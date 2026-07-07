import { BACKENDS } from "./backends";
import { loadDataset } from "./domain/dataset";
import { elapsedMs, percentile } from "./domain/operational";
import {
  averageRetrievalMetrics,
  scoreQuery,
} from "./domain/retrieval-metrics";
import type {
  BackendRun,
  BenchmarkResult,
  EmbeddingClient,
  VectorStore,
} from "./domain/types";
import { createFixtureEmbeddingClient } from "../vendors/embedding/fixture";
import { createFixtureVectorStore } from "../vendors/vectorstore/fixture";
import { createSqliteVecStore } from "../vendors/vectorstore/sqlite-vec";

type RunOptions = Readonly<{
  fixture: boolean;
  k: number;
  trials: number;
}>;

const createStore = (
  embedding: EmbeddingClient,
  fixture: boolean,
): VectorStore =>
  fixture
    ? createFixtureVectorStore()
    : createSqliteVecStore(embedding.dimensions);

export const estimateRagBenchmark = (): string =>
  "rag-benchmark estimate: sqlite-vec is local and keyless; expected API cost is $0.00. Runtime is proportional to documents × queries in the committed dataset.";

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
  for (const backend of BACKENDS) {
    const store = createStore(embedding, options.fixture);
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
      const results = await store.query(queryVectors[index] ?? [], options.k);
      const end = process.hrtime.bigint();
      latencies.push(elapsedMs(start, end));
      queryResults.push({
        queryId: query.id,
        results,
        metrics: scoreQuery(results, dataset.qrels, query.id, options.k),
      });
    }

    store.close?.();
    const measuredIngestMs = elapsedMs(ingestStart, ingestEnd);
    const deterministicLatencies = dataset.queries.map(() => 0);
    const operationalLatencies = options.fixture
      ? deterministicLatencies
      : latencies;
    runs.push({
      backend,
      provenance: options.fixture ? "fixtured" : "measured",
      embeddingModel: embedding.id,
      datasetId: dataset.id,
      k: options.k,
      retrieval: averageRetrievalMetrics(
        queryResults.map((result) => result.metrics),
      ),
      operational: {
        ingestMs: options.fixture ? 0 : measuredIngestMs,
        queryLatencyMs: operationalLatencies,
        queryLatencyP50Ms: percentile(operationalLatencies, 50),
        queryLatencyP95Ms: percentile(operationalLatencies, 95),
        costUsd: 0,
        maxScale: dataset.documents.length,
      },
      queryResults,
    });
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
