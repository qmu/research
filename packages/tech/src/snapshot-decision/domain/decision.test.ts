import { describe, expect, it } from "vitest";
import {
  decideSnapshot,
  type SnapshotEvidence,
  type SnapshotPolicy,
} from "./decision.js";

const policy: SnapshotPolicy = {
  maxLatencyMs: 2000,
  minQualityScore: 0.8,
  maxPeakMemoryBytes: 1024,
};
const snapshot: SnapshotEvidence = {
  source: "measured",
  latencyMs: 2000,
  qualityScore: 0.8,
  peakMemoryBytes: 1024,
};

describe("decideSnapshot", () => {
  it("accepts inclusive boundaries and returns the fixed public factor order", () => {
    expect(decideSnapshot(snapshot, policy)).toEqual({
      adopted: true,
      reasons: [
        { factor: "speed", code: "pass" },
        { factor: "quality", code: "pass" },
        { factor: "peak-memory", code: "pass" },
        { factor: "missing-evidence", code: "pass" },
      ],
    });
  });

  it("returns every failed threshold without short circuiting", () => {
    const result = decideSnapshot(
      {
        ...snapshot,
        latencyMs: 2001,
        qualityScore: 0.79,
        peakMemoryBytes: 1025,
      },
      policy,
    );
    expect(result.adopted).toBe(false);
    expect(result.reasons.map((r) => r.code)).toEqual([
      "threshold-failed",
      "threshold-failed",
      "threshold-failed",
      "pass",
    ]);
  });

  it.each(["latencyMs", "qualityScore", "peakMemoryBytes"] as const)(
    "rejects missing %s even when the other metrics pass",
    (key) => {
      const input = { ...snapshot };
      delete input[key];
      const result = decideSnapshot(input, policy);
      expect(result.adopted).toBe(false);
      expect(result.reasons.find((r) => r.code === "missing")).toBeDefined();
      expect(result.reasons[3]).toEqual({
        factor: "missing-evidence",
        code: "missing",
      });
    },
  );

  it.each([-1, NaN, Infinity, -Infinity])(
    "rejects invalid metrics %s",
    (value) => {
      const result = decideSnapshot(
        {
          ...snapshot,
          latencyMs: value,
          qualityScore: value,
          peakMemoryBytes: value,
        },
        policy,
      );
      expect(result.adopted).toBe(false);
      expect(result.reasons.map((r) => r.code)).toEqual([
        "invalid",
        "invalid",
        "invalid",
        "invalid",
      ]);
    },
  );

  it("rejects fixture evidence even with passing numbers", () => {
    const result = decideSnapshot({ ...snapshot, source: "fixture" }, policy);
    expect(result.adopted).toBe(false);
    expect(result.reasons[3]?.code).toBe("fixture");
  });

  it("reports all missing metrics for an empty snapshot", () => {
    expect(
      decideSnapshot({ source: "measured" }, policy).reasons.map((r) => r.code),
    ).toEqual(["missing", "missing", "missing", "missing"]);
  });

  it("accepts zero values under an explicit zero policy", () => {
    expect(
      decideSnapshot(
        {
          source: "measured",
          latencyMs: 0,
          qualityScore: 0,
          peakMemoryBytes: 0,
        },
        { maxLatencyMs: 0, minQualityScore: 0, maxPeakMemoryBytes: 0 },
      ).adopted,
    ).toBe(true);
  });

  it.each(["maxLatencyMs", "minQualityScore", "maxPeakMemoryBytes"] as const)(
    "rejects invalid %s policy",
    (key) => {
      for (const value of [-1, NaN, Infinity, -Infinity]) {
        expect(() =>
          decideSnapshot(snapshot, { ...policy, [key]: value }),
        ).toThrow(RangeError);
      }
    },
  );

  it("is deterministic and does not mutate frozen inputs", () => {
    const input = Object.freeze({ ...snapshot });
    const thresholds = Object.freeze({ ...policy });
    const first = decideSnapshot(input, thresholds);
    expect(decideSnapshot(input, thresholds)).toEqual(first);
    expect(input).toEqual(snapshot);
    expect(thresholds).toEqual(policy);
  });
});
