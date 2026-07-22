import { describe, expect, it } from "vitest";
import { DEEP_RESEARCH_PRICING, computeDeepResearchCostUsd } from "./pricing";

describe("computeDeepResearchCostUsd", () => {
  const pricing = {
    inputUsdPerMTok: 10,
    outputUsdPerMTok: 40,
    searchUsdPerCall: 0.005,
    lastVerified: "2026-07-18",
    source: "test",
  };

  it("sums token cost at the per-million rates", () => {
    // 100k input @ $10/M = $1.00; 50k output @ $40/M = $2.00.
    expect(
      computeDeepResearchCostUsd(pricing, {
        inputTokens: 100_000,
        outputTokens: 50_000,
      }),
    ).toBeCloseTo(3.0, 6);
  });

  it("adds the search surcharge only when a search count is reported", () => {
    const withCount = computeDeepResearchCostUsd(pricing, {
      inputTokens: 0,
      outputTokens: 0,
      searchCount: 10,
    });
    expect(withCount).toBeCloseTo(0.05, 6);
    // No count → no surcharge, even though the provider meters searches.
    expect(
      computeDeepResearchCostUsd(pricing, {
        inputTokens: 0,
        outputTokens: 0,
      }),
    ).toBe(0);
  });

  it("omits the surcharge when the provider folds search into tokens", () => {
    const tokensOnly = {
      inputUsdPerMTok: 10,
      outputUsdPerMTok: 40,
      lastVerified: "2026-07-18",
      source: "test",
    };
    expect(
      computeDeepResearchCostUsd(tokensOnly, {
        inputTokens: 0,
        outputTokens: 0,
        searchCount: 100,
      }),
    ).toBe(0);
  });

  it("prices every registered provider without throwing", () => {
    for (const provider of Object.keys(DEEP_RESEARCH_PRICING) as Array<
      keyof typeof DEEP_RESEARCH_PRICING
    >) {
      const cost = computeDeepResearchCostUsd(DEEP_RESEARCH_PRICING[provider], {
        inputTokens: 20_000,
        outputTokens: 10_000,
        searchCount: 5,
      });
      expect(cost).toBeGreaterThan(0);
    }
  });
});
