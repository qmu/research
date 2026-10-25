import { describe, expect, it } from "vitest";
import { evaluateAllEngines } from "./evaluate.js";
import { renderVerdictTable } from "./report.js";
import { useCaseById } from "./catalog.js";
import type { EngineMetrics } from "./types.js";

describe("renderVerdictTable", () => {
  it("renders the use case label, each engine's decision and its rule readings", () => {
    const row: EngineMetrics = {
      ttft: { value: 1, unit: "s" },
      tps: { value: 25, unit: "tokens/s" },
      quality: { value: 0.8, unit: "ratio" },
      peakRss: { value: null, reason: "NOT-RUN" },
    };
    const useCase = useCaseById("interactive-coding-assistant");
    const verdicts = evaluateAllEngines(useCase, {
      ollama: row,
      "llama.cpp": row,
      mlx: row,
      strata: row,
    });
    const table = renderVerdictTable(useCase.label, verdicts);
    expect(table).toContain("## Interactive coding assistant");
    expect(table).toContain("- ollama: undetermined");
    expect(table).toContain("ttft=1s[<=1.5s:ok]");
    expect(table).toContain("peakRss=(NOT-RUN)");
  });
});
