// Recompute a loaded record's throughput from its RAW per-trial fields.
//
// Why this exists. An archived frame stores `metrics.throughputTokensPerSec`
// already computed, so re-rendering a committed frame reproduces whatever
// definition was in force when the sweep ran. When the definition changed on
// 2026-08-04 (post-first-token window -> end-to-end; see
// docs/adr/0009-end-to-end-throughput.md), `--render-latest` therefore produced
// a byte-identical report: the fix reached new runs only, and every committed
// frame kept asserting the retired numbers.
//
// The raw inputs survive in the frame — the speed call's `outputTokens` and the
// trial's `totalLatencyMs` — so the rate is recomputable at no cost and without
// re-running a paid sweep. Doing it on LOAD, rather than migrating the files,
// keeps the archives exactly as they were written: a frame stays a faithful
// record of what its run observed, and the current definition is applied when
// the record is read. A later definition change needs no migration either.
//
// Two recomputation paths, in order:
//
//  1. From raw inputs — the speed call's `outputTokens` over the trial's
//     `totalLatencyMs`. Exact, and independent of any previous definition.
//
//  2. By RESCALING the stored rate, when the frame predates the speed call
//     recording `outputTokens` (the 2026-07-06 frame). The retired rate was
//     `tokens / generationMs`, so multiplying it by `generationMs / totalMs`
//     yields `tokens / totalMs` exactly — the token count cancels and never has
//     to be known. This is arithmetic inversion, not estimation.
//
//     Path 2 is only valid against a rate that was produced by the retired
//     definition. Every committed frame qualifies: the sustained definition
//     landed 2026-07-05 (`726b003`) and the oldest frame is 2026-07-06. To keep
//     that from being a fact someone has to remember, records now DECLARE their
//     definition (`throughputDefinition`), and a record already declaring
//     `end-to-end` is left alone — rescaling it a second time would shrink a
//     correct number. An absent declaration means the retired definition, which
//     is what every existing frame is.
//
// A trial that neither path can reach keeps its stored value rather than being
// zeroed: reporting 0 tok/s for an unmeasurable trial would be a fabricated
// measurement. `recomputeThroughput` counts those so a caller can say so.

import { endToEndTokensPerSecond } from "./throughput";
import { summarizeTrials } from "./aggregate";
import type { ConfigRun, ThroughputDefinition, TrialResult } from "./types";

// The speed probe's output-token count for one trial, or null when the frame
// does not carry it.
const speedCallOutputTokens = (trial: TrialResult): number | null => {
  const speed = (trial.calls ?? []).find((c) => c.probe === "speed");
  if (!speed) return null;
  return Number.isFinite(speed.outputTokens) ? speed.outputTokens : null;
};

export type { ThroughputDefinition };

export type RecomputeOutcome = Readonly<{
  configs: ReadonlyArray<ConfigRun>;
  // Trials recomputed from raw inputs (path 1).
  recomputed: number;
  // Trials converted by rescaling the stored rate (path 2).
  rescaled: number;
  // Trials neither path could reach; they keep their stored value.
  unrecomputable: number;
}>;

// The window the retired definition divided by, reproduced exactly (including
// its fallback when the first-token time was missing or not below the total).
const retiredGenerationMs = (totalMs: number, ttftMs: number | null): number =>
  ttftMs !== null && ttftMs > 0 && ttftMs < totalMs
    ? totalMs - ttftMs
    : totalMs;

/**
 * Apply the current throughput definition to every trial in every config, then
 * re-derive each config's aggregate stats so the mean and spread match the
 * per-trial values a reader can check against.
 *
 * Only throughput is touched. Latency, schema and accuracy metrics are stored
 * observations, not derived rates, so recomputing them would change what the
 * frame recorded rather than how it is interpreted.
 */
export const recomputeThroughput = (
  configs: ReadonlyArray<ConfigRun>,
  storedDefinition: ThroughputDefinition = "post-first-token",
): RecomputeOutcome => {
  if (storedDefinition === "end-to-end") {
    // Already current. Rescaling would shrink correct numbers.
    return { configs, recomputed: 0, unrecomputable: 0, rescaled: 0 };
  }

  let recomputed = 0;
  let rescaled = 0;
  let unrecomputable = 0;

  const next = configs.map((config) => {
    const trials = (config.trials ?? []).map((trial) => {
      const totalMs = trial.metrics.totalLatencyMs;
      const stored = trial.metrics.throughputTokensPerSec;
      if (totalMs === null || !Number.isFinite(totalMs) || totalMs <= 0) {
        if (stored !== null) unrecomputable += 1;
        return trial;
      }

      const tokens = speedCallOutputTokens(trial);
      let rate: number;
      if (tokens !== null) {
        rate = endToEndTokensPerSecond(tokens, totalMs);
        recomputed += 1;
      } else if (stored !== null && Number.isFinite(stored)) {
        // Invert the retired formula. `tokens` cancels: the retired rate times
        // (generation window / total window) is the end-to-end rate.
        rate =
          stored *
          (retiredGenerationMs(totalMs, trial.metrics.ttftMs) / totalMs);
        rescaled += 1;
      } else {
        return trial;
      }

      return {
        ...trial,
        metrics: { ...trial.metrics, throughputTokensPerSec: rate },
      };
    });

    return { ...config, trials, stats: summarizeTrials(trials) };
  });

  return { configs: next, recomputed, unrecomputable, rescaled };
};
