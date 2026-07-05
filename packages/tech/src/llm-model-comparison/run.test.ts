import { describe, it, expect } from "vitest";
import { runTrial, buildConfigRun } from "./run";
import type { JudgeConfig } from "./run";
import type { CompletionClient, JsonSchema } from "../vendors/llm/types";
import type { ModelCard, ProbeParams } from "./domain/types";

// Build a value that conforms to any generated schema — so the structured-output
// stub always conforms and the adaptive axis probe climbs to its caps.
const conformingInstance = (schema: JsonSchema): unknown => {
  const s = schema as Record<string, unknown>;
  if (s.type === "object") {
    const props = (s.properties ?? {}) as Record<string, JsonSchema>;
    const required = (s.required ?? []) as ReadonlyArray<string>;
    const out: Record<string, unknown> = {};
    for (const k of required) out[k] = conformingInstance(props[k]);
    return out;
  }
  return "x";
};

const PROBE: ProbeParams = {
  throughputTargetWords: 400,
  throughputTopic: "the water cycle",
  latencyPrompt: "One short fact about the water cycle.",
  // Small caps keep the test escalation short and deterministic.
  schemaProbe: {
    depth: { start: 2, cap: 4 },
    breadth: { start: 2, cap: 4 },
    refineSteps: 2,
    maxTokens: 2048,
  },
  lengthTargetWords: 100,
  lengthTopic: "the water cycle",
};

const CARD: ModelCard = {
  id: "test-model",
  provider: "anthropic",
  tier: "flagship",
  modelName: "Test Model",
  apiModelId: "test",
  released: "2026",
  inputCostPerMTok: 1,
  outputCostPerMTok: 2,
  effortLevels: ["low"],
  source: "https://example.com",
};

const judgeClient: CompletionClient = {
  model: "judge",
  complete: () =>
    Promise.resolve({
      text: "",
      outputTokens: 0,
      elapsedMs: 1,
      model: "judge",
    }),
  completeStreaming: () =>
    Promise.resolve({
      text: "",
      outputTokens: 0,
      elapsedMs: 1,
      ttftMs: 0,
      model: "judge",
    }),
  completeStructured: () =>
    Promise.resolve({
      raw: JSON.stringify({ strengths: "s", weaknesses: "w", bestFor: "b" }),
      outputTokens: 5,
      elapsedMs: 2,
      model: "judge",
    }),
};

const liveJudge: JudgeConfig = {
  client: judgeClient,
  live: true,
  model: "judge",
};

// Always throws — stands in for a provider outage / quota error / bad model id.
const throwingClient: CompletionClient = {
  model: "test",
  complete: () => Promise.reject(new Error("429 quota exhausted")),
  completeStreaming: () => Promise.reject(new Error("429 quota exhausted")),
  completeStructured: () => Promise.reject(new Error("429 quota exhausted")),
};

// Returns well-formed results for every probe; its structured output always
// conforms, so each schema axis climbs to its cap (depth 4, breadth 4 here).
const okClient: CompletionClient = {
  model: "test",
  complete: () =>
    Promise.resolve({
      text: Array.from({ length: 100 }, () => "word").join(" "),
      outputTokens: 20,
      elapsedMs: 10,
      model: "test",
    }),
  completeStreaming: () =>
    Promise.resolve({
      text: "hello there",
      outputTokens: 30,
      elapsedMs: 120,
      ttftMs: 20,
      model: "test",
    }),
  completeStructured: (_prompt, schema) =>
    Promise.resolve({
      raw: JSON.stringify(conformingInstance(schema)),
      outputTokens: 10,
      elapsedMs: 15,
      model: "test",
    }),
};

const fixtureFor = () => okClient;

