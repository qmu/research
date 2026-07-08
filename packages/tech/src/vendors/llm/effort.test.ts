import { describe, expect, it } from "vitest";
import { buildAnthropicParams } from "./anthropic";
import { buildGoogleConfig } from "./google";
import { buildOpenAiChatBody } from "./openai";
import { buildOpenAiRealtimeResponseCreateEvent } from "./openai-realtime";
import { buildOpenAiResponsesBody } from "./openai-responses";

describe("LLM adapter effort handling", () => {
  it("omits Anthropic output_config.effort for n/a", () => {
    expect(
      buildAnthropicParams("model", "prompt", { effort: "n/a" }).output_config,
    ).toBeUndefined();
    expect(
      buildAnthropicParams("model", "prompt", { effort: "low" }).output_config,
    ).toEqual({ effort: "low" });
  });

  it("omits OpenAI Chat reasoning_effort for n/a", () => {
    expect(
      buildOpenAiChatBody("model", "prompt", { effort: "n/a" }),
    ).not.toHaveProperty("reasoning_effort");
    expect(
      buildOpenAiChatBody("model", "prompt", { effort: "high" }),
    ).toHaveProperty("reasoning_effort", "high");
  });

  it("omits OpenAI Responses reasoning.effort for n/a", () => {
    expect(
      buildOpenAiResponsesBody("model", "prompt", { effort: "n/a" }),
    ).not.toHaveProperty("reasoning");
    expect(
      buildOpenAiResponsesBody("model", "prompt", { effort: "xhigh" }),
    ).toHaveProperty("reasoning", { effort: "xhigh" });
  });

  it("omits Google thinkingConfig for n/a", () => {
    expect(buildGoogleConfig({ effort: "n/a" })).not.toHaveProperty(
      "thinkingConfig",
    );
    expect(buildGoogleConfig({ effort: "medium" })).toHaveProperty(
      "thinkingConfig",
      { thinkingBudget: 4096 },
    );
  });

  it("omits effort fields for Realtime response creation", () => {
    const event = buildOpenAiRealtimeResponseCreateEvent({ effort: "n/a" });
    expect(event).toEqual({ type: "response.create" });
    expect(JSON.stringify(event)).not.toContain("effort");
  });
});
