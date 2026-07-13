import { describe, expect, it } from "vitest";
import { renderSvgGenerationReport } from "./report";
import { articleOutlineProblems } from "../../research/domain/article-outline";
import { runSvgGeneration } from "../run";
import { publishedResearchTopics } from "../../research/domain/site";

describe("renderSvgGenerationReport", () => {
  it("renders the standard 7-section English outline with the sidebar title", async () => {
    const result = await runSvgGeneration({ fixture: true, trials: 1 });
    const markdown = renderSvgGenerationReport(result);
    expect(articleOutlineProblems(markdown, "english")).toEqual([]);

    const sidebarLabel = publishedResearchTopics.find(
      (topic) => topic.id === "svg-generation",
    )?.source.text;
    // The frontmatter title must equal the sidebar label (published-page policy).
    expect(markdown).toContain(`title: ${sidebarLabel}`);
  });

  it("labels a keyless run as 0 measured and includes every subject row", async () => {
    const result = await runSvgGeneration({ fixture: true, trials: 1 });
    const markdown = renderSvgGenerationReport(result);
    expect(markdown).toContain("0 measured");
    for (const run of result.runs) {
      expect(markdown).toContain(run.modelName);
    }
  });
});
