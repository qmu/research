import { describe, it, expect } from "vitest";
import { estimateRun } from "./estimate";

describe("estimateRun", () => {
  const params = {
    configs: [
      { inputCostPerMTok: 5, outputCostPerMTok: 30 },
      { inputCostPerMTok: 1, outputCostPerMTok: 5 },
    ],
    probeCallsPerConfig: 9,
    avgInputTokensPerCall: 100,
    avgOutputTokensPerCall: 1000,
    judgeInputTokens: 2000,
    judgeOutputTokens: 200,
    judgeInputCostPerMTok: 5,
    judgeOutputCostPerMTok: 25,
    secondsPerCall: 4,
  };

  it("counts probe calls plus one judge call per configuration", () => {
    // 2 configs × (9 probe calls + 1 judge) = 20.
    expect(estimateRun(params).callCount).toBe(20);
    expect(estimateRun(params).configCount).toBe(2);
  });

  it("sums probe and judge cost from the token assumptions and prices", () => {
    // Per config probe cost = 9 × (100/1e6 · inPrice + 1000/1e6 · outPrice).
    //   config A: 9 × (0.0005 + 0.03)   = 0.2745
    //   config B: 9 × (0.0001 + 0.005)  = 0.0459
    // Judge cost = 2 × (2000/1e6·5 + 200/1e6·25) = 2 × (0.01 + 0.005) = 0.03
    expect(estimateRun(params).usdCost).toBeCloseTo(0.2745 + 0.0459 + 0.03, 6);
  });

  it("derives an ETA from call count and seconds-per-call", () => {
    // 20 calls × 4 s / 60 = 1.333… minutes.
    expect(estimateRun(params).etaMinutes).toBeCloseTo((20 * 4) / 60, 6);
  });
});
