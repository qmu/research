/**
 * Whole-machine peak memory sampled by an external OS-level monitor
 * (/proc/meminfo, nvidia-smi), not the engine's own API telemetry and not a
 * single process's RSS.
 */
export type StrataMemoryMeasurement =
  | { value: number; unit: "MiB"; source: "host-sampler" }
  | { value: null; unit: "MiB"; reason: "NO-FIELD" | "MEASURE-FAILED" };

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function metric(
  value: unknown,
  toMiB: (value: number) => number,
): StrataMemoryMeasurement {
  if (value === null || value === undefined) {
    return { value: null, unit: "MiB", reason: "NO-FIELD" };
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return { value: null, unit: "MiB", reason: "MEASURE-FAILED" };
  }
  return { value: toMiB(value), unit: "MiB", source: "host-sampler" };
}

/**
 * Import one parsed Strata community `memory-summary.json` record. Never
 * derives memory from the engine's own API responses or from per-request
 * timing data.
 */
export function normalizeStrataMemory(record: unknown): {
  host_ram_peak: StrataMemoryMeasurement;
  gpu_vram_peak: StrataMemoryMeasurement;
} {
  const row = object(record);
  return {
    host_ram_peak: metric(row.ram_peak_GiB, (gib) => gib * 1024),
    gpu_vram_peak: metric(row.gpu_peak_MiB, (mib) => mib),
  };
}
