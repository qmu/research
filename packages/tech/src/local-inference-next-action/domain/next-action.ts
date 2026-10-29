/**
 * Mirrors the public `ComparisonMetric` / `MissingReason` shape that
 * qmu/research#253's `comparisonMissingReasons` boundary returns, without
 * importing its unmerged code, so this module carries no dependency on
 * another open PR's branch.
 */
export const METRIC_ORDER = ["speed", "quality", "memory"] as const;
export type ComparisonMetric = (typeof METRIC_ORDER)[number];
export type MissingReason = "unsupported" | "failed" | "not-recorded";

export interface MissingMetric {
  metric: ComparisonMetric;
  reason: MissingReason;
}

export interface NextAction {
  label: string;
  detail: string;
  anchor: string;
}

const NEXT_ACTION_BY_REASON: Record<MissingReason, NextAction> = {
  unsupported: {
    label: "Check engine support",
    detail:
      "This engine does not measure this metric. Read its documented capability notes before comparing it on this axis.",
    anchor: "unsupported",
  },
  failed: {
    label: "Check the saved failure evidence",
    detail:
      "Measurement was attempted and failed. Read the saved failure evidence (exit code, truncated output) already recorded for this run.",
    anchor: "failed",
  },
  "not-recorded": {
    label: "Check the recording backlog",
    detail:
      "No measurement was recorded yet. Check whether this metric is scheduled for this engine before treating its absence as a result.",
    anchor: "not-recorded",
  },
};

function isComparisonMetric(value: unknown): value is ComparisonMetric {
  return (
    typeof value === "string" &&
    (METRIC_ORDER as readonly string[]).includes(value)
  );
}

/**
 * One safe, read-only next action for a single missing metric. Never a
 * reproduction/remeasurement trigger — see the package README.
 */
export function safeNextAction(missing: MissingMetric): NextAction {
  if (typeof missing !== "object" || missing === null) {
    throw new TypeError("Invalid missing metric");
  }
  if (!isComparisonMetric(missing.metric)) {
    throw new TypeError(`Invalid metric: ${String(missing.metric)}`);
  }
  const action = Object.hasOwn(NEXT_ACTION_BY_REASON, missing.reason)
    ? NEXT_ACTION_BY_REASON[missing.reason]
    : undefined;
  if (!action) {
    throw new TypeError(`Invalid missing reason: ${missing.metric}`);
  }
  return { ...action };
}
