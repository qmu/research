import { describe, expect, it } from "vitest";
import {
  coldStartValues,
  median,
  percentile,
  summarizeStat,
  taskCostUsd,
} from "./probe";
import type { ProbeSample, SandboxProviderCard } from "./types";

describe("percentile", () => {
  it("returns 0 for an empty vector", () => {
    expect(percentile([], 0.5)).toBe(0);
  });

  it("computes nearest-rank percentiles", () => {
    const values = [10, 20, 30, 40, 50];
    expect(percentile(values, 0.5)).toBe(30);
    expect(percentile(values, 0.95)).toBe(50);
    expect(percentile(values, 0)).toBe(10);
  });

  it("is order-independent", () => {
    expect(percentile([50, 10, 40, 20, 30], 0.5)).toBe(30);
  });

  it("clamps p outside [0,1]", () => {
    expect(percentile([1, 2, 3], 2)).toBe(3);
    expect(percentile([1, 2, 3], -1)).toBe(1);
  });
});

describe("summarizeStat", () => {
  it("returns all-zero for n=0", () => {
    expect(summarizeStat([])).toEqual({ mean: 0, stdDev: 0, n: 0 });
  });

  it("returns stdDev 0 for a single sample", () => {
    expect(summarizeStat([42])).toEqual({ mean: 42, stdDev: 0, n: 1 });
  });

  it("computes sample mean and standard deviation", () => {
    const stat = summarizeStat([2, 4, 6]);
    expect(stat.mean).toBe(4);
    expect(stat.n).toBe(3);
    expect(stat.stdDev).toBeCloseTo(2, 10);
  });
});

describe("coldStartValues", () => {
  it("projects the coldStartMs field in order", () => {
    const samples: ReadonlyArray<ProbeSample> = [
      { repetition: 1, coldStartMs: 90 },
      { repetition: 2, coldStartMs: 110 },
    ];
    expect(coldStartValues(samples)).toEqual([90, 110]);
  });
});

describe("taskCostUsd", () => {
  const card = {
    id: "x",
    publishedVcpuHourUsd: 0.1,
  } as unknown as SandboxProviderCard;

  it("prices wall-clock vCPU-seconds at the published rate", () => {
    // 3600 ms = 0.001 hour → 0.001 * $0.1 = $0.0001
    expect(taskCostUsd(card, 3600)).toBeCloseTo(0.0001, 12);
  });

  it("is zero for zero wall-clock", () => {
    expect(taskCostUsd(card, 0)).toBe(0);
  });
});

describe("median", () => {
  it("is the p50 nearest-rank value", () => {
    expect(median([3, 1, 2])).toBe(2);
  });
});
