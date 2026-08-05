// Read a stored time-to-first-token of 0 as the missing measurement it is.
//
// Until 2026-08-05 every adapter initialised `ttftMs` to 0 and treated 0 as
// "no content delta was observed". The value is a number, so it entered the
// aggregate as a real sample and pulled the mean toward zero. Claude Opus 5 at
// effort `high` published 10459 ± 10048 ms over trials of 19922, 0 and
// 11456 ms — a spread as large as the mean, produced entirely by counting a
// non-measurement as a measurement.
//
// Adapters now emit `null`, so new runs are unambiguous. Committed frames still
// carry the 0s, and they are converted on read for the same reason throughput is
// (see `recompute-throughput.ts`): the archives stay exactly as written, and the
// current semantics are applied when the record is interpreted.
//
// WHY 0 CAN BE READ AS MISSING WITHOUT AMBIGUITY. A first content delta cannot
// arrive in the same millisecond the request is issued — the value is a
// wall-clock difference across a network round trip, and no real streamed
// response has ever measured 0. The keyless fixtures never emit 0 either (their
// floors are 30 ms and 40 ms), so this conversion cannot disturb the byte-stable
// self-test. It applies only to the sentinel the adapters used to write.
//
// This does NOT recover the lost values. A trial whose first-token time was
// never captured stays uncaptured; the change is that it no longer counts as a
// zero. Recovering it needs a re-measurement, which no committed frame can
// supply.

import { summarizeTrials } from "./aggregate";
import type { ConfigRun } from "./types";

export type MissingTtftOutcome = Readonly<{
  configs: ReadonlyArray<ConfigRun>;
  // Trials whose stored 0 was reinterpreted as "not captured".
  converted: number;
}>;

/**
 * Rewrite a stored `ttftMs` of 0 to null across every trial, then re-derive the
 * affected aggregates so the mean and spread are over real measurements only.
 *
 * Only the first-token time is touched. Total latency of 0 is left alone: it is
 * a different measurement with a different failure mode, and a trial that truly
 * returned instantly would be a finding rather than a gap.
 */
export const readMissingTtftAsNull = (
  configs: ReadonlyArray<ConfigRun>,
): MissingTtftOutcome => {
  let converted = 0;

  const next = configs.map((config) => {
    let touched = false;
    const trials = (config.trials ?? []).map((trial) => {
      const ttft = trial.metrics.ttftMs;
      if (ttft === null || ttft > 0) return trial;
      converted += 1;
      touched = true;
      return { ...trial, metrics: { ...trial.metrics, ttftMs: null } };
    });
    return touched
      ? { ...config, trials, stats: summarizeTrials(trials) }
      : config;
  });

  return { configs: next, converted };
};
