import { GoogleGenAI } from "@google/genai";
import type {
  CompletionClient,
  CompletionOptions,
  JsonSchema,
  StreamedCompletion,
  StructuredCompletion,
} from "./types";
import { googleOutputTokens } from "./usage";

// Wrap the official @google/genai SDK behind the domain-named CompletionClient.
// Effort maps to a thinking budget; structured output uses `responseJsonSchema`;
// time-to-first-token comes from `generateContentStream`. The provider's types do
// not leak past this function, and usageMetadata.candidatesTokenCount is
// normalized through the pure helper.
const SYSTEM_FINAL_ANSWER_ONLY =
  "Respond with only the requested output. Do not include preamble, explanation, " +
  "or commentary.";

// Gemini's reasoning knob is a token budget, not an enum. Map the neutral effort
// labels used across the registry to representative budgets so a config is
// interpretable; a level a model doesn't support surfaces as a failed call.
const EFFORT_BUDGET: Record<string, number> = {
  low: 512,
  medium: 4096,
  high: 16384,
};

const buildConfig = (
  options: CompletionOptions | undefined,
  extra?: Record<string, unknown>,
): Record<string, unknown> => {
  const config: Record<string, unknown> = {
    systemInstruction: SYSTEM_FINAL_ANSWER_ONLY,
    maxOutputTokens: options?.maxTokens ?? 2048,
    ...extra,
  };
  if (options?.effort && options.effort in EFFORT_BUDGET) {
    config.thinkingConfig = { thinkingBudget: EFFORT_BUDGET[options.effort] };
  }
  return config;
};

export const createGoogleCompletionClient = (
  apiModelId: string,
  apiKey: string,
): CompletionClient => {
  const client = new GoogleGenAI({ apiKey });
  return {
    model: apiModelId,
    complete: async (prompt, options) => {
      const startedAt = Date.now();
      const response = await client.models.generateContent({
        model: apiModelId,
        contents: prompt,
        config: buildConfig(options) as unknown,
      } as unknown as Parameters<typeof client.models.generateContent>[0]);
      return {
        text: response.text ?? "",
        outputTokens: googleOutputTokens(response.usageMetadata),
        elapsedMs: Date.now() - startedAt,
        model: apiModelId,
      };
    },
    completeStreaming: async (prompt, options): Promise<StreamedCompletion> => {
      const startedAt = Date.now();
      const stream = await client.models.generateContentStream({
        model: apiModelId,
        contents: prompt,
        config: buildConfig(options) as unknown,
      } as unknown as Parameters<
        typeof client.models.generateContentStream
      >[0]);
      let ttftMs = 0;
      let text = "";
      let outputTokens = 0;
      for await (const chunk of stream) {
        const piece = chunk.text ?? "";
        if (piece) {
          if (ttftMs === 0) ttftMs = Date.now() - startedAt;
          text += piece;
        }
        if (chunk.usageMetadata) {
          outputTokens = googleOutputTokens(chunk.usageMetadata);
        }
      }
      return {
        text,
        outputTokens,
        elapsedMs: Date.now() - startedAt,
        ttftMs,
        model: apiModelId,
      };
    },
    completeStructured: async (
      prompt,
      schema: JsonSchema,
      options,
    ): Promise<StructuredCompletion> => {
      const startedAt = Date.now();
      const response = await client.models.generateContent({
        model: apiModelId,
        contents: prompt,
        config: buildConfig(options, {
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        }) as unknown,
      } as unknown as Parameters<typeof client.models.generateContent>[0]);
      return {
        raw: response.text ?? "",
        outputTokens: googleOutputTokens(response.usageMetadata),
        elapsedMs: Date.now() - startedAt,
        model: apiModelId,
      };
    },
  };
};
