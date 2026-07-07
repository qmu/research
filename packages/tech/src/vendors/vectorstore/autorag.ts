import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import type {
  EmbeddedDocument,
  QueryResult,
  StoreQuery,
  VectorStore,
} from "../../rag-benchmark/domain/types";

/**
 * Anti-corruption layer for Cloudflare AutoRAG — a fully-managed RAG pipeline
 * (ingest from R2 → embed → index → retrieve, all internal). It ignores the
 * fixed-embedding vectors and searches by query text, so its numbers measure the
 * whole managed stack, never the store in isolation (peer to OpenAI File Search).
 *
 * AutoRAG ingests from an R2 bucket and indexes asynchronously (a 6-hour cycle,
 * or a rate-limited force sync). This ACL provisions a dedicated per-run R2
 * bucket, uploads the corpus, creates the instance, triggers a sync, and polls
 * until documents become searchable — bounded by READINESS_TIMEOUT_MS. If the
 * index does not become searchable in that window (e.g. the account's REST API
 * cannot bind the R2 data source, which is dashboard-driven), the run raises a
 * clear error and the runner records the backend as `error`, never faked.
 */
const ACCOUNT_ID_ENV = "CLOUDFLARE_ACCOUNT_ID";
const API_TOKEN_ENV = "CLOUDFLARE_API_TOKEN";
const READINESS_TIMEOUT_MS = 480_000; // ~8 minutes
const READINESS_POLL_MS = 10_000;

type SearchHit = Readonly<{
  filename?: string;
  file_id?: string;
  score?: number;
}>;

type SyncJob = Readonly<{ ended_at?: string | null }>;

const docIdFromFilename = (filename: string): string =>
  filename.replace(/\.[^.]+$/, "");

export const createAutoRagStore = (): VectorStore => {
  const accountId = process.env[ACCOUNT_ID_ENV] ?? "";
  const apiToken = process.env[API_TOKEN_ENV] ?? "";
  const suffix = randomUUID().slice(0, 12);
  const bucketName = `rag-bench-corpus-${suffix}`;
  const ragId = `rag-bench-${suffix}`;
  const accountBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
  const authHeader = { Authorization: `Bearer ${apiToken}` };

  const api = async (
    path: string,
    init: RequestInit,
    label: string,
  ): Promise<Record<string, unknown>> => {
    const response = await fetch(`${accountBase}${path}`, {
      ...init,
      headers: { ...authHeader, ...(init.headers ?? {}) },
    });
    const body = (await response.json()) as Record<string, unknown>;
    if (body.success !== true) {
      throw new Error(
        `AutoRAG ${label}: ${JSON.stringify(body.errors ?? body)}`,
      );
    }
    return body;
  };

  const search = async (
    query: string,
    k: number,
  ): Promise<ReadonlyArray<SearchHit>> => {
    const body = await api(
      `/autorag/rags/${ragId}/search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, max_num_results: k }),
      },
      "search",
    );
    const result = (body.result ?? {}) as { data?: SearchHit[] };
    return result.data ?? [];
  };

  return {
    id: "autorag",
    upsert: async (documents: ReadonlyArray<EmbeddedDocument>) => {
      await api(
        "/r2/buckets",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: bucketName }),
        },
        "create bucket",
      );
      for (const { document } of documents) {
        await api(
          `/r2/buckets/${bucketName}/objects/${document.id}.txt`,
          {
            method: "PUT",
            headers: { "Content-Type": "text/plain" },
            body: `${document.title}\n${document.text}`,
          },
          "upload object",
        );
      }
      await api(
        "/autorag/rags",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: ragId,
            type: "r2",
            source_params: { bucket_name: bucketName },
          }),
        },
        "create instance",
      );
      await api(`/autorag/rags/${ragId}/sync`, { method: "PATCH" }, "sync");

      // Poll until the managed index makes documents searchable. A probe query
      // built from the first document's title is the true readiness signal. To
      // avoid waiting the full timeout on a doomed run, also watch the sync job:
      // once it has ended and a short grace search is still empty, the index
      // finished with nothing searchable, so fail fast rather than idle.
      const probe = documents[0];
      if (probe === undefined) return;
      const bindingError = new Error(
        `AutoRAG index ${ragId} produced no searchable documents. AutoRAG's R2 ` +
          `data-source binding is provisioned through the dashboard; the REST create ` +
          `API did not bind the bucket, so a live end-to-end measurement is not ` +
          `attainable for this account.`,
      );
      const latestJobEnded = async (): Promise<boolean> => {
        const body = await api(
          `/autorag/rags/${ragId}/jobs`,
          { method: "GET" },
          "jobs",
        ).catch(() => ({ result: [] }) as Record<string, unknown>);
        const jobs = (body.result ?? []) as ReadonlyArray<SyncJob>;
        return jobs.length > 0 && jobs.every((job) => Boolean(job.ended_at));
      };

      const deadline = Date.now() + READINESS_TIMEOUT_MS;
      let jobEndedAt: number | null = null;
      for (;;) {
        const hits = await search(probe.document.title, 1).catch(() => []);
        if (hits.length > 0) return;
        if (jobEndedAt === null && (await latestJobEnded())) {
          jobEndedAt = Date.now();
        }
        // Job finished, but a follow-up grace window still yields no results:
        // indexing produced nothing searchable — fail fast.
        if (
          jobEndedAt !== null &&
          Date.now() - jobEndedAt >= READINESS_POLL_MS
        ) {
          throw bindingError;
        }
        if (Date.now() >= deadline) throw bindingError;
        await delay(READINESS_POLL_MS);
      }
    },
    query: async (
      query: StoreQuery,
      k: number,
    ): Promise<ReadonlyArray<QueryResult>> => {
      const hits = await search(query.text, k);
      return hits.map((hit, index) => ({
        documentId: docIdFromFilename(hit.filename ?? hit.file_id ?? ""),
        // AutoRAG returns a relevance score (higher is better); fall back to a
        // rank-derived score if the API omits it.
        score: hit.score ?? 1 / (index + 1),
      }));
    },
    close: async () => {
      // Best-effort teardown so a failed run leaves no dangling instance/bucket.
      await api(
        `/autorag/rags/${ragId}`,
        { method: "DELETE" },
        "delete rag",
      ).catch(() => undefined);
      const listing = await api(
        `/r2/buckets/${bucketName}/objects`,
        { method: "GET" },
        "list objects",
      ).catch(() => ({ result: [] }) as Record<string, unknown>);
      const objects = (listing.result ?? []) as ReadonlyArray<{ key?: string }>;
      for (const object of objects) {
        if (object.key === undefined) continue;
        await api(
          `/r2/buckets/${bucketName}/objects/${object.key}`,
          { method: "DELETE" },
          "delete object",
        ).catch(() => undefined);
      }
      await api(
        `/r2/buckets/${bucketName}`,
        { method: "DELETE" },
        "delete bucket",
      ).catch(() => undefined);
    },
  };
};
