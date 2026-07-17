import OpenAI from "openai";
import type {
  CompletionClient,
  CompletionOptions,
  GeneratedImage,
  ImageGenerationClient,
  JsonSchema,
  StreamedCompletion,
  StructuredCompletion,
} from "./types";
import { openAiOutputTokens } from "./usage";
import { isNoEffortLevel } from "../../llm-model-comparison/domain/effort";

// Wrap the official OpenAI SDK behind the domain-named CompletionClient. Effort
// maps to OpenAI's `reasoning_effort`; structured output uses
// `response_format: { type: "json_schema" }`; time-to-first-token comes from a
// streamed request. The provider's types do not leak past this function, and
// usage.completion_tokens is normalized through the pure helper.
const SYSTEM_FINAL_ANSWER_ONLY =
  "Respond with only the requested output. Do not include preamble, explanation, " +
  "or commentary.";

const messages = (prompt: string) => [
  { role: "system" as const, content: SYSTEM_FINAL_ANSWER_ONLY },
  { role: "user" as const, content: prompt },
];

// Base request body. `reasoning_effort` is added when an effort level is
// requested; the double cast at each call site keeps the exact wire shape (and
// any fields the installed SDK types don't cover) confined to this adapter.
export const buildOpenAiChatBody = (
  model: string,
  prompt: string,
  options: CompletionOptions | undefined,
): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    model,
    max_completion_tokens: options?.maxTokens ?? 2048,
    messages: messages(prompt),
  };
  // `n/a` is the registry sentinel for a model with no reasoning-effort knob;
  // omit the field for it (sending an unsupported effort is a hard 400, not a
  // finding). Applies to OpenAI-compatible endpoints reached through this adapter.
  if (options?.effort && !isNoEffortLevel(options.effort)) {
    body.reasoning_effort = options.effort;
  }
  return body;
};

// The default OpenAI client: the Chat Completions adapter against api.openai.com.
export const createOpenAiCompletionClient = (
  apiModelId: string,
  apiKey: string,
): CompletionClient =>
  createOpenAiCompatibleCompletionClient(apiModelId, apiKey);

// The same Chat Completions adapter parameterized by base URL, so an
// OpenAI-compatible endpoint (e.g. xAI at https://api.x.ai/v1, which speaks the
// Chat Completions protocol) is reached with no protocol duplication — only the
// base URL differs. Provider-specific facts (the URL) stay in the caller / a thin
// per-provider wrapper, never in the domain.
export const createOpenAiCompatibleCompletionClient = (
  apiModelId: string,
  apiKey: string,
  baseURL?: string,
): CompletionClient => {
  const client = new OpenAI({ apiKey, baseURL });
  return {
    model: apiModelId,
    complete: async (prompt, options) => {
      const startedAt = Date.now();
      const response = await client.chat.completions.create(
        buildOpenAiChatBody(
          apiModelId,
          prompt,
          options,
        ) as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
      );
      return {
        text: response.choices[0]?.message?.content ?? "",
        outputTokens: openAiOutputTokens(response.usage),
        elapsedMs: Date.now() - startedAt,
        model: apiModelId,
      };
    },
    completeStreaming: async (prompt, options): Promise<StreamedCompletion> => {
      const startedAt = Date.now();
      const body = buildOpenAiChatBody(apiModelId, prompt, options);
      body.stream = true;
      body.stream_options = { include_usage: true };
      const stream = await client.chat.completions.create(
        body as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
      );
      let ttftMs = 0;
      let text = "";
      let outputTokens = 0;
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          if (ttftMs === 0) ttftMs = Date.now() - startedAt;
          text += delta;
        }
        if (chunk.usage) outputTokens = openAiOutputTokens(chunk.usage);
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
      const body = buildOpenAiChatBody(apiModelId, prompt, options);
      body.response_format = {
        type: "json_schema",
        json_schema: { name: "probe", schema, strict: true },
      };
      const response = await client.chat.completions.create(
        body as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
      );
      return {
        raw: response.choices[0]?.message?.content ?? "",
        outputTokens: openAiOutputTokens(response.usage),
        elapsedMs: Date.now() - startedAt,
        model: apiModelId,
      };
    },
  };
};

// The Images API adapter behind the domain-named ImageGenerationClient.
// Parameterized by base URL for OpenAI-compatible image endpoints (xAI's Grok
// Imagine speaks the same protocol); the default reaches api.openai.com. The
// image models used here return base64 PNG bytes.
//
// Dialect differences between compatible endpoints stay HERE (the ACL), never
// in domain code: xAI rejects the `size` argument (400 "Argument not
// supported: size", observed 2026-07-17) and returns a URL unless
// `response_format: "b64_json"` is requested, while OpenAI's gpt-image models
// accept `size` and always return base64.
export type OpenAiCompatibleImageDialect = Readonly<{
  /** Send `size: "1024x1024"` (OpenAI accepts it; xAI rejects it). */
  includeSize: boolean;
  /** Request `response_format: "b64_json"` (xAI defaults to URL). */
  requestB64Json: boolean;
}>;

const OPENAI_IMAGE_DIALECT: OpenAiCompatibleImageDialect = {
  includeSize: true,
  requestB64Json: false,
};

// Compatible endpoints do not agree on the returned image format (OpenAI's
// gpt-image models return PNG; xAI's Grok Imagine returns JPEG), so the MIME
// type is sniffed from the decoded magic bytes instead of being assumed —
// a mislabeled type is rejected by the vision judge downstream.
const sniffImageMimeType = (
  base64: string,
): "image/png" | "image/jpeg" | "image/webp" | "image/gif" => {
  const head = Buffer.from(base64.slice(0, 24), "base64");
  if (head.length >= 8 && head.readUInt32BE(0) === 0x89504e47)
    return "image/png";
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8)
    return "image/jpeg";
  if (head.length >= 12 && head.toString("latin1", 8, 12) === "WEBP")
    return "image/webp";
  if (head.length >= 4 && head.toString("latin1", 0, 4) === "GIF8")
    return "image/gif";
  return "image/png";
};

export const createOpenAiCompatibleImageGenerationClient = (
  apiModelId: string,
  apiKey: string,
  baseURL?: string,
  dialect: OpenAiCompatibleImageDialect = OPENAI_IMAGE_DIALECT,
): ImageGenerationClient => {
  const client = new OpenAI({ apiKey, baseURL });
  return {
    model: apiModelId,
    generateImage: async (prompt): Promise<GeneratedImage> => {
      const startedAt = Date.now();
      const response = await client.images.generate({
        model: apiModelId,
        prompt,
        n: 1,
        ...(dialect.includeSize ? { size: "1024x1024" } : {}),
        ...(dialect.requestB64Json ? { response_format: "b64_json" } : {}),
      } as unknown as OpenAI.Images.ImageGenerateParamsNonStreaming);
      const base64 = response.data?.[0]?.b64_json;
      if (base64 === undefined || base64 === "") {
        throw new Error(`image generation returned no image (${apiModelId})`);
      }
      return {
        base64,
        mimeType: sniffImageMimeType(base64),
        elapsedMs: Date.now() - startedAt,
        model: apiModelId,
      };
    },
  };
};

export const createOpenAiImageGenerationClient = (
  apiModelId: string,
  apiKey: string,
): ImageGenerationClient =>
  createOpenAiCompatibleImageGenerationClient(apiModelId, apiKey);
