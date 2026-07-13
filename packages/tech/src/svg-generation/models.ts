import type { NonSubjectProvider, SvgModelCard } from "./domain/types";

/**
 * Curated registry of the subjects this topic measures — one text flagship per
 * provider, since SVG is emitted through the ordinary completion API and the
 * question clients ask is "which frontier model draws best in SVG". ids, prices,
 * and provenance mirror the foundation-model catalog (`llm-model-comparison/
 * models.ts`); every value is curated catalog data with a cited source and a
 * last-verified date, never a live measurement. Prices are USD per million
 * tokens at the model's standard tier.
 */
export const SVG_MODELS: ReadonlyArray<SvgModelCard> = [
  {
    id: "claude-opus-4-8",
    provider: "anthropic",
    modelName: "Claude Opus 4.8",
    apiModelId: "claude-opus-4-8",
    inputCostPerMTok: 5,
    outputCostPerMTok: 25,
    lastVerified: "2026-07-14",
    source: "https://platform.claude.com/docs/en/about-claude/models/overview",
  },
  {
    id: "gpt-5-5",
    provider: "openai",
    modelName: "GPT-5.5",
    apiModelId: "gpt-5.5",
    inputCostPerMTok: 5,
    outputCostPerMTok: 30,
    lastVerified: "2026-07-14",
    source: "https://developers.openai.com/api/docs/pricing",
  },
  {
    id: "gemini-3-1-pro",
    provider: "google",
    modelName: "Gemini 3.1 Pro",
    apiModelId: "gemini-3.1-pro-preview",
    inputCostPerMTok: 2,
    outputCostPerMTok: 12,
    lastVerified: "2026-07-14",
    source: "https://ai.google.dev/gemini-api/docs/pricing",
  },
  {
    id: "grok-4-3",
    provider: "xai",
    modelName: "Grok 4.3",
    apiModelId: "grok-4.3",
    inputCostPerMTok: 1.25,
    outputCostPerMTok: 2.5,
    lastVerified: "2026-07-14",
    source: "https://docs.x.ai/developers/models/grok-4.3",
  },
];

/** Providers in this repository's stack with no distinct SVG capability to note.
 * All four subjects emit SVG through their text API, so — unlike the image topic,
 * where Anthropic exposes no image API — there is no not-applicable row here. Kept
 * as an explicit empty list so the report renderer has the same shape as the
 * image-generation topic. */
export const NON_SUBJECT_PROVIDERS: ReadonlyArray<NonSubjectProvider> = [];
