import { GoogleGenAI } from "@google/genai";
import type { CompletionClient, CompletionOptions } from "./types";
import { googleOutputTokens } from "./usage";

// Wrap the official @google/genai SDK behind the domain-named CompletionClient.
// The provider's types do not leak past this function;
// usageMetadata.candidatesTokenCount is normalized through the pure helper, and
// elapsed time is measured around the SDK call to match the other providers.
const SYSTEM_FINAL_ANSWER_ONLY =
  "Respond with only the requested output. Do not include preamble, explanation, " +
  "or commentary.";

export const createGoogleCompletionClient = (
  apiModelId: string,
  apiKey: string,
): CompletionClient => {
  const client = new GoogleGenAI({ apiKey });
  return {
    model: apiModelId,
    complete: async (prompt: string, options?: CompletionOptions) => {
      const startedAt = Date.now();
      const response = await client.models.generateContent({
        model: apiModelId,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_FINAL_ANSWER_ONLY,
          maxOutputTokens: options?.maxTokens ?? 2048,
        },
      });
      const elapsedMs = Date.now() - startedAt;
      return {
        text: response.text ?? "",
        outputTokens: googleOutputTokens(response.usageMetadata),
        elapsedMs,
        model: apiModelId,
      };
    },
  };
};
