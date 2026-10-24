import type { ExpectedMetric } from "./types";

export type MetricVerdict =
  /** Met the threshold, or missed it by no more than the tolerance. */
  | "pass"
  | "fail"
  /** No threshold declared; the value is reported, not gated. */
  | "observed"
  /** No value and `onMissing: "fail"` (the default). */
  | "missing-fail"
  /** No value and `onMissing: "exclude"`; left out of the verdict. */
  | "missing-excluded";

/** Slack in the metric's unit; zero when no tolerance is declared. */
export const toleranceMargin = (metric: ExpectedMetric): number => {
  const { tolerance, threshold } = metric;
  if (tolerance === undefined || threshold === undefined) return 0;
  return tolerance.kind === "absolute"
    ? tolerance.value
    : Math.abs(threshold) * tolerance.value;
};

/** Judge one measured value against its metric. `undefined`, `null` and
 * non-finite numbers all count as missing; they are never read as zero. */
export const evaluateMetric = (
  metric: ExpectedMetric,
  value: number | null | undefined,
): MetricVerdict => {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return (metric.onMissing ?? "fail") === "exclude"
      ? "missing-excluded"
      : "missing-fail";
  }
  if (metric.threshold === undefined) return "observed";
  const margin = toleranceMargin(metric);
  const met =
    metric.direction === "higher-is-better"
      ? value >= metric.threshold - margin
      : value <= metric.threshold + margin;
  return met ? "pass" : "fail";
};
