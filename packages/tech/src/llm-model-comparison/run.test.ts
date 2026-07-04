import { describe, it, expect } from "vitest";
import { runTrial, buildConfigRun } from "./run";
import type { JudgeConfig } from "./run";
import type { CompletionClient } from "../vendors/llm/types";
import type { ModelCard, ProbeParams } from "./domain/types";
import { escalatingLadder } from "./domain/json-schema";

const PROBE: ProbeParams = {
  throughputTargetWords: 400,
  throughputTopic: "the water cycle",
  latencyPrompt: "One short fact about the water cycle.",
  schemaLadder: escalatingLadder(3),
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

// A judge that returns a well-formed review. Toggle `live` per test.
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

// Returns well-formed results for every probe. Its structured output conforms to
// the first ladder rung (2 string fields) but not the second (4 fields), so the
// escalation records a tested max schema complexity of exactly 1.
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
  completeStructured: () =>
    Promise.resolve({
      raw: JSON.stringify({ field0: "a", field1: "b" }),
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
    // throughput + latency + (2 schema rungs: rung1 conforms, rung2 breaks) + length
    expect(t.calls).toHaveLength(5);
    expect(t.calls[0].probe).toBe("throughput");
    expect(t.calls[0].ttftMs).toBe(20);
    expect(t.metrics.throughputTokensPerSec).toBeCloseTo(300, 6); // 30 / ((120-20)/1000)
    expect(t.metrics.maxSchemaComplexity).toBe(1); // deepest conforming rung
  });

  it("never throws on a failing call — returns ok:false with the error", async () => {
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
