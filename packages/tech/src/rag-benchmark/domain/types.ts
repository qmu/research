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

export type RetrievalMetrics = Readonly<{
  recallAtK: number;
  ndcgAtK: number;
  mrr: number;
}>;

export type OperationalMetrics = Readonly<{
  ingestMs: number;
  queryLatencyMs: ReadonlyArray<number>;
  queryLatencyP50Ms: number;
  queryLatencyP95Ms: number;
  costUsd: number;
  maxScale: number;
}>;

export type BackendRun = Readonly<{
  backend: Backend;
  provenance: Provenance;
  embeddingModel: string;
  datasetId: string;
  k: number;
  retrieval: RetrievalMetrics;
  operational: OperationalMetrics;
  queryResults: ReadonlyArray<
    Readonly<{
      queryId: string;
      results: ReadonlyArray<QueryResult>;
      metrics: RetrievalMetrics;
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
