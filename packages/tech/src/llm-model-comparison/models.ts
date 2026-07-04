import type { ModelCard } from "./domain/types";

// Curated registry of the models compared — a MATRIX of ~8 models across the three
// providers, one flagship + mid + small tier each (Google ships two tiers), so the
// routine capability check shows the real spread of speed, structure, and
// instruction-following from a provider's largest model down to its smallest.
//
// Each card carries the provider's official product name, the exact wire id
// (isolated here so a correction is a one-line edit), a curated capability/price
// `tier`, and a cited `source`. Model ids, pricing, and release dates were
// verified against each provider's official pricing/model page at implementation
// time (2026-07); they move quickly, so treat each as correct only as of its
// source. Costs are USD per 1M tokens, input / output; for tiered pricing the
// standard (≤200k-token prompt) tier is recorded, matching the small probe sizes.
export const MODELS: ReadonlyArray<ModelCard> = [
  // ── Anthropic ──────────────────────────────────────────────────────────────
  {
    id: "anthropic-claude-opus-4-8",
    provider: "anthropic",
    tier: "flagship",
    modelName: "Claude Opus 4.8",
    apiModelId: "claude-opus-4-8",
    released: "2026",
    inputCostPerMTok: 5,
    outputCostPerMTok: 25,
    effortLevels: ["low", "medium", "high", "xhigh", "max"],
    source: "https://platform.claude.com/docs/en/about-claude/models/overview",
  },
  {
    id: "anthropic-claude-sonnet-5",
    provider: "anthropic",
    tier: "mid",
    modelName: "Claude Sonnet 5",
    apiModelId: "claude-sonnet-5",
    released: "2026",
    inputCostPerMTok: 3,
    outputCostPerMTok: 15,
    effortLevels: ["low", "medium", "high", "xhigh", "max"],
    source: "https://platform.claude.com/docs/en/about-claude/models/overview",
  },
  {
    id: "anthropic-claude-haiku-4-5",
    provider: "anthropic",
    tier: "small",
    modelName: "Claude Haiku 4.5",
    apiModelId: "claude-haiku-4-5-20251001",
    released: "2025-10",
    inputCostPerMTok: 1,
    outputCostPerMTok: 5,
    effortLevels: ["low", "medium", "high"],
    source: "https://platform.claude.com/docs/en/about-claude/models/overview",
  },
  // ── OpenAI ─────────────────────────────────────────────────────────────────
  {
    id: "openai-gpt-5-5",
    provider: "openai",
    tier: "flagship",
    modelName: "GPT-5.5",
    apiModelId: "gpt-5.5",
    released: "2026",
    inputCostPerMTok: 5,
    outputCostPerMTok: 30,
    effortLevels: ["minimal", "low", "medium", "high"],
    source: "https://developers.openai.com/api/docs/pricing",
  },
  {
    id: "openai-gpt-5",
    provider: "openai",
    tier: "mid",
    modelName: "GPT-5",
    apiModelId: "gpt-5",
    released: "2025",
    inputCostPerMTok: 1.25,
    outputCostPerMTok: 10,
    effortLevels: ["minimal", "low", "medium", "high"],
    source: "https://developers.openai.com/api/docs/pricing",
  },
  {
    id: "openai-gpt-5-mini",
    provider: "openai",
    tier: "small",
    modelName: "GPT-5 mini",
    apiModelId: "gpt-5-mini",
    released: "2025",
    inputCostPerMTok: 0.25,
    outputCostPerMTok: 2,
    effortLevels: ["minimal", "low", "medium", "high"],
    source: "https://developers.openai.com/api/docs/pricing",
  },
  // ── Google ─────────────────────────────────────────────────────────────────
  {
    id: "google-gemini-3-1-pro",
    provider: "google",
    tier: "flagship",
    modelName: "Gemini 3.1 Pro",
    apiModelId: "gemini-3.1-pro-preview",
    released: "2026",
    inputCostPerMTok: 2,
    outputCostPerMTok: 12,
    effortLevels: ["low", "medium", "high"],
    source: "https://ai.google.dev/gemini-api/docs/pricing",
  },
  {
    id: "google-gemini-3-1-flash",
    provider: "google",
    tier: "small",
    modelName: "Gemini 3.1 Flash",
    apiModelId: "gemini-3.1-flash-preview",
    released: "2026",
    inputCostPerMTok: 0.3,
    outputCostPerMTok: 2.5,
    effortLevels: ["low", "medium", "high"],
    source: "https://ai.google.dev/gemini-api/docs/pricing",
  },
];
