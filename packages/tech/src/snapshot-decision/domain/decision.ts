/** An offline API: callers supply normalized snapshot evidence and explicit policy. */
export type SnapshotEvidence = Readonly<{
  source: "measured" | "fixture";
  latencyMs?: number;
  qualityScore?: number;
  peakMemoryBytes?: number;
}>;

export type SnapshotPolicy = Readonly<{
  maxLatencyMs: number;
  minQualityScore: number;
  maxPeakMemoryBytes: number;
}>;

export type DecisionReason = Readonly<{
  factor: "speed" | "quality" | "peak-memory" | "missing-evidence";
  code: "pass" | "threshold-failed" | "missing" | "invalid" | "fixture";
}>;

export type SnapshotDecision = Readonly<{
  adopted: boolean;
  reasons: readonly DecisionReason[];
}>;

const validMetric = (value: number): boolean =>
  Number.isFinite(value) && value >= 0;

/**
 * Return all reasons in speed → quality → peak memory → missing evidence order.
 * Scores use the caller's scale. Equality passes; absent, invalid or fixture
 * evidence never qualifies. Invalid policy throws instead of deciding silently.
 * No I/O, defaults, ranking, provenance verification, or report integration.
 */
export const decideSnapshot = (
  snapshot: SnapshotEvidence,
  policy: SnapshotPolicy,
): SnapshotDecision => {
  if (
    !validMetric(policy.maxLatencyMs) ||
    !validMetric(policy.minQualityScore) ||
    !validMetric(policy.maxPeakMemoryBytes)
  ) {
    throw new RangeError(
      "Snapshot policy requires finite non-negative thresholds",
    );
  }

  const check = (
    factor: DecisionReason["factor"],
    value: number | undefined,
    passes: (value: number) => boolean,
  ): DecisionReason => ({
    factor,
    code:
      value === undefined
        ? "missing"
        : !validMetric(value)
          ? "invalid"
          : passes(value)
            ? "pass"
            : "threshold-failed",
  });
  const metrics = [
    check("speed", snapshot.latencyMs, (v) => v <= policy.maxLatencyMs),
    check("quality", snapshot.qualityScore, (v) => v >= policy.minQualityScore),
    check(
      "peak-memory",
      snapshot.peakMemoryBytes,
      (v) => v <= policy.maxPeakMemoryBytes,
    ),
  ];
  const evidence: DecisionReason = {
    factor: "missing-evidence",
    code:
      snapshot.source !== "measured"
        ? "fixture"
        : metrics.some((reason) => reason.code === "invalid")
          ? "invalid"
          : metrics.some((reason) => reason.code === "missing")
            ? "missing"
            : "pass",
  };
  const reasons = [...metrics, evidence];
  return {
    adopted: reasons.every((reason) => reason.code === "pass"),
    reasons,
  };
};
