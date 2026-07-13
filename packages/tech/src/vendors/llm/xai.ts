import type { CompletionClient, ImageGenerationClient } from "./types";
import {
  createOpenAiCompatibleCompletionClient,
  createOpenAiCompatibleImageGenerationClient,
} from "./openai";

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
