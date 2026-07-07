import { BACKENDS } from "./backends";
import { loadDataset } from "./domain/dataset";
import { elapsedMs, percentile } from "./domain/operational";
import {
  averageRetrievalMetrics,
  scoreQuery,
} from "./domain/retrieval-metrics";
import type {
  Backend,
  BackendRun,
  BenchmarkResult,
  EmbeddingClient,
  OperationalMetrics,
  RetrievalMetrics,
  VectorStore,
} from "./domain/types";
import { createFixtureEmbeddingClient } from "../vendors/embedding/fixture";
import { createFixtureVectorStore } from "../vendors/vectorstore/fixture";
import { createOpenAiVectorStore } from "../vendors/vectorstore/openai";
import { createSqliteVecStore } from "../vendors/vectorstore/sqlite-vec";

type RunOptions = Readonly<{
  fixture: boolean;
  k: number;
  trials: number;
  /** Backend ids to run; empty or absent means every registered backend. */
  backends?: ReadonlyArray<string>;
}>;

type StoreFactory = Readonly<{
  /** Env var whose presence gates a real run; null means keyless/local. */
  keyEnv: string | null;
  create: (embedding: EmbeddingClient) => VectorStore;
}>;

const STORE_FACTORIES: Readonly<Record<string, StoreFactory>> = {
  "sqlite-vec": {
    keyEnv: null,
    create: (embedding) => createSqliteVecStore(embedding.dimensions),
  },
  "openai-vector-store": {
    keyEnv: "OPENAI_API_KEY",
    create: () => createOpenAiVectorStore(),
  },
};

const selectBackends = (
  ids: ReadonlyArray<string> | undefined,
): ReadonlyArray<Backend> =>
  ids === undefined || ids.length === 0
    ? BACKENDS
    : BACKENDS.filter((backend) => ids.includes(backend.id));

const keyPresent = (factory: StoreFactory): boolean =>
  factory.keyEnv === null || Boolean(process.env[factory.keyEnv]);

const estimateBackendCostUsd = (backend: Backend, queries: number): number =>
  ((backend.searchCostPer1kCallsUsd ?? 0) * queries) / 1000;

export const estimateRagBenchmark = (
  backendIds?: ReadonlyArray<string>,
): string => {
  const dataset = loadDataset();
  const lines = selectBackends(backendIds).map((backend) => {
    const cost = estimateBackendCostUsd(backend, dataset.queries.length);
    return `  ${backend.id}: ~$${cost.toFixed(4)} for ${dataset.queries.length} queries — ${backend.costNote}`;
  });
  return [
    "rag-benchmark estimate (per real run on the committed dataset):",
    ...lines,
    "Runtime is proportional to documents × queries; test resources are deleted after the run.",
  ].join("\n");
};

const zeroRetrieval: RetrievalMetrics = { recallAtK: 0, ndcgAtK: 0, mrr: 0 };

const zeroOperational = (queries: number): OperationalMetrics => ({
  ingestMs: 0,
  queryLatencyMs: Array.from({ length: queries }, () => 0),
  queryLatencyP50Ms: 0,
  queryLatencyP95Ms: 0,
  costUsd: 0,
  maxScale: 0,
});

export const runRagBenchmark = async (
  options: RunOptions,
): Promise<BenchmarkResult> => {
  const dataset = loadDataset();
  const embedding = createFixtureEmbeddingClient();
  const documentVectors = await embedding.embed(
    dataset.documents.map((document) => `${document.title}\n${document.text}`),
  );
  const queryVectors = await embedding.embed(
    dataset.queries.map((query) => query.text),
  );
  const generatedAt = options.fixture
    ? "2026-01-01T00:00:00.000Z"
    : new Date().toISOString();

  const runs: Array<BackendRun> = [];
  for (const backend of selectBackends(options.backends)) {
    const factory = STORE_FACTORIES[backend.id];
    if (factory === undefined) {
      runs.push({
        backend,
        provenance: "error",
        embeddingModel: "n/a",
        datasetId: dataset.id,
        k: options.k,
        retrieval: zeroRetrieval,
        operational: zeroOperational(dataset.queries.length),
        queryResults: [],
        error: `No store factory registered for backend '${backend.id}'.`,
      });
      continue;
    }

    // A fixture run — or a real run without the backend's credential — uses the
    // deterministic fixture store and is flagged `fixtured`, never faked.
    const fixtured = options.fixture || !keyPresent(factory);
    const embeddingModel =
      !fixtured && backend.embeddingCoupling === "managed"
        ? "managed (provider-internal)"
        : embedding.id;
    const store = fixtured
      ? createFixtureVectorStore()
      : factory.create(embedding);

    try {
      const embeddedDocuments = dataset.documents.map((document, index) => ({
        document,
        vector: documentVectors[index] ?? [],
      }));
      const ingestStart = process.hrtime.bigint();
      await store.upsert(embeddedDocuments);
      const ingestEnd = process.hrtime.bigint();

      const queryResults = [];
      const latencies = [];
      for (const [index, query] of dataset.queries.entries()) {
        const start = process.hrtime.bigint();
        const results = await store.query(
          { text: query.text, vector: queryVectors[index] ?? [] },
          options.k,
        );
        const end = process.hrtime.bigint();
        latencies.push(elapsedMs(start, end));
        queryResults.push({
          queryId: query.id,
          results,
          metrics: scoreQuery(results, dataset.qrels, query.id, options.k),
        });
      }

      const measuredIngestMs = elapsedMs(ingestStart, ingestEnd);
      const deterministicLatencies = dataset.queries.map(() => 0);
      const operationalLatencies = fixtured
        ? deterministicLatencies
        : latencies;
      runs.push({
        backend,
        provenance: fixtured ? "fixtured" : "measured",
        embeddingModel,
        datasetId: dataset.id,
        k: options.k,
        retrieval: averageRetrievalMetrics(
          queryResults.map((result) => result.metrics),
        ),
        operational: {
          ingestMs: fixtured ? 0 : measuredIngestMs,
          queryLatencyMs: operationalLatencies,
          queryLatencyP50Ms: percentile(operationalLatencies, 50),
          queryLatencyP95Ms: percentile(operationalLatencies, 95),
          costUsd: fixtured
            ? 0
            : estimateBackendCostUsd(backend, dataset.queries.length),
          maxScale: dataset.documents.length,
        },
        queryResults,
      });
    } catch (error) {
      runs.push({
        backend,
        provenance: "error",
        embeddingModel,
        datasetId: dataset.id,
        k: options.k,
        retrieval: zeroRetrieval,
        operational: zeroOperational(dataset.queries.length),
        queryResults: [],
        error: String(error),
      });
    } finally {
      await store.close?.();
    }
  }

  return {
    generatedAt,
    dataset,
    runs,
    artifactPath: "rag-benchmark.data.json",
    fixture: options.fixture,
    trials: options.trials,
  };
};
