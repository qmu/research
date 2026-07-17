import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  citationFreshnessDays,
  scoreAbstention,
  scoreAnswerMatch,
} from "./domain/score";
import { PROBE_MANIFEST } from "./domain/manifest";
import type { TrendRecencyResult } from "./domain/types";

/**
 * The v3 scoring gate, run against REAL recorded data rather than invented
 * strings: re-score every answer the 2026-07-17 first real trial committed and
 * assert what the instrument-version bump is supposed to change — and, just as
 * importantly, what it must NOT.
 *
 * Re-scoring a committed frame is only possible because the run record keeps each
 * answer and its citations in full; it costs nothing and needs no key, which is
 * the whole point of recording them. The v2 frame itself stays exactly as
 * recorded — v3 numbers are produced by a future trial, never by rewriting a past
 * one (trend series connect same-instrument-version points only).
 */

const framePath = resolve(
  process.cwd(),
  "../../docs/research-reports/trend-recency-history/2026-07-17-trend-recency-v2-20260717.result.json",
);

const frame = JSON.parse(readFileSync(framePath, "utf8")) as TrendRecencyResult;

const probeById = new Map(
  PROBE_MANIFEST.probes.map((probe) => [probe.id, probe]),
);

const runById = (id: string) => {
  const run = frame.runs.find((candidate) => candidate.id === id);
  if (run === undefined) throw new Error(`no recorded run ${id}`);
  return run;
};

/** Every recorded call's answer, re-scored with the current (v3) scorer. */
const rescoredAbstentions = (id: string): ReadonlyArray<number> =>
  runById(id).calls.map((call) => scoreAbstention(call.answer));

const recordedAbstentions = (id: string): ReadonlyArray<number> =>
  runById(id).calls.map((call) => call.abstained);

describe("re-scoring the committed v2 frame with the v3 scorer", () => {
  it("reads the frame the first real trial recorded", () => {
    expect(frame.manifestVersion).toBe("trend-recency-v2-20260717");
    expect(frame.fixture).toBe(false);
  });

  it("flags the control abstentions v2 under-counted", () => {
    // All three controls declined honestly on all three probes and scored 0 in
    // v2: GPT-5.5 by U+2019 contractions, Grok and Gemini by dating the event
    // ("have not yet occurred") or denying existence ("No such models exist.").
    for (const id of [
      "gpt-5-5-ungrounded",
      "grok-4-3-ungrounded",
      "gemini-3-1-pro-ungrounded",
    ]) {
      expect(recordedAbstentions(id)).toEqual([0, 0, 0]);
      expect(rescoredAbstentions(id)).toEqual([1, 1, 1]);
    }
  });

  it("keeps the control abstentions v2 already caught", () => {
    expect(recordedAbstentions("claude-opus-4-8-ungrounded")).toEqual([
      1, 1, 1,
    ]);
    expect(rescoredAbstentions("claude-opus-4-8-ungrounded")).toEqual([
      1, 1, 1,
    ]);
  });

  it("un-flags the grounded Claude false positive", () => {
    // The row opened with a decline, announced a lookup, then answered correctly.
    const run = runById("claude-opus-4-8-grounded");
    const index = run.calls.findIndex(
      (call) => call.probeId === "20260709-gpt-5-6-variants",
    );
    expect(run.calls[index].abstained).toBe(1);
    expect(rescoredAbstentions("claude-opus-4-8-grounded")[index]).toBe(0);
  });

  it("leaves every grounded row abstention-free", () => {
    for (const id of [
      "gemini-3-1-pro-grounded",
      "gpt-5-5-grounded",
      "claude-opus-4-8-grounded",
    ]) {
      expect(rescoredAbstentions(id)).toEqual([0, 0, 0]);
    }
  });

  it("does NOT move the trial's recency-accuracy headline", () => {
    // The v3 changes are to abstention and freshness only. Grounded 1.00 vs
    // control 0.00 on every measured pair must survive the instrument bump —
    // if this moves, the published trial result silently changed meaning.
    for (const run of frame.runs) {
      if (run.provenance !== "measured") continue;
      for (const call of run.calls) {
        const probe = probeById.get(call.probeId);
        if (probe === undefined) throw new Error(`no probe ${call.probeId}`);
        expect(scoreAnswerMatch(call.answer, probe)).toBe(call.answerMatch);
      }
      const expected = run.grounding === "grounded" ? 1 : 0;
      for (const call of run.calls) expect(call.answerMatch).toBe(expected);
    }
  });

  it("records that the URL date signal rescues NO row of this frame", () => {
    // An honest negative: not one citation the trial recorded carries a date —
    // not in a provider field, and not in a URL path either (Gemini returns
    // opaque vertexaisearch redirects; OpenAI/Anthropic cited undated permalinks
    // like /index/gpt-5-6/ and /wiki/2026_FIFA_World_Cup). So freshness stays
    // n/a across the v2 frame even with the v3 fallback: the plumbing gives the
    // metric a signal only when a publisher dates its URLs, and resolving cited
    // URLs over the network remains the fix that would close this properly.
    for (const run of frame.runs) {
      for (const call of run.calls) {
        const probe = probeById.get(call.probeId);
        if (probe === undefined) throw new Error(`no probe ${call.probeId}`);
        expect(
          citationFreshnessDays(call.citations, probe.eventDateIso),
        ).toBeUndefined();
      }
    }
  });
});
