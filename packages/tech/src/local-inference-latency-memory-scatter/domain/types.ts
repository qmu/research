/**
 * A reading that was produced and checked: its run's identity (run id,
 * target commit, runner version) matched what the caller expected, so the
 * two numbers below are trustworthy enough to plot.
 *
 * `initialDelayMs` is the engine's time-to-first-token (`ttft` in the wider
 * local-inference metric vocabulary) — the delay between sending a prompt
 * and receiving the first generated token. `peakRssMiB` is the inference
 * process's peak resident set size, in MiB.
 */
export type VerifiedReading = Readonly<{
  status: "verified";
  initialDelayMs: number;
  peakRssMiB: number;
}>;

/**
 * A reading that was not produced, or whose identity did not match (a stale
 * runner version, a missing field, a retried run that never completed).
 * `reason` is a short, stable, human-readable code — not a measurement.
 */
export type UnverifiedReading = Readonly<{
  status: "unverified";
  reason: string;
}>;

export type LatencyMemoryReading = VerifiedReading | UnverifiedReading;

/** One local-inference trial: which engine, which reading. */
export type LatencyMemoryRun = Readonly<{
  engine: string;
  label: string;
  reading: LatencyMemoryReading;
}>;
