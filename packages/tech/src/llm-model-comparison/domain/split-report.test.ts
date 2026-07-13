import { describe, expect, it } from "vitest";
import { renderSplitReport } from "./split-report";
import { projectComparison } from "./split";
import type { Aggregate, ComparisonResult, ConfigRun } from "./types";

const agg = (mean: number, n = 3): Aggregate => ({
  mean,
  stdDev: 0.5,
  min: mean - 1,
  max: mean + 1,
  n,
});

const makeConfig = (
  overrides: Partial<ConfigRun> & Pick<ConfigRun, "stats" | "provenance">,
): ConfigRun => ({
  id: "anthropic-claude-fable-5",
  provider: "anthropic",
  tier: "frontier",
  modelName: "Claude Fable 5",
  apiModelId: "claude-fable-5",
  released: "2026-06",
  inputCostPerMTok: 6,
  outputCostPerMTok: 30,
  effortLevels: ["low"],
  source: "https://example.com",
  effort: "low",
  measuredAt: "2026-07-09T00:00:00.000Z",
  trialsRequested: 3,
  trials: [],
  review: {
    provenance: "judged",
    judgeModel: "claude-opus-4-8",
    strengths: "s",
    weaknesses: "w",
    bestFor: "b",
    raw: "{}",
  },
  ...overrides,
});

const stats = (throughput: number) => ({
  throughputTokensPerSec: agg(throughput),
  ttftMs: agg(42),
  totalLatencyMs: agg(210),
  maxSchemaDepth: agg(12),
  maxSchemaBreadth: agg(48),
  lengthAccuracy: agg(0.9),
  informationAccuracy: agg(0.8),
});

const result: ComparisonResult = {
  configs: [
    makeConfig({ provenance: "measured", stats: stats(150) }),
    makeConfig({
      provenance: "measured",
      modelName: "Claude Sonnet 5",
      id: "anthropic-claude-sonnet-5",
      stats: stats(250),
    }),
  ],
  trials: 3,
  generatedAt: "2026-07-09T00:00:00.000Z",
  probe: {
    speedTargetWords: 200,
    speedTopic: "topic",
    speedTrials: 3,
    schemaProbe: {
      depth: { start: 2, cap: 48 },
      breadth: { start: 2, cap: 192 },
      refineSteps: 4,
      maxTokens: 2048,
    },
    informationAccuracy: {
      dataset: "truthfulqa",
      manifestVersion: "v1",
      license: "MIT",
      questionCount: 5,
      scoring: "f1",
    },
  },
  judgeModel: "claude-opus-4-8",
  estimate: { configCount: 2, callCount: 20, usdCost: 2, etaMinutes: 2 },
  artifactPath: "llm-model-comparison.data.json",
  instrumentVersion: 2,
};

describe("renderSplitReport", () => {
  it("renders a speed report with only speed columns and a measured value", () => {
    const md = renderSplitReport(
      projectComparison(result, "speed", "llm-model-comparison.data.json"),
    );
    expect(md).toContain("# LLM response speed comparison");
    expect(md).toContain("Throughput (tok/s)");
    expect(md).toContain("TTFT (ms)");
    expect(md).toContain("| Anthropic | Claude Fable 5 |");
    expect(md).not.toContain("| anthropic | Claude Fable 5 |");
    // Accuracy columns must NOT leak into the speed report headline.
    expect(md).not.toContain("Max schema depth");
    expect(md).not.toContain("Information accuracy");
    // The measured throughput value is carried across.
    expect(md).toContain("250");
    // Provenance note that this is a projection, not a fresh measurement.
    expect(md).toContain("projection of the combined LLM comparison sweep");
    expect(md).toContain("llm-model-comparison.data.json");
  });

  it("renders an accuracy report with only accuracy columns", () => {
    const md = renderSplitReport(
      projectComparison(result, "accuracy", "llm-model-comparison.data.json"),
    );
    expect(md).toContain("# LLM output accuracy");
    expect(md).toContain("Max schema depth");
    expect(md).toContain("Length accuracy");
    expect(md).not.toContain("Throughput (tok/s)");
    expect(md).not.toContain("TTFT (ms)");
  });

  it("keeps section 4 as an aggregated overview and the tables in section 7", () => {
    const md = renderSplitReport(
      projectComparison(result, "speed", "llm-model-comparison.data.json"),
    );
    const results = md.slice(
      md.indexOf("## 4. Verification Results"),
      md.indexOf("## 5. Analysis"),
    );
    const data = md.slice(md.indexOf("## 7. Verification Data"));
    // §4: one aggregated row per aspect, no per-configuration table.
    expect(results).toContain("| Aspect | Best (configuration) |");
    expect(results).toContain("section 7, Verification Data");
    expect(results).not.toContain("| Provider | Model | Tier |");
    expect(results).not.toContain("| Configuration | Mean ± 95% CI |");
    // §7: the full per-configuration tables live here.
    expect(data).toContain("| Provider | Model | Tier |");
    expect(data).toContain("| Configuration | Mean ± 95% CI |");
  });

  it("does not advertise omitted accuracy metrics as measured coverage", () => {
    const older: ComparisonResult = {
      ...result,
      configs: result.configs.map((config) => {
        const stats = Object.fromEntries(
          Object.entries(config.stats).filter(
            ([key]) => key !== "informationAccuracy",
          ),
        ) as ConfigRun["stats"];
        return { ...config, stats };
      }),
    };
    const md = renderSplitReport(
      projectComparison(older, "accuracy", "old.data.json"),
    );
    expect(md).toContain(
      "covering JSON-schema structural limits and length-instruction following",
    );
    expect(md).not.toContain(
      "covering JSON-schema structural limits, length-instruction following, and factual information accuracy",
    );
    expect(md).toContain("**Not measured in this run.** Information accuracy");
  });

  it("marks fixtured configurations as not measured", () => {
    const fixtured: ComparisonResult = {
      ...result,
      configs: [makeConfig({ provenance: "fixtured", stats: stats(150) })],
    };
    const md = renderSplitReport(
      projectComparison(fixtured, "speed", "src.data.json"),
    );
    expect(md).toContain("n/a (fixtured)");
  });
});
