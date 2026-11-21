import { renderMemoryAdoptionTable } from "./table";
import type { MemoryUseCase, PeakMemoryReading } from "./types";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected common inference JSON object");
  return value as Record<string, unknown>;
}

function reading(value: unknown): PeakMemoryReading {
  if (value === undefined)
    return { value: null, unit: "MiB", reason: "NO-FIELD" };
  const metric = object(value);
  if (metric.unit !== "MiB") throw new Error("Peak memory requires MiB");
  if (metric.value === null) {
    const reason = metric.reason;
    if (
      reason !== "NO-FIELD" &&
      reason !== "NOT-RUN" &&
      reason !== "MEASURE-FAILED"
    )
      throw new Error("Invalid peak memory missing reason");
    return { value: null, unit: "MiB", reason };
  }
  if (
    typeof metric.value !== "number" ||
    !Number.isFinite(metric.value) ||
    metric.value < 0
  )
    throw new Error("Invalid peak memory value");
  return { value: metric.value, unit: "MiB" };
}

/** Read only the common envelope and whole-machine peaks; never substitute peak_rss. */
export function renderCommonMemoryAdoptionTable(
  input: unknown,
  useCases: ReadonlyArray<MemoryUseCase>,
): string {
  const result = object(input);
  if (result.schemaVersion !== 1 || !Array.isArray(result.runs))
    throw new Error("Expected common inference JSON schemaVersion 1 and runs");
  const rows = result.runs.map((value: unknown) => {
    const run = object(value);
    if (typeof run.engine !== "string" || !run.engine.trim())
      throw new Error("Expected engine identity");
    const metrics = object(run.metrics);
    return {
      engine: run.engine,
      hostRamPeak: reading(metrics.host_ram_peak),
      gpuVramPeak: reading(metrics.gpu_vram_peak),
    };
  });
  return renderMemoryAdoptionTable(rows, useCases);
}
