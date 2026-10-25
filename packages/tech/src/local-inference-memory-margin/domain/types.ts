/**
 * Headroom layer for whole-machine peak-memory readings (the shape
 * qmu/research#211 produces: an external OS-level sampler's peak over the
 * whole machine, in MiB, present as a value or missing with a reason code)
 * against the host's own FIXED memory capacity (the shape qmu/research#197
 * collects via `os.totalmem()`). Neither PR turns those two numbers into a
 * headroom figure, and neither states the fixed-tier bucketing this module
 * adds — see ../README.md for why this is not a duplicate of either.
 *
 * This module decides nothing about adoption (qmu/research#205 and #215 own
 * that axis); it only reports how much of the host's fixed memory tier is
 * left over after the peak reading, so that number can sit in the same row
 * as a speed figure and a quality figure without this module knowing how
 * either of those was produced.
 */

export type MemoryReading = Readonly<
  | { value: number; unit: "MiB" }
  | {
      value: null;
      unit: "MiB";
      reason: "NO-FIELD" | "MEASURE-FAILED" | "NOT-RUN";
    }
>;

/** A vendor-defined fixed memory capacity a host actually ships with — these
 * come in discrete sizes (unified-memory Apple Silicon hosts and
 * discrete-VRAM cards alike), never a continuous range. */
export type FixedCapacityTier = Readonly<{
  label: string;
  totalMiB: number;
}>;

export type MemoryMargin = Readonly<
  | { status: "ok"; marginMiB: number; tier: FixedCapacityTier }
  | { status: "insufficient"; marginMiB: number; tier: FixedCapacityTier }
  | {
      status: "undetermined";
      reason: "NO-FIELD" | "MEASURE-FAILED" | "NOT-RUN" | "NO-TIER";
      tier: FixedCapacityTier | null;
    }
>;

/** One engine's row in the published table: a caller-supplied, already
 * formatted speed cell and quality cell (this module does not produce or
 * judge either), plus the raw inputs this module turns into a margin. */
export type EngineMemoryMarginRow = Readonly<{
  engine: string;
  speed: string;
  quality: string;
  rawTotalMiB: number;
  peak: MemoryReading;
}>;
