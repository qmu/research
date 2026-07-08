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
    expect(result.runs[0]?.retrieval.queryCount).toBe(3);
    expect(result.runs[0]?.operational.trialCount).toBe(1);
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
    expect(result.runs[0]?.retrieval.trialStdDev).toBeUndefined();
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
      expect(result.runs[0]?.retrieval.intervalNote).toContain("deterministic");
    } finally {
      if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
    }
  });

  it("renders every credential-absent cloud backend as fixtured, never faked", async () => {
    const gatedEnv = [
      "AWS_PROFILE",
      "AWS_ACCESS_KEY_ID",
      "CLOUDFLARE_API_TOKEN",
    ];
    const saved = new Map(gatedEnv.map((name) => [name, process.env[name]]));
    for (const name of gatedEnv) delete process.env[name];
    try {
      const result = await runRagBenchmark({
        fixture: false,
        k: 3,
        trials: 1,
        backends: ["s3-vectors", "vectorize", "autorag"],
      });
      expect(result.runs.map((run) => run.backend.id)).toEqual([
        "s3-vectors",
        "vectorize",
        "autorag",
      ]);
      // Credential absent → deterministic fixture store, never a live call.
      expect(result.runs.every((run) => run.provenance === "fixtured")).toBe(
        true,
      );
    } finally {
      for (const [name, value] of saved) {
        if (value !== undefined) process.env[name] = value;
      }
    }
  });
});
