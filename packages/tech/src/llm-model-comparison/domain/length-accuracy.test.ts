import { describe, it, expect } from "vitest";
import {
  buildLengthPrompt,
  wordCount,
  lengthAccuracy,
} from "./length-accuracy";

describe("buildLengthPrompt", () => {
  it("names the target word count and topic", () => {
    const prompt = buildLengthPrompt(50, "the water cycle");
    expect(prompt).toContain("50 words");
    expect(prompt).toContain("the water cycle");
  });
});

describe("wordCount", () => {
  it("counts an empty string as zero", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("   \n  ")).toBe(0);
  });

  it("counts a single word", () => {
    expect(wordCount("hello")).toBe(1);
  });

  it("collapses internal whitespace", () => {
    expect(wordCount("  one   two\tthree\nfour  ")).toBe(4);
  });
});

describe("lengthAccuracy", () => {
  it("scores an exact match as 1", () => {
    expect(lengthAccuracy(100, 100)).toBe(1);
  });

  it("falls linearly with relative error", () => {
    expect(lengthAccuracy(100, 90)).toBeCloseTo(0.9);
    expect(lengthAccuracy(100, 120)).toBeCloseTo(0.8);
  });

  it("clamps to 0 for an answer more than 2x off", () => {
    expect(lengthAccuracy(100, 250)).toBe(0);
    expect(lengthAccuracy(100, 0)).toBe(0);
  });

  it("returns 0 for a non-positive target", () => {
    expect(lengthAccuracy(0, 0)).toBe(0);
    expect(lengthAccuracy(-5, 3)).toBe(0);
  });
});
