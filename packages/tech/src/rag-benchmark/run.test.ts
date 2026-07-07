import { describe, expect, it } from "vitest";
import { runRagBenchmark } from "./run";

describe("runRagBenchmark", () => {
  it("runs the keyless fixture path", async () => {
    const result = await runRagBenchmark({ fixture: true, k: 3, trials: 1 });
    expect(result.fixture).toBe(true);
    expect(result.runs.length).toBeGreaterThanOrEqual(2);
    expect(result.runs.every((run) => run.provenance === "fixtured")).toBe(
      true,
    );
    expect(result.runs[0]?.retrieval.recallAtK).toBeGreaterThan(0);
  });

  it("runs sqlite-vec locally without API credentials", async () => {
    const result = await runRagBenchmark({
      fixture: false,
      k: 3,
      trials: 1,
      backends: ["sqlite-vec"],
    });
    expect(result.runs[0]?.backend.id).toBe("sqlite-vec");
    expect(result.runs[0]?.provenance).toBe("measured");
    expect(result.runs[0]?.operational.costUsd).toBe(0);
  });

  it("renders a key-absent managed backend as fixtured, never faked", async () => {
    const saved = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const result = await runRagBenchmark({
        fixture: false,
        k: 3,
        trials: 1,
        backends: ["openai-vector-store"],
      });
      expect(result.runs[0]?.backend.id).toBe("openai-vector-store");
      expect(result.runs[0]?.backend.isolatedStore).toBe(false);
      expect(result.runs[0]?.provenance).toBe("fixtured");
      expect(result.runs[0]?.operational.costUsd).toBe(0);
    } finally {
      if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
    }
  });
});
