/**
 * Adoption-policy layer for whole-machine peak-memory readings (e.g.
 * qmu/research#211's Strata `host_ram_peak` / `gpu_vram_peak`: an external
 * OS-level sampler's peak over the whole machine, not a single process's
 * RSS). This module decides nothing about how a reading is produced — it
 * only checks an already-normalized reading, shaped like a common-JSON
 * measurement (a present value with a unit, or a missing value with a
 * stated reason), against a use case's memory ceiling.
 */

export type PeakMemoryReading = Readonly<
  | { value: number; unit: "MiB" }
  | {
      value: null;
      unit: "MiB";
      reason: "NO-FIELD" | "MEASURE-FAILED" | "NOT-RUN";
    }
>;

export type MemoryUseCase = Readonly<{
  id: string;
  label: string;
  /** Ceiling on the whole-machine resident memory peak, in MiB. */
  hostRamPeakMiB: number;
  /** Ceiling on the whole-machine GPU VRAM peak, in MiB. */
  gpuVramPeakMiB: number;
  rationale: string;
}>;

export type MemoryAdoptionDecision = "adopt" | "reject" | "undetermined";

export type MemoryAdoptionVerdict = Readonly<{
  useCase: string;
  /** "adopt" requires both metrics to clear their ceiling. A missing reading
   * is never counted as a pass; one metric over its ceiling rejects outright
   * even if the other metric is missing. */
  decision: MemoryAdoptionDecision;
  hostRamPeak: MemoryAdoptionDecision;
  gpuVramPeak: MemoryAdoptionDecision;
}>;
