import { describe, expect, it } from "vitest";
import exampleRuns from "./example-runs.json";
import { parseLatencyMemoryRuns } from "../domain/parse-runs.js";
import { renderLatencyMemoryScatterSection } from "../domain/scatter-section.js";

describe("local-inference-latency-memory-scatter worked example", () => {
  it("parses the committed fixture and plots only its verified runs", () => {
    const runs = parseLatencyMemoryRuns(exampleRuns);
    const section = renderLatencyMemoryScatterSection(runs);

    expect(runs).toHaveLength(5);
    expect(section.verifiedCount).toBe(3);
    expect(section.excludedCount).toBe(2);
    expect(section.markdown).toContain("<svg");
    expect(section.markdown).toContain(">llama.cpp</text>");
    expect(section.markdown).toContain(">mlx</text>");
    expect(section.markdown).not.toContain(">ollama</text>");
    expect(section.markdown).not.toContain(">strata</text>");
    expect(section.markdown).toContain("未検証のため 2 件を除外した");
  });
});
