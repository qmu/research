// Topic orchestration: run the four probes as trials against a client, fold the
// per-trial results into a ConfigRun, and have a judge review the configuration.
// This is the effectful glue between the pure domain graders/statistics and the
// vendor completion port — kept out of the entrypoint so it is unit-testable with
// an injected client (including a throwing one, to prove failure isolation), and
// out of `domain/` because it performs I/O (client calls) and must stay pure of
// that.

import type { CompletionClient } from "../vendors/llm/types";
import type {
  CallRecord,
  ConfigRun,
  ModelCard,
  ProbeParams,
  Provenance,
  Review,
  SchemaAxisParams,
  TrialResult,
} from "./domain/types";
import { sustainedTokensPerSecond } from "./domain/throughput";
import { normalizeLatency } from "./domain/latency";
import {
  advanceWarmAxis,
  buildSchema,
  buildSchemaPrompt,
  gradeConformance,
  startWarmAxisProbe,
} from "./domain/json-schema";
import { buildSpeedPrompt } from "./domain/speed-probe";
import { lengthAccuracy, wordCount } from "./domain/length-accuracy";
import {
  INFORMATION_ACCURACY_MANIFEST,
  buildBatchedInformationAccuracyPrompt,
  parseBatchedInformationAnswers,
  scoreInformationAccuracy,
} from "./domain/information-accuracy";
import {
  buildReviewPrompt,
  parseReview,
  reviewSchema,
  skippedReview,
} from "./domain/review";
import { summarizeTrials } from "./domain/aggregate";
import type { EffortLevel } from "./domain/effort";

// The judge that reviews each configuration: a single fixed model behind the
// port, whether it is `live` (a real judge) or the deterministic fixture judge.
export type JudgeConfig = Readonly<{
  client: CompletionClient;
  live: boolean;
  model: string;
}>;

// Hard per-call wall-clock ceiling. A single provider call that never returns
// (a stalled stream, a wedged socket) must not freeze the whole sweep: the call
// is raced against a timer so a hang becomes a caught error, the trial is flagged
// failed by the normal isolation, and the sweep continues. Generous enough that
// a legitimately slow high-effort generation still completes.
export const CALL_TIMEOUT_MS = 180_000;

