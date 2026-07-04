import Anthropic from "@anthropic-ai/sdk";
import type {
  CompletionClient,
  CompletionOptions,
  JsonSchema,
  LlmClient,
  StreamedCompletion,
  StructuredCompletion,
} from "./types";
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

// A final-answer-only instruction keeps every probe response gradeable.
const SYSTEM_FINAL_ANSWER_ONLY =
  "Respond with only the requested output. Do not include preamble, explanation, " +
  "or commentary.";

const textOf = (content: Anthropic.Messages.ContentBlock[]): string =>
  content.map((block) => (block.type === "text" ? block.text : "")).join("");

// Assemble the Messages request. The reasoning-effort knob (`output_config.effort`)
// and structured-output format (`output_config.format`) are Anthropic's, mapped
// here from the provider-neutral options; the double cast keeps this the ONLY
// place that knows the wire shape, regardless of how completely the installed SDK
// types cover these fields.
const buildParams = (
  model: string,
  prompt: string,
  options: CompletionOptions | undefined,
  format?: unknown,
): Record<string, unknown> => {
  const outputConfig: Record<string, unknown> = {};
  if (options?.effort) outputConfig.effort = options.effort;
  if (format) outputConfig.format = format;
  const params: Record<string, unknown> = {
    model,
    max_tokens: options?.maxTokens ?? 2048,
    system: SYSTEM_FINAL_ANSWER_ONLY,
    messages: [{ role: "user", content: prompt }],
  };
  if (Object.keys(outputConfig).length > 0) {
    params.output_config = outputConfig;
  }
  return params;
};

// Wrap the Anthropic SDK behind the richer CompletionClient for the comparison
// topic: a plain completion, a streamed completion (for time-to-first-token), and
// a structured-output completion (JSON-schema mode). Usage is normalized through
// the pure helper; per-provider mechanics stay inside this file.
export const createAnthropicCompletionClient = (
  apiModelId: string,
  apiKey: string,
): CompletionClient => {
  const client = new Anthropic({ apiKey });
  return {
    model: apiModelId,
    complete: async (prompt, options) => {
      const startedAt = Date.now();
      const response = await client.messages.create(
        buildParams(
          apiModelId,
          prompt,
          options,
        ) as unknown as Anthropic.Messages.MessageCreateParamsNonStreaming,
      );
      return {
        text: textOf(response.content),
        outputTokens: anthropicOutputTokens(response.usage),
        elapsedMs: Date.now() - startedAt,
        model: apiModelId,
      };
    },
    completeStreaming: async (prompt, options): Promise<StreamedCompletion> => {
      const startedAt = Date.now();
      const stream = client.messages.stream(
        buildParams(
          apiModelId,
          prompt,
          options,
        ) as unknown as Anthropic.Messages.MessageStreamParams,
      );
      let ttftMs = 0;
      for await (const event of stream) {
        if (
          ttftMs === 0 &&
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          ttftMs = Date.now() - startedAt;
        }
      }
      const final = await stream.finalMessage();
      return {
        text: textOf(final.content),
        outputTokens: anthropicOutputTokens(final.usage),
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
      const response = await client.messages.create(
        buildParams(apiModelId, prompt, options, {
          type: "json_schema",
          schema,
        }) as unknown as Anthropic.Messages.MessageCreateParamsNonStreaming,
      );
      return {
        raw: textOf(response.content),
        outputTokens: anthropicOutputTokens(response.usage),
        elapsedMs: Date.now() - startedAt,
        model: apiModelId,
      };
    },
  };
};
