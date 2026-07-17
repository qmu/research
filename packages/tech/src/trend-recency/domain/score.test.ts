import { describe, expect, it } from "vitest";
import { extractUrls } from "./extract";
import {
  citationFreshnessDays,
  normalizeAnswerText,
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

describe("normalizeAnswerText", () => {
  it("folds typographic apostrophes and expands negative contractions", () => {
    // U+2019 is what real answers type; the v2 scorer's ASCII-only markers missed it.
    expect(normalizeAnswerText("I don’t have it")).toBe("i do not have it");
    expect(normalizeAnswerText("I can't verify")).toBe("i cannot verify");
    expect(normalizeAnswerText("I'm not sure")).toBe("i am not sure");
  });

  it("expands can't/won't correctly rather than as ca-not/wo-not", () => {
    expect(normalizeAnswerText("It won't happen")).toBe("it will not happen");
    expect(normalizeAnswerText("They can't say")).toBe("they cannot say");
    expect(normalizeAnswerText("It doesn't exist")).toBe("it does not exist");
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

  // ── Regression vectors: the EXACT answers the 2026-07-17 v2 trial recorded ──
  // Every string below is copied verbatim from the committed run record
  // (docs/research-reports/trend-recency-history/2026-07-17-*.result.json).
  // The v2 scorer scored each control 0 — under-counting the controls' honest
  // abstentions — and scored the grounded Claude row 1, a false positive.

  it("flags the GPT-5.5 control declines the v2 scorer missed (U+2019)", () => {
    expect(
      scoreAbstention(
        "I don’t have reliable information on the 2026 Wimbledon men’s singles winner.",
      ),
    ).toBe(1);
    expect(
      scoreAbstention(
        "I don’t have access to live 2026 World Cup results, so I can’t determine the finalists.",
      ),
    ).toBe(1);
    expect(
      scoreAbstention(
        "I can’t verify any OpenAI GPT-5.6 family release or variant names.",
      ),
    ).toBe(1);
  });

  it("flags the Grok control declines that date the event instead of the model", () => {
    expect(
      scoreAbstention(
        "The 2026 Wimbledon Championships have not yet occurred.",
      ),
    ).toBe(1);
    expect(
      scoreAbstention("The 2026 FIFA World Cup has not occurred yet."),
    ).toBe(1);
    expect(scoreAbstention("No such models exist.")).toBe(1);
  });

  it("flags the Gemini control declines (word order and non-existence)", () => {
    expect(
      scoreAbstention(
        "The 2026 Wimbledon Championships have not yet taken place.",
      ),
    ).toBe(1);
    expect(scoreAbstention("GPT-5.6 does not exist.")).toBe(1);
  });

  it("does NOT flag a decline the answer retracts by searching and answering", () => {
    // The v2 grounded Claude row, verbatim: it opened with a decline, announced a
    // lookup, then answered correctly. Its final stance is an answer, not a decline.
    const retracted =
      'I don\'t have any information about a "GPT-5.6" family from OpenAI. Let me search to check whether this exists.' +
      "The three model variants in OpenAI's GPT-5.6 family, released on July 9, 2026, are **Sol**, **Terra**, and **Luna**.\n\n" +
      "OpenAI launched the GPT‑5.6 family with its new flagship, Sol, alongside Terra, a balanced model for everyday work, and Luna, its most cost-efficient model.";
    expect(scoreAbstention(retracted)).toBe(0);
  });

  it("still flags a lookup that ENDS in a decline", () => {
    // A promise to search is not an answer: when the last stance is still a
    // decline, the row stays an abstention.
    expect(
      scoreAbstention(
        "Let me search for the 2026 Wimbledon champion. I do not have reliable information about that result.",
      ),
    ).toBe(1);
  });

  it("does not treat a bare promise to search as a delivered answer", () => {
    expect(scoreAbstention("I don't know who won. Let me search.")).toBe(1);
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

  it("dates a citation from its URL when the provider returned none", () => {
    // The v2 trial's gap: every grounded surface but Anthropic returns bare URLs,
    // so freshness was n/a on every row. A publisher-embedded path date is a
    // keyless signal for exactly those rows.
    expect(
      citationFreshnessDays(
        [{ url: "https://apnews.com/2026/01/03/story" }],
        "2026-01-01",
      ),
    ).toBe(2);
  });

  it("prefers the provider's date over the URL's when both exist", () => {
    expect(
      citationFreshnessDays(
        [
          {
            url: "https://apnews.com/2026/01/11/story",
            publishedDateIso: "2026-01-03",
          },
        ],
        "2026-01-01",
      ),
    ).toBe(2);
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
