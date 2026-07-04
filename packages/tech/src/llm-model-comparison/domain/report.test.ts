import { describe, it, expect } from "vitest";
import { renderComparisonReport } from "./report";
import type {
  Aggregate,
  ComparisonResult,
  ModelRun,
  Provenance,
  ProbeStats,
} from "./types";

const agg = (mean: number, n: number): Aggregate => ({
  mean,
  stdDev: 0,
  min: mean,
  max: mean,
  n,
});

const stats = (
  tps: number,
  depth: number,
  len: number,
  n: number,
): ProbeStats => ({
  tokensPerSecond: agg(tps, n),
  maxNestedJsonDepth: agg(depth, n),
  lengthAccuracy: agg(len, n),
});

const run = (
  over: Partial<ModelRun> & { provenance: Provenance; stats: ProbeStats },
): ModelRun => ({
  id: "anthropic-opus",
  provider: "anthropic",
  tier: "flagship",
  modelName: "Claude Opus 4.8",
  apiModelId: "claude-opus-4-8",
  released: "2026",
  inputCostPerMTok: 5,
  outputCostPerMTok: 25,
  effortLevels: ["low", "high"],
  source: "https://example.com/anthropic",
  trialsRequested: 5,
  trials: [],
  ...over,
});

const measuredRun = run({
  provenance: "measured",
  stats: stats(87.5, 12, 0.94, 5),
});

const fixturedRun = run({
  id: "openai-gpt",
  provider: "openai",
  tier: "flagship",
  modelName: "GPT-5.5",
  apiModelId: "gpt-5.5",
  released: "2026",
  inputCostPerMTok: 5,
  outputCostPerMTok: 30,
  effortLevels: ["medium"],
  source: "https://example.com/openai",
  provenance: "fixtured",
  stats: stats(999, 99, 1, 5),
});

const result: ComparisonResult = {
  runs: [measuredRun, fixturedRun],
  trials: 5,
  generatedAt: "2026-07-04T00:00:00Z",
  probe: {
    depthLadder: [3, 5, 8, 12, 16],
    lengthTargetWords: 100,
    lengthTopic: "the water cycle",
  },
  artifactPath: "llm-model-comparison.data.json",
};

describe("renderComparisonReport", () => {
  const page = renderComparisonReport(result);

  it("starts with frontmatter carrying a non-empty description", () => {
    expect(page.startsWith("---\n")).toBe(true);
    expect(page).toMatch(/\ndescription: \S.*\n/);
  });

  it("renders one table row per model with curated cells", () => {
    expect(page).toContain("| anthropic | Claude Opus 4.8 | flagship |");
    expect(page).toContain("| openai | GPT-5.5 | flagship |");
    expect(page).toContain("$5.00 / $25.00");
  });

  it("shows measured mean probe values for a live row", () => {
    expect(page).toContain("87.5 tok/s");
    expect(page).toContain("12.0"); // depth mean, one decimal
    expect(page).toContain("94%");
  });

  it("masks all three probe columns for a fixtured row", () => {
    expect(page).not.toContain("999.0 tok/s");
    expect(page).not.toContain("| 99.0 |");
    expect(page).toContain("n/a (fixtured)");
  });

  it("reports the distribution (mean ± SD, min–max, n) in the per-probe detail", () => {
    expect(page).toContain("Per-probe detail (mean ± sample SD, min–max, n)");
    expect(page).toContain("87.5 ± 0.0 (87.5–87.5, n=5)");
  });

  it("links the raw per-trial run-artifact", () => {
    expect(page).toContain("(./llm-model-comparison.data.json)");
  });

  it("includes the legend, scope, and publication-constraints prose", () => {
    expect(page).toContain("**Legend.**");
    expect(page).toContain("## Scope & limitations");
    expect(page).toContain("### Publication constraints");
  });

  it("states the trial count in the methodology", () => {
    expect(page).toContain("over **5 trials**");
  });

  it("warns about non-measured rows when any row is fixtured or errored", () => {
    expect(page).toContain("This run includes non-measured rows.");
  });

  it("flags an all-failed model as n/a (error)", () => {
    const errored = renderComparisonReport({
      ...result,
      runs: [run({ provenance: "error", stats: stats(0, 0, 0, 0) })],
    });
    expect(errored).toContain("n/a (error)");
    expect(errored).toContain("This run includes non-measured rows.");
  });

  it("omits the non-measured warning when every row is measured", () => {
    const allMeasured = renderComparisonReport({
      ...result,
      runs: [measuredRun],
    });
    expect(allMeasured).not.toContain("This run includes non-measured rows.");
  });
});
