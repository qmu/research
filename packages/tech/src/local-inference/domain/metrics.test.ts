import { describe, expect, it } from "vitest";
import { metrics } from "./result.js";

describe("metrics", () => {
  it("derives TTFT in seconds and tps from client timing and usage tokens", () => {
    const result = metrics({ firstMs: 250, lastMs: 750, completionTokens: 10 });
    expect(result.ttft).toEqual({ value: 0.25, unit: "s", source: "client" });
    expect(result.completion_tokens).toEqual({
      value: 10,
      unit: "tokens",
      source: "usage",
    });
    expect(result.tps).toEqual({
      value: 20,
      unit: "tokens/s",
      source: "client",
    });
  });

  it("marks every observed field MEASURE-FAILED when the request failed", () => {
    const result = metrics(
      { firstMs: 250, lastMs: 750, completionTokens: 10 },
      true,
    );
    for (const key of ["ttft", "completion_tokens", "tps"] as const) {
      expect(result[key]).toMatchObject({
        value: null,
        reason: "MEASURE-FAILED",
      });
    }
  });

  it("marks missing observations NO-FIELD instead of filling zero", () => {
    const result = metrics({});
    for (const key of ["ttft", "completion_tokens", "tps"] as const) {
      expect(result[key]).toMatchObject({ value: null, reason: "NO-FIELD" });
    }
  });

  it("leaves tps missing but keeps TTFT when last time is not after first time", () => {
    const result = metrics({ firstMs: 500, lastMs: 500, completionTokens: 4 });
    expect(result.ttft).toMatchObject({ value: 0.5 });
    expect(result.tps).toMatchObject({ value: null, reason: "NO-FIELD" });
  });

  it("keeps a measured zero TTFT as a value, not a gap", () => {
    const result = metrics({ firstMs: 0 });
    expect(result.ttft).toEqual({ value: 0, unit: "s", source: "client" });
  });

  it("always reports startup time and peak RSS as NOT-RUN", () => {
    for (const failed of [false, true]) {
      const result = metrics({ firstMs: 1, lastMs: 2, completionTokens: 1 }, failed);
      expect(result.startup_time).toEqual({
        value: null,
        unit: "s",
        reason: "NOT-RUN",
      });
      expect(result.peak_rss).toEqual({
        value: null,
        unit: "MiB",
        reason: "NOT-RUN",
      });
    }
  });
});
