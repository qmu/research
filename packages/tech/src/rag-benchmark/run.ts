import { BACKENDS } from "./backends";
import {
  loadDataset,
  loadScifactSubset,
  scifactSubsetQueryCount,
} from "./domain/dataset";
import {
  elapsedMs,
  summarizeOperationalTrials,
  type OperationalTrial,
} from "./domain/operational";
import {
  averageRetrievalMetrics,
  scoreQuery,
  summarizeRetrievalMetrics,
} from "./domain/retrieval-metrics";
import type {
  Backend,
  BackendRun,
  BenchmarkResult,
  BenchmarkDataset,
  EmbeddingClient,
  EmbeddedDocument,
  OperationalMetrics,
  QueryResult,
  RetrievalMetricValues,
  RetrievalMetrics,
  StoreQuery,
  VectorStore,
} from "./domain/types";
import { createFixtureEmbeddingClient } from "../vendors/embedding/fixture";
import { createOpenAiEmbeddingClient } from "../vendors/embedding/openai";
import { createFixtureVectorStore } from "../vendors/vectorstore/fixture";
import { createAutoRagStore } from "../vendors/vectorstore/autorag";
import { createOpenAiVectorStore } from "../vendors/vectorstore/openai";
import { createS3VectorsStore } from "../vendors/vectorstore/s3-vectors";
import { createSqliteVecStore } from "../vendors/vectorstore/sqlite-vec";
import { createVectorizeStore } from "../vendors/vectorstore/vectorize";

type RunOptions = Readonly<{
  fixture: boolean;
  k: number;
  trials: number;
  /** Backend ids to run; empty or absent means every registered backend. */
  backends?: ReadonlyArray<string>;
  /**
   * `mini` (default) is the committed keyless fixture corpus. `scifact` loads the
   * real BEIR SciFact subset and, on a non-fixture run, embeds it with the real
   * OpenAI fixed-embedding model for the self-managed store-isolated comparison.
   */
  corpus?: "mini" | "scifact";
}>;

const loadCorpus = (corpus: RunOptions["corpus"]) =>
  corpus === "scifact" ? loadScifactSubset() : loadDataset();

const queryCountForCorpus = (corpus: RunOptions["corpus"]): number =>
  corpus === "scifact"
    ? scifactSubsetQueryCount()
    : loadDataset().queries.length;

type StoreFactory = Readonly<{
  /**
   * Env vars that gate a real run; a run is credentialed when ANY is set. An
   * empty list means keyless/local. (AWS resolves credentials from a chain, so
   * either a named profile or explicit access keys counts.)
   */
  keyEnv: ReadonlyArray<string>;
  create: (embedding: EmbeddingClient) => VectorStore;
}>;

const STORE_FACTORIES: Readonly<Record<string, StoreFactory>> = {
  "sqlite-vec": {
    keyEnv: [],
    create: (embedding) => createSqliteVecStore(embedding.dimensions),
  },
  "openai-vector-store": {
    keyEnv: ["OPENAI_API_KEY"],
    create: () => createOpenAiVectorStore(),
  },
  "s3-vectors": {
    keyEnv: ["AWS_PROFILE", "AWS_ACCESS_KEY_ID"],
    create: (embedding) => createS3VectorsStore(embedding.dimensions),
  },
  vectorize: {
    keyEnv: ["CLOUDFLARE_API_TOKEN"],
    create: (embedding) => createVectorizeStore(embedding.dimensions),
  },
  autorag: {
    keyEnv: ["CLOUDFLARE_API_TOKEN"],
    create: () => createAutoRagStore(),
  },
};

const selectBackends = (
  ids: ReadonlyArray<string> | undefined,
): ReadonlyArray<Backend> =>
  ids === undefined || ids.length === 0
    ? BACKENDS
    : BACKENDS.filter((backend) => ids.includes(backend.id));

const keyPresent = (factory: StoreFactory): boolean =>
  factory.keyEnv.length === 0 ||
  factory.keyEnv.some((name) => Boolean(process.env[name]));

const estimateBackendCostUsd = (
  backend: Backend,
  queries: number,
  trials: number,
): number => ((backend.searchCostPer1kCallsUsd ?? 0) * queries * trials) / 1000;

export const estimateRagBenchmark = (
  backendIds?: ReadonlyArray<string>,
  corpus?: RunOptions["corpus"],
  trials: number = 5,
): string => {
  const queryCount = queryCountForCorpus(corpus);
  const safeTrials = Math.max(1, Math.trunc(trials));
  const lines = selectBackends(backendIds).map((backend) => {
    const cost = estimateBackendCostUsd(backend, queryCount, safeTrials);
    return `  ${backend.id}: ~$${cost.toFixed(4)} for ${safeTrials} trial(s) × ${queryCount} queries — ${backend.costNote}`;
  });
  return [
    "rag-benchmark estimate (per real run on the committed dataset):",
    ...lines,
    "Runtime is proportional to documents × queries; test resources are deleted after the run.",
  ].join("\n");
};

