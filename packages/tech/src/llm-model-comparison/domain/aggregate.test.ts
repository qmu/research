import { describe, it, expect } from "vitest";
import { mean, stdDev, aggregate, summarizeTrials } from "./aggregate";
import type { TrialResult } from "./types";

describe("mean", () => {
  it("is 0 for an empty sample", () => {
    expect(mean([])).toBe(0);
  });

  it("returns the single value for a one-point sample", () => {
    expect(mean([42])).toBe(42);
  });

  it("averages a multi-point sample", () => {
    expect(mean([16, 12, 16, 12, 16])).toBeCloseTo(14.4, 10);
  });
});

describe("stdDev", () => {
  it("is 0 for an empty sample", () => {
    expect(stdDev([])).toBe(0);
  });

  it("is 0 for a single point (no dispersion definable)", () => {
    expect(stdDev([7])).toBe(0);
  });

  it("is 0 when every value is identical", () => {
    expect(stdDev([5, 5, 5, 5])).toBe(0);
  });

  it("uses the sample (n-1) estimator", () => {
    // Population var of [2,4,4,4,5,5,7,9] is 4; sample var is 32/7.
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(Math.sqrt(32 / 7), 10);
  });
});

describe("aggregate", () => {
  it("is an all-zero, n:0 aggregate for an empty sample", () => {
    expect(aggregate([])).toEqual({
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      n: 0,
    });
  });

  it("records mean, zero spread, extent, and count for identical values", () => {
    expect(aggregate([12, 12, 12])).toEqual({
      mean: 12,
      stdDev: 0,
      min: 12,
      max: 12,
      n: 3,
    });
  });

  it("captures min/max/n alongside the mean", () => {
    const a = aggregate([10, 20, 30]);
    expect(a.mean).toBe(20);
    expect(a.min).toBe(10);
    expect(a.max).toBe(30);
    expect(a.n).toBe(3);
    expect(a.stdDev).toBeCloseTo(10, 10);
  });
});

const trial = (
  n: number,
  ok: boolean,
  tps: number,
  depth: number,
  len: number,
): TrialResult => ({
  trial: n,
  ok,
  error: ok ? null : "boom",
  metrics: {
    tokensPerSecond: tps,
    maxNestedJsonDepth: depth,
    lengthAccuracy: len,
  },
  calls: [],
});

describe("summarizeTrials", () => {
  it("aggregates only the successful trials, excluding failures", () => {
    const trials: TrialResult[] = [
      trial(1, true, 50, 16, 1),
      trial(2, false, 0, 0, 0), // failure — must not drag the mean toward 0
      trial(3, true, 70, 12, 0.9),
    ];
    const stats = summarizeTrials(trials);
    expect(stats.tokensPerSecond.n).toBe(2);
    expect(stats.tokensPerSecond.mean).toBe(60);
    expect(stats.maxNestedJsonDepth.mean).toBe(14);
    expect(stats.lengthAccuracy.mean).toBeCloseTo(0.95, 10);
  });

  it("yields n:0 aggregates when every trial failed", () => {
    const stats = summarizeTrials([trial(1, false, 0, 0, 0)]);
    expect(stats.tokensPerSecond.n).toBe(0);
    expect(stats.maxNestedJsonDepth.n).toBe(0);
    expect(stats.lengthAccuracy.n).toBe(0);
  });
});
