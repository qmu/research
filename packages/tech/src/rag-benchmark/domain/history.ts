// Pure RAG history/archive projections. The entrypoint owns file IO and gzip;
// this module turns backend runs into compact trend points and redacts full
// artifacts into a commit-safe archive shape.

import type {
  ArchiveBenchmarkResult,
  BackendRun,
  BenchmarkResult,
  HistoryEntry,
  HistoryFile,
  HistoryMetricMethod,
  HistoryMetricStat,
  HistoryPoint,
} from "./types";

const metricMethod = (
  provenance: BackendRun["provenance"],
  n: number,
  stdDev: number,
): HistoryMetricMethod =>
  provenance === "error"
    ? "error-zero"
    : n > 1 || stdDev !== 0
      ? "trial-sample-std-dev"
      : "single-trial";

const metricStat = (
  mean: number,
  stdDev: number,
  n: number,
  provenance: BackendRun["provenance"],
): HistoryMetricStat => ({
  mean,
  stdDev,
  n,
  method: metricMethod(provenance, n, stdDev),
});

const runTotalStat = (
  mean: number,
  n: number,
  provenance: BackendRun["provenance"],
): HistoryMetricStat => ({
  mean,
  stdDev: 0,
  n,
  method: provenance === "error" ? "error-zero" : "run-total",
});

// Project one backend's run into the compact history point. Query-level results
// and backend artifacts stay in the full archived record.
export const toHistoryPoint = (run: BackendRun): HistoryPoint => {
  const retrievalN = run.retrieval.trialCount;
  const operationalN = run.operational.trialCount;
  const retrievalSpread = run.retrieval.trialStdDev;
  return {
    id: run.backend.id,
    provenance: run.provenance,
    recallAtK: metricStat(
      run.retrieval.recallAtK,
      retrievalSpread?.recallAtK ?? 0,
      retrievalN,
      run.provenance,
    ),
    ndcgAtK: metricStat(
      run.retrieval.ndcgAtK,
      retrievalSpread?.ndcgAtK ?? 0,
      retrievalN,
      run.provenance,
    ),
    mrr: metricStat(
      run.retrieval.mrr,
      retrievalSpread?.mrr ?? 0,
      retrievalN,
      run.provenance,
    ),
    ingestMs: metricStat(
      run.operational.ingestMs,
      run.operational.ingestMsStdDev,
      operationalN,
      run.provenance,
    ),
    p50Ms: metricStat(
      run.operational.queryLatencyP50Ms,
      run.operational.queryLatencyP50MsStdDev,
      operationalN,
      run.provenance,
    ),
    p95Ms: metricStat(
      run.operational.queryLatencyP95Ms,
      run.operational.queryLatencyP95MsStdDev,
      operationalN,
      run.provenance,
    ),
    costUsd: runTotalStat(
      run.operational.costUsd,
      operationalN,
      run.provenance,
    ),
    measuredAt: run.measuredAt,
  };
};

export const buildHistoryEntry = (
  runs: ReadonlyArray<BackendRun>,
  generatedAt: string,
  trials: number,
): HistoryEntry => ({
  generatedAt,
  trials,
  points: runs.map(toHistoryPoint),
});

export const appendHistory = (
  file: HistoryFile | null,
  entry: HistoryEntry,
): HistoryFile => ({
  entries: [...(file?.entries ?? []), entry],
});

export const redactBenchmarkResultForArchive = (
  result: BenchmarkResult,
): ArchiveBenchmarkResult => ({
  ...result,
  dataset: {
    ...result.dataset,
    documents: result.dataset.documents.map(({ id }) => ({ id })),
    queries: result.dataset.queries.map(({ id }) => ({ id })),
  },
});
