import { describe, it, expect } from "vitest";
import { runTrial, buildRun } from "./run";
import type { CompletionClient } from "../vendors/llm/types";
import type { ModelCard, ProbeParams } from "./domain/types";

const PROBE: ProbeParams = {
  depthLadder: [3, 5, 8],
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

// Always throws — stands in for a provider outage / quota error / bad model id.
const throwingClient: CompletionClient = {
  model: "test",
  complete: () => Promise.reject(new Error("429 quota exhausted")),
};

// Returns well-formed completions for both probe shapes.
const okClient: CompletionClient = {
  model: "test",
  complete: (prompt: string) =>
    Promise.resolve({
      text: /levels deep/.test(prompt)
        ? '{"child":{"child":{"child":"leaf"}}}'
        : Array.from({ length: 100 }, () => "word").join(" "),
      outputTokens: 20,
      elapsedMs: 10,
      model: "test",
    }),
};

const fixtureFor = () => okClient;

describe("runTrial", () => {
  it("captures every call verbatim on a successful trial", async () => {
    const t = await runTrial(okClient, 1, PROBE);
    expect(t.ok).toBe(true);
    expect(t.error).toBeNull();
    // one call per ladder rung plus the length probe
    expect(t.calls).toHaveLength(PROBE.depthLadder.length + 1);
    expect(t.calls[0].prompt).toContain("levels deep");
    expect(t.metrics.maxNestedJsonDepth).toBe(3); // deepest rung the JSON satisfies
  });

  it("never throws on a failing call — returns ok:false with the error", async () => {
    const t = await runTrial(throwingClient, 2, PROBE);
    expect(t.ok).toBe(false);
    expect(t.error).toContain("429 quota exhausted");
    expect(t.metrics.tokensPerSecond).toBe(0);
  });
});

describe("buildRun failure isolation", () => {
  it("flags a live model whose every trial fails as `error`, without throwing", async () => {
    const run = await buildRun(CARD, {
      trials: 3,
      probe: PROBE,
      liveClient: throwingClient,
      fixtureFor,
    });
    expect(run.provenance).toBe("error");
    expect(run.trials).toHaveLength(3);
    expect(run.trials.every((t) => !t.ok)).toBe(true);
    expect(run.stats.tokensPerSecond.n).toBe(0); // failures excluded from stats
  });

  it("flags a working live model as `measured`", async () => {
    const run = await buildRun(CARD, {
      trials: 4,
      probe: PROBE,
      liveClient: okClient,
      fixtureFor,
    });
    expect(run.provenance).toBe("measured");
    expect(run.stats.tokensPerSecond.n).toBe(4);
  });

  it("flags the keyless path (no live client) as `fixtured`", async () => {
    const run = await buildRun(CARD, {
      trials: 2,
      probe: PROBE,
      liveClient: undefined,
      fixtureFor,
    });
    expect(run.provenance).toBe("fixtured");
    expect(run.trials).toHaveLength(2);
  });
});
