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
  TrialResult,
} from "./domain/types";
import {
  buildThroughputPrompt,
  sustainedTokensPerSecond,
} from "./domain/throughput";
import { normalizeLatency } from "./domain/latency";
import {
  buildSchema,
  buildSchemaPrompt,
  gradeConformance,
} from "./domain/json-schema";
import {
  buildLengthPrompt,
  lengthAccuracy,
  wordCount,
} from "./domain/length-accuracy";
import {
  buildReviewPrompt,
  parseReview,
  reviewSchema,
  skippedReview,
} from "./domain/review";
import { summarizeTrials } from "./domain/aggregate";

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

// Run one trial: throughput (streamed long generation), latency (streamed short
// prompt), the schema-complexity escalation, and the length probe — capturing
// every call verbatim and deriving the metrics. NEVER throws — a failed call is
// caught and the trial returns `ok: false` with whatever calls completed, so one
// bad call (or one bad provider) never aborts the run.
export const runTrial = async (
  client: CompletionClient,
  trialNumber: number,
  probe: ProbeParams,
  effort: string,
): Promise<TrialResult> => {
  const calls: CallRecord[] = [];
  try {
    // --- throughput: sustained tokens/sec over a long streamed generation -----
    const throughputPrompt = buildThroughputPrompt(
      probe.throughputTargetWords,
      probe.throughputTopic,
    );
    const tp = await withTimeout(
      client.completeStreaming(throughputPrompt, { effort }),
      "throughput",
    );
    calls.push({
      probe: "throughput",
      effort,
      prompt: throughputPrompt,
      rawOutput: tp.text,
      outputTokens: tp.outputTokens,
      elapsedMs: tp.elapsedMs,
      ttftMs: tp.ttftMs,
      schemaComplexity: null,
      schemaConforms: null,
    });
    const throughputTokensPerSec = sustainedTokensPerSecond(
      tp.outputTokens,
      tp.elapsedMs,
      tp.ttftMs,
    );

    // --- latency: TTFT + total on a short streamed prompt ---------------------
    const latencyPrompt = probe.latencyPrompt;
    const lat = await withTimeout(
      client.completeStreaming(latencyPrompt, { effort }),
      "latency",
    );
    calls.push({
      probe: "latency",
      effort,
      prompt: latencyPrompt,
      rawOutput: lat.text,
      outputTokens: lat.outputTokens,
      elapsedMs: lat.elapsedMs,
      ttftMs: lat.ttftMs,
      schemaComplexity: null,
      schemaConforms: null,
    });
    const latency = normalizeLatency(lat.ttftMs, lat.elapsedMs);

    // --- schema complexity: escalate depth × breadth until non-conforming -----
    let maxSchemaComplexity = 0;
    for (let i = 0; i < probe.schemaLadder.length; i += 1) {
      const rung = probe.schemaLadder[i];
      const schema = buildSchema(rung);
      const prompt = buildSchemaPrompt(rung);
      const structured = await withTimeout(
        client.completeStructured(prompt, schema, { effort }),
        "schema",
      );
      const grade = gradeConformance(schema, structured.raw);
      calls.push({
        probe: "schema",
        effort,
        prompt,
        rawOutput: structured.raw,
        outputTokens: structured.outputTokens,
        elapsedMs: structured.elapsedMs,
        ttftMs: null,
        schemaComplexity: i + 1,
        schemaConforms: grade.conforms,
      });
      if (grade.conforms) {
        maxSchemaComplexity = i + 1;
      } else {
        break; // the model stopped affording this complexity; record the last max
      }
    }

    // --- length: word-count accuracy on a fixed target ------------------------
    const lengthPrompt = buildLengthPrompt(
      probe.lengthTargetWords,
      probe.lengthTopic,
    );
    const lengthCompletion = await withTimeout(
      client.complete(lengthPrompt, { effort, topic: probe.lengthTopic }),
      "length",
    );
    calls.push({
      probe: "length",
      effort,
      prompt: lengthPrompt,
      rawOutput: lengthCompletion.text,
      outputTokens: lengthCompletion.outputTokens,
      elapsedMs: lengthCompletion.elapsedMs,
      ttftMs: null,
      schemaComplexity: null,
      schemaConforms: null,
    });
    const accuracy = lengthAccuracy(
      probe.lengthTargetWords,
      wordCount(lengthCompletion.text),
    );

    return {
      trial: trialNumber,
      ok: true,
      error: null,
      metrics: {
        throughputTokensPerSec,
        ttftMs: latency.ttftMs,
        totalLatencyMs: latency.totalMs,
        maxSchemaComplexity,
        lengthAccuracy: accuracy,
      },
      calls,
    };
  } catch (error: unknown) {
    return {
      trial: trialNumber,
      ok: false,
      error: String(error),
      metrics: {
        throughputTokensPerSec: 0,
        ttftMs: 0,
        totalLatencyMs: 0,
        maxSchemaComplexity: 0,
        lengthAccuracy: 0,
      },
      calls,
    };
  }
};

export type RunOptions = Readonly<{
  trials: number;
  probe: ProbeParams;
  // The live client for this configuration, or undefined to use the fixture path.
  liveClient: CompletionClient | undefined;
  // Build the deterministic fixture client for a given 0-based trial index.
  fixtureFor: (trialIndex: number) => CompletionClient;
  // The judge that reviews this configuration after its trials.
  judge: JudgeConfig;
}>;

const zeroStat = { mean: 0, stdDev: 0, min: 0, max: 0, n: 0 } as const;

// Gather a few representative raw outputs from a configuration's successful
// trials so the judge grounds its review in what the model actually produced.
const sampleOutputs = (trials: ReadonlyArray<TrialResult>): string[] => {
  const samples: string[] = [];
  for (const t of trials) {
    if (!t.ok) continue;
    for (const probe of ["throughput", "schema", "length"] as const) {
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
  effort: string,
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
          maxSchemaComplexity: stats.maxSchemaComplexity.mean,
          lengthAccuracy: stats.lengthAccuracy.mean,
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
  effort: string,
  opts: RunOptions,
): Promise<ConfigRun> => {
  const { trials, probe, liveClient, fixtureFor, judge } = opts;
  const results: TrialResult[] = [];
  for (let i = 0; i < trials; i += 1) {
    const client = liveClient ?? fixtureFor(i);
    results.push(await runTrial(client, i + 1, probe, effort));
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
  effort: string,
  trials: number,
  reason: string,
  judgeModel: string,
): ConfigRun => ({
  ...card,
  effort,
  provenance: "error",
  trialsRequested: trials,
  trials: [
    {
      trial: 1,
      ok: false,
      error: reason,
      metrics: {
        throughputTokensPerSec: 0,
        ttftMs: 0,
        totalLatencyMs: 0,
        maxSchemaComplexity: 0,
        lengthAccuracy: 0,
      },
      calls: [],
    },
  ],
  stats: {
    throughputTokensPerSec: zeroStat,
    ttftMs: zeroStat,
    totalLatencyMs: zeroStat,
    maxSchemaComplexity: zeroStat,
    lengthAccuracy: zeroStat,
  },
  review: skippedReview(judgeModel),
});
