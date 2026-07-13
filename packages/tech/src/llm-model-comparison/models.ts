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
// line (via the Responses API, below) reuses OPENAI_API_KEY, and xAI's coding model
// grok-build-0.1 (below) reuses XAI_API_KEY. xAI's general Grok lineup (grok-4.3 and
// the 4.20 reasoning/non-reasoning pair, below) is reached through the same base-URL
// variant of the OpenAI adapter. All xAI cards are KEY-GATED on XAI_API_KEY; the
// keyless CI/fixture path renders them deterministically. The remaining
// cross-provider models (DeepSeek-Coder, Qwen-Coder, Mistral Devstral/Codestral, …)
// stay out of scope: each needs its own key/endpoint (and, being OpenAI-compatible,
// a base-URL variant) — a follow-up once keys exist. Google and Anthropic have no
// coding-specialized model id — their general Gemini Pro/Flash and Claude
// Opus/Sonnet tiers (above) are the coding tier.
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
  // ── xAI (OpenAI-compatible endpoint) ─────────────────────────────────────────
  // xAI speaks the OpenAI Chat Completions protocol at a different base URL, so its
  // whole Grok lineup is reached through the same base-URL variant of the OpenAI
  // adapter — a pure registry entry per model, no adapter work. KEY-GATED on
  // XAI_API_KEY; the keyless CI/fixture path renders each deterministically.
  // Reasoning effort maps to `reasoning_effort` and is swept only where the API
  // accepts it: grok-4.3 sweeps none/low/medium/high (`none` = no reasoning, the fast
  // end). The 4.20 reasoning sibling rejects `reasoning_effort` (a live 400) — its
  // reasoning is fixed — so like the non-reasoning 4.20 and the grok-build coding
  // model it has no effort knob (`n/a`, the adapter omits the field). The multi-agent
  // "heavy" tier is out of scope — its `effort` means agent count, billed per agent.
  {
    id: "xai-grok-4-3",
    provider: "xai",
    tier: "frontier",
    modelName: "Grok 4.3",
    apiModelId: "grok-4.3",
    released: "2026",
    inputCostPerMTok: 1.25,
    outputCostPerMTok: 2.5,
    // The only Grok card documented with a `none` effort level (no reasoning, the
    // fast end of its own sweep) through high — so one card fills an effort sweep.
    effortLevels: ["none", "low", "medium", "high"],
    source: "https://docs.x.ai/developers/models/grok-4.3",
  },
  {
    id: "xai-grok-4-20-0309-reasoning",
    provider: "xai",
    tier: "flagship",
    modelName: "Grok 4.20 Reasoning",
    apiModelId: "grok-4.20-0309-reasoning",
    released: "2026",
    inputCostPerMTok: 1.25,
    outputCostPerMTok: 2.5,
    // Reasoning sibling, but its reasoning is FIXED: a live probe returns 400
    // ("does not support parameter reasoningEffort") for every effort value — unlike
    // grok-4.3, this card has no effort knob. Declared `n/a` (the adapter omits the
    // field) so it measures at its single natural configuration; never faked.
    effortLevels: ["n/a"],
    source: "https://docs.x.ai/developers/models",
  },
  {
    id: "xai-grok-4-20-0309-non-reasoning",
    provider: "xai",
    tier: "mid",
    modelName: "Grok 4.20 Non-Reasoning",
    apiModelId: "grok-4.20-0309-non-reasoning",
    released: "2026",
    inputCostPerMTok: 1.25,
    outputCostPerMTok: 2.5,
    // The fast / non-reasoning general model: no reasoning-effort knob (`n/a`).
    effortLevels: ["n/a"],
    source: "https://docs.x.ai/developers/models",
  },
  // Coding-agent-optimized. grok-code-fast-1 was retired in xAI's 2026-05-15 model
  // retirement (it currently auto-redirects to grok-build-0.1 but hard-removes
  // ~2026-08-15); migrated proactively here to the current coding id. No effort knob.
  {
    id: "xai-grok-build-0-1",
    provider: "xai",
    tier: "small",
    modelName: "Grok Build 0.1",
    apiModelId: "grok-build-0.1",
    released: "2026",
    inputCostPerMTok: 1,
    outputCostPerMTok: 2,
    effortLevels: ["n/a"],
    source: "https://docs.x.ai/developers/models",
  },
  // ── Perplexity (Sonar) ──────────────────────────────────────────────────────
  // OpenAI-compatible Chat Completions at https://api.perplexity.ai (see
  // vendors/llm/perplexity.ts), KEY-GATED on PERPLEXITY_API_KEY; the keyless
  // CI/fixture path renders these deterministically. Sonar models are
  // search-grounded — their numbers reflect the model AS SERVED (retrieval + a
  // token-based request/response fee), not a plain chat model, which is the point
  // of measuring a backend as delivered. Effort is left `n/a`: the search models
  // reason internally and do not take a portable `reasoning_effort` knob on these
  // ids, so no unsupported effort is ever sent. Prices are curated best-known
  // estimates per the pricing page — treat each cell as correct only as of its source.
  {
    id: "perplexity-sonar",
    provider: "perplexity",
    tier: "mid",
    modelName: "Sonar",
    apiModelId: "sonar",
    released: "2025",
    inputCostPerMTok: 1,
    outputCostPerMTok: 1,
    effortLevels: ["n/a"],
    source: "https://docs.perplexity.ai/guides/pricing",
  },
  {
    id: "perplexity-sonar-pro",
    provider: "perplexity",
    tier: "flagship",
    modelName: "Sonar Pro",
    apiModelId: "sonar-pro",
    released: "2025",
    inputCostPerMTok: 3,
    outputCostPerMTok: 15,
    effortLevels: ["n/a"],
    source: "https://docs.perplexity.ai/guides/pricing",
  },
  {
    id: "perplexity-sonar-reasoning-pro",
    provider: "perplexity",
    tier: "frontier",
    modelName: "Sonar Reasoning Pro",
    apiModelId: "sonar-reasoning-pro",
    released: "2025",
    inputCostPerMTok: 2,
    outputCostPerMTok: 8,
    effortLevels: ["n/a"],
    source: "https://docs.perplexity.ai/guides/pricing",
  },
  // ── AWS Bedrock (Claude, IaaS transport) ────────────────────────────────────
  // The same Claude weights served through AWS Bedrock's Messages endpoint (see
  // vendors/llm/bedrock.ts), measured AS SERVED — latency, price, and region can
  // differ from the first-party API. KEY-GATED on AWS SigV4 credentials
  // (AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY); the keyless
  // CI/fixture path renders them deterministically. `apiModelId` is the
  // first-party id — the adapter adds Bedrock's `anthropic.` wire prefix. Bedrock
  // supports adaptive thinking/effort, so the effort ladder mirrors first-party.
  // Prices are curated best-known Bedrock on-demand estimates — treat each cell as
  // correct only as of its source.
  {
    id: "bedrock-claude-opus-4-8",
    provider: "bedrock",
    tier: "flagship",
    modelName: "Claude Opus 4.8 (Bedrock)",
    apiModelId: "claude-opus-4-8",
    released: "2026",
    inputCostPerMTok: 5,
    outputCostPerMTok: 25,
    effortLevels: ["low", "medium", "high", "xhigh", "max"],
    source:
      "https://platform.claude.com/docs/en/build-with-claude/claude-on-amazon-bedrock",
  },
  {
    id: "bedrock-claude-sonnet-5",
    provider: "bedrock",
    tier: "mid",
    modelName: "Claude Sonnet 5 (Bedrock)",
    apiModelId: "claude-sonnet-5",
    released: "2026-06",
    inputCostPerMTok: 3,
    outputCostPerMTok: 15,
    effortLevels: ["low", "medium", "high", "xhigh", "max"],
    source:
      "https://platform.claude.com/docs/en/build-with-claude/claude-on-amazon-bedrock",
  },
  // ── Google Vertex AI (Claude, IaaS transport) ───────────────────────────────
  // The same Claude weights served through Google Vertex AI (see
  // vendors/llm/vertex.ts), measured AS SERVED. KEY-GATED on GCP ADC routing
  // facts (GOOGLE_CLOUD_PROJECT / GOOGLE_CLOUD_LOCATION plus ambient ADC); the
  // keyless CI/fixture path renders them deterministically. Vertex model ids are
  // the bare first-party ids (no prefix). Vertex supports adaptive thinking/effort,
  // so the effort ladder mirrors first-party. Prices are curated best-known Vertex
  // estimates — treat each cell as correct only as of its source.
  {
    id: "vertex-claude-opus-4-8",
    provider: "vertex",
    tier: "flagship",
    modelName: "Claude Opus 4.8 (Vertex)",
    apiModelId: "claude-opus-4-8",
    released: "2026",
    inputCostPerMTok: 5,
    outputCostPerMTok: 25,
    effortLevels: ["low", "medium", "high", "xhigh", "max"],
    source:
      "https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai",
  },
];
