import type { ImageModelCard, NonSubjectProvider } from "./domain/types";

/**
 * Curated registry of the API-accessible image-generation models this topic
 * measures — the single source of truth for subjects, catalog prices, and
 * provenance. Every value is curated catalog data with a cited source and a
 * last-verified date, never a live measurement. Prices are the provider's
 * listed per-image price at the measured size/quality tier (1024px standard).
 */
export const IMAGE_MODELS: ReadonlyArray<ImageModelCard> = [
  {
    id: "gpt-image-1.5",
    provider: "openai",
    modelName: "GPT Image 1.5",
    apiModelId: "gpt-image-1.5",
    pricePerImageUsd: 0.04,
    sizeTier: "1024x1024 medium",
    lastVerified: "2026-07-13",
    source: "https://developers.openai.com/api/docs/pricing",
  },
  {
    id: "gemini-2.5-flash-image",
    provider: "google",
    modelName: "Gemini 2.5 Flash Image",
    apiModelId: "gemini-2.5-flash-image",
    pricePerImageUsd: 0.039,
    sizeTier: "1024x1024 standard",
    lastVerified: "2026-07-13",
    source: "https://ai.google.dev/gemini-api/docs/pricing",
  },
  {
    id: "grok-imagine-image",
    provider: "xai",
    modelName: "Grok Imagine",
    apiModelId: "grok-imagine-image",
    pricePerImageUsd: 0.02,
    sizeTier: "standard",
    lastVerified: "2026-07-13",
    source: "https://docs.x.ai/developers/models",
  },
];

/**
 * Providers in this repository's stack that expose NO image-generation API.
 * Recorded explicitly so the report shows an honest not-applicable row instead
 * of silently omitting a provider (vendor neutrality).
 */
export const NON_SUBJECT_PROVIDERS: ReadonlyArray<NonSubjectProvider> = [
  {
    providerName: "Anthropic",
    reason: "exposes no image-generation API",
    lastVerified: "2026-07-13",
  },
];

/**
 * The fixed vision-judge instrument: one model reads every generated image so
 * scores stay comparable across subjects. Changing the judge is an
 * instrument-version bump, not a silent swap.
 */
export const JUDGE_MODEL_ID = "claude-sonnet-5";
