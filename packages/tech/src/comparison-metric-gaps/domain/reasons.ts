/** Normalized evidence supplied by a trusted adapter; no raw errors are accepted. */
export type MetricEvidence =
  | Readonly<{ status: "measured"; value: number }>
  | Readonly<{ status: "unsupported" | "failed" | "not-recorded" }>;

export type ComparisonMetricEvidence = Readonly<{
  speed?: MetricEvidence;
  quality?: MetricEvidence;
  memory?: MetricEvidence;
}>;

export type MetricGapReason = Readonly<{
  metric: "speed" | "quality" | "memory";
  code: "unsupported" | "failed" | "not-recorded" | "invalid-value";
}>;

/**
 * Return only gaps, always speed → quality → memory. Values must be finite and
 * nonnegative; zero is valid. This does not decide adoption or verify provenance.
 * Unknown states throw rather than silently becoming eligible measurements.
 */
function metricGapReasons(
  evidence: ComparisonMetricEvidence,
): MetricGapReason[] {
  return (["speed", "quality", "memory"] as const).flatMap<MetricGapReason>(
    (metric) => {
      const item = evidence[metric];
      if (item === undefined)
        return [{ metric, code: "not-recorded" as const }];
      if (item.status === "measured") {
        return Number.isFinite(item.value) && item.value >= 0
          ? []
          : [{ metric, code: "invalid-value" }];
      }
      if (
        item.status === "unsupported" ||
        item.status === "failed" ||
        item.status === "not-recorded"
      ) {
        return [{ metric, code: item.status }];
      }
      throw new TypeError("Unknown comparison metric evidence status");
    },
  );
}

export type ComparisonPairGapReason = MetricGapReason &
  Readonly<{ side: "baseline" | "candidate" }>;

/** Compare both sides without allowing one side's evidence to fill the other. */
export function comparisonPairGapReasons(
  pair: Readonly<{
    baseline: ComparisonMetricEvidence;
    candidate: ComparisonMetricEvidence;
  }>,
): ComparisonPairGapReason[] {
  const baseline = metricGapReasons(pair.baseline);
  const candidate = metricGapReasons(pair.candidate);
  return (["speed", "quality", "memory"] as const).flatMap((metric) =>
    (["baseline", "candidate"] as const).flatMap((side) =>
      (side === "baseline" ? baseline : candidate)
        .filter((reason) => reason.metric === metric)
        .map((reason) => ({ ...reason, side })),
    ),
  );
}
