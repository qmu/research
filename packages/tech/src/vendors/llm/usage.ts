// Pure normalization of each provider's output-token count into a single number.
//
// The three SDKs name the field differently — Anthropic `usage.output_tokens`,
// OpenAI `usage.completion_tokens`, Google `usageMetadata.candidatesTokenCount` —
// and a wrong field silently corrupts the Speed measurement for one provider
// while the table still "looks fine". Isolating the mapping here, taking the raw
// usage shape as input, makes it a pure function that is unit-tested without a
// network call or an API key. The SDK usage *types* stop at this file; the domain
// depends only on the normalized `outputTokens`.
//
// Each normalizer is defensive: a missing, non-numeric, or zero count returns 0,
// so the runner can detect an unusable measurement and flag the row as not
// measured rather than computing a corrupt tokens-per-second.

const toCount = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

export type AnthropicUsageShape =
  { output_tokens?: unknown } | null | undefined;
export const anthropicOutputTokens = (usage: AnthropicUsageShape): number =>
  toCount(usage?.output_tokens);

export type OpenAiUsageShape =
  { completion_tokens?: unknown } | null | undefined;
export const openAiOutputTokens = (usage: OpenAiUsageShape): number =>
  toCount(usage?.completion_tokens);

// The OpenAI Responses API (/v1/responses) names the field `output_tokens`, not
// Chat Completions' `completion_tokens` — a separate normalizer so the coding
// models reached through the Responses adapter measure throughput correctly.
export type OpenAiResponsesUsageShape =
  { output_tokens?: unknown } | null | undefined;
export const openAiResponsesOutputTokens = (
  usage: OpenAiResponsesUsageShape,
): number => toCount(usage?.output_tokens);

export type GoogleUsageShape =
  { candidatesTokenCount?: unknown } | null | undefined;
export const googleOutputTokens = (usage: GoogleUsageShape): number =>
  toCount(usage?.candidatesTokenCount);

// Ollama's /api/generate and /api/chat responses name the output-token count
// `eval_count` (the number of tokens evaluated while generating the response,
// per the documented API shape at
// https://github.com/ollama/ollama/blob/main/docs/api.md). Only present on the
// final response of a stream (`done: true`); an in-progress chunk is correctly
// read as 0 by `toCount`, the same "not yet measured" signal every other
// provider's partial usage gives.
export type OllamaUsageShape = { eval_count?: unknown } | null | undefined;
export const ollamaOutputTokens = (usage: OllamaUsageShape): number =>
  toCount(usage?.eval_count);
