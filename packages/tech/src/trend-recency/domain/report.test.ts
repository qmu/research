import { describe, expect, it } from "vitest";
import { renderTrendRecencyReport } from "./report";
import { articleOutlineProblems } from "../../research/domain/article-outline";
import { runTrendRecency } from "../run";

describe("renderTrendRecencyReport", () => {
  it("renders the standard 7-section English outline", async () => {
    const result = await runTrendRecency({ fixture: true, trials: 1 });
    const markdown = renderTrendRecencyReport(result);
    expect(articleOutlineProblems(markdown, "english")).toEqual([]);
  });

  it("labels a keyless run as 0 measured and includes every subject row", async () => {
    const result = await runTrendRecency({ fixture: true, trials: 1 });
    const markdown = renderTrendRecencyReport(result);
    expect(markdown).toContain("0 measured");
    for (const run of result.runs) {
      expect(markdown).toContain(run.modelName);
    }
  });

  it("never fakes an unmeasured freshness value", async () => {
    const result = await runTrendRecency({
      fixture: true,
      trials: 1,
      modelIds: ["gpt-5-5-ungrounded"],
    });
    // The ungrounded fixture control abstains without citations, so its
    // freshness stat is n=0 and must render as "not measured", never 0 days.
    const markdown = renderTrendRecencyReport(result);
    expect(markdown).toContain("not measured");
  });
});
