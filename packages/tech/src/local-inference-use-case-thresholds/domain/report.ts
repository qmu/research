import type { AdoptionVerdict, RuleVerdict } from "./types.js";

function formatReading(verdict: RuleVerdict): string {
  const { reading, rule } = verdict;
  if (reading.value === null) return `${rule.metric}=(${reading.reason})`;
  return `${rule.metric}=${reading.value}${reading.unit}`;
}

function formatRule(verdict: RuleVerdict): string {
  const mark =
    verdict.outcome === "pass"
      ? "ok"
      : verdict.outcome === "fail"
        ? "FAIL"
        : "?";
  const comparator = verdict.rule.direction === "lower-is-better" ? "<=" : ">=";
  const boundary = `${comparator}${verdict.rule.threshold}${verdict.rule.unit}`;
  return `${formatReading(verdict)}[${boundary}:${mark}]`;
}

/** Renders one use case's per-engine verdicts as a plain-text table, e.g. for a
 * terminal or a committed command-output artifact. Pure function of its input —
 * no I/O, no clock. */
export function renderVerdictTable(
  useCaseLabel: string,
  verdicts: ReadonlyArray<AdoptionVerdict>,
): string {
  const lines = [`## ${useCaseLabel}`, ""];
  for (const verdict of verdicts) {
    lines.push(`- ${verdict.engine}: ${verdict.decision}`);
    for (const rule of verdict.rules) lines.push(`    ${formatRule(rule)}`);
  }
  return lines.join("\n");
}
