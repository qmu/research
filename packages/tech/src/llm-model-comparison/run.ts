// Topic orchestration: run the probes as trials against a client and fold the
// per-trial results into a ModelRun. This is the effectful glue between the pure
// domain graders/statistics and the vendor completion port — kept out of the
// entrypoint so it is unit-testable with an injected client (including a throwing
// one, to prove failure isolation), and out of `domain/` because it performs I/O
// (client calls) and must stay pure of that.

import type { CompletionClient } from "../vendors/llm/types";
import type {
  CallRecord,
  ModelCard,
  ModelRun,
  ProbeParams,
  Provenance,
  TrialResult,
} from "./domain/types";
import { buildNestedJsonPrompt, gradeNestedJson } from "./domain/nested-json";
import {
  buildLengthPrompt,
  lengthAccuracy,
  wordCount,
} from "./domain/length-accuracy";
import { tokensPerSecond } from "./domain/speed";
import { summarizeTrials } from "./domain/aggregate";

// Run one trial: the full nested-JSON ladder plus the length probe, capturing
// every call verbatim and deriving the three metrics. NEVER throws — a failed call
// is caught and the trial returns `ok: false` with whatever calls completed, so
// one bad call (or one bad provider) never aborts the run.
export const runTrial = async (
  client: CompletionClient,
  trialNumber: number,
  probe: ProbeParams,
): Promise<TrialResult> => {
  const calls: CallRecord[] = [];
  try {
    let maxDepth = 0;
    for (const target of probe.depthLadder) {
      const prompt = buildNestedJsonPrompt(target);
      const completion = await client.complete(prompt);
      calls.push({
        probe: "nested-json",
        prompt,
        rawOutput: completion.text,
        outputTokens: completion.outputTokens,
        elapsedMs: completion.elapsedMs,
      });
      const grade = gradeNestedJson(target, completion.text);
      if (grade.success && target > maxDepth) {
        maxDepth = target;
      }
    }

    const lengthPrompt = buildLengthPrompt(
      probe.lengthTargetWords,
      probe.lengthTopic,
    );
    const lengthCompletion = await client.complete(lengthPrompt, {
      topic: probe.lengthTopic,
    });
    calls.push({
      probe: "length",
      prompt: lengthPrompt,
      rawOutput: lengthCompletion.text,
      outputTokens: lengthCompletion.outputTokens,
      elapsedMs: lengthCompletion.elapsedMs,
    });
    const accuracy = lengthAccuracy(
      probe.lengthTargetWords,
      wordCount(lengthCompletion.text),
    );

    const totalTokens = calls.reduce((sum, c) => sum + c.outputTokens, 0);
    const totalElapsed = calls.reduce((sum, c) => sum + c.elapsedMs, 0);

    return {
      trial: trialNumber,
      ok: true,
      error: null,
      metrics: {
        tokensPerSecond: tokensPerSecond(totalTokens, totalElapsed),
        maxNestedJsonDepth: maxDepth,
        lengthAccuracy: accuracy,
      },
      calls,
    };
  } catch (error: unknown) {
    return {
      trial: trialNumber,
      ok: false,
      error: String(error),
      metrics: { tokensPerSecond: 0, maxNestedJsonDepth: 0, lengthAccuracy: 0 },
      calls,
    };
  }
};

export type RunOptions = Readonly<{
  trials: number;
  probe: ProbeParams;
  // The live client for this model, or undefined to use the fixture path.
  liveClient: CompletionClient | undefined;
  // Build the deterministic fixture client for a given 0-based trial index.
  fixtureFor: (trialIndex: number) => CompletionClient;
}>;

// Build one model's run: N trials, then aggregate. Provenance is `measured` when
// at least one live trial succeeded, `error` when a live model's every trial
// failed (isolated — not fatal to the matrix), and `fixtured` for the keyless
// path.
export const buildRun = async (
  card: ModelCard,
  opts: RunOptions,
): Promise<ModelRun> => {
  const { trials, probe, liveClient, fixtureFor } = opts;
  const results: TrialResult[] = [];
  for (let i = 0; i < trials; i += 1) {
    const client = liveClient ?? fixtureFor(i);
    results.push(await runTrial(client, i + 1, probe));
  }
  const anyOk = results.some((r) => r.ok);
  const provenance: Provenance = liveClient
    ? anyOk
      ? "measured"
      : "error"
    : "fixtured";
  return {
    ...card,
    provenance,
    trialsRequested: trials,
    trials: results,
    stats: summarizeTrials(results),
  };
};

// A synthetic all-failed run for a model whose client could not even be built
// (e.g. an SDK constructor threw) — keeps one model's fatal error from aborting
// the whole matrix.
export const errorRun = (
  card: ModelCard,
  trials: number,
  reason: string,
): ModelRun => ({
  ...card,
  provenance: "error",
  trialsRequested: trials,
  trials: [
    {
      trial: 1,
      ok: false,
      error: reason,
      metrics: { tokensPerSecond: 0, maxNestedJsonDepth: 0, lengthAccuracy: 0 },
      calls: [],
    },
  ],
  stats: summarizeTrials([]),
});
