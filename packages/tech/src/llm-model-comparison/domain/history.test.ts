import { describe, it, expect } from "vitest";
import {
  appendHistory,
  archivesToPrune,
  buildAvailabilityHistoryEntry,
  buildHistoryEntry,
  latestArchive,
  selectErrored,
  toHistoryPoint,
} from "./history";
import type { Aggregate, ConfigRun, HistoryFile, Provenance } from "./types";
import type { EffortLevel } from "./effort";
import type { AvailabilityHistoryPoint } from "./availability";

const agg = (mean: number, stdDev = 0, n = 1): Aggregate => ({
  mean,
  stdDev,
  min: mean,
  max: mean,
  n,
});

const cfg = (
  id: string,
  effort: EffortLevel,
  provenance: Provenance,
  measuredAt = "2026-01-01T00:00:00.000Z",
): ConfigRun => ({
  id,
  provider: "openai",
  tier: "mid",
  modelName: id,
  apiModelId: id,
  released: "2026",
  inputCostPerMTok: 2.5,
  outputCostPerMTok: 15,
  effortLevels: [effort],
  source: "https://example.com",
  effort,
  provenance,
  measuredAt,
  trialsRequested: 1,
  trials: [],
  stats: {
    throughputTokensPerSec: agg(150, 12, 3),
    ttftMs: agg(300),
    totalLatencyMs: agg(900),
    maxSchemaDepth: agg(12),
    maxSchemaBreadth: agg(48),
    lengthAccuracy: agg(0.9),
    informationAccuracy: agg(0.8),
  },
  review: {
    provenance: "skipped",
    judgeModel: "judge",
    strengths: "",
    weaknesses: "",
    bestFor: "",
    raw: "",
  },
});

describe("toHistoryPoint", () => {
  it("projects metric interval inputs + provenance + measuredAt, dropping raw trials", () => {
    const point = toHistoryPoint(
      cfg("m1", "high", "measured", "2026-02-02T00:00:00.000Z"),
    );
    expect(point).toEqual({
      id: "m1",
      provider: "openai",
      modelName: "m1",
      effort: "high",
      provenance: "measured",
      throughputTokensPerSec: {
        mean: 150,
        stdDev: 12,
        n: 3,
        method: "trial-sample-std-dev",
      },
      ttftMs: { mean: 300, stdDev: 0, n: 1, method: "single-trial" },
      totalLatencyMs: { mean: 900, stdDev: 0, n: 1, method: "single-trial" },
      maxSchemaDepth: { mean: 12, stdDev: 0, n: 1, method: "single-trial" },
      maxSchemaBreadth: { mean: 48, stdDev: 0, n: 1, method: "single-trial" },
      lengthAccuracy: { mean: 0.9, stdDev: 0, n: 1, method: "single-trial" },
      informationAccuracy: {
        mean: 0.8,
        stdDev: 0,
        n: 1,
        method: "single-trial",
      },
      measuredAt: "2026-02-02T00:00:00.000Z",
    });
  });
});

describe("buildHistoryEntry", () => {
  it("stamps the run and carries one point per config", () => {
    const entry = buildHistoryEntry(
      [cfg("m1", "low", "measured"), cfg("m2", "high", "error")],
      "2026-03-03T00:00:00.000Z",
      3,
    );
    expect(entry.generatedAt).toBe("2026-03-03T00:00:00.000Z");
    expect(entry.trials).toBe(3);
    expect(entry.points.map((p) => p.id)).toEqual(["m1", "m2"]);
  });
});

describe("buildAvailabilityHistoryEntry", () => {
  it("records availability points without model metric points", () => {
    const point: AvailabilityHistoryPoint = {
      provider: "openai",
      targetModelId: "gpt-test",
      targetModelName: "GPT Test",
      n: 3,
      observationWindow: {
        startedAt: "2026-01-01T00:00:00.000Z",
        endedAt: "2026-01-01T00:02:00.000Z",
        durationMs: 120_000,
      },
      successCount: 3,
      failureCount: 0,
      successRate: 1,
      meanResponseTimeMs: 120,
      failureTypeBreakdown: {
        timeout: 0,
        server_error: 0,
        rate_limit: 0,
        network_error: 0,
        client_error: 0,
        unknown_error: 0,
      },
      rateLimitCount: 0,
      downFrequency: 0,
      downtimeDurationMs: 0,
      downRuns: [],
      measuredAt: "2026-01-01T00:02:00.000Z",
      samplingSpecVersion: "manual-health-probe-v1",
      cadence: "manual-on-demand",
    };
    const entry = buildAvailabilityHistoryEntry(
      [point],
      "2026-01-01T00:02:00.000Z",
    );
    expect(entry.trials).toBe(0);
    expect(entry.points).toEqual([]);
    expect(entry.availability).toEqual([point]);
  });
});

describe("appendHistory", () => {
  it("seeds a fresh file when there is no prior history", () => {
    const entry = buildHistoryEntry([cfg("m1", "low", "measured")], "t1", 1);
    expect(appendHistory(null, entry).entries).toEqual([entry]);
  });

  it("appends the newest entry last, preserving prior entries", () => {
    const e1 = buildHistoryEntry([cfg("m1", "low", "measured")], "t1", 1);
    const e2 = buildHistoryEntry([cfg("m1", "low", "measured")], "t2", 1);
    const file: HistoryFile = appendHistory(null, e1);
    const grown = appendHistory(file, e2);
    expect(grown.entries.map((e) => e.generatedAt)).toEqual(["t1", "t2"]);
  });
});

describe("selectErrored", () => {
  it("returns exactly the errored configurations", () => {
    const errored = selectErrored([
      cfg("m1", "low", "measured"),
      cfg("m2", "high", "error"),
      cfg("m3", "n/a", "error"),
      cfg("m4", "low", "fixtured"),
    ]);
    expect(errored.map((c) => c.id)).toEqual(["m2", "m3"]);
  });
});

// ISO stamps (":" → "-") are fixed-width, so lexicographic order is chronological.
const A = "2026-07-01T00-00-00.000Z.data.json.gz";
const B = "2026-07-04T12-30-00.000Z.data.json.gz";
const C = "2026-07-06T09-25-24.044Z.data.json.gz";

describe("latestArchive", () => {
  it("returns the newest by stamp regardless of input order", () => {
    expect(latestArchive([B, A, C])).toBe(C);
  });

  it("returns null when there are no archives", () => {
    expect(latestArchive([])).toBeNull();
  });
});

describe("archivesToPrune", () => {
  it("keeps the N most-recent and returns the older ones to delete", () => {
    // keep 2 of 3 → the single oldest (A) is pruned.
    expect(archivesToPrune([C, A, B], 2)).toEqual([A]);
  });

  it("prunes nothing when at or under the cap", () => {
    expect(archivesToPrune([A, B], 2)).toEqual([]);
    expect(archivesToPrune([A], 5)).toEqual([]);
    expect(archivesToPrune([], 5)).toEqual([]);
  });

  it("prunes all when keep is 0 or negative", () => {
    expect(archivesToPrune([A, B, C], 0)).toEqual([A, B, C]);
    expect(archivesToPrune([A, B, C], -1)).toEqual([A, B, C]);
  });
});
