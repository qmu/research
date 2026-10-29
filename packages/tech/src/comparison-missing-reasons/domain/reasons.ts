/** Canonical order shared by callers, independent of JSON property order. */
export const METRIC_ORDER = ["speed", "quality", "memory"] as const;
export type ComparisonMetric = (typeof METRIC_ORDER)[number];
export type MissingReason = "unsupported" | "failed" | "not-recorded";
export type MetricEvidence =
  | { value: number; missingReason?: never }
  | { value: null; missingReason: MissingReason };
export type ComparisonEvidence = Record<ComparisonMetric, MetricEvidence>;
export interface ComparisonMissingReason {
  metric: ComparisonMetric;
  reason: MissingReason;
}

/**
 * Validate the normalized evidence boundary before returning any result.
 * This API does not infer failure causes, calculate adoption, or expose values.
 */
export function comparisonMissingReasons(
  evidence: ComparisonEvidence,
): ComparisonMissingReason[] {
  if (typeof evidence !== "object" || evidence === null) {
    throw new TypeError("Invalid comparison evidence");
  }
  const result: ComparisonMissingReason[] = [];
  for (const metric of METRIC_ORDER) {
    if (!Object.hasOwn(evidence, metric)) {
      throw new TypeError(`Missing comparison metric: ${metric}`);
    }
    const entry = evidence[metric];
    if (
      typeof entry !== "object" ||
      entry === null ||
      !Object.hasOwn(entry, "value")
    ) {
      throw new TypeError(`Invalid comparison metric: ${metric}`);
    }
    if (entry.value === null) {
      if (
        !Object.hasOwn(entry, "missingReason") ||
        !["unsupported", "failed", "not-recorded"].includes(entry.missingReason)
      ) {
        throw new TypeError(`Invalid missing reason: ${metric}`);
      }
      result.push({ metric, reason: entry.missingReason });
    } else if (
      typeof entry.value !== "number" ||
      !Number.isFinite(entry.value) ||
      entry.value < 0 ||
      Object.hasOwn(entry, "missingReason")
    ) {
      throw new TypeError(`Invalid measured value: ${metric}`);
    }
  }
  return result;
}
