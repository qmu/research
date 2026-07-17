import Anthropic from "@anthropic-ai/sdk";
import type {
  Completion,
  CompletionClient,
  CompletionOptions,
  GroundedAnswer,
  GroundedAnswerClient,
  GroundedCitation,
  JsonSchema,
  LlmClient,
  StreamedCompletion,
  StructuredCompletion,
  VisionCapability,
  VisionClient,
  VisionInput,
  VisionOptions,
} from "./types";
import { anthropicOutputTokens } from "./usage";
import { isNoEffortLevel } from "../../llm-model-comparison/domain/effort";

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

export const ANTHROPIC_VISION_CAPABILITY: VisionCapability = {
  imageInput: true,
  structuredOutput: true,
  supportedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
};

const requireVisionCapability = (
  model: string,
  capability: VisionCapability | undefined,
): VisionCapability => {
  if (!capability) {
    throw new Error(`${model} is not configured as vision-capable`);
  }
  return capability;
};

const requireVisionInput = (
  input: VisionInput,
  capability: VisionCapability,
): VisionInput => {
  if (input.images.length === 0) {
    throw new Error("Vision input requires at least one image");
  }
  const unsupported = input.images.find(
    (image) => !capability.supportedMimeTypes.includes(image.mimeType),
  );
  if (unsupported) {
    throw new Error(`Unsupported vision MIME type: ${unsupported.mimeType}`);
  }
  return input;
};

const imageBlocks = (
  input: VisionInput,
): ReadonlyArray<Record<string, unknown>> =>
  input.images.map((image) => ({
    type: "image",
    source: {
      type: "base64",
      media_type: image.mimeType,
      data: image.base64,
    },
  }));

// Assemble the Messages request. The reasoning-effort knob (`output_config.effort`)
// and structured-output format (`output_config.format`) are Anthropic's, mapped
// here from the provider-neutral options; the double cast keeps this the ONLY
// place that knows the wire shape, regardless of how completely the installed SDK
// types cover these fields.
export const buildAnthropicParams = (
  model: string,
  prompt: string,
  options: CompletionOptions | undefined,
  format?: unknown,
): Record<string, unknown> => {
  const outputConfig: Record<string, unknown> = {};
  // `n/a` is the registry sentinel for a model with no reasoning-effort knob
  // (e.g. Haiku 4.5, which rejects `output_config.effort` with a 400). Omit the
  // field for it — sending an effort the model doesn't support is a hard error,
  // not a finding.
  if (options?.effort && !isNoEffortLevel(options.effort)) {
    outputConfig.effort = options.effort;
  }
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

export const buildAnthropicVisionParams = (
  model: string,
  input: VisionInput,
  options: VisionOptions | undefined,
  capability: VisionCapability | undefined,
  format?: unknown,
): Record<string, unknown> => {
  const verifiedInput = requireVisionInput(
    input,
    requireVisionCapability(model, capability),
  );
  const params = buildAnthropicParams(model, "", options, format);
  params.messages = [
    {
      role: "user",
      content: [
        ...imageBlocks(verifiedInput),
        { type: "text", text: verifiedInput.instruction },
      ],
    },
  ];
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
  };
};

// ── Web search (grounded answers for the trend-recency topic) ─────────────────

const CITED_ANSWER_SYSTEM_PROMPT =
  "Answer the question concisely and factually, and cite the sources you used.";

// `page_age` is a human-readable published date ("April 30, 2025") or a
// relative phrase the platform could not date; keep only what parses to a
// calendar date, normalized to ISO so the freshness metric reads it.
const toIsoDate = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return undefined;
  // A date-only string parses as LOCAL midnight; format the local calendar
  // date (not toISOString, which can shift it across a UTC date boundary).
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

