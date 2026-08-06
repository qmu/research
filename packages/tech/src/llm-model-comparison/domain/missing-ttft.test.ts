import { describe, it, expect } from "vitest";
import { readMissingTtftAsNull } from "./missing-ttft";
import type { ConfigRun, TrialResult } from "./types";

const trial = (n: number, ttftMs: number | null): TrialResult =>
  ({
    trial: n,
    ok: true,
    error: null,
    calls: [],
    metrics: {
      throughputTokensPerSec: 100,
      ttftMs,
      totalLatencyMs: 20_000,
      maxSchemaDepth: null,
      maxSchemaBreadth: null,
      lengthAccuracy: null,
      informationAccuracy: null,
    },
  }) as unknown as TrialResult;

const config = (trials: ReadonlyArray<TrialResult>): ConfigRun =>
  ({ trials, stats: {} }) as unknown as ConfigRun;

describe("readMissingTtftAsNull", () => {
  // The published Claude Opus 5 `high` row: trials of 19922, 0 and 11456 ms
  // averaged to 10459 ± 10048 ms. The 0 was a non-measurement counted as a
  // measurement, and it dragged the mean down by roughly a third.
  it("drops a stored 0 from the aggregate instead of averaging it in", () => {
    const before = [config([trial(1, 19_922), trial(2, 0), trial(3, 11_456)])];
    const out = readMissingTtftAsNull(before);
    const stats = out.configs[0].stats.ttftMs;

    expect(out.converted).toBe(1);
    expect(out.configs[0].trials[1].metrics.ttftMs).toBeNull();
    // Mean over the two real measurements, not three.
    expect(stats.n).toBe(2);
    expect(stats.mean).toBeCloseTo((19_922 + 11_456) / 2, 6);
    // The retired mean was pulled below both real samples' midpoint.
    expect(stats.mean).toBeGreaterThan(10_459);
  });

  it("leaves real measurements untouched", () => {
    const out = readMissingTtftAsNull([config([trial(1, 40), trial(2, 55)])]);
    expect(out.converted).toBe(0);
    expect(out.configs[0].trials.map((t) => t.metrics.ttftMs)).toEqual([
      40, 55,
    ]);
  });

  it("leaves an already-null first-token time alone", () => {
    const out = readMissingTtftAsNull([config([trial(1, null)])]);
    expect(out.converted).toBe(0);
    expect(out.configs[0].trials[0].metrics.ttftMs).toBeNull();
  });

  it("is idempotent", () => {
    const once = readMissingTtftAsNull([config([trial(1, 0), trial(2, 500)])]);
    const twice = readMissingTtftAsNull(once.configs);
    expect(twice.converted).toBe(0);
    expect(twice.configs[0].stats.ttftMs.n).toBe(1);
  });

  // Total latency has a different failure mode: a genuinely instant total would
  // be a finding, not a gap, so it must not be silently discarded here.
  it("does not touch total latency", () => {
    const t = trial(1, 0);
    const out = readMissingTtftAsNull([config([t])]);
    expect(out.configs[0].trials[0].metrics.totalLatencyMs).toBe(20_000);
  });
});
