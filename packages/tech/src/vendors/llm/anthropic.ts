import Anthropic from "@anthropic-ai/sdk";
import type { CompletionClient, CompletionOptions, LlmClient } from "./types";
import { anthropicOutputTokens } from "./usage";

// Default to the latest Claude model. Override with ANTHROPIC_MODEL to benchmark
// a specific model; pin the id in any published comparison.
export const DEFAULT_MODEL = "claude-opus-4-8";

// Wrap the Anthropic SDK behind the domain-named LlmClient. The provider's
// types do not leak past this function.
export const createAnthropicClient = (
  model: string,
  apiKey: string,
): LlmClient => {
  const client = new Anthropic({ apiKey });
  return {
    model,
    generateAnswer: async (prompt: string): Promise<string> => {
      const response = await client.messages.create({
        model,
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      });
      return response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("");
    },
  };
};

// Wrap the Anthropic SDK behind the richer CompletionClient for the comparison
// topic. Captures the wall-clock elapsed time around the SDK call and normalizes
// usage.output_tokens through the pure helper. A final-answer-only instruction
// keeps the response gradeable; no thinking parameter is set.
const SYSTEM_FINAL_ANSWER_ONLY =
  "Respond with only the requested output. Do not include preamble, explanation, " +
  "or commentary.";

export const createAnthropicCompletionClient = (
  apiModelId: string,
  apiKey: string,
): CompletionClient => {
  const client = new Anthropic({ apiKey });
  return {
    model: apiModelId,
    complete: async (prompt: string, options?: CompletionOptions) => {
      const startedAt = Date.now();
      const response = await client.messages.create({
        model: apiModelId,
        max_tokens: options?.maxTokens ?? 2048,
        system: SYSTEM_FINAL_ANSWER_ONLY,
        messages: [{ role: "user", content: prompt }],
      });
      const elapsedMs = Date.now() - startedAt;
      const text = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("");
      return {
        text,
        outputTokens: anthropicOutputTokens(response.usage),
        elapsedMs,
        model: apiModelId,
      };
    },
  };
};