// A web-search Messages response interleaves `web_search_tool_result` blocks
// (everything the search returned, each result carrying `url`/`title`/
// `page_age`) with `text` blocks whose `citations` mark the sources the answer
// ACTUALLY cites (`web_search_result_location`). Prefer the cited set — that is
// what the citation-validity metric means — enriched with the matching search
// result's published date; fall back to the raw search results only when the
// answer carries no citation locations at all. Pure and exported so it is
// unit-tested without a network call.
export const extractAnthropicWebSearchCitations = (
  content: unknown,
): GroundedCitation[] => {
  if (!Array.isArray(content)) return [];
  const cited = new Map<string, GroundedCitation>();
  const searched = new Map<string, GroundedCitation>();
  for (const block of content) {
    if (block === null || typeof block !== "object") continue;
    const record = block as Record<string, unknown>;
    if (record.type === "text" && Array.isArray(record.citations)) {
      for (const citation of record.citations) {
        if (citation === null || typeof citation !== "object") continue;
        const loc = citation as Record<string, unknown>;
        if (loc.type !== "web_search_result_location") continue;
        const url = typeof loc.url === "string" ? loc.url : undefined;
        if (url === undefined) continue;
        const title = typeof loc.title === "string" ? loc.title : undefined;
        cited.set(url, { url, ...(title === undefined ? {} : { title }) });
      }
    }
    if (
      record.type === "web_search_tool_result" &&
      Array.isArray(record.content)
    ) {
      for (const result of record.content) {
        if (result === null || typeof result !== "object") continue;
        const item = result as Record<string, unknown>;
        if (item.type !== "web_search_result") continue;
        const url = typeof item.url === "string" ? item.url : undefined;
        if (url === undefined) continue;
        const title = typeof item.title === "string" ? item.title : undefined;
        const publishedDateIso = toIsoDate(
          typeof item.page_age === "string" ? item.page_age : undefined,
        );
        searched.set(url, {
          url,
          ...(title === undefined ? {} : { title }),
          ...(publishedDateIso === undefined ? {} : { publishedDateIso }),
        });
      }
    }
  }
  if (cited.size === 0) return [...searched.values()];
  return [...cited.values()].map((citation) => {
    const dated = searched.get(citation.url);
    return dated?.publishedDateIso === undefined
      ? citation
      : { ...citation, publishedDateIso: dated.publishedDateIso };
  });
};

// Grounded-answer client for the trend-recency topic: one question in, one
// cited answer out, with the server-side web-search tool enabled. `max_uses`
// bounds the per-answer search surcharge. Tool parameters follow the current
// Anthropic web-search documentation; the topic's first real trial is the live
// verification of this wiring.
export const createAnthropicGroundedClient = (
  apiModelId: string,
  apiKey: string,
): GroundedAnswerClient => {
  const client = new Anthropic({ apiKey });
  return {
    model: apiModelId,
    answer: async (question: string): Promise<GroundedAnswer> => {
      const startedAt = Date.now();
      const response = await client.messages.create({
        model: apiModelId,
        max_tokens: 2048,
        system: CITED_ANSWER_SYSTEM_PROMPT,
        messages: [{ role: "user", content: question }],
        tools: [
          { type: "web_search_20250305", name: "web_search", max_uses: 3 },
        ],
      } as unknown as Anthropic.Messages.MessageCreateParamsNonStreaming);
      return {
        answer: textOf(response.content),
        citations: extractAnthropicWebSearchCitations(response.content),
        outputTokens: anthropicOutputTokens(response.usage),
        elapsedMs: Date.now() - startedAt,
        model: apiModelId,
      };
    },
  };
};

export const createAnthropicVisionClient = (
  apiModelId: string,
  apiKey: string,
  capability: VisionCapability | undefined,
): VisionClient => {
  const verifiedCapability = requireVisionCapability(apiModelId, capability);
  const client = new Anthropic({ apiKey });
  return {
    model: apiModelId,
    capability: verifiedCapability,
    completeVision: async (input, options): Promise<Completion> => {
      const startedAt = Date.now();
      const response = await client.messages.create(
        buildAnthropicVisionParams(
          apiModelId,
          input,
          options,
          verifiedCapability,
        ) as unknown as Anthropic.Messages.MessageCreateParamsNonStreaming,
      );
      return {
        text: textOf(response.content),
        outputTokens: anthropicOutputTokens(response.usage),
        elapsedMs: Date.now() - startedAt,
        model: apiModelId,
      };
    },
    completeVisionStructured: async (
      input,
      schema: JsonSchema,
      options,
    ): Promise<StructuredCompletion> => {
      const startedAt = Date.now();
      const response = await client.messages.create(
        buildAnthropicVisionParams(
          apiModelId,
          input,
          options,
          verifiedCapability,
          {
            type: "json_schema",
            schema,
          },
        ) as unknown as Anthropic.Messages.MessageCreateParamsNonStreaming,
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
