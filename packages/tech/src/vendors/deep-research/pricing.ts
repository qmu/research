import type { DeepResearchProvider } from "../../deep-research/domain/types";

// Per-query cost derivation for the deep-research topic. Kept PURE and separate
// from the provider adapters so the money math is unit-tested without a network
// call or an API key: an adapter reads the raw usage its SDK returned, hands the
// normalized token/search counts here, and gets back a single USD figure.
//
// Every rate is curated catalog data with a cited source and last-verified date
// (2026-07-18, see the mission `proposal.md`), never a live quote. Deep-research
// billing has three layers — model tokens, and (where the provider meters them
// separately) grounded-search tool calls — so a provider's `searchUsdPerCall`
// captures the search surcharge the token rates miss.

export type ProviderPricing = Readonly<{
  /** USD per million input (prompt + reasoning, where billed as input) tokens. */
  inputUsdPerMTok: number;
  /** USD per million output tokens. */
  outputUsdPerMTok: number;
  /** USD per grounded web/X search the endpoint performs, when the provider
   * meters searches separately from tokens (undefined = folded into tokens). */
  searchUsdPerCall?: number;
  lastVerified: string;
  source: string;
}>;

// Reference rates as of 2026-07-18. Sources are the same vendor/pricing pages the
// proposal cites; the binding figure is always the provider's own bill, which the
// real run records per call alongside this derived estimate.
export const DEEP_RESEARCH_PRICING: Record<
  DeepResearchProvider,
  ProviderPricing
> = {
  openai: {
    // o3-deep-research: $10 / $40 per M in/out. Web search is folded into the
    // per-1k-tool-call line the Responses usage does not itemize per query, so it
    // is approximated by the reference midpoint when search count is unknown.
    inputUsdPerMTok: 10,
    outputUsdPerMTok: 40,
    lastVerified: "2026-07-18",
    source: "https://developers.openai.com/api/docs/models/o3-deep-research",
  },
  perplexity: {
    // sonar-deep-research: $2 / $8 per M in/out, plus $5 / 1k search queries
    // (citation + reasoning token surcharges are billed inside the token counts
    // Perplexity returns, so they are captured by the token rates).
    inputUsdPerMTok: 2,
    outputUsdPerMTok: 8,
    searchUsdPerCall: 0.005,
    lastVerified: "2026-07-18",
    source: "https://docs.perplexity.ai/docs/getting-started/pricing",
  },
  google: {
    // Gemini 3.1 Pro: $2 / $12 per M in/out, plus grounded search at $14 / 1k
    // (~80 searches on a standard Deep Research task).
    inputUsdPerMTok: 2,
    outputUsdPerMTok: 12,
    searchUsdPerCall: 0.014,
    lastVerified: "2026-07-18",
    source:
      "https://ai.google.dev/gemini-api/docs/models/deep-research-preview-04-2026",
  },
  xai: {
    // Grok 4.5: $2 / $6 per M in/out, plus Web/X agent-tool search at $5 / 1k
    // calls each.
    inputUsdPerMTok: 2,
    outputUsdPerMTok: 6,
    searchUsdPerCall: 0.005,
    lastVerified: "2026-07-18",
    source: "https://docs.x.ai/developers/pricing",
  },
  anthropic: {
    // Claude (current catalog model) tokens plus the `web_search` tool at
    // $10 / 1k searches — the transparent build-your-own baseline.
    inputUsdPerMTok: 3,
    outputUsdPerMTok: 15,
    searchUsdPerCall: 0.01,
    lastVerified: "2026-07-18",
    source:
      "https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool",
  },
};

export type UsageForCost = Readonly<{
  inputTokens: number;
  outputTokens: number;
  /** Grounded searches the endpoint reported performing, when known. */
  searchCount?: number;
}>;

/**
 * The USD cost of one deep-research query from its billed usage. Token cost is
 * always computed; the search surcharge is added only when BOTH the provider
 * meters searches separately (`searchUsdPerCall` set) and the call reported a
 * search count — otherwise it is omitted rather than guessed. Returns 0 when no
 * tokens were billed (an errored or empty call), so the caller can fall back to
 * the card's curated reference midpoint rather than reporting a false $0.
 */
export const computeDeepResearchCostUsd = (
  pricing: ProviderPricing,
  usage: UsageForCost,
): number => {
  const tokenCost =
    (usage.inputTokens * pricing.inputUsdPerMTok +
      usage.outputTokens * pricing.outputUsdPerMTok) /
    1_000_000;
  const searchCost =
    pricing.searchUsdPerCall !== undefined && usage.searchCount !== undefined
      ? usage.searchCount * pricing.searchUsdPerCall
      : 0;
  return tokenCost + searchCost;
};
