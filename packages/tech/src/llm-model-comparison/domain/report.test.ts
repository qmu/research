import { describe, it, expect } from "vitest";
import { renderComparisonReport } from "./report";
import type { ComparisonResult, ComparisonRow } from "./types";

const measuredRow: ComparisonRow = {
  id: "anthropic-opus",
  provider: "anthropic",
  modelName: "Claude Opus 4.8",
  apiModelId: "claude-opus-4-8",
  released: "2026-01",
  inputCostPerMTok: 5,
  outputCostPerMTok: 25,
  effortLevels: ["low", "high"],
  source: "https://example.com/anthropic",
  measurement: {
    measured: true,
    tokensPerSecond: 87.5,
    maxNestedJsonDepth: 12,
    lengthAccuracy: 0.94,
    elapsedMs: 2300,
    outputTokens: 201,
  },
};

const fixturedRow: ComparisonRow = {
  id: "openai-gpt",
  provider: "openai",
  modelName: "GPT-5.5",
  apiModelId: "gpt-5.5",
  released: "2026-02",
  inputCostPerMTok: 5,
  outputCostPerMTok: 30,
  effortLevels: ["medium"],
  source: "https://example.com/openai",
  measurement: {
    measured: false,
    tokensPerSecond: 999,
    maxNestedJsonDepth: 99,
    lengthAccuracy: 1,
    elapsedMs: 1234,
    outputTokens: 555,
  },
};

const result: ComparisonResult = {
  rows: [measuredRow, fixturedRow],
  generatedAt: "2026-06-24T00:00:00Z",
  probe: {
    depthLadder: [3, 5, 8, 12, 16],
    lengthTargetWords: 100,
    lengthTopic: "the water cycle",
  },
};

describe("renderComparisonReport", () => {
  const page = renderComparisonReport(result);

  it("starts with frontmatter carrying a non-empty description", () => {
    expect(page.startsWith("---\n")).toBe(true);
    expect(page).toMatch(/\ndescription: \S.*\n/);
  });

  it("renders one table row per model with all eight aspects", () => {
    expect(page).toContain("| anthropic | Claude Opus 4.8 |");
    expect(page).toContain("| openai | GPT-5.5 |");
    expect(page).toContain("$5.00 / $25.00");
  });

  it("shows measured probe values for a live row", () => {
    expect(page).toContain("87.5 tok/s");
    expect(page).toContain("| 12 |");
    expect(page).toContain("94%");
  });

  it("masks all three probe columns for a fixtured row", () => {
    // The fixtured row's synthetic probe values must never appear as live figures.
    expect(page).not.toContain("999.0 tok/s");
    expect(page).not.toContain("| 99 |");
    expect(page).toContain("n/a (fixtured)");
  });

  it("masks the raw elapsed and output-token cells for a fixtured row", () => {
    // The deterministic fixture's raw numbers must not surface as if measured.
    expect(page).not.toContain("1234 ms");
    expect(page).not.toContain("| 555 |");
  });

  it("includes the legend, scope, and publication-constraints prose", () => {
    expect(page).toContain("**Legend.**");
    expect(page).toContain("## Scope & limitations");
    expect(page).toContain("### Publication constraints");
  });

  it("warns that the run includes fixtured rows when any row is fixtured", () => {
    expect(page).toContain("This run includes fixtured rows.");
  });

  it("omits the fixtured-run warning when every row is measured", () => {
    const allMeasured = renderComparisonReport({
      ...result,
      rows: [measuredRow],
    });
    expect(allMeasured).not.toContain("This run includes fixtured rows.");
  });
});
