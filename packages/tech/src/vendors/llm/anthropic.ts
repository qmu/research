import Anthropic from "@anthropic-ai/sdk";
import type { LlmClient } from "./types";

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
