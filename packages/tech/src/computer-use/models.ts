import type { ComputerUseModelCard, NonSubjectProvider } from "./domain/types";

/**
 * Curated registry of the API-native computer-use tools this topic measures — the
 * single source of truth for subjects, tool versions, catalog token prices, and
 * provenance. Every value is curated catalog data with a cited source and a
 * last-verified date, never a live measurement. One config per provider is pinned
 * so the only variable across subjects is the model/tool; the shared harness is
 * fixed (see `run.ts`). Correcting an id or price is a one-line edit here.
 *
 * Token prices are USD per 1M tokens (input / output). Computer-use billing is at
 * the underlying model's token rates — there is no separate per-action fee — and
 * screenshots dominate the input side, which is why cost-per-task is a headline
 * metric.
 */
export const COMPUTER_USE_MODELS: ReadonlyArray<ComputerUseModelCard> = [
  {
    id: "anthropic-computer-use-sonnet-5",
    provider: "anthropic",
    modelName: "Claude Sonnet 5 (Computer Use)",
    apiModelId: "claude-sonnet-5",
    toolVersion: "computer_20251124",
    apiSurface: "Messages API (beta computer-use-2025-11-24)",
    inputCostPerMTok: 3,
    outputCostPerMTok: 15,
    lastVerified: "2026-07-14",
    source:
      "https://platform.claude.com/docs/en/docs/agents-and-tools/tool-use/computer-use-tool",
  },
  {
    id: "openai-computer-use-preview",
    provider: "openai",
    modelName: "OpenAI computer-use-preview",
    apiModelId: "computer-use-preview",
    toolVersion: "computer",
    apiSurface: "Responses API",
    inputCostPerMTok: 3,
    outputCostPerMTok: 12,
    lastVerified: "2026-07-14",
    source:
      "https://developers.openai.com/api/docs/models/computer-use-preview",
  },
  {
    id: "google-gemini-2.5-computer-use",
    provider: "google",
    modelName: "Gemini 2.5 Computer Use",
    apiModelId: "gemini-2.5-computer-use-preview-10-2025",
    toolVersion: "computer_use",
    apiSurface: "Gemini API",
    // Gemini 2.5 Computer Use bills at the Gemini 2.5 Pro SKU. The newer
    // Gemini 3.5 Flash computer-use pricing was unverified at last check, so the
    // 2.5 model is pinned to keep every price cited; revisit on the next survey.
    inputCostPerMTok: 1.25,
    outputCostPerMTok: 10,
    lastVerified: "2026-07-14",
    source: "https://ai.google.dev/gemini-api/docs/computer-use",
  },
];

/**
 * Providers in this repository's stack with NO API-native computer-use tool,
 * recorded explicitly so the report shows an honest not-applicable row rather
 * than silently omitting a provider (vendor neutrality).
 */
export const NON_SUBJECT_PROVIDERS: ReadonlyArray<NonSubjectProvider> = [
  {
    providerName: "xAI (Grok)",
    reason: "exposes no API-native computer-use tool",
    lastVerified: "2026-07-14",
  },
];

/** The fixed actuation + observation layer every subject is driven through, so
 * the only variable across subjects is the model/tool. Named here because the
 * report states it and history connects same-harness points only. */
export const HARNESS = "Playwright (repo Playwright MCP plugin)";