const zeroInterval = { lower: 0, upper: 0 } as const;

const zeroRetrieval = (
  queries: number,
  trials: number,
  intervalNote: string,
): RetrievalMetrics => ({
  recallAtK: 0,
  ndcgAtK: 0,
  mrr: 0,
  recallAtKCi95: zeroInterval,
  ndcgAtKCi95: zeroInterval,
  mrrCi95: zeroInterval,
  queryCount: queries,
  trialCount: trials,
  intervalNote,
});

const zeroOperational = (
  queries: number,
  trials: number,
): OperationalMetrics => ({
  ingestMs: 0,
  ingestMsStdDev: 0,
  queryLatencyMs: Array.from({ length: queries }, () => 0),
  queryLatencyP50Ms: 0,
  queryLatencyP50MsStdDev: 0,
  queryLatencyP95Ms: 0,
  queryLatencyP95MsStdDev: 0,
  trialCount: trials,
  costUsd: 0,
  maxScale: 0,
});

type QueryMeasurement = Readonly<{
  queryId: string;
  results: ReadonlyArray<QueryResult>;
  metrics?: RetrievalMetricValues;
}>;

type BackendTrial = Readonly<{
  operational: OperationalTrial;
  queryResults: ReadonlyArray<QueryMeasurement>;
  retrieval?: RetrievalMetricValues;
}>;

type PreparedVectors = Readonly<{
  embedding: EmbeddingClient;
  documentVectors: ReadonlyArray<StoreQuery["vector"]>;
  queryVectors: ReadonlyArray<StoreQuery["vector"]>;
}>;

const prepareVectors = async (
  embedding: EmbeddingClient,
  dataset: BenchmarkDataset,
): Promise<PreparedVectors> => ({
  embedding,
  documentVectors: await embedding.embed(
    dataset.documents.map((document) => `${document.title}\n${document.text}`),
  ),
  queryVectors: await embedding.embed(
    dataset.queries.map((query) => query.text),
  ),
});

const emptyVectors = (
  embedding: EmbeddingClient,
  dataset: BenchmarkDataset,
): PreparedVectors => ({
  embedding,
  documentVectors: dataset.documents.map(() => []),
  queryVectors: dataset.queries.map(() => []),
});

const retrievalIntervalNote = (
  backend: Backend,
  fixtured: boolean,
  queryCount: number,
): string =>
  backend.retrievalDeterministic || fixtured
    ? `Retrieval quality is deterministic for this run; the 95% interval is over the ${queryCount}-query sample, not trial variance.`
    : "Retrieval queries were repeated across operational trials; the 95% interval is over the query sample and run-to-run spread is reported separately.";

const measureBackendTrial = async (
  backend: Backend,
  factory: StoreFactory,
  embedding: EmbeddingClient,
  fixtured: boolean,
  documents: ReadonlyArray<EmbeddedDocument>,
  queries: ReadonlyArray<Readonly<{ id: string; text: string }>>,
  queryVectors: ReadonlyArray<StoreQuery["vector"]>,
  qrels: Parameters<typeof scoreQuery>[1],
  k: number,
  scoreRetrieval: boolean,
): Promise<BackendTrial> => {
  const store = fixtured
    ? createFixtureVectorStore()
    : factory.create(embedding);
  try {
    const ingestStart = process.hrtime.bigint();
    await store.upsert(documents);
    const ingestEnd = process.hrtime.bigint();

    const queryResults: Array<QueryMeasurement> = [];
    const latencies: Array<number> = [];
    for (const [index, query] of queries.entries()) {
      const start = process.hrtime.bigint();
      const results = await store.query(
        { text: query.text, vector: queryVectors[index] ?? [] },
        k,
      );
      const end = process.hrtime.bigint();
      latencies.push(fixtured ? 0 : elapsedMs(start, end));
      queryResults.push({
        queryId: query.id,
        results,
        metrics: scoreRetrieval
          ? scoreQuery(results, qrels, query.id, k)
          : undefined,
      });
    }

    const scored = queryResults
      .map((result) => result.metrics)
      .filter(
        (metric): metric is RetrievalMetricValues => metric !== undefined,
      );
    return {
      operational: {
        ingestMs: fixtured ? 0 : elapsedMs(ingestStart, ingestEnd),
        queryLatencyMs: latencies,
        costUsd: fixtured
          ? 0
          : estimateBackendCostUsd(backend, queries.length, 1),
        maxScale: documents.length,
      },
      queryResults,
      retrieval:
        scored.length > 0 ? averageRetrievalMetrics(scored) : undefined,
    };
  } finally {
    await store.close?.();
  }
};

