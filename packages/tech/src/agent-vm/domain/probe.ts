import type { ProbeSample, SandboxProviderCard, Stat } from "./types";

/**
 * Pure aggregation for the sandbox probe. Given a vector of cold-start samples
 * (ms) it computes the percentiles and the mean/stdDev the artifact records;
 * given a task wall-clock it derives the vCPU-seconds cost at the card's
 * published rate. No effects, no clock, no provider access.
 */

/** Nearest-rank percentile over a value vector. p in [0, 1]. Empty → 0. */
export const percentile = (
  values: ReadonlyArray<number>,
  p: number,
): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const clamped = Math.min(1, Math.max(0, p));
  const rank = Math.ceil(clamped * sorted.length);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index] ?? 0;
};

/** Mean, sample standard deviation, and count. n=0 → all zero; n=1 → stdDev 0,
 * matching the other topics' aggregation conventions. */
export const summarizeStat = (values: ReadonlyArray<number>): Stat => {
  const n = values.length;
  if (n === 0) return { mean: 0, stdDev: 0, n: 0 };
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  if (n === 1) return { mean, stdDev: 0, n };
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1);
  return { mean, stdDev: Math.sqrt(variance), n };
};

/** Cold-start ms values from probe samples, in repetition order. */
export const coldStartValues = (
  samples: ReadonlyArray<ProbeSample>,
): ReadonlyArray<number> => samples.map((sample) => sample.coldStartMs);

/**
 * Cost of one fixed-task run: its wall-clock, converted to vCPU-hours at the
 * card's published per-vCPU-hour rate, over a single vCPU. A cost floor of one
 * billing tick is NOT modeled here — this is the compute-time cost; per-boot
 * minimums are noted in the report, not folded into the number.
 */
export const taskCostUsd = (
  card: SandboxProviderCard,
  fixedTaskWallClockMs: number,
): number => (fixedTaskWallClockMs / 1000 / 3600) * card.publishedVcpuHourUsd;

/** Median helper for report overviews (p50 by nearest-rank). */
export const median = (values: ReadonlyArray<number>): number =>
  percentile(values, 0.5);
