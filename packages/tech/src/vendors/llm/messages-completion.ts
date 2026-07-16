import Anthropic from "@anthropic-ai/sdk";
import type {
  CompletionClient,
  JsonSchema,
  StreamedCompletion,
  StructuredCompletion,
} from "./types";
import { buildAnthropicParams } from "./anthropic";
import { anthropicOutputTokens } from "./usage";

// The Anthropic Messages API is served through three transports we support: the
// first-party API (`anthropic.ts`), AWS Bedrock (`bedrock.ts`), and Google Vertex
// (`vertex.ts`). All three SDK clients expose the SAME `.messages.create` /
// `.messages.stream` surface (they are generated from one spec), so the
// CompletionClient wiring is written once here and each transport just constructs
// its own client and delegates. The provider-neutral request shaping stays in
// `buildAnthropicParams`; usage normalization stays in `usage.ts`; no transport's
// SDK type leaks past this file.

// The minimal Messages surface the completion client needs — only `create` and
// `stream`. The three transports' SDK clients each expose a `messages` resource
// that is the same shape at runtime but a distinct (narrower) compile-time type,
// so each adapter casts its client to this interface at the ACL boundary, the
// same way this file casts request params to the SDK's param types.
export type MessagesClient = {
  messages: {
    create(
      params: Anthropic.Messages.MessageCreateParamsNonStreaming,
    ): Promise<Anthropic.Messages.Message>;
    stream(
      params: Anthropic.Messages.MessageStreamParams,
    ): ReturnType<Anthropic["messages"]["stream"]>;
  };
};

const textOf = (content: Anthropic.Messages.ContentBlock[]): string =>
  content.map((block) => (block.type === "text" ? block.text : "")).join("");

// Wrap a Messages-API client behind the richer CompletionClient port: a plain
// completion, a streamed completion (for time-to-first-token), and a
// structured-output completion (JSON-schema mode). Identical to the first-party
// Anthropic adapter's client, parameterized by the transport's own SDK client.
export const createMessagesCompletionClient = (
  apiModelId: string,
  client: MessagesClient,
): CompletionClient => ({
  model: apiModelId,
  complete: async (prompt, options) => {
    const startedAt = Date.now();
    const response = await client.messages.create(
      buildAnthropicParams(
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
      buildAnthropicParams(
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
      buildAnthropicParams(apiModelId, prompt, options, {
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
});
