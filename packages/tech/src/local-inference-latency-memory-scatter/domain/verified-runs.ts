import type { LatencyMemoryRun, VerifiedReading } from "./types.js";

/** A run narrowed to its `verified` reading, so the two numbers are always present. */
export type VerifiedLatencyMemoryRun = Readonly<{
  engine: string;
  label: string;
  reading: VerifiedReading;
}>;

const isVerified = (
  run: LatencyMemoryRun,
): run is VerifiedLatencyMemoryRun => run.reading.status === "verified";

/**
 * Keeps only the runs whose reading is `verified`. This is the one gate the
 * scatter plot is built around: a run with a missing or identity-mismatched
 * reading is dropped rather than plotted at 0, `null`, or any other
 * placeholder that a chart would render as a real point.
 */
export const onlyVerifiedRuns = (
  runs: ReadonlyArray<LatencyMemoryRun>,
): ReadonlyArray<VerifiedLatencyMemoryRun> => runs.filter(isVerified);
