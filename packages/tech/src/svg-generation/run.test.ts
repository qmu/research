import { describe, expect, it } from "vitest";
import { estimateSvgGeneration, runSvgGeneration } from "./run";
import { PROMPT_MANIFEST } from "./domain/manifest";
import { SVG_MODELS } from "./models";

describe("runSvgGeneration (fixture path)", () => {
  it("scores every subject deterministically without keys", async () => {
    const result = await runSvgGeneration({ fixture: true, trials: 2 });
    expect(result.fixture).toBe(true);
    expect(result.runs).toHaveLength(SVG_MODELS.length);
    const perModelCalls = PROMPT_MANIFEST.prompts.length * 2;
    for (const run of result.runs) {
      expect(run.provenance).toBe("fixtured");
      expect(run.calls).toHaveLength(perModelCalls);
      // The fixture emits valid svg for every prompt, so validity is a clean 1.
      expect(run.stats.renderValidity.mean).toBe(1);
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

describe("estimateSvgGeneration", () => {
  it("prices every subject and names the ceiling", () => {
    const text = estimateSvgGeneration(undefined, 3);
    for (const card of SVG_MODELS) {
      expect(text).toContain(card.id);
    }
    expect(text).toContain("ceiling");
  });
});
