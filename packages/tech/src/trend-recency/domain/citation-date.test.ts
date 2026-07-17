import { describe, expect, it } from "vitest";
import {
  citationPublishedDateIso,
  publishedDateFromUrl,
} from "./citation-date";

describe("publishedDateFromUrl", () => {
  it("reads the date a publisher embeds in the URL path", () => {
    // The three path shapes the news CMSs in the first trial's citation set use.
    expect(
      publishedDateFromUrl("https://apnews.com/2026/07/15/world-cup"),
    ).toBe("2026-07-15");
    expect(publishedDateFromUrl("https://npr.org/2026/7/9/gpt-5-6")).toBe(
      "2026-07-09",
    );
    expect(
      publishedDateFromUrl("https://techcrunch.com/2026-07-12-wimbledon-final"),
    ).toBe("2026-07-12");
  });

  it("returns undefined when the path carries no date", () => {
    // Every URL shape the first trial actually recorded: none is dated, which is
    // why freshness had no signal on any row.
    expect(
      publishedDateFromUrl("https://en.wikipedia.org/wiki/2026_FIFA_World_Cup"),
    ).toBeUndefined();
    expect(
      publishedDateFromUrl("https://openai.com/index/gpt-5-6/"),
    ).toBeUndefined();
    expect(
      publishedDateFromUrl("https://www.espn.com/tennis/story/_/id/49342484/x"),
    ).toBeUndefined();
  });

  it("does not mistake an opaque numeric id for a date", () => {
    // A digit adjacent to the candidate date must block it: the lookaround
    // guards keep an article id like 20260715123 from dating a citation.
    expect(
      publishedDateFromUrl("https://news.example.com/article/20260715123"),
    ).toBeUndefined();
    expect(
      publishedDateFromUrl("https://news.example.com/a/12026/07/154"),
    ).toBeUndefined();
  });

  it("rejects numbers that do not name a calendar date", () => {
    expect(
      publishedDateFromUrl("https://news.example.com/2026/02/31/story"),
    ).toBeUndefined();
    expect(
      publishedDateFromUrl("https://news.example.com/2026/13/01/story"),
    ).toBeUndefined();
  });

  it("reads the path only — never the host or a tracking query", () => {
    // `?utm_source=openai` was on every OpenAI-surfaced citation in the trial.
    expect(
      publishedDateFromUrl("https://a.example/story?published=2026/07/15"),
    ).toBeUndefined();
    expect(
      publishedDateFromUrl("https://a.example/2026/07/15/x?utm_source=openai"),
    ).toBe("2026-07-15");
  });

  it("is total — a malformed URL yields undefined rather than throwing", () => {
    expect(publishedDateFromUrl("not-a-url")).toBeUndefined();
    expect(publishedDateFromUrl("")).toBeUndefined();
  });
});

describe("citationPublishedDateIso", () => {
  it("prefers the provider's own date and passes it through unchanged", () => {
    expect(
      citationPublishedDateIso({
        url: "https://a.example/2026/01/02/story",
        publishedDateIso: "2026-07-15",
      }),
    ).toBe("2026-07-15");
  });

  it("falls back to the URL-embedded date when the provider returned none", () => {
    expect(
      citationPublishedDateIso({ url: "https://apnews.com/2026/07/15/story" }),
    ).toBe("2026-07-15");
  });

  it("falls back when the provider's date is unparseable", () => {
    expect(
      citationPublishedDateIso({
        url: "https://apnews.com/2026/07/15/story",
        publishedDateIso: "a few days ago",
      }),
    ).toBe("2026-07-15");
  });

  it("is undefined when neither source dates the citation", () => {
    expect(
      citationPublishedDateIso({ url: "https://openai.com/index/gpt-5-6/" }),
    ).toBeUndefined();
  });
});
