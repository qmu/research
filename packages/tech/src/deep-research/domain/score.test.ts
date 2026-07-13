import { describe, expect, it } from "vitest";
import {
  citationDomains,
  citationMetrics,
  registrableDomain,
  scoreAnswerQuality,
  scoreCitationValidity,
  sourceDiversity,
  summarizeStat,
} from "./score";
import type { ResearchQuestion } from "./types";

describe("registrableDomain", () => {
  it("strips a leading www. and lowercases the host", () => {
    expect(registrableDomain("https://WWW.Example.COM/a/b")).toBe(
      "example.com",
    );
  });

  it("keeps subdomains other than www", () => {
    expect(registrableDomain("https://en.wikipedia.org/wiki/QUIC")).toBe(
      "en.wikipedia.org",
    );
  });

  it("returns empty string for an unparseable url", () => {
    expect(registrableDomain("not a url")).toBe("");
  });
});

describe("citationDomains / sourceDiversity", () => {
  const citations = [
    { url: "https://www.rfc-editor.org/rfc/rfc9114" },
    { url: "https://rfc-editor.org/errata" }, // same domain after www-strip
    { url: "https://en.wikipedia.org/wiki/HTTP/3" },
    { url: "broken" }, // dropped
  ];

  it("dedupes by registrable domain in first-seen order and drops unparseable", () => {
    expect(citationDomains(citations)).toEqual([
      "rfc-editor.org",
      "en.wikipedia.org",
    ]);
  });

  it("counts distinct domains", () => {
    expect(sourceDiversity(citations)).toBe(2);
    expect(sourceDiversity([])).toBe(0);
  });
});

describe("scoreAnswerQuality", () => {
  const question: ResearchQuestion = {
    id: "q",
    prompt: "?",
    rubric: [
      { id: "a", question: "a?" },
      { id: "b", question: "b?" },
      { id: "c", question: "c?" },
      { id: "d", question: "d?" },
    ],
  };

  it("is satisfied-over-total", () => {
    expect(
      scoreAnswerQuality(question, [
        { rubricId: "a", satisfied: true },
        { rubricId: "b", satisfied: false },
        { rubricId: "c", satisfied: true },
      ]),
    ).toBeCloseTo(0.5);
  });

  it("ignores unknown ids and treats unanswered as unsatisfied", () => {
    expect(
      scoreAnswerQuality(question, [
        { rubricId: "a", satisfied: true },
        { rubricId: "z", satisfied: true }, // unknown — ignored
      ]),
    ).toBeCloseTo(0.25);
  });

  it("is 0 for an empty rubric", () => {
    expect(scoreAnswerQuality({ id: "e", prompt: "?", rubric: [] }, [])).toBe(
      0,
    );
  });
});

describe("scoreCitationValidity", () => {
  it("is valid-over-checked", () => {
    expect(
      scoreCitationValidity([
        { url: "a", valid: true },
        { url: "b", valid: false },
        { url: "c", valid: true },
        { url: "d", valid: true },
      ]),
    ).toBeCloseTo(0.75);
  });

  it("is 0 when nothing was checked", () => {
    expect(scoreCitationValidity([])).toBe(0);
  });
});

describe("summarizeStat", () => {
  it("returns all-zero for no values", () => {
    expect(summarizeStat([])).toEqual({ mean: 0, stdDev: 0, n: 0 });
  });

  it("returns stdDev 0 for a single value", () => {
    expect(summarizeStat([42])).toEqual({ mean: 42, stdDev: 0, n: 1 });
  });

  it("computes mean and sample stdDev", () => {
    const stat = summarizeStat([2, 4, 6]);
    expect(stat.mean).toBeCloseTo(4);
    expect(stat.n).toBe(3);
    expect(stat.stdDev).toBeCloseTo(2); // sample sd of [2,4,6]
  });
});

describe("citationMetrics", () => {
  it("derives count, domains, and diversity from a raw answer", () => {
    const metrics = citationMetrics({
      report: "…",
      citations: [
        { url: "https://a.example.com/1" },
        { url: "https://a.example.com/2" },
        { url: "https://b.example.org/3" },
      ],
      elapsedMs: 10,
      costUsd: 0,
      model: "fixture",
    });
    expect(metrics.citationCount).toBe(3);
    expect(metrics.sourceDiversity).toBe(2);
    expect(metrics.citationDomains).toEqual(["a.example.com", "b.example.org"]);
  });
});
