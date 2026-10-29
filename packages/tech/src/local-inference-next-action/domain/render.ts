import {
  METRIC_ORDER,
  safeNextAction,
  type ComparisonMetric,
  type MissingMetric,
} from "./next-action.js";

const METRIC_LABEL: Record<ComparisonMetric, string> = {
  speed: "Speed",
  quality: "Quality",
  memory: "Memory",
};

/**
 * Renders a fixed-order Markdown table — one row per missing metric, each
 * with exactly one safe next action — for a hosting adoption page. Order is
 * always speed → quality → memory, independent of `missing`'s own order.
 * Returns "" for an empty list: this function records no adoption verdict.
 */
export function renderMissingMetricNextActions(
  missing: readonly MissingMetric[],
): string {
  if (!Array.isArray(missing)) {
    throw new TypeError("Invalid missing metric list");
  }
  if (missing.length === 0) return "";

  const seen = new Set<ComparisonMetric>();
  for (const entry of missing) {
    if (typeof entry !== "object" || entry === null) {
      throw new TypeError("Invalid missing metric entry");
    }
    if (seen.has(entry.metric)) {
      throw new TypeError(`Duplicate metric: ${String(entry.metric)}`);
    }
    seen.add(entry.metric);
  }

  const rows = METRIC_ORDER.filter((metric) => seen.has(metric)).map(
    (metric) => {
      const entry = missing.find((candidate) => candidate.metric === metric);
      if (!entry) throw new TypeError(`Missing metric: ${metric}`);
      const action = safeNextAction(entry);
      return `| ${METRIC_LABEL[metric]} | ${entry.reason} | [${action.label}](#${action.anchor}) — ${action.detail} |`;
    },
  );

  if (rows.length !== missing.length) {
    throw new TypeError("Invalid metric in missing metric list");
  }

  return [
    "| Metric | Missing reason | Safe next action |",
    "| --- | --- | --- |",
    ...rows,
  ].join("\n");
}
