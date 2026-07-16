import { describe, expect, it } from "vitest";
import {
  aggregateRunStats,
  costFromTokens,
  meanActionLatencyMs,
  summarizeStat,
} from "./score";
import { TASK_SUITE } from "./manifest";
import type { ComputerUseCallRecord } from "./types";

const record = (
  over: Partial<ComputerUseCallRecord>,
): ComputerUseCallRecord => ({
  taskId: "t",
  category: "navigation",
  repetition: 0,
  succeeded: true,
  steps: 4,
  wallClockMs: 1000,
  latencyPerActionMs: 50,
  costUsd: 0.5,
  recovered: false,
  ...over,
});

describe("costFromTokens", () => {
  it("prices input and output tokens at per-MTok rates", () => {
    // 1M input @ $3 + 0.5M output @ $15 = 3 + 7.5
    expect(costFromTokens(1_000_000, 500_000, 3, 15)).toBeCloseTo(10.5);
  });

  it("is zero for no tokens", () => {
    expect(costFromTokens(0, 0, 3, 15)).toBe(0);
  });
});

describe("meanActionLatencyMs", () => {
  it("averages per-action latencies", () => {
    expect(meanActionLatencyMs([40, 60, 50])).toBeCloseTo(50);
  });

  it("scores an empty trajectory as zero rather than dividing by zero", () => {
    expect(meanActionLatencyMs([])).toBe(0);
  });
});

describe("summarizeStat", () => {
  it("returns zeros for no samples and stdDev 0 for one sample", () => {
    expect(summarizeStat([])).toEqual({ mean: 0, stdDev: 0, n: 0 });
    expect(summarizeStat([5])).toEqual({ mean: 5, stdDev: 0, n: 1 });
  });

  it("computes mean and sample standard deviation", () => {
    const stat = summarizeStat([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(stat.mean).toBeCloseTo(5);
    expect(stat.stdDev).toBeCloseTo(2.138, 3);
    expect(stat.n).toBe(8);
  });
});

describe("aggregateRunStats", () => {
  it("reads success and recovery rates as [0,1] means of indicators", () => {
    const stats = aggregateRunStats([
      record({ succeeded: true, recovered: true }),
      record({ succeeded: false, recovered: false }),
      record({ succeeded: true, recovered: false }),
      record({ succeeded: true, recovered: false }),
    ]);
    expect(stats.taskSuccessRate.mean).toBeCloseTo(0.75);
    expect(stats.taskSuccessRate.n).toBe(4);
    expect(stats.recoveryRate.mean).toBeCloseTo(0.25);
  });

  it("measures steps-to-complete over successful attempts only", () => {
    const stats = aggregateRunStats([
      record({ succeeded: true, steps: 4 }),
      record({ succeeded: false, steps: 20 }),
      record({ succeeded: true, steps: 6 }),
    ]);
    // The failed 20-step attempt is excluded from the solve-cost average.
    expect(stats.stepsToComplete.mean).toBeCloseTo(5);
    expect(stats.stepsToComplete.n).toBe(2);
  });

  it("spans every attempt for latency, wall-clock, and cost", () => {
    const stats = aggregateRunStats([
      record({ succeeded: false, wallClockMs: 1000, costUsd: 0.2 }),
      record({ succeeded: true, wallClockMs: 3000, costUsd: 0.4 }),
    ]);
    expect(stats.wallClockPerTaskMs.mean).toBeCloseTo(2000);
    expect(stats.wallClockPerTaskMs.n).toBe(2);
    expect(stats.costPerTaskUsd.mean).toBeCloseTo(0.3);
  });

  it("yields an all-zero success stat for no attempts (error rows)", () => {
    const stats = aggregateRunStats([]);
    expect(stats.taskSuccessRate).toEqual({ mean: 0, stdDev: 0, n: 0 });
    expect(stats.stepsToComplete).toEqual({ mean: 0, stdDev: 0, n: 0 });
  });
});

describe("task suite manifest", () => {
  it("gives every task a unique id, a start path, and a predicate target", () => {
    for (const task of TASK_SUITE.tasks) {
      expect(task.startPath.startsWith("/"), task.id).toBe(true);
      expect(task.successPredicate.detail.length, task.id).toBeGreaterThan(0);
      expect(task.optimalSteps, task.id).toBeGreaterThan(0);
    }
    const ids = TASK_SUITE.tasks.map((task) => task.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
