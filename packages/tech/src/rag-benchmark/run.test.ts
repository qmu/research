import { describe, expect, it } from "vitest";
import { runRagBenchmark } from "./run";

describe("runRagBenchmark", () => {
  it("runs the keyless fixture path", async () => {
    const result = await runRagBenchmark({ fixture: true, k: 3, trials: 1 });
    expect(result.fixture).toBe(true);
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0]?.provenance).toBe("fixtured");
    expect(result.runs[0]?.retrieval.recallAtK).toBeGreaterThan(0);
  });

  it("runs sqlite-vec locally without API credentials", async () => {
    const result = await runRagBenchmark({ fixture: false, k: 3, trials: 1 });
    expect(result.runs[0]?.backend.id).toBe("sqlite-vec");
    expect(result.runs[0]?.provenance).toBe("measured");
    expect(result.runs[0]?.operational.costUsd).toBe(0);
  });
});
