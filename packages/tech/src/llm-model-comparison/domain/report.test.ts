import { describe, it, expect } from "vitest";
import { renderComparisonReport } from "./report";
import type {
  Aggregate,
  ComparisonResult,
  ModelRun,
  Provenance,
  ProbeStats,
  TrialResult,
} from "./types";

const agg = (mean: number, sd: number, n: number): Aggregate => ({
  mean,
  stdDev: sd,
  min: mean - sd,
  max: mean + sd,
  n,
});

const stats = (
  tps: Aggregate,
  depth: Aggregate,
  len: Aggregate,
): ProbeStats => ({
  tokensPerSecond: tps,
  maxNestedJsonDepth: depth,
  lengthAccuracy: len,
});

const okTrial = (
  trial: number,
  tps: number,
  depth: number,
  len: number,
): TrialResult => ({
  trial,
  ok: true,
  error: null,
  metrics: {
    tokensPerSecond: tps,
    maxNestedJsonDepth: depth,
    lengthAccuracy: len,
  },
  calls: [],
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
  trialsRequested: 2,
  trials: [],
  ...over,
});

const measuredRun = run({
  provenance: "measured",
  trials: [okTrial(1, 85, 12, 0.93), okTrial(2, 90, 12, 0.95)],
  stats: stats(agg(87.5, 2.5, 2), agg(12, 0, 2), agg(0.94, 0.01, 2)),
});

const fixturedRun = run({
  id: "openai-gpt",
  provider: "openai",
  tier: "flagship",
  modelName: "GPT-5.5",
  apiModelId: "gpt-5.5",
  inputCostPerMTok: 5,
  outputCostPerMTok: 30,
  effortLevels: ["medium"],
  source: "https://example.com/openai",
  provenance: "fixtured",
  stats: stats(agg(999, 0, 5), agg(99, 0, 5), agg(1, 0, 5)),
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

  it("has all the comprehensive sections", () => {
    expect(page).toContain("## Methodology");
    expect(page).toContain("## Comparison");
    expect(page).toContain("## Per-aspect analysis");
    expect(page).toContain("## Per-model profiles");
    expect(page).toContain("## Data transparency");
    expect(page).toContain("## Scope & limitations");
    expect(page).toContain("## Reproduce");
  });

  it("renders per-aspect distribution tables", () => {
    expect(page).toContain("### Speed (output tokens / second)");
    expect(page).toContain("### Maximum nested-JSON depth");
    expect(page).toContain("### Length-instruction accuracy");
    expect(page).toContain("| Mean ± SD | Min–Max | n |");
  });

  it("renders a per-model profile with curated facts and a source link", () => {
    expect(page).toContain("### Claude Opus 4.8 — anthropic · flagship");
    expect(page).toContain("[source](https://example.com/anthropic)");
  });

  it("quotes the exact probe prompts verbatim and links the artifact", () => {
    expect(page).toContain(
      "Return ONLY a single JSON object nested exactly 16 levels deep",
    );
    expect(page).toContain(
      "Write a single paragraph about the water cycle that is exactly 100 words",
    );
    expect(page).toContain("(./llm-model-comparison.data.json)");
  });

  it("shows measured means and per-trial values for a live model", () => {
    expect(page).toContain("87.5 tok/s");
    expect(page).toContain("87.5 ± 2.5");
    expect(page).toContain("| 1 | 85.0 |"); // per-trial row
  });

  it("masks every probe column for a non-measured model", () => {
    expect(page).not.toContain("999.0 tok/s");
    expect(page).not.toContain("| 99.0 |");
    expect(page).toContain("n/a (fixtured)");
  });

  it("states provenance in words, not colour (a11y root-cause fix)", () => {
    expect(page).toContain("never by colour");
  });

  it("flags an all-failed model as n/a (error)", () => {
    const errored = renderComparisonReport({
      ...result,
      runs: [
        run({
          provenance: "error",
          stats: stats(agg(0, 0, 0), agg(0, 0, 0), agg(0, 0, 0)),
        }),
      ],
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

  it("matches the golden snapshot (formatting regression guard)", () => {
    expect(page).toMatchSnapshot();
  });
});
