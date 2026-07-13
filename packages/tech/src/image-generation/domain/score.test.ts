import { describe, expect, it } from "vitest";
import {
  scorePromptAdherence,
  scoreTextRenderAccuracy,
  summarizeStat,
} from "./score";
import { PROMPT_MANIFEST } from "./manifest";
import type { ImagePrompt } from "./types";

const adherencePrompt: ImagePrompt = {
  id: "p",
  kind: "adherence",
  prompt: "x",
  constraints: [
    { id: "a", question: "A?" },
    { id: "b", question: "B?" },
    { id: "c", question: "C?" },
  ],
};

describe("scorePromptAdherence", () => {
  it("counts satisfied constraints over the rubric total", () => {
    expect(
      scorePromptAdherence(adherencePrompt, [
        { constraintId: "a", satisfied: true },
        { constraintId: "b", satisfied: false },
        { constraintId: "c", satisfied: true },
      ]),
    ).toBeCloseTo(2 / 3);
  });

  it("treats unanswered constraints as unsatisfied and ignores unknown ids", () => {
    expect(
      scorePromptAdherence(adherencePrompt, [
        { constraintId: "a", satisfied: true },
        { constraintId: "not-in-rubric", satisfied: true },
      ]),
    ).toBeCloseTo(1 / 3);
  });

  it("scores an empty rubric as zero rather than dividing by zero", () => {
    expect(
      scorePromptAdherence({ ...adherencePrompt, constraints: [] }, []),
    ).toBe(0);
  });
});

describe("scoreTextRenderAccuracy", () => {
  it("ignores case and punctuation", () => {
    expect(
      scoreTextRenderAccuracy("HELLO BENCHMARK", "hello, benchmark!"),
    ).toBe(1);
  });

  it("scores missing words proportionally", () => {
    expect(
      scoreTextRenderAccuracy("QMU RESEARCH 2026", "QMU 2026"),
    ).toBeCloseTo(2 / 3);
  });

  it("does not double-count a repeated expected token", () => {
    expect(scoreTextRenderAccuracy("go go stop", "go stop")).toBeCloseTo(2 / 3);
  });
});

describe("summarizeStat", () => {
  it("returns zeros for no samples and stdDev 0 for one sample", () => {
    expect(summarizeStat([])).toEqual({ mean: 0, stdDev: 0, n: 0 });
    expect(summarizeStat([5])).toEqual({ mean: 5, stdDev: 0, n: 1 });
  });

  it("computes mean and sample standard deviation", () => {
    const stat = summarizeStat([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(stat.mean).toBeCloseTo(5);
    expect(stat.stdDev).toBeCloseTo(2.138, 3);
    expect(stat.n).toBe(8);
  });
});

describe("prompt manifest", () => {
  it("gives every adherence prompt a rubric and every text prompt an expected string", () => {
    for (const prompt of PROMPT_MANIFEST.prompts) {
      if (prompt.kind === "adherence") {
        expect(prompt.constraints.length, prompt.id).toBeGreaterThan(0);
        expect(prompt.expectedText, prompt.id).toBeUndefined();
      } else {
        expect(prompt.constraints.length, prompt.id).toBe(0);
        expect((prompt.expectedText ?? "").length, prompt.id).toBeGreaterThan(
          0,
        );
      }
    }
    const ids = PROMPT_MANIFEST.prompts.map((prompt) => prompt.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
