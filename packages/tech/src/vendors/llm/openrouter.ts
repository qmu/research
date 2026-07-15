import type { CompletionClient } from "./types";
import { createOpenAiCompatibleCompletionClient } from "./openai";

// OpenRouter is an aggregator GATEWAY: one key and one bill routed to many
// vendors' models — including the exact frontier models this registry already
// tracks (Claude, GPT, Grok, Gemini). It speaks the OpenAI Chat Completions
// protocol at its own base URL, so it is reached through the same base-URL variant
// of the OpenAI adapter as xAI and Perplexity — no new SDK, no new dependency. The
// single OpenRouter-specific fact (the base URL) stays behind this thin wrapper,
// never in `domain/` or the entrypoint.
//
// Because OpenRouter prices the models we track at their first-party rates
// (passthrough), a comparison against the first-party cards isolates the gateway's
// transport overhead rather than a price difference. OpenRouter spells model ids
// its own way (`anthropic/claude-opus-4.8`, with a dot) — that is a per-backend
// fact carried by each model card's `apiModelId`, so no translation happens here.
// See docs/adr/0007-aggregator-gateway-subset.md.
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export const createOpenRouterCompletionClient = (
  apiModelId: string,
  apiKey: string,
): CompletionClient =>
  createOpenAiCompatibleCompletionClient(
    apiModelId,
    apiKey,
    OPENROUTER_BASE_URL,
  );
