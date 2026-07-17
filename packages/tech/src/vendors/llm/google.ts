import { GoogleGenAI } from "@google/genai";
import type {
  CompletionClient,
  CompletionOptions,
  GeneratedImage,
  GroundedAnswer,
  GroundedAnswerClient,
  GroundedCitation,
  ImageGenerationClient,
  JsonSchema,
  StreamedCompletion,
  StructuredCompletion,
} from "./types";
import { googleOutputTokens } from "./usage";
import { isNoEffortLevel } from "../../llm-model-comparison/domain/effort";

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

export const buildGoogleConfig = (
  options: CompletionOptions | undefined,
  extra?: Record<string, unknown>,
): Record<string, unknown> => {
  const config: Record<string, unknown> = {
    systemInstruction: SYSTEM_FINAL_ANSWER_ONLY,
    maxOutputTokens: options?.maxTokens ?? 2048,
    ...extra,
  };
  if (
    options?.effort &&
    !isNoEffortLevel(options.effort) &&
    options.effort in EFFORT_BUDGET
  ) {
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
        config: buildGoogleConfig(options) as unknown,
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
        config: buildGoogleConfig(options) as unknown,
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
        config: buildGoogleConfig(options, {
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

// ── Google Search grounding (grounded answers for the trend-recency topic) ────

const CITED_ANSWER_SYSTEM_PROMPT =
  "Answer the question concisely and factually, and cite the sources you used.";

// A grounded generateContent response carries the sources under
// `candidates[0].groundingMetadata.groundingChunks[].web` (`uri` + `title`, no
// published date). Read the shape defensively — grounding metadata is absent
// when the model chose not to search — and de-duplicate by URL. Pure and
// exported so it is unit-tested without a network call.
export const extractGoogleGroundingCitations = (
  candidate: unknown,
): GroundedCitation[] => {
  const metadata = (candidate as { groundingMetadata?: unknown } | undefined)
    ?.groundingMetadata;
  const chunks = (metadata as { groundingChunks?: unknown } | undefined)
    ?.groundingChunks;
  if (!Array.isArray(chunks)) return [];
  const byUrl = new Map<string, GroundedCitation>();
  for (const chunk of chunks) {
    if (chunk === null || typeof chunk !== "object") continue;
    const web = (chunk as { web?: unknown }).web;
    if (web === null || typeof web !== "object" || web === undefined) continue;
    const record = web as Record<string, unknown>;
    const uri = typeof record.uri === "string" ? record.uri : undefined;
    if (uri === undefined) continue;
    const title = typeof record.title === "string" ? record.title : undefined;
    byUrl.set(uri, { url: uri, ...(title === undefined ? {} : { title }) });
  }
  return [...byUrl.values()];
};

// Grounded-answer client for the trend-recency topic: one question in, one
// cited answer out, with the Google Search grounding tool enabled
// (`tools: [{ googleSearch: {} }]`). Tool parameters follow the current
// Gemini API grounding documentation; the topic's first real trial is the live
// verification of this wiring.
export const createGoogleGroundedClient = (
  apiModelId: string,
  apiKey: string,
): GroundedAnswerClient => {
  const client = new GoogleGenAI({ apiKey });
  return {
    model: apiModelId,
    answer: async (question: string): Promise<GroundedAnswer> => {
      const startedAt = Date.now();
      const response = await client.models.generateContent({
        model: apiModelId,
        contents: question,
        config: {
          systemInstruction: CITED_ANSWER_SYSTEM_PROMPT,
          maxOutputTokens: 2048,
          tools: [{ googleSearch: {} }],
        } as unknown,
      } as unknown as Parameters<typeof client.models.generateContent>[0]);
      return {
        answer: response.text ?? "",
        citations: extractGoogleGroundingCitations(response.candidates?.[0]),
        outputTokens: googleOutputTokens(response.usageMetadata),
        elapsedMs: Date.now() - startedAt,
        model: apiModelId,
      };
    },
  };
};

// Gemini image models (e.g. gemini-2.5-flash-image) return the image as an
// inline-data part of a generateContent response; this adapter extracts the
// first image part into the provider-neutral GeneratedImage.
export const createGoogleImageGenerationClient = (
  apiModelId: string,
  apiKey: string,
): ImageGenerationClient => {
  const client = new GoogleGenAI({ apiKey });
  return {
    model: apiModelId,
    generateImage: async (prompt): Promise<GeneratedImage> => {
      const startedAt = Date.now();
      const response = await client.models.generateContent({
        model: apiModelId,
        contents: prompt,
      } as unknown as Parameters<typeof client.models.generateContent>[0]);
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        const inline = (
          part as { inlineData?: { data?: string; mimeType?: string } }
        ).inlineData;
        if (inline?.data) {
          return {
            base64: inline.data,
            mimeType:
              inline.mimeType === "image/jpeg" ? "image/jpeg" : "image/png",
            elapsedMs: Date.now() - startedAt,
            model: apiModelId,
          };
        }
      }
      throw new Error(`image generation returned no image (${apiModelId})`);
    },
  };
};
