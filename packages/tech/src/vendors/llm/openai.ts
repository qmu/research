import OpenAI from "openai";
import type { CompletionClient, CompletionOptions } from "./types";
import { openAiOutputTokens } from "./usage";

// Wrap the official OpenAI SDK behind the domain-named CompletionClient. The
// provider's types do not leak past this function; usage.completion_tokens is
// normalized through the pure helper, and elapsed time is measured around the
// SDK call so timing semantics match the other providers.
const SYSTEM_FINAL_ANSWER_ONLY =
  "Respond with only the requested output. Do not include preamble, explanation, " +
  "or commentary.";

export const createOpenAiCompletionClient = (
  apiModelId: string,
  apiKey: string,
): CompletionClient => {
  const client = new OpenAI({ apiKey });
  return {
    model: apiModelId,
    complete: async (prompt: string, options?: CompletionOptions) => {
      const startedAt = Date.now();
      const response = await client.chat.completions.create({
        model: apiModelId,
        max_completion_tokens: options?.maxTokens ?? 2048,
        messages: [
          { role: "system", content: SYSTEM_FINAL_ANSWER_ONLY },
          { role: "user", content: prompt },
        ],
      });
      const elapsedMs = Date.now() - startedAt;
      const text = response.choices[0]?.message?.content ?? "";
      return {
        text,
        outputTokens: openAiOutputTokens(response.usage),
        elapsedMs,
        model: apiModelId,
      };
    },
  };
};
