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

// --- gzip-archive retention (pure filename math; the IO lives in the entrypoint) --
//
// Real runs archive the full record under `history/<stamp>.data.json.gz`, where the
// stamp is an ISO timestamp with ":" → "-". ISO stamps are fixed-width, so a plain
// lexicographic sort is chronological — oldest first, newest last.

// The newest archive filename, or null when there is none. Used by the
// render-from-history path to pick the latest real snapshot to render.
export const latestArchive = (
  filenames: ReadonlyArray<string>,
): string | null => {
  const sorted = [...filenames].sort();
  return sorted.length > 0 ? sorted[sorted.length - 1] : null;
};

// Given the archive filenames, keep the `keep` most-recent and return the OLDER ones
// to delete — the retention policy that bounds repo growth as real sweeps accumulate.
// `keep <= 0` prunes all; fewer than `keep` archives prunes none.
export const archivesToPrune = (
  filenames: ReadonlyArray<string>,
  keep: number,
): string[] => {
  const sorted = [...filenames].sort(); // oldest first
  const excess = Math.max(0, sorted.length - Math.max(0, keep));
  return sorted.slice(0, excess);
};
