import { describe, expect, it } from "vitest";
import { extractUrls } from "./extract";
import {
  citationFreshnessDays,
  scoreAbstention,
  scoreAnswerMatch,
  scoreCitationValidity,
  summarizeStat,
} from "./score";
import type { Citation, RecencyProbe } from "./types";

const probe: RecencyProbe = {
  id: "p",
  topic: "ai-models",
  question: "Which lab released Claude Opus 4.8?",
  eventDateIso: "2026-01-01",
  expectedAnswer: "Anthropic",
  expectedKeywords: ["anthropic"],
};

describe("scoreAnswerMatch", () => {
  it("credits an answer containing every expected keyword, case/punctuation-insensitive", () => {
    expect(scoreAnswerMatch("It was Anthropic.", probe)).toBe(1);
    expect(scoreAnswerMatch("anthropic", probe)).toBe(1);
  });

  it("rejects an answer missing a required keyword", () => {
    expect(scoreAnswerMatch("It was OpenAI.", probe)).toBe(0);
  });

  it("requires ALL keywords, not any", () => {
    const multi: RecencyProbe = { ...probe, expectedKeywords: ["grok", "xai"] };
    expect(scoreAnswerMatch("Grok is a model.", multi)).toBe(0);
    expect(scoreAnswerMatch("Grok, made by xAI.", multi)).toBe(1);
  });

  it("scores 0 when the probe carries no keywords", () => {
    expect(
      scoreAnswerMatch("anything", { ...probe, expectedKeywords: [] }),
    ).toBe(0);
  });
});

describe("scoreAbstention", () => {
  it("flags an honest decline", () => {
    expect(
      scoreAbstention(
        "I don't have information about events after my training cutoff.",
      ),
    ).toBe(1);
  });

  it("does not flag a confident answer", () => {
    expect(scoreAbstention("Anthropic released it in 2026.")).toBe(0);
  });
});

describe("scoreCitationValidity", () => {
  it("is the fraction of well-formed http(s) URLs", () => {
    const citations: ReadonlyArray<Citation> = [
      { url: "https://example.com/a" },
      { url: "http://news.example.org/b" },
      { url: "not-a-url" },
      { url: "ftp://example.com/c" },
    ];
    expect(scoreCitationValidity(citations)).toBe(0.5);
  });

  it("scores 0 for no citations", () => {
    expect(scoreCitationValidity([])).toBe(0);
  });
});

describe("citationFreshnessDays", () => {
  it("returns the median absolute age in days relative to the event", () => {
    const citations: ReadonlyArray<Citation> = [
      { url: "https://a", publishedDateIso: "2026-01-03" }, // 2 days
      { url: "https://b", publishedDateIso: "2025-12-30" }, // 2 days
      { url: "https://c", publishedDateIso: "2026-01-11" }, // 10 days
    ];
    expect(citationFreshnessDays(citations, "2026-01-01")).toBe(2);
  });

  it("averages the two middle values for an even count", () => {
    const citations: ReadonlyArray<Citation> = [
      { url: "https://a", publishedDateIso: "2026-01-02" }, // 1
      { url: "https://b", publishedDateIso: "2026-01-04" }, // 3
    ];
    expect(citationFreshnessDays(citations, "2026-01-01")).toBe(2);
  });

  it("returns undefined when no citation has a parseable date", () => {
    expect(
      citationFreshnessDays([{ url: "https://a" }], "2026-01-01"),
    ).toBeUndefined();
  });
});

describe("summarizeStat", () => {
  it("handles empty, single, and multi-value inputs", () => {
    expect(summarizeStat([])).toEqual({ mean: 0, stdDev: 0, n: 0 });
    expect(summarizeStat([5])).toEqual({ mean: 5, stdDev: 0, n: 1 });
    const stat = summarizeStat([2, 4]);
    expect(stat.mean).toBe(3);
    expect(stat.n).toBe(2);
    expect(stat.stdDev).toBeCloseTo(Math.SQRT2, 10);
  });
});

describe("extractUrls", () => {
  it("pulls and de-duplicates URLs, trimming trailing punctuation", () => {
    expect(
      extractUrls(
        "See https://a.com/x, and https://a.com/x. Also https://b.org.",
      ),
    ).toEqual(["https://a.com/x", "https://b.org"]);
  });

  it("returns an empty list when there is no URL", () => {
    expect(extractUrls("no links here")).toEqual([]);
  });
});
