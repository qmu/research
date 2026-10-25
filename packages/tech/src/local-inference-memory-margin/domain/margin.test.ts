import { describe, expect, it } from "vitest";
import {
  computeMemoryMargin,
  computeMemoryMarginFromRawCapacity,
} from "./margin";
import type { FixedCapacityTier, MemoryReading } from "./types";

const TIER_16G: FixedCapacityTier = { label: "16 GiB", totalMiB: 16384 };

describe("computeMemoryMargin", () => {
  it("reports positive headroom under the tier as ok", () => {
    const reading: MemoryReading = { value: 10000, unit: "MiB" };
    const margin = computeMemoryMargin(reading, TIER_16G);
    expect(margin).toEqual({
      status: "ok",
      marginMiB: 6384,
      tier: TIER_16G,
    });
  });

  it("reports a peak exactly at the tier as ok, zero margin", () => {
    const reading: MemoryReading = { value: 16384, unit: "MiB" };
    expect(computeMemoryMargin(reading, TIER_16G)).toEqual({
      status: "ok",
      marginMiB: 0,
      tier: TIER_16G,
    });
  });

  it("reports a peak over the tier as insufficient, a negative number", () => {
    const reading: MemoryReading = { value: 18000, unit: "MiB" };
    expect(computeMemoryMargin(reading, TIER_16G)).toEqual({
      status: "insufficient",
      marginMiB: -1616,
      tier: TIER_16G,
    });
  });

  it("propagates a missing reading's reason, never as zero use", () => {
    const reading: MemoryReading = {
      value: null,
      unit: "MiB",
      reason: "NOT-RUN",
    };
    expect(computeMemoryMargin(reading, TIER_16G)).toEqual({
      status: "undetermined",
      reason: "NOT-RUN",
      tier: TIER_16G,
    });
  });

  it("propagates MEASURE-FAILED distinctly from NO-FIELD", () => {
    const reading: MemoryReading = {
      value: null,
      unit: "MiB",
      reason: "MEASURE-FAILED",
    };
    expect(computeMemoryMargin(reading, TIER_16G)).toMatchObject({
      status: "undetermined",
      reason: "MEASURE-FAILED",
    });
  });
});

describe("computeMemoryMarginFromRawCapacity", () => {
  it("buckets the raw capacity then computes margin against that tier", () => {
    const reading: MemoryReading = { value: 10000, unit: "MiB" };
    expect(computeMemoryMarginFromRawCapacity(reading, 16100)).toEqual({
      status: "ok",
      marginMiB: 6384,
      tier: { label: "16 GiB", totalMiB: 16384 },
    });
  });

  it("is undetermined/NO-TIER when the raw capacity matches no tier", () => {
    const reading: MemoryReading = { value: 10000, unit: "MiB" };
    expect(computeMemoryMarginFromRawCapacity(reading, 40000)).toEqual({
      status: "undetermined",
      reason: "NO-TIER",
      tier: null,
    });
  });

  it("reports NO-TIER even when the reading itself is also missing", () => {
    const reading: MemoryReading = {
      value: null,
      unit: "MiB",
      reason: "NO-FIELD",
    };
    // The capacity bucket is checked first; a missing capacity never
    // resolves to the reading's own reason code, so the two failure modes
    // stay distinguishable.
    expect(computeMemoryMarginFromRawCapacity(reading, 40000)).toEqual({
      status: "undetermined",
      reason: "NO-TIER",
      tier: null,
    });
  });
});
