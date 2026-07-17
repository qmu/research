import { describe, expect, it } from "vitest";
import {
  appendHistory,
  buildHistoryEntry,
  providerTrends,
  toHistoryPoint,
  type AgentVmHistoryFile,
} from "./history";
import type { AgentVmResult, SandboxRun } from "./types";

const run = (
  id: string,
  coldStartMsP50: number,
  publishedVcpuHourUsd: number,
  provenance: SandboxRun["measurement"]["provenance"] = "fixtured",
): SandboxRun => ({
  card: {
    id,
    providerName: id.toUpperCase(),
    isolationModel: "firecracker",
    publishedVcpuHourUsd,
    publishedGbHourUsd: 0.01,
    billingGranularity: "per-second",
    maxRuntimeSeconds: null,
    snapshotResume: true,
    filesystemPersistence: "persistent",
    networkEgress: "open",
    gpuAvailable: false,
    apiReachable: true,
    lastVerified: "2026-07-14",
    source: "https://example.com",
  },
  measurement: {
    provenance,
    repetitions: 3,
    coldStartMsP50,
    coldStartMsP95: coldStartMsP50 + 10,
    coldStartStat: { mean: coldStartMsP50, stdDev: 0, n: 3 },
    warmReuseMs: 10,
    fixedTaskWallClockMs: 100,
    measuredCostUsd: 0.0001,
    samples: [],
  },
});

const result = (
  generatedAt: string,
  runs: ReadonlyArray<SandboxRun>,
): AgentVmResult => ({
  generatedAt,
  fixture: true,
  repetitions: 3,
  instrumentVersion: 1,
  task: { id: "t", description: "d" },
  runs,
  artifactPath: "agent-vm-comparison.data.json",
});

describe("toHistoryPoint", () => {
  it("keeps the two trend metrics and provenance", () => {
    const point = toHistoryPoint(
      run("e2b", 90, 0.1),
      "2026-07-14T00:00:00.000Z",
    );
    expect(point).toMatchObject({
      id: "e2b",
      coldStartMsP50: 90,
      publishedVcpuHourUsd: 0.1,
      provenance: "fixtured",
      measuredAt: "2026-07-14T00:00:00.000Z",
    });
  });
});

describe("buildHistoryEntry / appendHistory", () => {
  it("stamps the instrument version and appends newest-last", () => {
    const first = buildHistoryEntry(
      result("2026-06-01T00:00:00.000Z", [run("e2b", 90, 0.1)]),
      "1",
    );
    const second = buildHistoryEntry(
      result("2026-07-01T00:00:00.000Z", [run("e2b", 95, 0.1)]),
      "1",
    );
    const file = appendHistory(appendHistory(null, first), second);
    expect(file.entries).toHaveLength(2);
    expect(file.entries[0]?.generatedAt).toBe("2026-06-01T00:00:00.000Z");
    expect(file.entries[1]?.instrumentVersion).toBe("1");
  });
});

describe("providerTrends", () => {
  const file: AgentVmHistoryFile = {
    entries: [
      buildHistoryEntry(
        result("2026-06-01T00:00:00.000Z", [
          run("e2b", 90, 0.1),
          run("fly", 2800, 0.02),
        ]),
        "1",
      ),
      buildHistoryEntry(
        result("2026-07-01T00:00:00.000Z", [
          run("e2b", 95, 0.11),
          run("fly", 2700, 0.02),
        ]),
        "1",
      ),
    ],
  };

  it("connects same-version points per provider in chronological order", () => {
    const trends = providerTrends(file, "coldStartMsP50", "1");
    expect(trends.map((t) => t.id)).toEqual(["e2b", "fly"]);
    expect(trends[0]?.samples.map((s) => s.value)).toEqual([90, 95]);
    expect(trends[1]?.samples.map((s) => s.value)).toEqual([2800, 2700]);
  });

  it("tracks the reference price series", () => {
    const trends = providerTrends(file, "publishedVcpuHourUsd", "1");
    expect(trends[0]?.samples.map((s) => s.value)).toEqual([0.1, 0.11]);
  });

  it("excludes points from a different instrument version", () => {
    const mixed = appendHistory(
      file,
      buildHistoryEntry(
        result("2026-08-01T00:00:00.000Z", [run("e2b", 80, 0.12)]),
        "2",
      ),
    );
    const trends = providerTrends(mixed, "coldStartMsP50", "1");
    expect(trends[0]?.samples.map((s) => s.value)).toEqual([90, 95]);
  });

  it("omits cold-start for unreachable rows but keeps price", () => {
    const withGap: AgentVmHistoryFile = {
      entries: [
        buildHistoryEntry(
          result("2026-06-01T00:00:00.000Z", [
            run("e2b", 0, 0.1, "unreachable"),
          ]),
          "1",
        ),
      ],
    };
    expect(providerTrends(withGap, "coldStartMsP50", "1")).toEqual([]);
    expect(providerTrends(withGap, "publishedVcpuHourUsd", "1")).toHaveLength(
      1,
    );
  });
});
