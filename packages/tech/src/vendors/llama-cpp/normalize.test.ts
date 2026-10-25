import { describe, expect, it } from "vitest";
import chat from "./fixtures/chat.json";
import completion from "./fixtures/completion.json";
import captured from "./fixtures/captured-completion.json";
import { normalizeLlamaCpp } from "./normalize";

describe("normalizeLlamaCpp", () => {
  it.each([chat, completion])(
    "normalizes completed server JSON and round-trips JSON",
    (raw) => {
      const result = normalizeLlamaCpp(raw, { elapsedMs: 150, ttftMs: 30 });
      expect(result).toEqual({
        engine: "llama.cpp",
        model: "fixture-model.gguf",
        text: "東京です。",
        finishReason: "choices" in raw ? "stop" : "eos",
        inputTokens: 24,
        outputTokens: 4,
        elapsedMs: 150,
        ttftMs: 30,
        runtime: { promptMs: 12.5, generationMs: 80, tokensPerSecond: 50 },
      });
      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    },
  );
  it("imports a real b11869 native response", () => {
    expect(normalizeLlamaCpp(captured)).toEqual({
      engine: "llama.cpp",
      model: "stories15M-q4_0",
      text: ", there was a little girl named L",
      finishReason: "limit",
      inputTokens: 5,
      outputTokens: 8,
      elapsedMs: null,
      ttftMs: null,
      runtime: {
        promptMs: 35.931,
        generationMs: 347.097,
        tokensPerSecond: 20.16727312537994,
      },
    });
  });
  it("keeps missing measurements null, without deriving client time from server timings", () => {
    expect(normalizeLlamaCpp(chat)).toMatchObject({
      elapsedMs: null,
      ttftMs: null,
    });
    expect(normalizeLlamaCpp({ model: "m", content: "" })).toMatchObject({
      text: "",
      inputTokens: null,
      outputTokens: null,
      runtime: { promptMs: null, generationMs: null, tokensPerSecond: null },
    });
  });
  it("preserves measured zero and ignores invalid token counts and timings", () => {
    expect(
      normalizeLlamaCpp(
        {
          ...completion,
          tokens_evaluated: 0,
          tokens_predicted: 1.5,
          timings: {
            prompt_ms: -1,
            predicted_ms: Infinity,
            predicted_per_second: "50",
          },
        },
        { elapsedMs: 0, ttftMs: 0 },
      ),
    ).toMatchObject({
      inputTokens: 0,
      outputTokens: null,
      elapsedMs: 0,
      ttftMs: 0,
      runtime: { promptMs: null, generationMs: null, tokensPerSecond: null },
    });
  });
  it.each([
    null,
    { ...completion, stop: false },
    {},
    { error: { message: "private server details" } },
    { ...chat, choices: [] },
    { ...chat, choices: [chat.choices[0], chat.choices[0]] },
    { ...chat, choices: [{ delta: { content: "partial" } }] },
    { ...completion, model: "" },
  ])("rejects malformed, error, multi-choice and streaming inputs", (raw) => {
    expect(() => normalizeLlamaCpp(raw)).toThrow();
  });
  it.each([
    { elapsedMs: -1 },
    { elapsedMs: NaN },
    { elapsedMs: 5, ttftMs: 6 },
    { elapsedMs: 5, ttftMs: -1 },
  ])("rejects inconsistent client measurements", (measurement) => {
    expect(() => normalizeLlamaCpp(chat, measurement)).toThrow(
      "Invalid client measurement",
    );
  });
  it("does not mutate imported JSON", () => {
    const before = JSON.stringify(chat);
    normalizeLlamaCpp(chat);
    expect(JSON.stringify(chat)).toBe(before);
  });
});