const withTimeout = <T>(work: Promise<T>, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${CALL_TIMEOUT_MS}ms`)),
      CALL_TIMEOUT_MS,
    );
  });
  return Promise.race([work, guard]).finally(() => clearTimeout(timer));
};

// Prior schema boundaries from the last real artifact, used to warm-start the
// per-axis search. Absent boundaries fall back to the cold cap-first bisection.
export type WarmBoundaries = Readonly<{
  depth?: number;
  breadth?: number;
}>;

export type TrialOptions = Readonly<{
  /** Run the once-per-configuration structural probes (schema + information)
   * in this trial. True on trial 1; later trials measure speed only and carry
   * null for the structural metrics. */
  structural: boolean;
  warm?: WarmBoundaries;
}>;

// Run one trial. Every trial makes the unified speed probe (one streamed
// exact-length generation → throughput, TTFT, total latency, length accuracy);
// the structural probes (warm-started schema axis searches + one batched
// information call) run only when `options.structural`. NEVER throws — a failed
// call is caught and the trial returns `ok: false` with whatever calls
// completed, so one bad call (or one bad provider) never aborts the run.
export const runTrial = async (
  client: CompletionClient,
  trialNumber: number,
  probe: ProbeParams,
  effort: EffortLevel,
  options: TrialOptions,
): Promise<TrialResult> => {
  const calls: CallRecord[] = [];
  const nullMetrics = {
    throughputTokensPerSec: null,
    ttftMs: null,
    totalLatencyMs: null,
    maxSchemaDepth: null,
    maxSchemaBreadth: null,
    lengthAccuracy: null,
    informationAccuracy: null,
  };
  try {
    // --- unified speed probe: four metrics from one streamed call -------------
    const speedPrompt = buildSpeedPrompt(
      probe.speedTargetWords,
      probe.speedTopic,
    );
    const sp = await withTimeout(
      client.completeStreaming(speedPrompt, { effort }),
      "speed",
    );
    calls.push({
      probe: "speed",
      effort,
      prompt: speedPrompt,
      rawOutput: sp.text,
      outputTokens: sp.outputTokens,
      elapsedMs: sp.elapsedMs,
      ttftMs: sp.ttftMs,
      schemaAxis: null,
      schemaValue: null,
      schemaConforms: null,
      informationQuestionId: null,
      error: null,
    });
    const latency = normalizeLatency(sp.ttftMs, sp.elapsedMs);
    const throughputTokensPerSec = sustainedTokensPerSecond(
      sp.outputTokens,
      sp.elapsedMs,
      sp.ttftMs,
    );
    const accuracy = lengthAccuracy(probe.speedTargetWords, wordCount(sp.text));

    if (!options.structural) {
      return {
        trial: trialNumber,
        ok: true,
        error: null,
        metrics: {
          ...nullMetrics,
          throughputTokensPerSec,
          ttftMs: latency.ttftMs,
          totalLatencyMs: latency.totalMs,
          lengthAccuracy: accuracy,
        },
        calls,
      };
    }

    // --- schema complexity: warm-started exact boundary search per axis -------
    // Depth and breadth are probed INDEPENDENTLY (depth at breadth 1; breadth at
    // depth 1). With a prior boundary the stable case costs 2 probes per axis;
    // without one, cap-first bisection stays within 1 + log2(cap). A provider
    // rejection is a ceiling finding, recorded verbatim, never a trial failure.
    const probeAxis = async (
      axis: "depth" | "breadth",
      params: SchemaAxisParams,
      prior: number | undefined,
    ): Promise<number> => {
      let state = startWarmAxisProbe(prior, params.cap);
      while (state.next !== null) {
        const value = state.next;
        const shape =
          axis === "depth"
            ? { depth: value, breadth: 1 }
            : { depth: 1, breadth: value };
        const schema = buildSchema(shape);
        const prompt = buildSchemaPrompt(shape);
        let conforms = false;
        let raw = "";
        let outputTokens = 0;
        let elapsedMs = 0;
        let callError: string | null = null;
        try {
          const structured = await withTimeout(
            client.completeStructured(prompt, schema, {
              effort,
              maxTokens: probe.schemaProbe.maxTokens,
            }),
            `schema:${axis}=${value}`,
          );
          raw = structured.raw;
          outputTokens = structured.outputTokens;
          elapsedMs = structured.elapsedMs;
          conforms = gradeConformance(schema, raw).conforms;
        } catch (e: unknown) {
          // Provider rejection / failure at this complexity: a ceiling finding,
          // not a trial failure. Record it and treat the rung as non-conforming.
          callError = String(e);
        }
        calls.push({
          probe: "schema",
          effort,
          prompt,
          rawOutput: raw,
          outputTokens,
          elapsedMs,
          ttftMs: null,
          schemaAxis: axis,
          schemaValue: value,
          schemaConforms: conforms,
          informationQuestionId: null,
          error: callError,
        });
        state = advanceWarmAxis(state, conforms);
      }
      return state.lo;
    };

    const maxSchemaDepth = await probeAxis(
      "depth",
      probe.schemaProbe.depth,
      options.warm?.depth,
    );
    const maxSchemaBreadth = await probeAxis(
      "breadth",
      probe.schemaProbe.breadth,
      options.warm?.breadth,
    );

    // --- information accuracy: one batched call, deterministic scoring --------
    const informationPrompt = buildBatchedInformationAccuracyPrompt(
      INFORMATION_ACCURACY_MANIFEST.questions,
    );
    const informationCompletion = await withTimeout(
      client.complete(informationPrompt, { effort, maxTokens: 512 }),
      "information",
    );
    calls.push({
      probe: "information",
      effort,
      prompt: informationPrompt,
      rawOutput: informationCompletion.text,
      outputTokens: informationCompletion.outputTokens,
      elapsedMs: informationCompletion.elapsedMs,
      ttftMs: null,
      schemaAxis: null,
      schemaValue: null,
      schemaConforms: null,
      informationQuestionId: "batched",
      error: null,
    });
    const informationScore = scoreInformationAccuracy(
      INFORMATION_ACCURACY_MANIFEST,
      parseBatchedInformationAnswers(
        informationCompletion.text,
        INFORMATION_ACCURACY_MANIFEST.questions,
      ),
    );

    return {
      trial: trialNumber,
      ok: true,
      error: null,
      metrics: {
        throughputTokensPerSec,
        ttftMs: latency.ttftMs,
        totalLatencyMs: latency.totalMs,
        maxSchemaDepth,
        maxSchemaBreadth,
        lengthAccuracy: accuracy,
        informationAccuracy: informationScore.f1,
      },
      calls,
    };
  } catch (error: unknown) {
    return {
      trial: trialNumber,
      ok: false,
      error: String(error),
      metrics: nullMetrics,
      calls,
    };
  }
};

export type RunOptions = Readonly<{
  trials: number;
  probe: ProbeParams;
  // Prior schema boundaries for this configuration (from the last real
  // artifact), used to warm-start the axis search. Optional: cold search
  // otherwise.
  warm?: WarmBoundaries;
  // The live client for this configuration, or undefined to use the fixture path.
  liveClient: CompletionClient | undefined;
  // Build the deterministic fixture client for a given 0-based trial index.
  fixtureFor: (trialIndex: number) => CompletionClient;
  // The judge that reviews this configuration after its trials.
  judge: JudgeConfig;
  // ISO timestamp of this run, stamped onto the config so a merged artifact
  // records when each cell was measured (the entrypoint owns the clock).
  measuredAt: string;
}>;

const zeroStat = { mean: 0, stdDev: 0, min: 0, max: 0, n: 0 } as const;

// Gather a few representative raw outputs from a configuration's successful
// trials so the judge grounds its review in what the model actually produced.
const sampleOutputs = (trials: ReadonlyArray<TrialResult>): string[] => {
  const samples: string[] = [];
  for (const t of trials) {
    if (!t.ok) continue;
    for (const probe of [
      "throughput",
      "schema",
      "length",
      "information",
    ] as const) {
      const call = t.calls.find((c) => c.probe === probe && c.rawOutput !== "");
      if (call) samples.push(call.rawOutput);
      if (samples.length >= 3) return samples;
    }
  }
  return samples;
};

// Ask the judge to review a configuration from its metrics + sample outputs.
// Never throws — a judge failure yields an empty (skipped-style) review rather
// than aborting the run.
const runJudge = async (
  card: ModelCard,
  effort: EffortLevel,
  provenance: Provenance,
  stats: ConfigRun["stats"],
  trials: ReadonlyArray<TrialResult>,
  judge: JudgeConfig,
): Promise<Review> => {
  if (provenance === "error") {
    return skippedReview(judge.model);
  }
  const reviewProvenance =
    provenance === "measured" && judge.live ? "judged" : "fixtured";
  try {
    const structured = await withTimeout(
      judge.client.completeStructured(
        buildReviewPrompt({
          modelName: card.modelName,
          effort,
          throughputTokensPerSec: stats.throughputTokensPerSec.mean,
          ttftMs: stats.ttftMs.mean,
          totalLatencyMs: stats.totalLatencyMs.mean,
          maxSchemaDepth: stats.maxSchemaDepth.mean,
          maxSchemaBreadth: stats.maxSchemaBreadth.mean,
          lengthAccuracy: stats.lengthAccuracy.mean,
          informationAccuracy: stats.informationAccuracy.mean,
          sampleOutputs: sampleOutputs(trials),
        }),
        reviewSchema(),
      ),
      "judge",
    );
    return parseReview(structured.raw, judge.model, reviewProvenance);
  } catch {
    return skippedReview(judge.model);
  }
};

// Build one configuration's run: N trials at a fixed effort, aggregate, then have
// the judge review it. Provenance is `measured` when at least one live trial
// succeeded, `error` when a live configuration's every trial failed (isolated —
// not fatal to the matrix), and `fixtured` for the keyless path.
export const buildConfigRun = async (
  card: ModelCard,
  effort: EffortLevel,
  opts: RunOptions,
): Promise<ConfigRun> => {
  const { trials, probe, liveClient, fixtureFor, judge, measuredAt, warm } =
    opts;
  const results: TrialResult[] = [];
  for (let i = 0; i < trials; i += 1) {
    const client = liveClient ?? fixtureFor(i);
    results.push(
      await runTrial(client, i + 1, probe, effort, {
        structural: i === 0,
        ...(warm === undefined ? {} : { warm }),
      }),
    );
  }
  const anyOk = results.some((r) => r.ok);
  const provenance: Provenance = liveClient
    ? anyOk
      ? "measured"
      : "error"
    : "fixtured";
  const stats = summarizeTrials(results);
  const review = await runJudge(
    card,
    effort,
    provenance,
    stats,
    results,
    judge,
  );
  return {
    ...card,
    effort,
    provenance,
    measuredAt,
    trialsRequested: trials,
    trials: results,
    stats,
    review,
  };
};

// A synthetic all-failed run for a configuration whose client could not even be
// built (e.g. an SDK constructor threw) — keeps one configuration's fatal error
// from aborting the whole matrix.
export const errorRun = (
  card: ModelCard,
  effort: EffortLevel,
  trials: number,
  reason: string,
  judgeModel: string,
  measuredAt: string,
): ConfigRun => ({
  ...card,
  effort,
  provenance: "error",
  measuredAt,
  trialsRequested: trials,
  trials: [
    {
      trial: 1,
      ok: false,
      error: reason,
      metrics: {
        throughputTokensPerSec: null,
        ttftMs: null,
        totalLatencyMs: null,
        maxSchemaDepth: null,
        maxSchemaBreadth: null,
        lengthAccuracy: null,
        informationAccuracy: null,
      },
      calls: [],
    },
  ],
  stats: {
    throughputTokensPerSec: zeroStat,
    ttftMs: zeroStat,
    totalLatencyMs: zeroStat,
    maxSchemaDepth: zeroStat,
    maxSchemaBreadth: zeroStat,
    lengthAccuracy: zeroStat,
    informationAccuracy: zeroStat,
  },
  review: skippedReview(judgeModel),
});
