import type { CompletionClient } from "./types";
import { createOpenAiCompatibleCompletionClient } from "./openai";

// xAI's API is OpenAI-compatible (the Chat Completions protocol) served at a
// different base URL, so its coding model (grok-code-fast-1) is reached through the
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
