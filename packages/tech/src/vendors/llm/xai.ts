import OpenAI from "openai";
import type {
  CompletionClient,
  GroundedAnswer,
  GroundedAnswerClient,
  GroundedCitation,
  ImageGenerationClient,
} from "./types";
import {
  createOpenAiCompatibleCompletionClient,
  createOpenAiCompatibleImageGenerationClient,
} from "./openai";
import { openAiOutputTokens } from "./usage";

// xAI's API is OpenAI-compatible (the Chat Completions protocol) served at a
// different base URL, so its whole Grok lineup (grok-4.3, the 4.20 reasoning/
// non-reasoning pair, and the grok-build coding model) is reached through the
// OpenAI adapter with only the base URL swapped. The single xAI-specific fact — the
// base URL — is kept behind this thin wrapper, never in `domain/` or the entrypoint.
// Reuses the installed `openai` SDK; no new dependency is taken on (see
// docs/dependency-decisions.md).
const XAI_BASE_URL = "https://api.x.ai/v1";

export const createXaiCompletionClient = (
  apiModelId: string,
  apiKey: string,
): CompletionClient =>
  createOpenAiCompatibleCompletionClient(apiModelId, apiKey, XAI_BASE_URL);

// Grok Imagine speaks the OpenAI Images protocol at the same base URL, so the
// image-generation port is the OpenAI adapter with the URL swapped, like the
// completion client above.
export const createXaiImageGenerationClient = (
  apiModelId: string,
  apiKey: string,
): ImageGenerationClient =>
  createOpenAiCompatibleImageGenerationClient(apiModelId, apiKey, XAI_BASE_URL);

// ── Live Search (grounded answers for the trend-recency topic) ────────────────

const CITED_ANSWER_SYSTEM_PROMPT =
  "Answer the question concisely and factually, and cite the sources you used.";

// Live Search is requested through the xAI-specific `search_parameters` request
// extension on the same Chat Completions protocol; the response carries a
// `citations` extension. Documented as an array of URL strings, with richer
// `{ url, title, date }` objects a plausible wire evolution — read BOTH
// defensively and de-duplicate by URL, preferring a dated entry, the same
// convention as the Perplexity ACL. Pure and exported so it is unit-tested
// without a network call.
export const extractXaiCitations = (raw: {
  citations?: unknown;
}): GroundedCitation[] => {
  const byUrl = new Map<string, GroundedCitation>();
  if (!Array.isArray(raw.citations)) return [];
  for (const entry of raw.citations) {
    if (typeof entry === "string") {
      if (entry.length > 0 && !byUrl.has(entry))
        byUrl.set(entry, { url: entry });
      continue;
    }
    if (entry === null || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const url = typeof record.url === "string" ? record.url : undefined;
    if (url === undefined) continue;
    const title = typeof record.title === "string" ? record.title : undefined;
    const date = typeof record.date === "string" ? record.date : undefined;
    byUrl.set(url, {
      url,
      ...(title === undefined ? {} : { title }),
      ...(date === undefined ? {} : { publishedDateIso: date }),
    });
  }
  return [...byUrl.values()];
};

// Grounded-answer client for the trend-recency topic: one question in, one
// cited answer out, with Live Search enabled. `search_parameters` /
// `citations` are xAI extensions the installed OpenAI SDK types do not cover;
// the casts keep that wire shape confined to this adapter. Tool parameters
// follow the current xAI Live Search documentation; the topic's first real
// trial is the live verification of this wiring.
export const createXaiGroundedClient = (
  apiModelId: string,
  apiKey: string,
): GroundedAnswerClient => {
  const client = new OpenAI({ apiKey, baseURL: XAI_BASE_URL });
  return {
    model: apiModelId,
    answer: async (question: string): Promise<GroundedAnswer> => {
      const startedAt = Date.now();
      const response = await client.chat.completions.create({
        model: apiModelId,
        messages: [
          { role: "system", content: CITED_ANSWER_SYSTEM_PROMPT },
          { role: "user", content: question },
        ],
        search_parameters: { mode: "on", return_citations: true },
      } as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);
      const raw = response as unknown as { citations?: unknown };
      return {
        answer: response.choices[0]?.message?.content ?? "",
        citations: extractXaiCitations(raw),
        outputTokens: openAiOutputTokens(response.usage),
        elapsedMs: Date.now() - startedAt,
        model: apiModelId,
      };
    },
  };
};
