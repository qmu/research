// Pure statistics over trial samples. These reduce the per-trial metric values of
// a model into an `Aggregate` (mean + spread) for the report. Referentially
// transparent: same numbers in, same aggregate out — the compiler and the unit
// tests are the whole safety net.

import type { Aggregate, ProbeStats, TrialResult } from "./types";

// Arithmetic mean; 0 for an empty sample (a model with no successful trials shows
// n=0 and the report flags it rather than dividing by zero).
export const mean = (xs: ReadonlyArray<number>): number =>
  xs.length === 0 ? 0 : xs.reduce((sum, x) => sum + x, 0) / xs.length;

// Sample standard deviation (Bessel's n-1). Undefined for a single point, so a
// sample of size < 2 has zero spread by definition — a 1-trial mean carries no
// dispersion.
export const stdDev = (xs: ReadonlyArray<number>): number => {
  if (xs.length < 2) {
    return 0;
  }
  const m = mean(xs);
  const variance =
    xs.reduce((sum, x) => sum + (x - m) * (x - m), 0) / (xs.length - 1);
  return Math.sqrt(variance);
};

// Reduce a sample to its mean, spread, extent, and count. An empty sample is a
// well-formed all-zeros aggregate with `n: 0` — the caller (and the report)
// decides how to present "no data", never this function throwing.
export const aggregate = (xs: ReadonlyArray<number>): Aggregate => ({
  mean: mean(xs),
  stdDev: stdDev(xs),
  min: xs.length === 0 ? 0 : Math.min(...xs),
  max: xs.length === 0 ? 0 : Math.max(...xs),
  n: xs.length,
});

// Summarize a configuration's trials into the aggregated metrics. Only successful
// (`ok`) trials contribute — a failed trial is excluded from every aggregate, so
// the mean is over real measurements, never contaminated by a zeroed failure.
export const summarizeTrials = (
  trials: ReadonlyArray<TrialResult>,
): ProbeStats => {
  const ok = trials.filter((t) => t.ok);
  return {
    throughputTokensPerSec: aggregate(
      ok.map((t) => t.metrics.throughputTokensPerSec),
    ),
    ttftMs: aggregate(ok.map((t) => t.metrics.ttftMs)),
    totalLatencyMs: aggregate(ok.map((t) => t.metrics.totalLatencyMs)),
    maxSchemaDepth: aggregate(ok.map((t) => t.metrics.maxSchemaDepth)),
    maxSchemaBreadth: aggregate(ok.map((t) => t.metrics.maxSchemaBreadth)),
    lengthAccuracy: aggregate(ok.map((t) => t.metrics.lengthAccuracy)),
    informationAccuracy: aggregate(
      ok.map((t) => t.metrics.informationAccuracy),
    ),
  };
};