describe("runTrial", () => {
  it("captures every probe call and derives the metrics on a successful trial", async () => {
    const t = await runTrial(okClient, 1, PROBE, "low");
    expect(t.ok).toBe(true);
    expect(t.error).toBeNull();
    // throughput + latency + depth axis (2,4) + breadth axis (2,4) + length
    expect(t.calls).toHaveLength(7);
    expect(t.calls[0].probe).toBe("throughput");
    expect(t.calls[0].ttftMs).toBe(20);
    expect(t.metrics.throughputTokensPerSec).toBeCloseTo(300, 6); // 30 / ((120-20)/1000)
    // Always conforms → each axis reaches its cap.
    expect(t.metrics.maxSchemaDepth).toBe(4);
    expect(t.metrics.maxSchemaBreadth).toBe(4);
    const schemaCalls = t.calls.filter((c) => c.probe === "schema");
    expect(schemaCalls.some((c) => c.schemaAxis === "depth")).toBe(true);
    expect(schemaCalls.some((c) => c.schemaAxis === "breadth")).toBe(true);
    expect(schemaCalls.every((c) => c.schemaConforms === true)).toBe(true);
  });

  it("records a schema-call rejection as a finding, not a trial failure", async () => {
    // Structured calls reject at depth/breadth >= 4; smaller schemas conform.
    const rejectAtCap: CompletionClient = {
      ...okClient,
      completeStructured: (_prompt, schema) => {
        const s = schema as Record<string, unknown>;
        const props = (s.properties ?? {}) as Record<string, unknown>;
        const wide = Object.keys(props).length >= 4;
        const deep = "child" in props; // a nested child means depth > 1
        if (wide || deep) {
          return Promise.reject(new Error("400 schema too complex"));
        }
        return okClient.completeStructured(_prompt, schema);
      },
    };
    const t = await runTrial(rejectAtCap, 1, PROBE, "low");
    expect(t.ok).toBe(true); // a schema rejection never fails the trial
    expect(t.metrics.maxSchemaDepth).toBe(1); // depth 2 rejected → capped at 1
    const rejected = t.calls.find((c) => c.error?.includes("too complex"));
    expect(rejected?.probe).toBe("schema");
  });

  it("never throws on a failing probe — returns ok:false with the error", async () => {
    const t = await runTrial(throwingClient, 2, PROBE, "low");
    expect(t.ok).toBe(false);
    expect(t.error).toContain("429 quota exhausted");
    expect(t.metrics.throughputTokensPerSec).toBe(0);
  });
});

describe("buildConfigRun failure isolation & judging", () => {
  it("flags a working live configuration `measured` with a judged review", async () => {
    const run = await buildConfigRun(CARD, "low", {
      trials: 3,
      probe: PROBE,
      liveClient: okClient,
      fixtureFor,
      judge: liveJudge,
    });
    expect(run.provenance).toBe("measured");
    expect(run.effort).toBe("low");
    expect(run.stats.throughputTokensPerSec.n).toBe(3);
    expect(run.stats.maxSchemaDepth.mean).toBe(4);
    expect(run.review.provenance).toBe("judged");
    expect(run.review.bestFor).toBe("b");
  });

  it("flags a live configuration whose every trial fails as `error`, review skipped", async () => {
    const run = await buildConfigRun(CARD, "low", {
      trials: 2,
      probe: PROBE,
      liveClient: throwingClient,
      fixtureFor,
      judge: liveJudge,
    });
    expect(run.provenance).toBe("error");
    expect(run.trials.every((t) => !t.ok)).toBe(true);
    expect(run.stats.throughputTokensPerSec.n).toBe(0);
    expect(run.review.provenance).toBe("skipped");
  });

  it("flags the keyless path (no live client) as `fixtured` with a fixtured review", async () => {
    const run = await buildConfigRun(CARD, "low", {
      trials: 2,
      probe: PROBE,
      liveClient: undefined,
      fixtureFor,
      judge: { client: judgeClient, live: false, model: "judge" },
    });
    expect(run.provenance).toBe("fixtured");
    expect(run.review.provenance).toBe("fixtured");
  });
});
