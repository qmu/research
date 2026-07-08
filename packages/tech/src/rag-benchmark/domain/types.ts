export type Provenance = "measured" | "fixtured" | "error";

export type BackendKind = "self-managed" | "managed";

export type EmbeddingCoupling = "fixed" | "managed";

export type DocumentRecord = Readonly<{
  id: string;
  title: string;
  text: string;
}>;

export type QueryRecord = Readonly<{
  id: string;
  text: string;
}>;

export type RelevanceJudgment = Readonly<{
  queryId: string;
  documentId: string;
  relevance: number;
}>;

export type BenchmarkDataset = Readonly<{
  id: string;
  name: string;
  source: string;
  license: string;
  documents: ReadonlyArray<DocumentRecord>;
  queries: ReadonlyArray<QueryRecord>;
  qrels: ReadonlyArray<RelevanceJudgment>;
}>;

export type Backend = Readonly<{
  id: string;
  name: string;
  kind: BackendKind;
  embeddingCoupling: EmbeddingCoupling;
  isolatedStore: boolean;
  retrievalDeterministic: boolean;
  source: string;
  costNote: string;
  metadataFiltering: boolean;
  /** Curated per-1k-search-calls price used to estimate a real run's cost. */
  searchCostPer1kCallsUsd?: number;
  /** Curated fact about what the provider actually indexes (e.g. server-side chunking). */
  ingestionNote?: string;
}>;

export type Vector = ReadonlyArray<number>;

export type EmbeddedDocument = Readonly<{
  document: DocumentRecord;
  vector: Vector;
}>;

export type QueryResult = Readonly<{
  documentId: string;
  score: number;
}>;

/**
 * A query carries both the raw text and the fixed-embedding vector: self-managed
 * stores search by vector, managed stores (which embed internally) search by text.
 */
export type StoreQuery = Readonly<{
  text: string;
  vector: Vector;
}>;

export type EmbeddingClient = Readonly<{
  id: string;
  dimensions: number;
  embed: (texts: ReadonlyArray<string>) => Promise<ReadonlyArray<Vector>>;
}>;

export type VectorStore = Readonly<{
  id: string;
  upsert: (documents: ReadonlyArray<EmbeddedDocument>) => Promise<void>;
  query: (query: StoreQuery, k: number) => Promise<ReadonlyArray<QueryResult>>;
  close?: () => void | Promise<void>;
}>;

export type RetrievalMetricValues = Readonly<{
  recallAtK: number;
  ndcgAtK: number;
  mrr: number;
}>;

export type RetrievalMetrics = Readonly<
  RetrievalMetricValues & {
    recallAtKCi95: ConfidenceInterval;
    ndcgAtKCi95: ConfidenceInterval;
    mrrCi95: ConfidenceInterval;
    queryCount: number;
    trialCount: number;
    trialStdDev?: RetrievalMetricStdDev;
    intervalNote: string;
  }
>;

export type ConfidenceInterval = Readonly<{
  lower: number;
  upper: number;
}>;

export type RetrievalMetricStdDev = Readonly<{
  recallAtK: number;
  ndcgAtK: number;
  mrr: number;
}>;

export type OperationalMetrics = Readonly<{
  ingestMs: number;
  ingestMsStdDev: number;
  queryLatencyMs: ReadonlyArray<number>;
  queryLatencyP50Ms: number;
  queryLatencyP50MsStdDev: number;
  queryLatencyP95Ms: number;
  queryLatencyP95MsStdDev: number;
  trialCount: number;
  costUsd: number;
  maxScale: number;
}>;

export type BackendRun = Readonly<{
  backend: Backend;
  provenance: Provenance;
  measuredAt: string;
  embeddingModel: string;
  datasetId: string;
  k: number;
  retrieval: RetrievalMetrics;
  operational: OperationalMetrics;
  queryResults: ReadonlyArray<
    Readonly<{
      queryId: string;
      results: ReadonlyArray<QueryResult>;
      metrics: RetrievalMetricValues;
    }>
  >;
  error?: string;
}>;

export type BenchmarkResult = Readonly<{
  generatedAt: string;
  dataset: BenchmarkDataset;
  runs: ReadonlyArray<BackendRun>;
  artifactPath: string;
  fixture: boolean;
  trials: number;
}>;

export type ArchiveDocumentRecord = Readonly<Pick<DocumentRecord, "id">>;

export type ArchiveQueryRecord = Readonly<Pick<QueryRecord, "id">>;

export type ArchiveBenchmarkDataset = Readonly<
  Omit<BenchmarkDataset, "documents" | "queries"> & {
    documents: ReadonlyArray<ArchiveDocumentRecord>;
    queries: ReadonlyArray<ArchiveQueryRecord>;
  }
>;

export type ArchiveBenchmarkResult = Readonly<
  Omit<BenchmarkResult, "dataset"> & {
    dataset: ArchiveBenchmarkDataset;
  }
>;

// --- historical benchmark series --------------------------------------------
//
// Real RAG benchmark runs append compact backend points to a history file while
// preserving the complete run artifact separately. Each metric keeps the inputs a
// trend chart needs: mean, spread, sample count, and the method that produced the
// spread. The full artifact remains the source for query-level rows and raw
// backend details.

export type HistoryMetricMethod =
  | "trial-sample-std-dev"
  | "single-trial"
  | "run-total"
  | "error-zero";

export type HistoryMetricStat = Readonly<{
  mean: number;
  stdDev: number;
  n: number;
  method: HistoryMetricMethod;
}>;

export type HistoryPoint = Readonly<{
  id: string;
  provenance: Provenance;
  recallAtK: HistoryMetricStat;
  ndcgAtK: HistoryMetricStat;
  mrr: HistoryMetricStat;
  ingestMs: HistoryMetricStat;
  p50Ms: HistoryMetricStat;
  p95Ms: HistoryMetricStat;
  costUsd: HistoryMetricStat;
  measuredAt: string;
}>;

export type HistoryEntry = Readonly<{
  generatedAt: string;
  trials: number;
  points: ReadonlyArray<HistoryPoint>;
}>;

export type HistoryFile = Readonly<{
  entries: ReadonlyArray<HistoryEntry>;
}>;
