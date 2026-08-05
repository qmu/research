import { describe, it, expect } from "vitest";
import { buildLatencyPrompt, normalizeLatency } from "./latency";

describe("buildLatencyPrompt", () => {
  it("asks for a short response about the topic", () => {
    expect(buildLatencyPrompt("the water cycle")).toContain("the water cycle");
  });
});

describe("normalizeLatency", () => {
  it("passes a well-formed pair through", () => {
    expect(normalizeLatency(120, 800)).toEqual({ ttftMs: 120, totalMs: 800 });
  });

  it("clamps negatives to zero", () => {
    expect(normalizeLatency(-5, -10)).toEqual({ ttftMs: 0, totalMs: 0 });
  });

  it("never lets TTFT exceed the total response time", () => {
    expect(normalizeLatency(900, 800)).toEqual({ ttftMs: 800, totalMs: 800 });
  });
});

describe("normalizeLatency — a missing first-token time", () => {
  // Clamping null to 0 is what made "not captured" and "instant" the same
  // value, and 0 then counted as a real sample in the mean.
  it("keeps null as null rather than clamping it to zero", () => {
    expect(normalizeLatency(null, 1000)).toEqual({
      ttftMs: null,
      totalMs: 1000,
    });
  });

  it("still normalizes the total when the first-token time is missing", () => {
    expect(normalizeLatency(null, -5)).toEqual({ ttftMs: null, totalMs: 0 });
  });
});
