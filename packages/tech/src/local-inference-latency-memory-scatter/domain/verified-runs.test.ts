import { describe, expect, it } from "vitest";
import { onlyVerifiedRuns } from "./verified-runs.js";
import type { LatencyMemoryRun } from "./types.js";

describe("onlyVerifiedRuns", () => {
  it("keeps verified runs and drops unverified ones", () => {
    const runs: LatencyMemoryRun[] = [
      {
        engine: "llama.cpp",
        label: "trial-1",
        reading: { status: "verified", initialDelayMs: 120, peakRssMiB: 900 },
      },
      {
        engine: "ollama",
        label: "trial-2",
        reading: { status: "unverified", reason: "runner-version-mismatch" },
      },
      {
        engine: "mlx",
        label: "trial-3",
        reading: { status: "verified", initialDelayMs: 80, peakRssMiB: 650 },
      },
    ];

    const verified = onlyVerifiedRuns(runs);

    expect(verified.map((run) => run.engine)).toEqual(["llama.cpp", "mlx"]);
    expect(verified.every((run) => run.reading.status === "verified")).toBe(
      true,
    );
  });

  it("returns an empty array when nothing verified, without throwing", () => {
    const runs: LatencyMemoryRun[] = [
      {
        engine: "strata",
        label: "trial-1",
        reading: { status: "unverified", reason: "NO-FIELD" },
      },
    ];

    expect(onlyVerifiedRuns(runs)).toEqual([]);
  });

  it("returns an empty array for an empty input", () => {
    expect(onlyVerifiedRuns([])).toEqual([]);
  });
});
