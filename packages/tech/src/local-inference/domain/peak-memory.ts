import type { MemoryReading } from "../../local-inference-memory-margin/domain/types.js";
export type PeakRss = {
  value: number | null;
  unit: "MiB";
  source: "ps-rss-sampled";
  scope: "single-server-process";
  reason: "SAMPLED" | "NO-PID" | "UNSUPPORTED-HOST" | "SAMPLE-FAILED";
  samples: number;
  intervalMs: number;
};

/** Explicit process-only input. This is NOT whole-machine unified-memory use. */
export function peakRssReading(peak: PeakRss): MemoryReading {
  if (
    peak.reason === "SAMPLED" &&
    peak.value !== null &&
    Number.isFinite(peak.value) &&
    peak.value > 0
  )
    return { value: peak.value, unit: "MiB" };
  return {
    value: null,
    unit: "MiB",
    reason:
      peak.reason === "NO-PID" || peak.reason === "UNSUPPORTED-HOST"
        ? "NOT-RUN"
        : "MEASURE-FAILED",
  };
}
