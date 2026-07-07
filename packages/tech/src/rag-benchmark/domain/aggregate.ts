import type { BackendRun, RetrievalMetrics } from "./types";

export const aggregateRuns = (
  runs: ReadonlyArray<BackendRun>,
): ReadonlyArray<BackendRun> => runs;

export const average = (values: ReadonlyArray<number>): number =>
  values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;

export const averageRetrieval = (
  values: ReadonlyArray<RetrievalMetrics>,
): RetrievalMetrics => ({
  recallAtK: average(values.map((value) => value.recallAtK)),
  ndcgAtK: average(values.map((value) => value.ndcgAtK)),
  mrr: average(values.map((value) => value.mrr)),
});
