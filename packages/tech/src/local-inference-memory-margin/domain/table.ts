import type { EngineMemoryMarginRow, FixedCapacityTier } from "./types";
import { computeMemoryMarginFromRawCapacity } from "./margin";

function escape(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function marginCell(
  row: EngineMemoryMarginRow,
  tiers?: ReadonlyArray<FixedCapacityTier>,
  toleranceRatio?: number,
): string {
  const margin = computeMemoryMarginFromRawCapacity(
    row.peak,
    row.rawTotalMiB,
    tiers,
    toleranceRatio,
  );
  if (margin.status === "undetermined") return `(${margin.reason})`;
  const tierLabel = margin.tier.label;
  if (margin.status === "ok") {
    const headroom = margin.marginMiB.toFixed(1);
    return `+${headroom} MiB margin (${tierLabel})`;
  }
  const over = Math.abs(margin.marginMiB).toFixed(1);
  return `insufficient — ${over} MiB over ${tierLabel}`;
}

/**
 * Renders one deterministic Markdown table joining, per engine, a
 * caller-supplied speed cell and quality cell (already formatted; this
 * module neither measures nor judges either) with the memory headroom this
 * module computes from `rawTotalMiB` and `peak`. Row order is the caller's.
 * Cell text is escaped so an engine name cannot break the table structure.
 */
export function renderMemoryMarginTable(
  rows: ReadonlyArray<EngineMemoryMarginRow>,
  tiers?: ReadonlyArray<FixedCapacityTier>,
  toleranceRatio?: number,
): string {
  const header = ["Engine", "Speed", "Quality", "Memory margin"];
  const divider = header.map(() => "---");
  const body = rows.map((row) => {
    const cells = [
      escape(row.engine),
      escape(row.speed),
      escape(row.quality),
      marginCell(row, tiers, toleranceRatio),
    ];
    return `| ${cells.join(" | ")} |`;
  });
  return [
    `| ${header.join(" | ")} |`,
    `| ${divider.join(" | ")} |`,
    ...body,
  ].join("\n");
}
