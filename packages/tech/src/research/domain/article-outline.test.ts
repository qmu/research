import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ARTICLE_OUTLINE,
  articleOutlineProblems,
  extractMarkdownHeadings,
  renderEnglishResearchArticle,
} from "./article-outline";
import { publishedResearchTopics } from "./site";

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

  it("keeps every published English and Japanese article on the standard outline", () => {
    for (const topic of publishedResearchTopics) {
      const english = readFileSync(repoPath(topic.source.docsPath), "utf8");
      const japanese = readFileSync(repoPath(topic.japanese.docsPath), "utf8");
      expect(
        articleOutlineProblems(english, "english"),
        topic.source.docsPath,
      ).toEqual([]);
      expect(
        articleOutlineProblems(japanese, "japanese"),
        topic.japanese.docsPath,
      ).toEqual([]);
    }
  });
});
