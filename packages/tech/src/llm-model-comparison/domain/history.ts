// The historical benchmark projection. Pure: turns a run's configurations into a
// compact per-config series appended to an ever-growing history file, and selects
// the errored configurations a repair run re-benchmarks. The gzip archive of the
// full record and the file IO live in the entrypoint — this module only shapes
// data, so it is deterministic and unit-testable.

import type {
  ConfigRun,
  HistoryEntry,
  HistoryFile,
  HistoryPoint,
} from "./types";

// Project one configuration's aggregates into its compact history point. The full
// per-call raw capture is NOT copied here — the point is the small, trend-able
// summary; the complete record lives in the (archived) artifact.
export const toHistoryPoint = (run: ConfigRun): HistoryPoint => ({
  id: run.id,
  provider: run.provider,
  modelName: run.modelName,
  effort: run.effort,
  provenance: run.provenance,
  throughputTokensPerSec: run.stats.throughputTokensPerSec.mean,
  ttftMs: run.stats.ttftMs.mean,
  totalLatencyMs: run.stats.totalLatencyMs.mean,
  maxSchemaDepth: run.stats.maxSchemaDepth.mean,
  maxSchemaBreadth: run.stats.maxSchemaBreadth.mean,
  lengthAccuracy: run.stats.lengthAccuracy.mean,
  measuredAt: run.measuredAt,
});

// Build the history entry for a completed (merged) run — every configuration's
// point, stamped with the run's wall clock and trial count.
export const buildHistoryEntry = (
  configs: ReadonlyArray<ConfigRun>,
  generatedAt: string,
  trials: number,
): HistoryEntry => ({
  generatedAt,
  trials,
  points: configs.map(toHistoryPoint),
});

// Append a run's entry to the (possibly empty/absent) history file, newest last.
export const appendHistory = (
  file: HistoryFile | null,
  entry: HistoryEntry,
): HistoryFile => ({
  entries: [...(file?.entries ?? []), entry],
});

// The configurations whose live measurement failed — the exact set an
// `--only-errored` repair run re-benchmarks so the record ends with no unresolved
// errors.
export const selectErrored = (configs: ReadonlyArray<ConfigRun>): ConfigRun[] =>
  configs.filter((c) => c.provenance === "error");
