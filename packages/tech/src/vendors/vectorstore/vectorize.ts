import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import type {
  EmbeddedDocument,
  QueryResult,
  StoreQuery,
  Vector,
  VectorStore,
} from "../../rag-benchmark/domain/types";

/**
 * Anti-corruption layer for Cloudflare Vectorize (v2 REST) — a self-managed
 * store: we provide the fixed-embedding vectors, so this is a store-isolated
 * comparison against sqlite-vec / S3 Vectors. Auth is a Cloudflare account id +
 * API token (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN). The per-run index is
 * created in upsert() and deleted in close().
 *
 * Vectorize mutations are eventually consistent (vectors are not queryable for
 * ~5-15s after upsert), so upsert() polls until the data is searchable before
 * returning — that propagation wait is a genuine operational characteristic of
 * the store and is intentionally included in the measured ingest time.
 */
const ACCOUNT_ID_ENV = "CLOUDFLARE_ACCOUNT_ID";
const API_TOKEN_ENV = "CLOUDFLARE_API_TOKEN";
const READINESS_TIMEOUT_MS = 120_000;
const READINESS_POLL_MS = 2_000;
// Vectorize upserts are eventually consistent per-vector: the first vector can
// become queryable well before the whole batch finishes indexing. After the
// probe is queryable we settle until a full-batch readiness check stops growing,
// so queries run against the complete index (otherwise recall is understated).
const SETTLE_POLL_MS = 3_000;
const SETTLE_STABLE_ROUNDS = 3;

type VectorizeMatch = Readonly<{ id: string; score: number }>;

export const createVectorizeStore = (dimensions: number): VectorStore => {
  const accountId = process.env[ACCOUNT_ID_ENV] ?? "";
  const apiToken = process.env[API_TOKEN_ENV] ?? "";
  const indexName = `rag-bench-${randomUUID()}`;
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/vectorize/v2/indexes`;
  const authHeader = { Authorization: `Bearer ${apiToken}` };

  const request = async (
    path: string,
    init: RequestInit,
  ): Promise<Record<string, unknown>> => {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { ...authHeader, ...(init.headers ?? {}) },
    });
    const body = (await response.json()) as Record<string, unknown>;
    if (body.success !== true) {
      throw new Error(
        `Vectorize ${path}: ${JSON.stringify(body.errors ?? body)}`,
      );
    }
    return body;
  };

  const runQuery = async (
    vector: Vector,
    k: number,
  ): Promise<ReadonlyArray<VectorizeMatch>> => {
    const body = await request(`/${indexName}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vector: [...vector],
        topK: k,
        returnMetadata: "none",
      }),
    });
    const result = (body.result ?? {}) as { matches?: VectorizeMatch[] };
    return result.matches ?? [];
  };

  return {
    id: "vectorize",
    upsert: async (documents: ReadonlyArray<EmbeddedDocument>) => {
      await request("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: indexName,
          config: { dimensions, metric: "cosine" },
        }),
      });
      const ndjson = documents
        .map((row) =>
          JSON.stringify({ id: row.document.id, values: [...row.vector] }),
        )
        .join("\n");
      await request(`/${indexName}/upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/x-ndjson" },
        body: ndjson,
      });

      // Poll until the async mutation has propagated and vectors are queryable.
      const probe = documents[0];
      if (probe === undefined) return;
      const deadline = Date.now() + READINESS_TIMEOUT_MS;
      for (;;) {
        const matches = await runQuery(probe.vector, 1);
        if (matches.length > 0) break;
        if (Date.now() >= deadline) {
          throw new Error(
            `Vectorize index ${indexName} did not become queryable within ${READINESS_TIMEOUT_MS}ms`,
          );
        }
        await delay(READINESS_POLL_MS);
      }

      // Settle: the batch keeps indexing after the first vector is queryable, so
      // wait until a top-N probe stops growing (all vectors indexed) before
      // returning — measuring against a partially-indexed store understates recall.
      let lastCount = -1;
      let stable = 0;
      const probeK = Math.min(documents.length, 100); // Vectorize caps topK at 100
      while (Date.now() < deadline) {
        const seen = await runQuery(probe.vector, probeK);
        if (seen.length === lastCount) {
          if (++stable >= SETTLE_STABLE_ROUNDS) return;
        } else {
          stable = 0;
          lastCount = seen.length;
        }
        await delay(SETTLE_POLL_MS);
      }
    },
    query: async (
      query: StoreQuery,
      k: number,
    ): Promise<ReadonlyArray<QueryResult>> => {
      const matches = await runQuery(query.vector, k);
      return matches.map((match) => ({
        documentId: match.id,
        // Vectorize cosine score is already higher-is-better.
        score: match.score,
      }));
    },
    close: async () => {
      await request(`/${indexName}`, { method: "DELETE" }).catch(
        () => undefined,
      );
    },
  };
};
