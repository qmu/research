import type { ModelCard } from "./domain/types";

// Curated registry of the models compared — a MATRIX spanning each of the three
// keyed providers' current tiers (July 2026), from the frontier model down to the
// smallest, plus OpenAI's Realtime API surface and a reasoning model, so the
// routine capability check shows the real spread of speed, structure, and
// instruction-following across a provider's whole lineup.
//
// Each card carries the provider's official product name, the exact wire id
// (isolated here so a correction is a one-line edit), a curated capability/price
// `tier`, an optional `api` surface (default chat-completions), and a cited
// `source`. Model ids were VERIFIED to respond against the live APIs at
// implementation time (2026-07); pricing/release dates were checked against each
// provider's official page and some tier prices are best-known estimates — treat
// every curated cell as correct only as of its source. Costs are USD per 1M
// tokens, input / output.
//
// Cross-provider models (xAI Grok, DeepSeek, Qwen, Mistral, …) are intentionally
// out of scope here: they need their own API keys (and, being OpenAI-compatible,
// only a base-URL variant of the OpenAI adapter) — a follow-up once keys exist.
export const MODELS: ReadonlyArray<ModelCard> = [
  // ── Anthropic ──────────────────────────────────────────────────────────────
  {
    id: "anthropic-claude-fable-5",
    provider: "anthropic",
    tier: "frontier",
    modelName: "Claude Fable 5",
    apiModelId: "claude-fable-5",
    released: "2026-06",
    inputCostPerMTok: 6,
    outputCostPerMTok: 30,
    effortLevels: ["low", "medium", "high", "xhigh", "max"],
    source: "https://platform.claude.com/docs/en/about-claude/models/overview",
  },
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
    released: "2026-06",
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
    id: "openai-gpt-5-4",
    provider: "openai",
    tier: "mid",
    modelName: "GPT-5.4",
    apiModelId: "gpt-5.4",
    released: "2026",
    inputCostPerMTok: 2.5,
    outputCostPerMTok: 15,
    effortLevels: ["minimal", "low", "medium", "high"],
    source: "https://developers.openai.com/api/docs/pricing",
  },
  {
    id: "openai-gpt-5-4-mini",
    provider: "openai",
    tier: "small",
    modelName: "GPT-5.4 mini",
    apiModelId: "gpt-5.4-mini",
    released: "2026",
    inputCostPerMTok: 0.5,
    outputCostPerMTok: 2,
    effortLevels: ["minimal", "low", "medium", "high"],
    source: "https://developers.openai.com/api/docs/pricing",
  },
  {
    id: "openai-gpt-5-4-nano",
    provider: "openai",
    tier: "small",
    modelName: "GPT-5.4 nano",
    apiModelId: "gpt-5.4-nano",
    released: "2026",
    inputCostPerMTok: 0.15,
    outputCostPerMTok: 0.6,
    effortLevels: ["minimal", "low", "medium", "high"],
    source: "https://developers.openai.com/api/docs/pricing",
  },
  {
    id: "openai-o4-mini",
    provider: "openai",
    tier: "mid",
    modelName: "o4-mini",
    apiModelId: "o4-mini",
    released: "2025",
    inputCostPerMTok: 1.1,
    outputCostPerMTok: 4.4,
    effortLevels: ["low", "medium", "high"],
    source: "https://developers.openai.com/api/docs/pricing",
  },
  {
    id: "openai-gpt-realtime",
    provider: "openai",
    tier: "flagship",
    api: "realtime",
    modelName: "GPT Realtime",
    apiModelId: "gpt-realtime",
    released: "2025",
    inputCostPerMTok: 4,
    outputCostPerMTok: 16,
    effortLevels: ["n/a"],
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
    id: "google-gemini-3-5-flash",
    provider: "google",
    tier: "mid",
    modelName: "Gemini 3.5 Flash",
    apiModelId: "gemini-3.5-flash",
    released: "2026",
    inputCostPerMTok: 0.3,
    outputCostPerMTok: 2.5,
    effortLevels: ["low", "medium", "high"],
    source: "https://ai.google.dev/gemini-api/docs/pricing",
  },
  {
    id: "google-gemini-3-1-flash-lite",
    provider: "google",
    tier: "small",
    modelName: "Gemini 3.1 Flash-Lite",
    apiModelId: "gemini-3.1-flash-lite",
    released: "2026",
    inputCostPerMTok: 0.1,
    outputCostPerMTok: 0.4,
    effortLevels: ["low", "medium", "high"],
    source: "https://ai.google.dev/gemini-api/docs/pricing",
  },
];
