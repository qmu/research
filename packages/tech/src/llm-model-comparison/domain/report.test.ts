import { describe, it, expect } from "vitest";
import { renderComparisonReport } from "./report";
import type {
  Aggregate,
  ComparisonResult,
  ConfigRun,
  ProbeParams,
  Provenance,
  Review,
} from "./types";

const agg = (mean: number, n: number): Aggregate => ({
  mean,
  stdDev: 0,
  min: mean,
  max: mean,
  n,
});

const review = (provenance: Review["provenance"]): Review => ({
  provenance,
  judgeModel: "claude-opus-4-8",
  strengths: "fast and structured",
  weaknesses: "pricey at high effort",
  bestFor: "latency-sensitive structured extraction",
  raw: "{}",
});

const config = (
  overrides: Partial<ConfigRun> & { effort: string; provenance: Provenance },
): ConfigRun => ({
  id: "test-model",
  provider: "anthropic",
  tier: "flagship",
  modelName: "Test Model",
  apiModelId: "test",
  released: "2026",
  inputCostPerMTok: 5,
  outputCostPerMTok: 25,
  effortLevels: ["low", "high"],
  source: "https://example.com",
  measuredAt: "2026-01-01T00:00:00.000Z",
  trialsRequested: 3,
  trials: [],
  stats: {
    throughputTokensPerSec: agg(150, 3),
    ttftMs: agg(320, 3),
    totalLatencyMs: agg(900, 3),
    maxSchemaDepth: agg(12, 3),
    maxSchemaBreadth: agg(48, 3),
    lengthAccuracy: agg(0.92, 3),
  },
  review: review(overrides.provenance === "error" ? "skipped" : "judged"),
  ...overrides,
});

const PROBE: ProbeParams = {
  throughputTargetWords: 400,
  throughputTopic: "how large language models generate text",
  latencyPrompt: "One short fact about the water cycle.",
  schemaProbe: {
    depth: { start: 2, cap: 128 },
    breadth: { start: 2, cap: 512 },
    refineSteps: 6,
    maxTokens: 8192,
  },
  lengthTargetWords: 100,
  lengthTopic: "the water cycle",
};

const result = (configs: ReadonlyArray<ConfigRun>): ComparisonResult => ({
  configs,
  trials: 3,
  generatedAt: "2026-01-01T00:00:00.000Z",
  probe: PROBE,
  judgeModel: "claude-opus-4-8",
  estimate: {
    configCount: configs.length,
    callCount: 60,
    usdCost: 12.5,
    etaMinutes: 4,
  },
  artifactPath: "llm-model-comparison.data.json",
});

describe("renderComparisonReport", () => {
  it("reports throughput and latency as separate, unit-labelled columns", () => {
    const md = renderComparisonReport(
      result([config({ effort: "low", provenance: "measured" })]),
    );
    expect(md).toContain("Throughput (tok/s)");
    expect(md).toContain("TTFT (ms)");
    expect(md).toContain("Total latency (ms)");
    expect(md).toContain("Max schema depth");
    expect(md).toContain("Max schema breadth");
  });

  it("never presents a fixtured or errored configuration as a live measurement", () => {
    const md = renderComparisonReport(
      result([
        config({ effort: "low", provenance: "fixtured" }),
        config({ effort: "high", provenance: "error" }),
      ]),
    );
    expect(md).toContain("n/a (fixtured)");
    expect(md).toContain("n/a (error)");
  });

  it("states the pre-run cost estimate and the --estimate dry run", () => {
    const md = renderComparisonReport(
      result([config({ effort: "low", provenance: "measured" })]),
    );
    expect(md).toContain("## Cost & time");
    expect(md).toContain("--estimate");
    expect(md).toContain("API calls");
  });

  it("links the complete raw record artifact and renders per-config reviews", () => {
    const md = renderComparisonReport(
      result([config({ effort: "low", provenance: "measured" })]),
    );
    expect(md).toContain("llm-model-comparison.data.json");
    expect(md).toContain("Per-configuration developer reviews");
    expect(md).toContain("latency-sensitive structured extraction");
  });

  it("summary detail omits the per-aspect distributions; full adds per-trial tables", () => {
    const one = result([config({ effort: "low", provenance: "measured" })]);
    expect(renderComparisonReport(one, "summary")).not.toContain(
      "Per-aspect analysis",
    );
    expect(renderComparisonReport(one, "standard")).toContain(
      "Per-aspect analysis",
    );
    expect(renderComparisonReport(one, "full")).toContain(
      "Per-trial measured values",
    );
  });

  it("matches the golden standard-detail snapshot", () => {
    const md = renderComparisonReport(
      result([
        config({ effort: "low", provenance: "measured" }),
        config({ effort: "high", provenance: "measured" }),
      ]),
    );
    expect(md).toMatchSnapshot();
  });
});
