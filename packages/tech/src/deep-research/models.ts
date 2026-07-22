import type { SubjectCard } from "./domain/types";

/**
 * Curated registry of the deep-research endpoints this topic measures — the
 * single source of truth for subjects, access shapes, and reference per-query
 * cost. Every value is curated catalog data with a cited source and a
 * last-verified date, never a live measurement. The four turnkey products are
 * held against the Anthropic build-your-own baseline (`baseline: true`), so the
 * comparison answers whether a turnkey endpoint is worth it over a loop we can
 * build ourselves. Offerings surveyed 2026-07-14 (see the mission `proposal.md`).
 */
export const DEEP_RESEARCH_SUBJECTS: ReadonlyArray<SubjectCard> = [
  {
    id: "openai-o3-deep-research",
    provider: "openai",
    displayName: "OpenAI o3 Deep Research",
    apiModelId: "o3-deep-research",
    access: "Responses API, web search always-on",
    approxCostPerQueryUsd: 3.0,
    lastVerified: "2026-07-14",
    source: "https://developers.openai.com/api/docs/models/o3-deep-research",
  },
  {
    id: "perplexity-sonar-deep-research",
    provider: "perplexity",
    displayName: "Perplexity Sonar Deep Research",
    apiModelId: "sonar-deep-research",
    access: "OpenAI-compatible chat endpoint",
    approxCostPerQueryUsd: 0.5,
    lastVerified: "2026-07-14",
    source: "https://docs.perplexity.ai/docs/getting-started/pricing",
  },
  {
    id: "gemini-deep-research",
    provider: "google",
    displayName: "Gemini Deep Research",
    apiModelId: "deep-research-preview-04-2026",
    access: "Interactions API, background=True",
    approxCostPerQueryUsd: 2.0,
    lastVerified: "2026-07-14",
    source: "https://ai.google.dev/gemini-api/docs/deep-research",
  },
  {
    id: "grok-deepsearch",
    provider: "xai",
    displayName: "Grok DeepSearch",
    apiModelId: "grok-4.3",
    access: "Responses Agent Tools (web_search) — the API path for DeepSearch",
    approxCostPerQueryUsd: 1.5,
    lastVerified: "2026-07-18",
    source: "https://docs.x.ai/developers/pricing",
  },
  {
    id: "anthropic-baseline",
    provider: "anthropic",
    displayName: "Anthropic build-your-own (Claude + web_search)",
    apiModelId: "claude-opus-4-8",
    access:
      "Messages API, self-orchestrated agentic loop (web_search tool + extended thinking)",
    approxCostPerQueryUsd: 1.0,
    lastVerified: "2026-07-14",
    source: "https://docs.anthropic.com/en/docs/build-with-claude/tool-use",
    baseline: true,
  },
];

/**
 * The fixed LLM-judge instrument: one model grades every report against the
 * per-question rubric and checks sampled citations, so scores stay comparable
 * across subjects. Changing the judge is an instrument-version bump, not a
 * silent swap.
 */
export const JUDGE_MODEL_ID = "claude-sonnet-5";
