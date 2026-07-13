import { average, normalInterval, stdDev, wilsonInterval } from "./aggregate";
import type {
  QueryResult,
  RelevanceJudgment,
  RetrievalMetricValues,
  RetrievalMetrics,
} from "./types";

const relevantForQuery = (
  qrels: ReadonlyArray<RelevanceJudgment>,
  queryId: string,
): ReadonlyMap<string, number> =>
  new Map(
    qrels
      .filter((qrel) => qrel.queryId === queryId && qrel.relevance > 0)
      .map((qrel) => [qrel.documentId, qrel.relevance]),
  );

const logDiscount = (rank: number): number => 1 / Math.log2(rank + 1);

export const recallAtK = (
  results: ReadonlyArray<QueryResult>,
  qrels: ReadonlyArray<RelevanceJudgment>,
  queryId: string,
  k: number,
): number => {
  const relevant = relevantForQuery(qrels, queryId);
  if (relevant.size === 0) return 0;
  const retrieved = new Set(
    results.slice(0, k).map((result) => result.documentId),
  );
  return [...relevant.keys()].some((documentId) => retrieved.has(documentId))
    ? 1
    : 0;
};

export const ndcgAtK = (
  results: ReadonlyArray<QueryResult>,
  qrels: ReadonlyArray<RelevanceJudgment>,
  queryId: string,
  k: number,
): number => {
  const relevant = relevantForQuery(qrels, queryId);
  const dcg = results.slice(0, k).reduce((sum, result, index) => {
    const relevance = relevant.get(result.documentId) ?? 0;
    return sum + relevance * logDiscount(index + 1);
  }, 0);
  const ideal = [...relevant.values()]
    .sort((a, b) => b - a)
    .slice(0, k)
    .reduce(
      (sum, relevance, index) => sum + relevance * logDiscount(index + 1),
      0,
    );
  return ideal === 0 ? 0 : dcg / ideal;
};

export const reciprocalRank = (
  results: ReadonlyArray<QueryResult>,
  qrels: ReadonlyArray<RelevanceJudgment>,
  queryId: string,
): number => {
  const relevant = relevantForQuery(qrels, queryId);
  const index = results.findIndex((result) => relevant.has(result.documentId));
  return index === -1 ? 0 : 1 / (index + 1);
};

export const scoreQuery = (
  results: ReadonlyArray<QueryResult>,
  qrels: ReadonlyArray<RelevanceJudgment>,
  queryId: string,
  k: number,
): RetrievalMetricValues => ({
  recallAtK: recallAtK(results, qrels, queryId, k),
  ndcgAtK: ndcgAtK(results, qrels, queryId, k),
  mrr: reciprocalRank(results, qrels, queryId),
});

export const averageRetrievalMetrics = (
  metrics: ReadonlyArray<RetrievalMetricValues>,
): RetrievalMetricValues => {
  if (metrics.length === 0) {
    return { recallAtK: 0, ndcgAtK: 0, mrr: 0 };
  }
  return {
    recallAtK: average(metrics.map((metric) => metric.recallAtK)),
    ndcgAtK: average(metrics.map((metric) => metric.ndcgAtK)),
    mrr: average(metrics.map((metric) => metric.mrr)),
  };
};

export const summarizeRetrievalMetrics = (
  queryMetrics: ReadonlyArray<RetrievalMetricValues>,
  trialMetrics: ReadonlyArray<RetrievalMetricValues>,
  intervalNote: string,
): RetrievalMetrics => {
  const summary = averageRetrievalMetrics(queryMetrics);
  const recallSuccesses = queryMetrics.filter(
    (metric) => metric.recallAtK > 0,
  ).length;
  const trialCount = Math.max(1, trialMetrics.length);
  const spread =
    trialMetrics.length > 1
      ? {
          recallAtK: stdDev(trialMetrics.map((metric) => metric.recallAtK)),
          ndcgAtK: stdDev(trialMetrics.map((metric) => metric.ndcgAtK)),
          mrr: stdDev(trialMetrics.map((metric) => metric.mrr)),
        }
      : undefined;
  return {
    ...summary,
    recallAtKCi95: wilsonInterval(recallSuccesses, queryMetrics.length),
    ndcgAtKCi95: normalInterval(queryMetrics.map((metric) => metric.ndcgAtK)),
    mrrCi95: normalInterval(queryMetrics.map((metric) => metric.mrr)),
    queryCount: queryMetrics.length,
    trialCount,
    trialStdDev: spread,
    intervalNote,
  };
};
