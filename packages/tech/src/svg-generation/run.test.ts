import { describe, expect, it } from "vitest";
import {
  createFixtureJudge,
  estimateSvgGeneration,
  judgeSvgFidelity,
  runSvgGeneration,
} from "./run";
import { PROMPT_MANIFEST } from "./domain/manifest";
import { SVG_MODELS } from "./models";
import { createFixtureSvgRasterizer } from "../vendors/raster/fixture";
import type { SvgRasterizer } from "../vendors/raster/types";

describe("runSvgGeneration (fixture path)", () => {
  it("scores every subject deterministically without keys", async () => {
    const result = await runSvgGeneration({ fixture: true, trials: 2 });
    expect(result.fixture).toBe(true);
    expect(result.judgeModel).toBe("fixture-judge");
    expect(result.rasterizer).toBe("fixture-raster");
    expect(result.runs).toHaveLength(SVG_MODELS.length);
    const perModelCalls = PROMPT_MANIFEST.prompts.length * 2;
    for (const run of result.runs) {
      expect(run.provenance).toBe("fixtured");
      expect(run.calls).toHaveLength(perModelCalls);
      // The fixture emits valid svg for every prompt, so validity is a clean 1.
      expect(run.stats.renderValidity.mean).toBe(1);
      // The fixture judge satisfies every rubric constraint, so fidelity is 1
      // over every call — the rasterize → judge → score path runs end to end.
      expect(run.stats.promptFidelity.mean).toBe(1);
      expect(run.stats.promptFidelity.n).toBe(perModelCalls);
      for (const call of run.calls) {
        const prompt = PROMPT_MANIFEST.prompts.find(
          (p) => p.id === call.promptId,
        );
        expect(call.judgeAnswers).toHaveLength(prompt?.constraints.length ?? 0);
      }
      // Animated prompts animate; the presence stat covers only those calls.
      const animatedCount = PROMPT_MANIFEST.prompts.filter(
        (p) => p.kind === "animated",
      ).length;
      expect(run.stats.animationPresence.mean).toBe(1);
      expect(run.stats.animationPresence.n).toBe(animatedCount * 2);
      expect(run.stats.pathComplexity.mean).toBeGreaterThan(0);
    }
  });

  it("is byte-stable across two fixture runs", async () => {
    const a = await runSvgGeneration({ fixture: true, trials: 1 });
    const b = await runSvgGeneration({ fixture: true, trials: 1 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("honours a model-id filter", async () => {
    const result = await runSvgGeneration({
      fixture: true,
      trials: 1,
      modelIds: ["grok-4-3"],
    });
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0].id).toBe("grok-4-3");
  });
});

describe("judgeSvgFidelity", () => {
  const prompt = PROMPT_MANIFEST.prompts[0];
  const rasterizer = createFixtureSvgRasterizer();

  it("scores a structurally invalid SVG 0 without a judge read", async () => {
    const judge = {
      model: "must-not-be-called",
      rubric: () => Promise.reject(new Error("judge must not be called")),
    };
    const scored = await judgeSvgFidelity(
      "<svg><rect></svg>",
      0,
      prompt,
      rasterizer,
      judge,
    );
    expect(scored).toEqual({ promptFidelity: 0 });
  });

  it("scores an unrasterizable SVG 0 instead of crashing", async () => {
    const failing: SvgRasterizer = {
      engine: "always-fails",
      rasterize: () => Promise.reject(new Error("cannot render")),
    };
    const scored = await judgeSvgFidelity(
      "<svg/>",
      1,
      prompt,
      failing,
      createFixtureJudge(),
    );
    expect(scored).toEqual({ promptFidelity: 0 });
  });

  it("scores the satisfied-constraint ratio from the judge's answers", async () => {
    const firstConstraint = prompt.constraints[0];
    const judge = {
      model: "partial-judge",
      rubric: () =>
        Promise.resolve([
          { constraintId: firstConstraint.id, satisfied: true },
        ]),
    };
    const scored = await judgeSvgFidelity(
      "<svg/>",
      1,
      prompt,
      rasterizer,
      judge,
    );
    expect(scored.promptFidelity).toBe(1 / prompt.constraints.length);
    expect(scored.judgeAnswers).toHaveLength(1);
  });
});

describe("estimateSvgGeneration", () => {
  it("prices every subject and names the ceiling and the judge", () => {
    const text = estimateSvgGeneration(undefined, 3);
    for (const card of SVG_MODELS) {
      expect(text).toContain(card.id);
    }
    expect(text).toContain("ceiling");
    expect(text).toContain("judge");
  });
});
