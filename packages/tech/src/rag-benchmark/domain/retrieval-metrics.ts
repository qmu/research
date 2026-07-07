import type { QueryResult, RelevanceJudgment, RetrievalMetrics } from "./types";

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
  const hits = [...relevant.keys()].filter((documentId) =>
    retrieved.has(documentId),
  ).length;
  return hits / relevant.size;
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
): RetrievalMetrics => ({
  recallAtK: recallAtK(results, qrels, queryId, k),
  ndcgAtK: ndcgAtK(results, qrels, queryId, k),
  mrr: reciprocalRank(results, qrels, queryId),
});

export const averageRetrievalMetrics = (
  metrics: ReadonlyArray<RetrievalMetrics>,
): RetrievalMetrics => {
  if (metrics.length === 0) {
    return { recallAtK: 0, ndcgAtK: 0, mrr: 0 };
  }
  const total = metrics.reduce(
    (acc, metric) => ({
      recallAtK: acc.recallAtK + metric.recallAtK,
      ndcgAtK: acc.ndcgAtK + metric.ndcgAtK,
      mrr: acc.mrr + metric.mrr,
    }),
    { recallAtK: 0, ndcgAtK: 0, mrr: 0 },
  );
  return {
    recallAtK: total.recallAtK / metrics.length,
    ndcgAtK: total.ndcgAtK / metrics.length,
    mrr: total.mrr / metrics.length,
  };
};
