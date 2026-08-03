// The historical benchmark projection. Pure: turns a run's configurations into a
// compact per-config series appended to an ever-growing history file, and selects
// the errored configurations a repair run re-benchmarks. The gzip archive of the
// full record and the file IO live in the entrypoint — this module only shapes
// data, so it is deterministic and unit-testable.

import type {
  Aggregate,
  ConfigRun,
  HistoryEntry,
  HistoryFile,
  HistoryPoint,
  HistoryMetricMethod,
  MetricStat,
  Provenance,
} from "./types";
import { mergeConfigs } from "./merge";

const metricMethod = (
  provenance: Provenance,
  n: number,
  stdDev: number,
): HistoryMetricMethod =>
  provenance === "error"
    ? "error-zero"
    : n > 1 || stdDev !== 0
      ? "trial-sample-std-dev"
      : "single-trial";

const toMetricStat = (
  aggregate: Aggregate,
  provenance: Provenance,
): MetricStat => ({
  mean: aggregate.mean,
  stdDev: aggregate.stdDev,
  n: aggregate.n,
  method: metricMethod(provenance, aggregate.n, aggregate.stdDev),
});

// Project one configuration's aggregates into its compact history point. The full
// per-call raw capture is NOT copied here — the point is the small, trend-able
// summary; the complete record lives in the (archived) artifact.
export const toHistoryPoint = (run: ConfigRun): HistoryPoint => ({
  id: run.id,
  provider: run.provider,
  modelName: run.modelName,
  effort: run.effort,
  provenance: run.provenance,
  throughputTokensPerSec: toMetricStat(
    run.stats.throughputTokensPerSec,
    run.provenance,
  ),
  ttftMs: toMetricStat(run.stats.ttftMs, run.provenance),
  totalLatencyMs: toMetricStat(run.stats.totalLatencyMs, run.provenance),
  maxSchemaDepth: toMetricStat(run.stats.maxSchemaDepth, run.provenance),
  maxSchemaBreadth: toMetricStat(run.stats.maxSchemaBreadth, run.provenance),
  lengthAccuracy: toMetricStat(run.stats.lengthAccuracy, run.provenance),
  informationAccuracy: toMetricStat(
    run.stats.informationAccuracy,
    run.provenance,
  ),
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

// Every archive filename in chronological order (oldest first). ISO stamps are
// fixed-width, so a lexicographic sort is chronological.
export const archivesOldestFirst = (
  filenames: ReadonlyArray<string>,
): string[] => [...filenames].sort();

/**
 * Rebuild the COMPLETE measurement record by folding every committed archive
 * frame together, oldest to newest.
 *
 * This is what makes the record reproducible from the repository. A single
 * frame is only a snapshot of the configs its run touched: a scoped sweep
 * archives a narrow frame, so the NEWEST frame is not the fullest one. On
 * 2026-07-27 the newest committed frame held 6 configs while the published
 * table needed 47, and the only artifact that could render the article was an
 * untracked, machine-local `.real.data.json` on one checkout.
 *
 * Folding is correct rather than merely convenient, because it reuses the exact
 * policy an incremental run already applies: `mergeConfigs` carries forward a
 * config a later run did not touch and never lets a weaker provenance
 * (`error`/`fixtured`) overwrite a real `measured` cell. Replaying the frames in
 * order therefore reconstructs the same record the incremental runs built.
 *
 * Pure: the caller does the reading and decompressing. Returns null for no
 * frames at all. The newest frame supplies the record's non-config metadata,
 * since that is the most recent description of the instrument.
 */
export const reconstructRecord = <
  T extends { configs: ReadonlyArray<ConfigRun> },
>(
  framesOldestFirst: ReadonlyArray<T>,
): T | null => {
  if (framesOldestFirst.length === 0) return null;
  const newest = framesOldestFirst[framesOldestFirst.length - 1] as T;
  const configs = framesOldestFirst.reduce<ConfigRun[]>(
    (carried, frame) => mergeConfigs(carried, frame.configs),
    [],
  );
  return { ...newest, configs };
};

/**
 * Whether projecting `next` configurations over a page that currently carries
 * `previous` is an implausible narrowing that must be refused.
 *
 * Any decrease qualifies. The published speed and accuracy tables are a census
 * of the matrix, so a projection carrying fewer rows than the page already
 * shows means the source record lost configurations rather than gained
 * measurements — which is what a scoped sweep with no base produces. A genuine
 * removal (a retired model) is rare and deliberate, so it is worth an explicit
 * flag; a silent 47 -> 12 rewrite of a published article is not.
 */
export const isImplausibleNarrowing = (
  previousCount: number,
  nextCount: number,
): boolean => nextCount < previousCount;

/**
 * Whether a run may write its result out as the complete record.
 *
 * "First full run with no record" and "scoped run with no base" were the same
 * code path, and that is the whole defect: only the former may legitimately
 * replace the record. A scoped run exists to MERGE into a base, so without one
 * its partial result silently becomes the census.
 *
 * Pure so the decision is machine-checked rather than asserted — the live path
 * needs provider credentials, so the branch itself is not otherwise reachable
 * in a test.
 */
export const mayWriteWholeRecord = (input: {
  readonly selectorPresent: boolean;
  readonly hasBase: boolean;
  readonly allowPartialRecord: boolean;
}): boolean =>
  !input.selectorPresent || input.hasBase || input.allowPartialRecord;
