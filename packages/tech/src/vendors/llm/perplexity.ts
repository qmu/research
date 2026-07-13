import OpenAI from "openai";
import type {
  CompletionClient,
  GroundedAnswer,
  GroundedAnswerClient,
  GroundedCitation,
} from "./types";
import { createOpenAiCompatibleCompletionClient } from "./openai";
import { openAiOutputTokens } from "./usage";

// Perplexity's API is OpenAI-compatible (the Chat Completions protocol) served at
// a different base URL, so its Sonar lineup is reached through the installed
// `openai` SDK / the OpenAI adapter with only the base URL swapped — the same
// pattern as `xai.ts`, no new SDK and no new dependency (see
// docs/dependency-decisions.md). The single Perplexity-specific fact — the base
// URL — is kept behind this thin wrapper, never in `domain/` or the entrypoint.
// Sonar models are search-native: they ground every answer and return the sources
// they used, which the grounded adapter below normalizes into `GroundedCitation`;
// that grounding is a provider fact that stays behind this ACL.
const PERPLEXITY_BASE_URL = "https://api.perplexity.ai";

export const createPerplexityCompletionClient = (
  apiModelId: string,
  apiKey: string,
): CompletionClient =>
  createOpenAiCompatibleCompletionClient(
    apiModelId,
    apiKey,
    PERPLEXITY_BASE_URL,
  );

const SYSTEM_PROMPT =
  "Answer the question concisely and factually, and cite the sources you used.";

// Sonar returns sources either as a top-level `citations` (an array of URL
// strings) or a richer `search_results` (`[{ title, url, date }]`). Read BOTH
// defensively — the two have coexisted and either may be dropped by a wire change
// — and de-duplicate by URL, preferring the dated `search_results` entry so the
// freshness metric keeps its signal. Pure and exported so it is unit-tested
// without a network call.
export const extractPerplexityCitations = (raw: {
  citations?: unknown;
  search_results?: unknown;
}): GroundedCitation[] => {
  const byUrl = new Map<string, GroundedCitation>();

  if (Array.isArray(raw.citations)) {
    for (const entry of raw.citations) {
      if (typeof entry === "string" && entry.length > 0 && !byUrl.has(entry)) {
        byUrl.set(entry, { url: entry });
      }
    }
  }

  if (Array.isArray(raw.search_results)) {
    for (const entry of raw.search_results) {
      if (entry === null || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const url = typeof record.url === "string" ? record.url : undefined;
      if (url === undefined) continue;
      const title = typeof record.title === "string" ? record.title : undefined;
      const date = typeof record.date === "string" ? record.date : undefined;
      // A dated search_result supersedes a bare citations URL for the same source.
      byUrl.set(url, {
        url,
        ...(title === undefined ? {} : { title }),
        ...(date === undefined ? {} : { publishedDateIso: date }),
      });
    }
  }

  return [...byUrl.values()];
};

export const createPerplexityGroundedClient = (
  apiModelId: string,
  apiKey: string,
): GroundedAnswerClient => {
  const client = new OpenAI({ apiKey, baseURL: PERPLEXITY_BASE_URL });
  return {
    model: apiModelId,
    answer: async (question: string): Promise<GroundedAnswer> => {
      const startedAt = Date.now();
      const response = await client.chat.completions.create({
        model: apiModelId,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: question },
        ],
      } as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);
      // `citations` / `search_results` are Perplexity extensions the SDK types do
      // not cover; the cast keeps that wire shape confined to this adapter.
      const raw = response as unknown as {
        citations?: unknown;
        search_results?: unknown;
      };
      return {
        answer: response.choices[0]?.message?.content ?? "",
        citations: extractPerplexityCitations(raw),
        outputTokens: openAiOutputTokens(response.usage),
        elapsedMs: Date.now() - startedAt,
        model: apiModelId,
      };
    },
  };
};
