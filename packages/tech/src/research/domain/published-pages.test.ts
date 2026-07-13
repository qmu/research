import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { publishedResearchTopics } from "./site";

/**
 * Guards over the committed published pages (the files qmu-co-jp receives):
 *
 * - Every published page's frontmatter `title` equals its sidebar label
 *   (`source.text` for English pages, `japanese.text` for Japanese pages), so
 *   the qmu-co-jp sidebar and the article never show different titles.
 * - No published page contains a ```mermaid fence — qmu-co-jp does not render
 *   Mermaid, so a diagram there would ship as a raw code block.
 *
 * These read the committed files from disk: the policy holds for what is
 * actually published, not just for what the renderers would produce.
 */

const repoPath = (path: string): string =>
  resolve(process.cwd(), "../..", path);

const frontmatterTitle = (markdown: string): string | undefined => {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (match === null) return undefined;
  const line = (match[1] ?? "")
    .split("\n")
    .find((candidate) => candidate.startsWith("title:"));
  if (line === undefined) return undefined;
  const value = line.slice("title:".length).trim();
  return /^".*"$/.test(value) ? JSON.parse(value) : value;
};

const publishedPages = publishedResearchTopics.flatMap((topic) => [
  { path: topic.source.docsPath, sidebarLabel: topic.source.text },
  { path: topic.japanese.docsPath, sidebarLabel: topic.japanese.text },
]);

describe("published pages", () => {
  it("carries its sidebar label as the frontmatter title on every page", () => {
    for (const page of publishedPages) {
      const markdown = readFileSync(repoPath(page.path), "utf8");
      expect(frontmatterTitle(markdown), page.path).toBe(page.sidebarLabel);
    }
  });

  it("contains no mermaid fence on any page", () => {
    for (const page of publishedPages) {
      const markdown = readFileSync(repoPath(page.path), "utf8");
      expect(markdown, page.path).not.toMatch(/^```mermaid/m);
    }
  });

  // Site-wide article policy: §4 検証結果 / Verification Results is a concise
  // aggregated overview (charts allowed); exhaustive per-subject tables belong
  // in §7 検証データ. The budget keeps a raw result dump from creeping back
  // into §4. Pages without a numbered §4 (snapshot pages) are exempt.
  const SECTION4_BUDGET_CHARS = 3_000;

  const section4Of = (markdown: string): string | undefined => {
    const match = markdown.match(/^## 4\..*$/m);
    if (match === null || match.index === undefined) return undefined;
    const rest = markdown.slice(match.index + match[0].length);
    const next = rest.search(/^## /m);
    return next === -1 ? rest : rest.slice(0, next);
  };

  it("keeps section 4 a concise overview within the budget", () => {
    for (const page of publishedPages) {
      const markdown = readFileSync(repoPath(page.path), "utf8");
      const section = section4Of(markdown);
      if (section === undefined) continue;
      const withoutSvg = section.replace(/<svg[\s\S]*?<\/svg>/g, "");
      expect(withoutSvg.length, page.path).toBeLessThanOrEqual(
        SECTION4_BUDGET_CHARS,
      );
    }
  });
});
