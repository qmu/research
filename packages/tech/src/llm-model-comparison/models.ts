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
// Coding-agent-optimized models are included where reachable: OpenAI's `-codex`
// line (via the Responses API, below) reuses OPENAI_API_KEY, and xAI's
// grok-code-fast-1 (below) is wired via a base-URL variant of the OpenAI adapter
// but is KEY-GATED on XAI_API_KEY — it renders on the keyless fixture path until
// that key exists. The remaining cross-provider models (DeepSeek-Coder, Qwen-Coder,
// Mistral Devstral/Codestral, …) stay out of scope: each needs its own key/endpoint
// (and, being OpenAI-compatible, a base-URL variant) — a follow-up once keys exist.
// Google and Anthropic have no coding-specialized model id — their general Gemini
// Pro/Flash and Claude Opus/Sonnet tiers (above) are the coding tier.
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
    // Haiku 4.5 has no reasoning-effort knob: `output_config.effort` is rejected
    // (400) on this tier — the earlier sweep's three Haiku "error" configs were
    // exactly the effort levels it cannot honor. Declare the single no-effort
    // configuration with the `n/a` sentinel (as the Realtime card does); the
    // Anthropic adapter omits the `effort` field for it.
    effortLevels: ["n/a"],
    source: "https://platform.claude.com/docs/en/about-claude/models/overview",
  },
  // ── OpenAI ─────────────────────────────────────────────────────────────────
  // The GPT-5.x `reasoning_effort` levels are `none | low | medium | high | xhigh`
  // — NOT `minimal`. A live probe confirmed the API rejects `minimal` with a 400
  // ("does not support 'minimal' with this model"); the earlier sweep's four
  // OpenAI "error" configs were exactly that. `none` is the fastest supported
  // level (no reasoning), so it takes `minimal`'s place as the low end of the
  // spread. o4-mini (a reasoning model) exposes only low/medium/high.
  {
    id: "openai-gpt-5-5",
    provider: "openai",
    tier: "flagship",
    modelName: "GPT-5.5",
    apiModelId: "gpt-5.5",
    released: "2026",
    inputCostPerMTok: 5,
    outputCostPerMTok: 30,
    effortLevels: ["none", "low", "medium", "high"],
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
    effortLevels: ["none", "low", "medium", "high"],
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
    effortLevels: ["none", "low", "medium", "high"],
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
    effortLevels: ["none", "low", "medium", "high"],
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
  // ── OpenAI Codex (coding-agent-optimized; Responses API) ─────────────────────
  // The `-codex` line is reached through the Responses API (`api: "responses"`),
  // NOT Chat Completions — reasoning models carry state across the Responses
  // surface. Reuses OPENAI_API_KEY. `xhigh` is the codex-recommended top effort.
  {
    id: "openai-gpt-5-3-codex",
    provider: "openai",
    tier: "flagship",
    api: "responses",
    modelName: "GPT-5.3 Codex",
    apiModelId: "gpt-5.3-codex",
    released: "2026",
    inputCostPerMTok: 1.75,
    outputCostPerMTok: 14,
    effortLevels: ["low", "medium", "high", "xhigh"],
    source: "https://developers.openai.com/api/docs/models/gpt-5.3-codex",
  },
  {
    id: "openai-gpt-5-1-codex-mini",
    provider: "openai",
    tier: "small",
    api: "responses",
    modelName: "GPT-5.1 Codex mini",
    apiModelId: "gpt-5.1-codex-mini",
    released: "2026",
    inputCostPerMTok: 0.25,
    outputCostPerMTok: 2,
    effortLevels: ["low", "medium", "high"],
    source: "https://developers.openai.com/api/docs/models/gpt-5.1-codex-mini",
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
  // ── xAI (coding-agent-optimized; OpenAI-compatible endpoint) ─────────────────
  // grok-code-fast-1 is a purpose-built agentic-coding model on an OpenAI-compatible
  // API, reached through a base-URL variant of the OpenAI adapter. KEY-GATED: needs
  // XAI_API_KEY; the keyless fixture path renders it until the key exists. No
  // reasoning-effort knob is swept (`n/a`) — the adapter omits the field.
  {
    id: "xai-grok-code-fast-1",
    provider: "xai",
    tier: "small",
    modelName: "Grok Code Fast 1",
    apiModelId: "grok-code-fast-1",
    released: "2025",
    inputCostPerMTok: 0.2,
    outputCostPerMTok: 1.5,
    effortLevels: ["n/a"],
    source: "https://docs.x.ai/docs/models",
  },
];
