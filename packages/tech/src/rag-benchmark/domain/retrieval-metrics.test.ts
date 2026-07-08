import { describe, expect, it } from "vitest";
import {
  ndcgAtK,
  recallAtK,
  reciprocalRank,
  scoreQuery,
  summarizeRetrievalMetrics,
} from "./retrieval-metrics";
import type { QueryResult, RelevanceJudgment } from "./types";

const qrels: ReadonlyArray<RelevanceJudgment> = [
  { queryId: "Q1", documentId: "D1", relevance: 2 },
  { queryId: "Q1", documentId: "D2", relevance: 1 },
];

const results: ReadonlyArray<QueryResult> = [
  { documentId: "D3", score: 0.9 },
  { documentId: "D1", score: 0.8 },
  { documentId: "D2", score: 0.7 },
];

describe("retrieval metrics", () => {
  it("computes recall at k", () => {
    expect(recallAtK(results, qrels, "Q1", 1)).toBe(0);
    expect(recallAtK(results, qrels, "Q1", 2)).toBe(1);
    expect(recallAtK(results, qrels, "Q1", 3)).toBe(1);
  });

  it("computes reciprocal rank", () => {
    expect(reciprocalRank(results, qrels, "Q1")).toBe(0.5);
  });

  it("computes nDCG at k with graded relevance", () => {
    expect(ndcgAtK(results, qrels, "Q1", 3)).toBeCloseTo(0.67, 3);
  });

  it("scores a query with all retrieval metrics", () => {
    const metrics = scoreQuery(results, qrels, "Q1", 3);
    expect(metrics.recallAtK).toBe(1);
    expect(metrics.ndcgAtK).toBeCloseTo(0.67, 3);
    expect(metrics.mrr).toBe(0.5);
  });

  it("summarizes query metrics with 95% confidence intervals", () => {
    const queryMetrics = [
      { recallAtK: 1, ndcgAtK: 1, mrr: 1 },
      { recallAtK: 1, ndcgAtK: 0.5, mrr: 0.5 },
      { recallAtK: 0, ndcgAtK: 0, mrr: 0 },
      { recallAtK: 0, ndcgAtK: 0.5, mrr: 0.5 },
    ];
    const summary = summarizeRetrievalMetrics(
      queryMetrics,
      [queryMetrics[0] ?? { recallAtK: 0, ndcgAtK: 0, mrr: 0 }],
      "query sample only",
    );
    expect(summary.recallAtK).toBe(0.5);
    expect(summary.recallAtKCi95.lower).toBeCloseTo(0.15, 2);
    expect(summary.recallAtKCi95.upper).toBeCloseTo(0.85, 2);
    expect(summary.ndcgAtK).toBe(0.5);
    expect(summary.ndcgAtKCi95.lower).toBeCloseTo(0.1, 1);
    expect(summary.ndcgAtKCi95.upper).toBeCloseTo(0.9, 1);
    expect(summary.queryCount).toBe(4);
  });
});
