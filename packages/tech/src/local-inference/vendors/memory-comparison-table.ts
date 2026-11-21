import type { StrataMemoryMeasurement } from "./strata-memory";

export type MemoryComparisonRow = Readonly<{
  engine: string;
  hostRamPeak: StrataMemoryMeasurement;
  gpuVramPeak: StrataMemoryMeasurement;
}>;

function escape(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function cell(measurement: StrataMemoryMeasurement): string {
  return measurement.value === null
    ? `(${measurement.reason})`
    : `${measurement.value.toFixed(1)} ${measurement.unit}`;
}

function renderRow(row: MemoryComparisonRow): string {
  const cells = [
    escape(row.engine),
    cell(row.hostRamPeak),
    cell(row.gpuVramPeak),
  ];
  return `| ${cells.join(" | ")} |`;
}

/**
 * Renders normalized peak-memory readings (e.g. from `normalizeStrataMemory`)
 * as a deterministic Markdown table, one row per engine. Rows keep the
 * caller's order; missing or failed readings show their reason code instead
 * of a number, and a measured zero renders as `0.0 MiB`. Cell text is
 * escaped so an engine name cannot break the table structure.
 */
export function renderMemoryComparisonTable(
  rows: readonly MemoryComparisonRow[],
): string {
  const header = "| Engine | Host RAM peak | GPU VRAM peak |";
  const divider = "| --- | --- | --- |";
  return [header, divider, ...rows.map(renderRow)].join("\n");
}
