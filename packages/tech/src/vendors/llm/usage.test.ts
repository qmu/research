import { describe, it, expect } from "vitest";
import {
  anthropicOutputTokens,
  openAiOutputTokens,
  openAiResponsesOutputTokens,
  googleOutputTokens,
  ollamaOutputTokens,
} from "./usage";

describe("usage normalization", () => {
  it("reads Anthropic's output_tokens field", () => {
    expect(anthropicOutputTokens({ output_tokens: 201 })).toBe(201);
  });

  it("reads OpenAI's completion_tokens field", () => {
    expect(openAiOutputTokens({ completion_tokens: 188 })).toBe(188);
  });

  it("reads the OpenAI Responses API's output_tokens field", () => {
    expect(openAiResponsesOutputTokens({ output_tokens: 244 })).toBe(244);
    expect(openAiResponsesOutputTokens({ output_tokens: 0 })).toBe(0);
    expect(openAiResponsesOutputTokens(undefined)).toBe(0);
  });

  it("reads Google's candidatesTokenCount field", () => {
    expect(googleOutputTokens({ candidatesTokenCount: 175 })).toBe(175);
  });

  it("reads Ollama's eval_count field", () => {
    expect(ollamaOutputTokens({ eval_count: 142 })).toBe(142);
  });

  it("returns 0 for a missing usage object", () => {
    expect(anthropicOutputTokens(undefined)).toBe(0);
    expect(openAiOutputTokens(null)).toBe(0);
    expect(googleOutputTokens(undefined)).toBe(0);
    expect(ollamaOutputTokens(undefined)).toBe(0);
  });

  it("returns 0 for a missing or zero count so the runner can flag the row", () => {
    expect(anthropicOutputTokens({})).toBe(0);
    expect(openAiOutputTokens({ completion_tokens: 0 })).toBe(0);
    expect(googleOutputTokens({ candidatesTokenCount: -5 })).toBe(0);
    // An in-progress streamed chunk before the final `done: true` line.
    expect(ollamaOutputTokens({ eval_count: 0 })).toBe(0);
  });

  it("ignores a non-numeric count", () => {
    expect(
      anthropicOutputTokens({ output_tokens: "201" as unknown as number }),
    ).toBe(0);
  });
});
