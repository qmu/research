import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import type {
  EmbeddedDocument,
  QueryResult,
  StoreQuery,
  VectorStore,
} from "../../rag-benchmark/domain/types";
import { defaultTeardownWarn, type TeardownWarn } from "./teardown";

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
 *
 * Teardown is guaranteed on every path: `close()` deletes exactly the resources
 * this run created (bucket objects → bucket → instance, since R2 rejects
 * deleting a non-empty bucket), warns on stderr instead of throwing, and stays
 * idempotent. `sweepAutoRagOrphans` reclaims `rag-bench-*` remnants left by an
 * earlier crashed or partially-failed teardown.
 */
const ACCOUNT_ID_ENV = "CLOUDFLARE_ACCOUNT_ID";
const API_TOKEN_ENV = "CLOUDFLARE_API_TOKEN";
const READINESS_TIMEOUT_MS = 480_000; // ~8 minutes
const READINESS_POLL_MS = 10_000;
/** Every per-run resource carries this prefix so orphans are identifiable. */
export const AUTORAG_RESOURCE_PREFIX = "rag-bench-";

type SearchHit = Readonly<{
  filename?: string;
  file_id?: string;
  score?: number;
}>;

type SyncJob = Readonly<{ ended_at?: string | null }>;

const docIdFromFilename = (filename: string): string =>
  filename.replace(/\.[^.]+$/, "");

/** Minimal Cloudflare API caller; throws on `success: false`. */
export type AutoRagApi = (
  path: string,
  init: RequestInit,
  label: string,
) => Promise<Record<string, unknown>>;

