import { describe, expect, it } from "vitest";
import { peakRssReading, type PeakRss } from "./peak-memory.js";

const base: PeakRss = {
  value: 12288,
  unit: "MiB",
  source: "ps-rss-sampled",
  scope: "single-server-process",
  reason: "SAMPLED",
  samples: 10,
  intervalMs: 50,
};

describe("peakRssReading", () => {
  it("passes a sampled positive value through unchanged", () => {
    expect(peakRssReading(base)).toEqual({ value: 12288, unit: "MiB" });
  });

  it("maps NO-PID and UNSUPPORTED-HOST to NOT-RUN without a value", () => {
    for (const reason of ["NO-PID", "UNSUPPORTED-HOST"] as const) {
      expect(peakRssReading({ ...base, value: null, reason })).toEqual({
        value: null,
        unit: "MiB",
        reason: "NOT-RUN",
      });
    }
  });

  it("maps SAMPLE-FAILED to MEASURE-FAILED without a value", () => {
    expect(
      peakRssReading({ ...base, value: null, reason: "SAMPLE-FAILED" }),
    ).toEqual({ value: null, unit: "MiB", reason: "MEASURE-FAILED" });
  });

  it("never fabricates a value from an unusable SAMPLED reading", () => {
    for (const value of [null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(peakRssReading({ ...base, value })).toEqual({
        value: null,
        unit: "MiB",
        reason: "MEASURE-FAILED",
      });
    }
  });

  it("ignores a stray value when the reason is not SAMPLED", () => {
    expect(peakRssReading({ ...base, reason: "SAMPLE-FAILED" })).toEqual({
      value: null,
      unit: "MiB",
      reason: "MEASURE-FAILED",
    });
  });
});
