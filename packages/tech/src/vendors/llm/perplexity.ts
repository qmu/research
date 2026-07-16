import type { CompletionClient } from "./types";
import { createOpenAiCompatibleCompletionClient } from "./openai";

// Perplexity's API is OpenAI-compatible (the Chat Completions protocol) served at
// a different base URL, so its Sonar lineup is reached through the OpenAI adapter
// with only the base URL swapped — the same pattern as `xai.ts`, no new SDK and no
// new dependency (see docs/dependency-decisions.md). The single Perplexity-specific
// fact — the base URL — is kept behind this thin wrapper, never in `domain/` or the
// entrypoint. Sonar models are search-grounded: the benchmark measures them as
// served, and that grounding is a provider fact that stays behind this ACL.
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
