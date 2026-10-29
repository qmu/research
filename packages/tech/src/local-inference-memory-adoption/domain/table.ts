import type { MemoryUseCase, PeakMemoryReading } from "./types";
import { evaluateMemoryAdoptionForAllUseCases } from "./evaluate";

export type EngineMemoryRow = Readonly<{
  engine: string;
  hostRamPeak: PeakMemoryReading;
  gpuVramPeak: PeakMemoryReading;
}>;

function escape(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function readingCell(reading: PeakMemoryReading): string {
  return reading.value === null
    ? `(${reading.reason})`
    : `${reading.value.toFixed(1)} ${reading.unit}`;
}

/**
 * Renders normalized peak-memory readings (e.g. qmu/research#211's
 * `host_ram_peak` / `gpu_vram_peak`) alongside their adoption verdict for
 * each use case in `useCases` (ceilings from `use-cases.json`), as one
 * deterministic Markdown table. Row order is the caller's; use-case column
 * order is `useCases`'s. A missing or failed reading shows its reason code
 * instead of a number, and makes every use-case column for that row read
 * "undetermined" unless the other metric already rejects it — never
 * "adopt". Cell text is escaped so an engine name cannot break the table.
 */
export function renderMemoryAdoptionTable(
  rows: ReadonlyArray<EngineMemoryRow>,
  useCases: ReadonlyArray<MemoryUseCase>,
): string {
  const header = [
    "Engine",
    "Host RAM peak",
    "GPU VRAM peak",
    ...useCases.map((useCase) => useCase.label),
  ];
  const divider = header.map(() => "---");
  const body = rows.map((row) => {
    const verdicts = evaluateMemoryAdoptionForAllUseCases(
      useCases,
      row.hostRamPeak,
      row.gpuVramPeak,
    );
    const cells = [
      escape(row.engine),
      readingCell(row.hostRamPeak),
      readingCell(row.gpuVramPeak),
      ...verdicts.map((verdict) => verdict.decision),
    ];
    return `| ${cells.join(" | ")} |`;
  });
  return [
    `| ${header.join(" | ")} |`,
    `| ${divider.join(" | ")} |`,
    ...body,
  ].join("\n");
}
