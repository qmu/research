import OpenAI from "openai";
import type {
  CompletionClient,
  CompletionOptions,
  JsonSchema,
  StreamedCompletion,
  StructuredCompletion,
} from "./types";
import { openAiResponsesOutputTokens } from "./usage";
import { isNoEffortLevel } from "../../llm-model-comparison/domain/effort";

// Wrap the OpenAI Responses API (`/v1/responses`) behind the domain-named
// CompletionClient. This is a SEPARATE surface from Chat Completions (`openai.ts`):
// the reasoning / `-codex` coding models are reached here. The wire shapes differ —
// `input`/`instructions` instead of `messages`, `reasoning.effort` instead of the
// top-level `reasoning_effort`, `text.format` instead of `response_format`, and the
// response carries `output_text` with a `response.completed` stream event — so it
// is its own thin adapter. The provider's types do not leak past this file; the
// body is built as a neutral object and the double cast at each call site confines
// the exact wire shape here (regardless of how the installed SDK's overloaded
// `responses.create` is typed).

const SYSTEM_FINAL_ANSWER_ONLY =
  "Respond with only the requested output. Do not include preamble, explanation, " +
  "or commentary.";

// Base request body. `reasoning.effort` is added only when a real effort level is
// requested; the `n/a` sentinel (a model with no reasoning-effort knob) omits it,
// since an unsupported effort is a hard 400 rather than a finding.
export const buildOpenAiResponsesBody = (
  model: string,
  prompt: string,
  options: CompletionOptions | undefined,
): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    model,
    instructions: SYSTEM_FINAL_ANSWER_ONLY,
    input: prompt,
    max_output_tokens: options?.maxTokens ?? 2048,
  };
  if (options?.effort && !isNoEffortLevel(options.effort)) {
    body.reasoning = { effort: options.effort };
  }
  return body;
};

// The Responses object carries the concatenated text as `output_text` and the
// generated-token count as `usage.output_tokens`.
type ResponseLike = {
  output_text?: string;
  usage?: { output_tokens?: unknown };
};

// One streamed event, narrowed to the two types this adapter reads: the
// incremental text delta (for time-to-first-token) and the terminal completed
// event (which carries the final response + usage).
type StreamEventLike = {
  type: string;
  delta?: string;
  response?: ResponseLike;
};

export const createOpenAiResponsesCompletionClient = (
  apiModelId: string,
  apiKey: string,
): CompletionClient => {
  const client = new OpenAI({ apiKey });
  // The overloaded `responses.create` param type, taken from the SDK itself, so a
  // neutral body is cast to the exact wire shape without naming a namespace path.
  type CreateParams = Parameters<typeof client.responses.create>[0];
  return {
    model: apiModelId,
    complete: async (prompt, options) => {
      const startedAt = Date.now();
      const response = (await client.responses.create(
        buildOpenAiResponsesBody(
          apiModelId,
          prompt,
          options,
        ) as unknown as CreateParams,
      )) as unknown as ResponseLike;
      return {
        text: response.output_text ?? "",
        outputTokens: openAiResponsesOutputTokens(response.usage),
        elapsedMs: Date.now() - startedAt,
        model: apiModelId,
      };
    },
    completeStreaming: async (prompt, options): Promise<StreamedCompletion> => {
      const startedAt = Date.now();
      const body = buildOpenAiResponsesBody(apiModelId, prompt, options);
      body.stream = true;
      const stream = (await client.responses.create(
        body as unknown as CreateParams,
      )) as unknown as AsyncIterable<StreamEventLike>;
      let ttftMs = 0;
      let text = "";
      let outputTokens = 0;
      for await (const event of stream) {
        if (
          event.type === "response.output_text.delta" &&
          typeof event.delta === "string"
        ) {
          if (ttftMs === 0) ttftMs = Date.now() - startedAt;
          text += event.delta;
        } else if (event.type === "response.completed" && event.response) {
          // The completed event carries the authoritative final text + usage.
          outputTokens = openAiResponsesOutputTokens(event.response.usage);
          if (event.response.output_text) text = event.response.output_text;
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
      const body = buildOpenAiResponsesBody(apiModelId, prompt, options);
      // Responses structured output: json-schema goes under `text.format` (flat
      // name/schema/strict), unlike Chat Completions' nested `response_format`.
      body.text = {
        format: { type: "json_schema", name: "probe", schema, strict: true },
      };
      const response = (await client.responses.create(
        body as unknown as CreateParams,
      )) as unknown as ResponseLike;
      return {
        raw: response.output_text ?? "",
        outputTokens: openAiResponsesOutputTokens(response.usage),
        elapsedMs: Date.now() - startedAt,
        model: apiModelId,
      };
    },
  };
};