export const runRagBenchmark = async (
  options: RunOptions,
): Promise<BenchmarkResult> => {
  const dataset = loadCorpus(options.corpus);
  const trialCount = Math.max(1, Math.trunc(options.trials));
  const fixtureEmbedding = createFixtureEmbeddingClient();
  let fixtureVectors: Promise<PreparedVectors> | undefined;
  let fixedRealVectors: Promise<PreparedVectors> | undefined;
  const getFixtureVectors = (): Promise<PreparedVectors> => {
    fixtureVectors ??= prepareVectors(fixtureEmbedding, dataset);
    return fixtureVectors;
  };
  const getFixedRealVectors = (): Promise<PreparedVectors> => {
    fixedRealVectors ??= prepareVectors(createOpenAiEmbeddingClient(), dataset);
    return fixedRealVectors;
  };
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
        measuredAt: generatedAt,
        embeddingModel: "n/a",
        datasetId: dataset.id,
        k: options.k,
        retrieval: zeroRetrieval(
          dataset.queries.length,
          trialCount,
          "No retrieval interval is available because the backend did not run.",
        ),
        operational: zeroOperational(dataset.queries.length, trialCount),
        queryResults: [],
        error: `No store factory registered for backend '${backend.id}'.`,
      });
      continue;
    }

    // A fixture run — or a real run without the backend's credential — uses the
    // deterministic fixture store and is flagged `fixtured`, never faked.
    const fixtured = options.fixture || !keyPresent(factory);
    let embeddingModel = "n/a";
    try {
      const vectors = fixtured
        ? await getFixtureVectors()
        : backend.embeddingCoupling === "fixed" && options.corpus === "scifact"
          ? await getFixedRealVectors()
          : backend.embeddingCoupling === "fixed"
            ? await getFixtureVectors()
            : emptyVectors(fixtureEmbedding, dataset);
      embeddingModel =
        !fixtured && backend.embeddingCoupling === "managed"
          ? "managed (provider-internal)"
          : vectors.embedding.id;
      const embeddedDocuments = dataset.documents.map((document, index) => ({
        document,
        vector: vectors.documentVectors[index] ?? [],
      }));
      const retrievalDeterministic = backend.retrievalDeterministic || fixtured;
      const trials: Array<BackendTrial> = [];
      for (let trial = 0; trial < trialCount; trial += 1) {
        trials.push(
          await measureBackendTrial(
            backend,
            factory,
            vectors.embedding,
            fixtured,
            embeddedDocuments,
            dataset.queries,
            vectors.queryVectors,
            dataset.qrels,
            options.k,
            !retrievalDeterministic || trial === 0,
          ),
        );
      }

      const firstTrial = trials[0];
      const scoredQueryResults =
        firstTrial?.queryResults
          .map((result) =>
            result.metrics === undefined
              ? undefined
              : {
                  queryId: result.queryId,
                  results: result.results,
                  metrics: result.metrics,
                },
          )
          .filter(
            (
              result,
            ): result is Readonly<{
              queryId: string;
              results: ReadonlyArray<QueryResult>;
              metrics: RetrievalMetricValues;
            }> => result !== undefined,
          ) ?? [];
      const queryMetrics = scoredQueryResults.map((result) => result.metrics);
      const trialRetrievalMetrics = trials
        .map((trial) => trial.retrieval)
        .filter(
          (metric): metric is RetrievalMetricValues => metric !== undefined,
        );
      runs.push({
        backend,
        provenance: fixtured ? "fixtured" : "measured",
        measuredAt: generatedAt,
        embeddingModel,
        datasetId: dataset.id,
        k: options.k,
        retrieval: summarizeRetrievalMetrics(
          queryMetrics,
          retrievalDeterministic
            ? trialRetrievalMetrics.slice(0, 1)
            : trialRetrievalMetrics,
          retrievalIntervalNote(backend, fixtured, dataset.queries.length),
        ),
        operational: summarizeOperationalTrials(
          trials.map((trial) => trial.operational),
        ),
        queryResults: scoredQueryResults,
      });
    } catch (error) {
      runs.push({
        backend,
        provenance: "error",
        measuredAt: generatedAt,
        embeddingModel,
        datasetId: dataset.id,
        k: options.k,
        retrieval: zeroRetrieval(
          dataset.queries.length,
          trialCount,
          "No retrieval interval is available because the backend errored.",
        ),
        operational: zeroOperational(dataset.queries.length, trialCount),
        queryResults: [],
        error: String(error),
      });
    }
  }

  return {
    generatedAt,
    dataset,
    runs,
    artifactPath: "rag-benchmark.data.json",
    fixture: options.fixture,
    trials: trialCount,
  };
};
