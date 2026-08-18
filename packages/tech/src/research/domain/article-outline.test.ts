import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ARTICLE_OUTLINE,
  CATALOG_OUTLINE,
  articleOutlineProblems,
  extractMarkdownHeadings,
  outlineKindForTopicKind,
  renderEnglishCatalogArticle,
  renderEnglishResearchArticle,
} from "./article-outline";
import { publishedResearchTopics, reportFrameSources } from "./site";
import { snapshotBudgetProblems } from "./snapshot";
import { findTopic } from "./topic";

const repoPath = (path: string): string =>
  resolve(process.cwd(), "../..", path);

describe("article outline", () => {
  it("ignores headings inside code fences", () => {
    expect(
      extractMarkdownHeadings(
        [
          "# Title",
          "",
          "```sh",
          "# shell comment",
          "## not a markdown heading",
          "```",
          "",
          "## 1. Research Purpose",
        ].join("\n"),
      ),
    ).toEqual([
      { level: 1, text: "Title" },
      { level: 2, text: "1. Research Purpose" },
    ]);
  });

  it("renders the shared English article outline", () => {
    const markdown = renderEnglishResearchArticle({
      title: "Example",
      description: "Example description.",
      purpose: "Purpose.",
      targetModels: "Models.",
      targetMetrics: "Metrics.",
      scopeAndConstraints: "Scope.",
      verificationResults: "Results.",
      analysis: "Analysis.",
      reproductionSteps: "Steps.",
      reproductionCost: "Cost.",
      cleanup: "Cleanup.",
      verificationData: "Data.",
    });
    expect(articleOutlineProblems(markdown, "english")).toEqual([]);
    expect(ARTICLE_OUTLINE.english.h2).toEqual([
      "1. Research Purpose",
      "2. Measurement Targets",
      "3. Scope and Constraints",
      "4. Verification Results",
      "5. Analysis",
      "6. Reproduction",
      "7. Verification Data",
    ]);
    expect(ARTICLE_OUTLINE.english.h3).toEqual([
      "Target Models",
      "Target Metrics",
      "Reproduction Steps",
      "Reproduction Cost (Estimate)",
      "Cleanup",
    ]);
  });

  it("renders the reference-catalog outline", () => {
    const markdown = renderEnglishCatalogArticle({
      title: "Example",
      description: "Example description.",
      overview: "Overview.",
      coverage: "Coverage.",
      catalog: "Catalog.",
      sources: "Sources.",
    });
    expect(articleOutlineProblems(markdown, "english", "catalog")).toEqual([]);
    expect(CATALOG_OUTLINE.english.h2).toEqual([
      "Overview",
      "Coverage",
      "Catalog",
      "Sources",
    ]);
    expect(CATALOG_OUTLINE.japanese.h2).toEqual([
      "概要",
      "収録範囲",
      "カタログ",
      "出典",
    ]);
    // The catalog outline exists to differ from the verification one: a
    // reference topic states no research purpose, and shares no section with
    // the measured topics' outline.
    expect(CATALOG_OUTLINE.english.h2).not.toContain("1. Research Purpose");
    expect(CATALOG_OUTLINE.japanese.h2).not.toContain("1. 調査の目的");
    for (const outline of [CATALOG_OUTLINE.english, CATALOG_OUTLINE.japanese]) {
      expect(outline.h3).toEqual([]);
    }
    expect(
      CATALOG_OUTLINE.english.h2.filter((heading) =>
        ARTICLE_OUTLINE.english.h2.includes(heading),
      ),
    ).toEqual([]);
  });

  it("selects each topic's outline from its registry kind", () => {
    expect(outlineKindForTopicKind(findTopic("foundation-models")?.kind)).toBe(
      "catalog",
    );
    // Every other published topic — and an unregistered id — stays on the
    // validated standard outline by omission.
    for (const topic of publishedResearchTopics) {
      if (topic.id === "foundation-models") continue;
      expect(outlineKindForTopicKind(findTopic(topic.id)?.kind), topic.id).toBe(
        "standard",
      );
    }
    expect(outlineKindForTopicKind(undefined)).toBe("standard");
  });

  it("keeps every published English and Japanese article on its topic's outline", () => {
    for (const topic of publishedResearchTopics) {
      // For a snapshot topic the outline applies to the full trial report;
      // the sidebar page is the snapshot and is checked separately below.
      const englishPath = reportFrameSources(topic).source;
      const kind = outlineKindForTopicKind(findTopic(topic.id)?.kind);
      const english = readFileSync(repoPath(englishPath), "utf8");
      const japanese = readFileSync(repoPath(topic.japanese.docsPath), "utf8");
      expect(
        articleOutlineProblems(english, "english", kind),
        englishPath,
      ).toEqual([]);
      expect(
        articleOutlineProblems(japanese, "japanese", kind),
        topic.japanese.docsPath,
      ).toEqual([]);
    }
  });

  it("keeps every committed snapshot page within the compactness budget", () => {
    for (const topic of publishedResearchTopics) {
      if (topic.articleMode !== "snapshot") continue;
      const snapshot = readFileSync(repoPath(topic.source.docsPath), "utf8");
      expect(snapshotBudgetProblems(snapshot), topic.source.docsPath).toEqual(
        [],
      );
      for (const heading of ["## Tendency", "## Trials", "## Design"]) {
        expect(snapshot, topic.source.docsPath).toContain(heading);
      }
    }
  });
});
