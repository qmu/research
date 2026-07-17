import type { TrendModelCard } from "./domain/types";

/**
 * Curated registry of the subjects this topic measures: one search-augmented
 * configuration per provider surface, each paired with an ungrounded control of
 * the same base model, so the metric isolates what live retrieval adds over
 * parametric memory. Perplexity Sonar is search-native and has no ungrounded twin.
 *
 * Token prices and base-model ids mirror the foundation-model catalog
 * (`llm-model-comparison/models.ts`). `searchCostPerKRequestsUsd` is the extra
 * web/search billing grounded surfaces charge on top of tokens (USD per 1000
 * search requests / grounded queries); every value here is a BEST-KNOWN ESTIMATE
 * with a cited source and a last-verified date — the `--estimate` path and the
 * first real trial refine it. Ungrounded controls carry 0.
 */
export const TREND_MODELS: ReadonlyArray<TrendModelCard> = [
  // ── Grounded subjects ────────────────────────────────────────────────────────
  {
    id: "grok-4-3-grounded",
    provider: "xai",
    grounding: "grounded",
    // Live Search was retired mid-series (410 on the 2026-07-17 trial); this
    // subject is the same base model on xAI's replacement grounded surface, the
    // Agent Tools `web_search` tool.
    modelName: "Grok 4.3 + Agent Tools web search",
    apiModelId: "grok-4.3",
    inputCostPerMTok: 1.25,
    outputCostPerMTok: 2.5,
    // Agent Tools re-priced the grounded surface DOWN: retired Live Search billed
    // $25/1k searches, the replacement `web_search` tool bills $5/1k successful
    // calls. Token prices are unchanged ($1.25/$2.50 per Mtok for grok-4.3).
    searchCostPerKRequestsUsd: 5,
    lastVerified: "2026-07-17",
    source: "https://docs.x.ai/developers/pricing",
  },
  {
    id: "sonar-grounded",
    provider: "perplexity",
    grounding: "grounded",
    modelName: "Perplexity Sonar",
    apiModelId: "sonar",
    inputCostPerMTok: 1,
    outputCostPerMTok: 1,
    searchCostPerKRequestsUsd: 5,
    lastVerified: "2026-07-14",
    source: "https://docs.perplexity.ai/guides/pricing",
  },
  {
    id: "sonar-pro-grounded",
    provider: "perplexity",
    grounding: "grounded",
    modelName: "Perplexity Sonar Pro",
    apiModelId: "sonar-pro",
    inputCostPerMTok: 3,
    outputCostPerMTok: 15,
    searchCostPerKRequestsUsd: 8,
    lastVerified: "2026-07-14",
    source: "https://docs.perplexity.ai/guides/pricing",
  },
  {
    id: "gemini-3-1-pro-grounded",
    provider: "google",
    grounding: "grounded",
    modelName: "Gemini 3.1 Pro + Google Search grounding",
    apiModelId: "gemini-3.1-pro-preview",
    inputCostPerMTok: 2,
    outputCostPerMTok: 12,
    searchCostPerKRequestsUsd: 35,
    lastVerified: "2026-07-14",
    source: "https://ai.google.dev/gemini-api/docs/grounding",
  },
  {
    id: "gpt-5-5-grounded",
    provider: "openai",
    grounding: "grounded",
    modelName: "GPT-5.5 + web search",
    apiModelId: "gpt-5.5",
    inputCostPerMTok: 5,
    outputCostPerMTok: 30,
    searchCostPerKRequestsUsd: 10,
    lastVerified: "2026-07-14",
    source: "https://developers.openai.com/api/docs/pricing",
  },
  {
    id: "claude-opus-4-8-grounded",
    provider: "anthropic",
    grounding: "grounded",
    modelName: "Claude Opus 4.8 + web search",
    apiModelId: "claude-opus-4-8",
    inputCostPerMTok: 5,
    outputCostPerMTok: 25,
    searchCostPerKRequestsUsd: 10,
    lastVerified: "2026-07-14",
    source: "https://platform.claude.com/docs/en/about-claude/models/overview",
  },
  // ── Ungrounded controls (same base model, no search tool) ────────────────────
  {
    id: "grok-4-3-ungrounded",
    provider: "xai",
    grounding: "ungrounded",
    modelName: "Grok 4.3 (no search)",
    apiModelId: "grok-4.3",
    inputCostPerMTok: 1.25,
    outputCostPerMTok: 2.5,
    searchCostPerKRequestsUsd: 0,
    lastVerified: "2026-07-14",
    source: "https://docs.x.ai/developers/models/grok-4.3",
  },
  {
    id: "gemini-3-1-pro-ungrounded",
    provider: "google",
    grounding: "ungrounded",
    modelName: "Gemini 3.1 Pro (no grounding)",
    apiModelId: "gemini-3.1-pro-preview",
    inputCostPerMTok: 2,
    outputCostPerMTok: 12,
    searchCostPerKRequestsUsd: 0,
    lastVerified: "2026-07-14",
    source: "https://ai.google.dev/gemini-api/docs/pricing",
  },
  {
    id: "gpt-5-5-ungrounded",
    provider: "openai",
    grounding: "ungrounded",
    modelName: "GPT-5.5 (no search)",
    apiModelId: "gpt-5.5",
    inputCostPerMTok: 5,
    outputCostPerMTok: 30,
    searchCostPerKRequestsUsd: 0,
    lastVerified: "2026-07-14",
    source: "https://developers.openai.com/api/docs/pricing",
  },
  {
    id: "claude-opus-4-8-ungrounded",
    provider: "anthropic",
    grounding: "ungrounded",
    modelName: "Claude Opus 4.8 (no search)",
    apiModelId: "claude-opus-4-8",
    inputCostPerMTok: 5,
    outputCostPerMTok: 25,
    searchCostPerKRequestsUsd: 0,
    lastVerified: "2026-07-14",
    source: "https://platform.claude.com/docs/en/about-claude/models/overview",
  },
];
