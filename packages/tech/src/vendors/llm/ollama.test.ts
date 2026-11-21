import { describe, expect, it } from "vitest";
import {
  normalizeOllamaCompletion,
  type OllamaGenerateResponse,
} from "./ollama";

// A captured-shape /api/generate response, reproducing every field Ollama's
// documented API returns for a non-streamed request
// (https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-completion):
// `context` and the `*_duration` fields (nanoseconds) are real wire fields this
// adapter does not read — the normalizer must ignore them rather than choke on
// the extra shape, the same tolerance every other provider's normalizer has for
// fields its `Completion` contract does not carry.
const OLLAMA_SAMPLE_GENERATE_RESPONSE: OllamaGenerateResponse & {
  created_at: string;
  done_reason: string;
  context: ReadonlyArray<number>;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  eval_duration: number;
} = {
  model: "llama3.1:8b",
  created_at: "2026-08-01T12:00:00.000000000Z",
  response: "The capital of France is Paris.",
  done: true,
  done_reason: "stop",
  context: [1, 2, 3],
  total_duration: 5191566416,
  load_duration: 2154458,
  prompt_eval_count: 26,
  prompt_eval_duration: 383809000,
  eval_count: 8,
  eval_duration: 4799921000,
};

describe("normalizeOllamaCompletion", () => {
  it("normalizes a real-shaped /api/generate response into the common Completion", () => {
    expect(
      normalizeOllamaCompletion(
        OLLAMA_SAMPLE_GENERATE_RESPONSE,
        "llama3.1:8b",
        312,
      ),
    ).toEqual({
      text: "The capital of France is Paris.",
      outputTokens: 8,
      elapsedMs: 312,
      model: "llama3.1:8b",
    });
  });

  it("reports the caller's measured elapsedMs, not a provider-reported duration", () => {
    const first = normalizeOllamaCompletion(
      OLLAMA_SAMPLE_GENERATE_RESPONSE,
      "llama3.1:8b",
      100,
    );
    const second = normalizeOllamaCompletion(
      OLLAMA_SAMPLE_GENERATE_RESPONSE,
      "llama3.1:8b",
      900,
    );
    expect(first.elapsedMs).toBe(100);
    expect(second.elapsedMs).toBe(900);
  });

  it("falls back to an empty string and 0 tokens for a missing response/count", () => {
    expect(normalizeOllamaCompletion({}, "llama3.1:8b", 50)).toEqual({
      text: "",
      outputTokens: 0,
      elapsedMs: 50,
      model: "llama3.1:8b",
    });
  });

  it("reads 0 output tokens from an in-progress streamed chunk (done: false)", () => {
    const chunk: OllamaGenerateResponse = {
      model: "llama3.1:8b",
      response: "The",
      done: false,
    };
    expect(
      normalizeOllamaCompletion(chunk, "llama3.1:8b", 40).outputTokens,
    ).toBe(0);
  });

  it("is total over a non-string response field", () => {
    expect(
      normalizeOllamaCompletion(
        { response: 12345 } as unknown as OllamaGenerateResponse,
        "llama3.1:8b",
        10,
      ).text,
    ).toBe("");
  });
});
