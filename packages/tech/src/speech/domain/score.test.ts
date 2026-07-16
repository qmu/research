import { describe, expect, it } from "vitest";
import {
  normalizeWords,
  summarizeStat,
  wordAccuracy,
  wordErrorRate,
} from "./score";
import { SPEECH_MANIFEST } from "./manifest";

describe("normalizeWords", () => {
  it("lowercases and drops punctuation", () => {
    expect(normalizeWords("Hello, World!")).toEqual(["hello", "world"]);
  });

  it("collapses whitespace and returns empty for blank input", () => {
    expect(normalizeWords("  a   b ")).toEqual(["a", "b"]);
    expect(normalizeWords("   ")).toEqual([]);
  });
});

describe("wordErrorRate", () => {
  it("is zero for an exact match ignoring case and punctuation", () => {
    expect(wordErrorRate("The birch canoe", "the birch canoe!")).toBe(0);
  });

  it("counts a single substitution over the reference length", () => {
    expect(wordErrorRate("the birch canoe", "the birch paddle")).toBeCloseTo(
      1 / 3,
    );
  });

  it("counts a deletion and an insertion", () => {
    // reference 3 words; hypothesis drops one and adds one → 2 edits / 3.
    expect(
      wordErrorRate("the birch canoe", "the paddle canoe slid"),
    ).toBeCloseTo(2 / 3);
  });

  it("treats an empty reference as 0 vs empty and 1 vs non-empty", () => {
    expect(wordErrorRate("", "")).toBe(0);
    expect(wordErrorRate("", "extra words")).toBe(1);
  });
});

describe("wordAccuracy", () => {
  it("is 1 for an exact match and floors at 0 for a very wrong hypothesis", () => {
    expect(wordAccuracy("hello world", "hello world")).toBe(1);
    expect(
      wordAccuracy("hi", "these are many completely unrelated extra words"),
    ).toBe(0);
  });

  it("is the complement of WER for a partial match", () => {
    expect(wordAccuracy("the birch canoe", "the birch paddle")).toBeCloseTo(
      2 / 3,
    );
  });
});

describe("summarizeStat", () => {
  it("returns zeros for no samples and stdDev 0 for one sample", () => {
    expect(summarizeStat([])).toEqual({ mean: 0, stdDev: 0, n: 0 });
    expect(summarizeStat([5])).toEqual({ mean: 5, stdDev: 0, n: 1 });
  });

  it("computes mean and sample standard deviation", () => {
    const stat = summarizeStat([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(stat.mean).toBeCloseTo(5);
    expect(stat.stdDev).toBeCloseTo(2.138, 3);
    expect(stat.n).toBe(8);
  });
});

describe("speech manifest", () => {
  it("has non-empty, unique utterance ids and texts", () => {
    const ids = [
      ...SPEECH_MANIFEST.tts.map((utterance) => utterance.id),
      ...SPEECH_MANIFEST.stt.map((utterance) => utterance.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    for (const utterance of SPEECH_MANIFEST.tts) {
      expect(utterance.text.length, utterance.id).toBeGreaterThan(0);
    }
    for (const utterance of SPEECH_MANIFEST.stt) {
      expect(
        utterance.referenceTranscript.length,
        utterance.id,
      ).toBeGreaterThan(0);
      expect(utterance.audioSource.length, utterance.id).toBeGreaterThan(0);
    }
  });
});
