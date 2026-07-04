import { describe, it, expect } from "vitest";
import { buildThroughputPrompt, sustainedTokensPerSecond } from "./throughput";

describe("buildThroughputPrompt", () => {
  it("asks for a long generation on the topic", () => {
    const p = buildThroughputPrompt(400, "the water cycle");
    expect(p).toContain("400");
    expect(p).toContain("the water cycle");
  });
});

describe("sustainedTokensPerSecond", () => {
  it("divides tokens by the generation window (total minus TTFT)", () => {
    // 100 tokens over a 1000 ms generation window (1100 total − 100 TTFT).
    expect(sustainedTokensPerSecond(100, 1100, 100)).toBeCloseTo(100, 6);
  });

  it("falls back to the total time when TTFT is missing or not below total", () => {
    // No first-token signal (ttft 0) → use the whole 1000 ms.
    expect(sustainedTokensPerSecond(50, 1000, 0)).toBeCloseTo(50, 6);
    // TTFT >= total (degenerate) → use total, never divide by <= 0.
    expect(sustainedTokensPerSecond(50, 1000, 1000)).toBeCloseTo(50, 6);
  });

  it("returns 0 for a non-positive token count or elapsed time", () => {
    expect(sustainedTokensPerSecond(0, 1000, 100)).toBe(0);
    expect(sustainedTokensPerSecond(100, 0, 0)).toBe(0);
  });
});
