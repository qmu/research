import type { ModelCard } from "./domain/types";

// Curated registry of the models compared — one flagship per provider for the
// deliberate "minimum for now". Each card carries the provider's official product
// name, the exact wire id (isolated here so a correction is a one-line edit), and
// a cited `source`. Model ids, pricing, and release dates were verified against
// each provider's official pricing/model page at implementation time
// (2026-06-24); they move quickly, so treat each as correct only as of its source.
//
// Costs are USD per 1M tokens, input / output. For Google's tiered pricing the
// standard (≤200k-token prompt) tier is recorded, matching the small probe sizes.
export const MODELS: ReadonlyArray<ModelCard> = [
  {
    id: "anthropic-claude-opus-4-8",
    provider: "anthropic",
    modelName: "Claude Opus 4.8",
    apiModelId: "claude-opus-4-8",
    released: "2026",
    inputCostPerMTok: 5,
    outputCostPerMTok: 25,
    effortLevels: ["low", "medium", "high", "xhigh", "max"],
    source: "https://platform.claude.com/docs/en/about-claude/models/overview",
  },
  {
    id: "openai-gpt-5-5",
    provider: "openai",
    modelName: "GPT-5.5",
    apiModelId: "gpt-5.5",
    released: "2026",
    inputCostPerMTok: 5,
    outputCostPerMTok: 30,
    effortLevels: ["minimal", "low", "medium", "high"],
    source: "https://developers.openai.com/api/docs/pricing",
  },
  {
    id: "google-gemini-3-1-pro",
    provider: "google",
    modelName: "Gemini 3.1 Pro",
    apiModelId: "gemini-3.1-pro-preview",
    released: "2026",
    inputCostPerMTok: 2,
    outputCostPerMTok: 12,
    effortLevels: ["low", "medium", "high"],
    source: "https://ai.google.dev/gemini-api/docs/pricing",
  },
];
