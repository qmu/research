import { describe, expect, it } from "vitest";
import { average, normalInterval, stdDev, wilsonInterval } from "./aggregate";
import { percentile, summarizeOperationalTrials } from "./operational";

describe("percentile", () => {
  it("returns nearest-rank percentiles", () => {
    expect(percentile([5, 1, 9, 3], 50)).toBe(3);
    expect(percentile([5, 1, 9, 3], 95)).toBe(9);
  });

  it("returns zero for an empty sample", () => {
    expect(percentile([], 95)).toBe(0);
  });
});

describe("aggregate helpers", () => {
  it("computes sample average and standard deviation", () => {
    expect(average([2, 4, 4, 4, 5, 5, 7, 9])).toBe(5);
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
  });

  it("computes Wilson and normal 95% intervals", () => {
    expect(wilsonInterval(50, 100).lower).toBeCloseTo(0.404, 3);
    expect(wilsonInterval(50, 100).upper).toBeCloseTo(0.596, 3);
    expect(normalInterval([0, 0.5, 0.5, 1]).lower).toBeCloseTo(0.1, 1);
    expect(normalInterval([0, 0.5, 0.5, 1]).upper).toBeCloseTo(0.9, 1);
  });
});

describe("summarizeOperationalTrials", () => {
  it("reports mean plus trial standard deviation", () => {
    const summary = summarizeOperationalTrials([
      { ingestMs: 10, queryLatencyMs: [1, 2, 3], costUsd: 0.1, maxScale: 5 },
      { ingestMs: 14, queryLatencyMs: [2, 4, 6], costUsd: 0.1, maxScale: 5 },
    ]);
    expect(summary.ingestMs).toBe(12);
    expect(summary.ingestMsStdDev).toBeCloseTo(2.828, 3);
    expect(summary.queryLatencyP50Ms).toBe(3);
    expect(summary.queryLatencyP50MsStdDev).toBeCloseTo(1.414, 3);
    expect(summary.costUsd).toBe(0.2);
    expect(summary.trialCount).toBe(2);
  });
});