const createAutoRagApi = (accountId: string, apiToken: string): AutoRagApi => {
  const accountBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
  const authHeader = { Authorization: `Bearer ${apiToken}` };
  return async (path, init, label) => {
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
};

const warnDeleteFailure = (
  warn: TeardownWarn,
  resource: string,
  error: unknown,
): void => {
  warn(
    `[rag-benchmark] teardown warning (autorag): failed to delete ${resource}: ${String(error)}`,
  );
};

const listObjectKeysPage = async (
  api: AutoRagApi,
  bucketName: string,
): Promise<ReadonlyArray<string>> => {
  const body = await api(
    `/r2/buckets/${bucketName}/objects?per_page=1000`,
    { method: "GET" },
    "list objects",
  );
  const objects = (body.result ?? []) as ReadonlyArray<{ key?: string }>;
  return objects
    .map((object) => object.key)
    .filter((key): key is string => key !== undefined);
};

/**
 * Delete every object in the bucket, page by page (R2 refuses to delete a
 * non-empty bucket). Re-listing after each deleted page walks all pages without
 * cursor bookkeeping; a page on which nothing could be deleted aborts the loop
 * so a persistent failure cannot spin forever. Returns true when the bucket is
 * verifiably empty.
 */
export const emptyBucket = async (
  api: AutoRagApi,
  bucketName: string,
  warn: TeardownWarn = defaultTeardownWarn,
): Promise<boolean> => {
  for (;;) {
    let keys: ReadonlyArray<string>;
    try {
      keys = await listObjectKeysPage(api, bucketName);
    } catch (error) {
      warnDeleteFailure(warn, `objects of R2 bucket ${bucketName}`, error);
      return false;
    }
    if (keys.length === 0) return true;
    let deleted = 0;
    for (const key of keys) {
      try {
        await api(
          `/r2/buckets/${bucketName}/objects/${encodeURIComponent(key)}`,
          { method: "DELETE" },
          "delete object",
        );
        deleted += 1;
      } catch (error) {
        warnDeleteFailure(warn, `R2 object ${bucketName}/${key}`, error);
      }
    }
    if (deleted === 0) return false;
  }
};

/**
 * Idempotently tear down one run's AutoRAG resources in dependency order:
 * bucket objects → bucket → AutoRAG instance. Never throws; each failure is a
 * visible stderr warning. Returns true when everything given is gone.
 */
export const teardownAutoRagResources = async (
  api: AutoRagApi,
  resources: Readonly<{ ragId?: string; bucketName?: string }>,
  warn: TeardownWarn = defaultTeardownWarn,
): Promise<boolean> => {
  let clean = true;
  if (resources.bucketName !== undefined) {
    if (await emptyBucket(api, resources.bucketName, warn)) {
      try {
        await api(
          `/r2/buckets/${resources.bucketName}`,
          { method: "DELETE" },
          "delete bucket",
        );
      } catch (error) {
        clean = false;
        warnDeleteFailure(warn, `R2 bucket ${resources.bucketName}`, error);
      }
    } else {
      clean = false;
    }
  }
  if (resources.ragId !== undefined) {
    try {
      await api(
        `/autorag/rags/${resources.ragId}`,
        { method: "DELETE" },
        "delete rag instance",
      );
    } catch (error) {
      clean = false;
      warnDeleteFailure(warn, `AutoRAG instance ${resources.ragId}`, error);
    }
  }
  return clean;
};

export type OrphanSweepSummary = Readonly<{
  ragsDeleted: number;
  bucketsDeleted: number;
  clean: boolean;
}>;

/**
 * List and reclaim `rag-bench-*` AutoRAG instances and R2 buckets left behind
 * by an earlier run whose teardown failed part-way. Only benchmark-prefixed
 * resources are ever touched.
 */
export const sweepAutoRagOrphansWithApi = async (
  api: AutoRagApi,
  warn: TeardownWarn = defaultTeardownWarn,
): Promise<OrphanSweepSummary> => {
  const ragsBody = await api("/autorag/rags", { method: "GET" }, "list rags");
  const rags = (ragsBody.result ?? []) as ReadonlyArray<{ id?: string }>;
  const orphanRagIds = rags
    .map((rag) => rag.id)
    .filter(
      (id): id is string =>
        id !== undefined && id.startsWith(AUTORAG_RESOURCE_PREFIX),
    );

  const bucketsBody = await api(
    "/r2/buckets",
    { method: "GET" },
    "list buckets",
  );
  const bucketResult = (bucketsBody.result ?? {}) as {
    buckets?: ReadonlyArray<{ name?: string }>;
  };
  const orphanBucketNames = (bucketResult.buckets ?? [])
    .map((bucket) => bucket.name)
    .filter(
      (name): name is string =>
        name !== undefined && name.startsWith(AUTORAG_RESOURCE_PREFIX),
    );

  let clean = true;
  for (const ragId of orphanRagIds) {
    if (!(await teardownAutoRagResources(api, { ragId }, warn))) clean = false;
  }
  let bucketsDeleted = 0;
  for (const bucketName of orphanBucketNames) {
    if (await teardownAutoRagResources(api, { bucketName }, warn)) {
      bucketsDeleted += 1;
    } else {
      clean = false;
    }
  }
  return {
    ragsDeleted: orphanRagIds.length,
    bucketsDeleted,
    clean,
  };
};

/** Env-credentialed orphan sweep for the `--sweep-orphans` CLI path. */
export const sweepAutoRagOrphans = async (
  warn: TeardownWarn = defaultTeardownWarn,
): Promise<OrphanSweepSummary> => {
  const accountId = process.env[ACCOUNT_ID_ENV] ?? "";
  const apiToken = process.env[API_TOKEN_ENV] ?? "";
  if (accountId === "" || apiToken === "") {
    throw new Error(
      `AutoRAG orphan sweep requires ${ACCOUNT_ID_ENV} and ${API_TOKEN_ENV}.`,
    );
  }
  return sweepAutoRagOrphansWithApi(
    createAutoRagApi(accountId, apiToken),
    warn,
  );
};

export const createAutoRagStore = (): VectorStore => {
  const accountId = process.env[ACCOUNT_ID_ENV] ?? "";
  const apiToken = process.env[API_TOKEN_ENV] ?? "";
  const suffix = randomUUID().slice(0, 12);
  const bucketName = `${AUTORAG_RESOURCE_PREFIX}corpus-${suffix}`;
  const ragId = `${AUTORAG_RESOURCE_PREFIX}${suffix}`;
  const api = createAutoRagApi(accountId, apiToken);
  // Track exactly what this run has provisioned so close() tears down created
  // resources on every path (including a failed upsert) and stays idempotent.
  let bucketCreated = false;
  let ragCreated = false;

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
      bucketCreated = true;
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
      ragCreated = true;
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
      const clean = await teardownAutoRagResources(api, {
        ragId: ragCreated ? ragId : undefined,
        bucketName: bucketCreated ? bucketName : undefined,
      });
      // On full success a second close() is a no-op; on failure the flags stay
      // set so a retried close() attempts the remaining resources again.
      if (clean) {
        bucketCreated = false;
        ragCreated = false;
      }
    },
  };
};
