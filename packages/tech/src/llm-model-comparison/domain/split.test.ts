import { describe, expect, it } from "vitest";
import { aspectsForGroup, GROUP_SPECS, projectComparison } from "./split";
import type {
  Aggregate,
  CallRecord,
  ComparisonResult,
  ConfigRun,
  Probe,
} from "./types";

const agg = (mean: number): Aggregate => ({
  mean,
  stdDev: 0.5,
  min: mean - 1,
  max: mean + 1,
  n: 3,
});

const call = (probe: Probe): CallRecord => ({
  probe,
  effort: "low",
  prompt: `${probe} prompt`,
  rawOutput: `${probe} output`,
  outputTokens: 10,
  elapsedMs: 5,
  ttftMs: probe === "throughput" || probe === "latency" ? 3 : null,
  schemaAxis: null,
  schemaValue: null,
  schemaConforms: null,
  informationQuestionId: null,
  error: null,
});

const config: ConfigRun = {
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
  provenance: "measured",
  measuredAt: "2026-07-09T00:00:00.000Z",
  trialsRequested: 3,
  trials: [
    {
      trial: 1,
      ok: true,
      error: null,
      metrics: {
        throughputTokensPerSec: 150,
        ttftMs: 40,
        totalLatencyMs: 200,
        maxSchemaDepth: 12,
        maxSchemaBreadth: 48,
        lengthAccuracy: 0.9,
        informationAccuracy: 0.8,
      },
      calls: [
        call("throughput"),
        call("latency"),
        call("schema"),
        call("length"),
        call("information"),
      ],
    },
  ],
  stats: {
    throughputTokensPerSec: agg(150),
    ttftMs: agg(40),
    totalLatencyMs: agg(200),
    maxSchemaDepth: agg(12),
    maxSchemaBreadth: agg(48),
    lengthAccuracy: agg(0.9),
    informationAccuracy: agg(0.8),
  },
  review: {
    provenance: "judged",
    judgeModel: "claude-opus-4-8",
    strengths: "s",
    weaknesses: "w",
    bestFor: "b",
    raw: "{}",
  },
};

const result: ComparisonResult = {
  configs: [config],
  trials: 3,
  generatedAt: "2026-07-09T00:00:00.000Z",
  probe: {
    throughputTargetWords: 400,
    throughputTopic: "topic",
    latencyPrompt: "hi",
    schemaProbe: {
      depth: { start: 2, cap: 48 },
      breadth: { start: 2, cap: 192 },
      refineSteps: 4,
      maxTokens: 2048,
    },
    lengthTargetWords: 100,
    lengthTopic: "topic",
    informationAccuracy: {
      dataset: "truthfulqa",
      manifestVersion: "v1",
      license: "MIT",
      questionCount: 5,
      scoring: "f1",
    },
  },
  judgeModel: "claude-opus-4-8",
  estimate: { configCount: 1, callCount: 10, usdCost: 1, etaMinutes: 1 },
  artifactPath: "llm-model-comparison.data.json",
};

const firstConfig = (artifact: ReturnType<typeof projectComparison>) => {
  const run = artifact.configs[0];
  if (run === undefined) throw new Error("no config in projection");
  return run;
};

const firstTrialCalls = (
  artifact: ReturnType<typeof projectComparison>,
): ReadonlyArray<{ probe: string }> => {
  const trial = firstConfig(artifact).trials[0];
  if (trial === undefined) throw new Error("no trial in projection");
  return trial.calls;
};

describe("projectComparison", () => {
  it("preserves each metric's stats, provenance, and trial count exactly", () => {
    const speed = projectComparison(result, "speed", "src.data.json");
    const run = firstConfig(speed);
    expect(run.provenance).toBe("measured");
    expect(run.stats.throughputTokensPerSec.mean).toBe(150);
    expect(run.stats.ttftMs.mean).toBe(40);
    expect(run.stats.totalLatencyMs.mean).toBe(200);
    expect(speed.trials).toBe(3);
    expect(speed.generatedAt).toBe(result.generatedAt);
    expect(speed.sourceArtifact).toBe("src.data.json");
  });

  it("keeps only the group's probe raw-captures per trial", () => {
    const speed = projectComparison(result, "speed", "src.data.json");
    const probes = firstTrialCalls(speed).map((c) => c.probe);
    expect(new Set(probes)).toEqual(new Set(["throughput", "latency"]));

    const accuracy = projectComparison(result, "accuracy", "src.data.json");
    const accProbes = firstTrialCalls(accuracy).map((c) => c.probe);
    expect(new Set(accProbes)).toEqual(
      new Set(["schema", "length", "information"]),
    );
  });

  it("reports only its own metrics", () => {
    expect(projectComparison(result, "speed", "s").metrics).toEqual([
      "throughputTokensPerSec",
      "ttftMs",
      "totalLatencyMs",
    ]);
    expect(projectComparison(result, "accuracy", "s").metrics).toEqual([
      "maxSchemaDepth",
      "maxSchemaBreadth",
      "lengthAccuracy",
      "informationAccuracy",
    ]);
  });

  it("splits the seven metrics with no overlap and no loss", () => {
    const speed = new Set(GROUP_SPECS.speed.metrics);
    const accuracy = new Set(GROUP_SPECS.accuracy.metrics);
    expect([...speed].some((m) => accuracy.has(m))).toBe(false);
    expect(speed.size + accuracy.size).toBe(7);
  });
});

describe("aspectsForGroup", () => {
  it("returns display metadata for each of the group's metrics in order", () => {
    expect(aspectsForGroup("speed").map((a) => a.key)).toEqual([
      "throughputTokensPerSec",
      "ttftMs",
      "totalLatencyMs",
    ]);
    expect(aspectsForGroup("accuracy").map((a) => a.header)).toContain(
      "Length accuracy",
    );
  });
});
