import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readComparisonArtifact, type StoredComparison } from "./read-artifact";
import type { ComparisonResult, ConfigRun, TrialResult } from "./types";

const generatedAt = "2026-01-01T00:00:00.000Z";
const legacy = (ttftMs = 500, totalLatencyMs = 2000): StoredComparison => ({
  generatedAt,
  configs: [
    {
      trials: [
        {
          ok: true,
          calls: [],
          metrics: { throughputTokensPerSec: 100, totalLatencyMs, ttftMs },
        } as unknown as TrialResult,
      ],
      stats: {},
    } as unknown as ConfigRun,
  ],
});
const fixture = (path: string): ComparisonResult =>
  JSON.parse(
    readFileSync(
      new URL(`../../../../../docs/research-reports/${path}`, import.meta.url),
      "utf8",
    ),
  ) as ComparisonResult;

describe("readComparisonArtifact", () => {
  it("reads the existing v1 speed fixture without changing the file or input", () => {
    const stored = fixture(
      "history/speed/2026-07-09T11-12-01-332Z/llm-speed-comparison.data.json",
    );
    const before = JSON.stringify(stored);
    expect(stored.instrumentVersion).toBeUndefined();
    const { record } = readComparisonArtifact(stored);
    expect(record.instrumentVersion).toBe(1);
    expect(record.throughputDefinition).toBe("end-to-end");
    expect(record.configs).toHaveLength(stored.configs.length);
    expect(JSON.stringify(stored)).toBe(before);
    expect(readComparisonArtifact(record).record).toEqual(record);
  });
  it("keeps the v2 instrument, captures, metadata and existing timestamps", () => {
    const stored = fixture("llm-model-comparison.data.json");
    const { record } = readComparisonArtifact(stored);
    expect(record.instrumentVersion).toBe(2);
    expect(record.generatedAt).toBe(stored.generatedAt);
    for (const [index, config] of record.configs.entries()) {
      expect(config.measuredAt).toBe(stored.configs[index].measuredAt);
      expect(config.trials.map((t) => t.calls)).toEqual(
        stored.configs[index].trials.map((t) => t.calls),
      );
    }
    expect(readComparisonArtifact(record).record).toEqual(record);
  });
  it("backfills provenance and rescales exactly once while preserving extra fields", () => {
    const stored = { ...legacy(), fixture: true, annotation: { label: "old" } };
    const before = structuredClone(stored);
    const { record } = readComparisonArtifact(stored);
    expect(record.configs[0].measuredAt).toBe(generatedAt);
    expect(record.configs[0].trials[0].metrics.throughputTokensPerSec).toBe(75);
    expect(record.configs[0].stats.throughputTokensPerSec.mean).toBe(75);
    expect(record.annotation).toEqual(stored.annotation);
    expect(record.fixture).toBe(true);
    expect(readComparisonArtifact(record).record).toEqual(record);
    expect(stored).toEqual(before);
  });
  it("normalizes the old missing-TTFT sentinel after throughput migration", () => {
    const result = readComparisonArtifact(legacy(0));
    expect(result.missingTtftTrials).toBe(1);
    expect(result.record.configs[0].trials[0].metrics.ttftMs).toBeNull();
    expect(result.record.configs[0].trials[0].metrics.totalLatencyMs).toBe(
      2000,
    );
    expect(readComparisonArtifact(result.record).missingTtftTrials).toBe(0);
  });
  it("keeps an empty record and does not manufacture trials", () => {
    expect(
      readComparisonArtifact({ generatedAt, configs: [] }).record.configs,
    ).toEqual([]);
  });
  it("refuses a partial throughput migration instead of labelling it current", () => {
    const stored = legacy(500, 0);
    const before = structuredClone(stored);
    expect(() => readComparisonArtifact(stored)).toThrow(
      "Cannot migrate 1 stored throughput trial(s)",
    );
    expect(stored).toEqual(before);
  });
  it("rejects unknown throughput semantics rather than guessing the old formula", () => {
    const stored = { ...legacy(), throughputDefinition: "future" };
    expect(() =>
      readComparisonArtifact(stored as unknown as StoredComparison),
    ).toThrow("Unsupported stored throughput definition");
  });
});
