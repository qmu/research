import { describe, expect, it } from "vitest";
import {
  ENGINES,
  FAILURE_CODES,
  GAP_REASONS,
  METRICS,
  metricsForDimension,
} from "./types";

describe("fixed classification sets", () => {
  it("names 4 engines, 4 gap reasons and 8 failure codes", () => {
    expect(ENGINES).toHaveLength(4);
    expect(GAP_REASONS).toHaveLength(4);
    expect(FAILURE_CODES).toHaveLength(8);
    expect(new Set(ENGINES).size).toBe(ENGINES.length);
    expect(new Set(GAP_REASONS).size).toBe(GAP_REASONS.length);
    expect(new Set(FAILURE_CODES).size).toBe(FAILURE_CODES.length);
  });

  it("covers every metric with exactly one dimension", () => {
    const covered = new Set([
      ...metricsForDimension("speed"),
      ...metricsForDimension("quality"),
      ...metricsForDimension("memory"),
    ]);
    expect(covered.size).toBe(METRICS.length);
    expect([...covered].sort()).toEqual([...METRICS].sort());
  });
});

describe("metricsForDimension", () => {
  it("groups speed metrics as ttft, tps and startup_time", () => {
    expect(metricsForDimension("speed")).toEqual([
      "ttft",
      "tps",
      "startup_time",
    ]);
  });

  it("groups quality as quality_score only", () => {
    expect(metricsForDimension("quality")).toEqual(["quality_score"]);
  });

  it("groups memory as peak_rss only", () => {
    expect(metricsForDimension("memory")).toEqual(["peak_rss"]);
  });
});
