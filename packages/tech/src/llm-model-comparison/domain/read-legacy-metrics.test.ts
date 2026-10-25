import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  readLegacyMetrics,
  type LegacyMetricsConfig,
} from "./read-legacy-metrics";
import { recomputeThroughput } from "./recompute-throughput";

const archived = (): { configs: LegacyMetricsConfig[] } =>
  JSON.parse(
    readFileSync(
      new URL(
        "../../../../../docs/research-reports/history/speed/2026-07-09T11-52-54-627Z/llm-speed-comparison.data.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

describe("pre-information-probe JSON compatibility", () => {
  it("reads the committed v1 fixture without inventing accuracy measurements", () => {
    const stored = archived();
    const before = JSON.stringify(stored);
    const configs = readLegacyMetrics(stored.configs);
    expect(configs.length).toBeGreaterThan(0);
    for (const [index, config] of configs.entries()) {
      expect(
        config.trials.every((t) => t.metrics.informationAccuracy === null),
      ).toBe(true);
      expect(config.stats.informationAccuracy).toEqual({
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        n: 0,
      });
      expect(config.trials.map((t) => t.calls)).toEqual(
        stored.configs[index].trials.map((t) => t.calls),
      );
      expect(config.stats.ttftMs).toEqual(stored.configs[index].stats.ttftMs);
    }
    expect(JSON.stringify(stored)).toBe(before);
  });

  it("keeps measured zero, null and positive scores while excluding failed trials", () => {
    const original = archived().configs[0];
    const scores = [undefined, null, 0, 0.75, 1];
    const mixed = {
      ...original,
      trials: scores.map((informationAccuracy, index) => ({
        ...original.trials[0],
        ok: index !== 4,
        metrics: { ...original.trials[0].metrics, informationAccuracy },
      })),
    };
    const [config] = readLegacyMetrics([mixed]);
    expect(config.trials.map((t) => t.metrics.informationAccuracy)).toEqual([
      null,
      null,
      0,
      0.75,
      1,
    ]);
    expect(config.stats.informationAccuracy.n).toBe(2);
    expect(config.stats.informationAccuracy.mean).toBe(0.375);
  });

  it("preserves extra metadata and returns current configs unchanged on repeated reads", () => {
    const source = { ...archived().configs[0], extension: { retained: true } };
    const once = readLegacyMetrics([source]);
    expect(once[0]).toMatchObject({ extension: { retained: true } });
    expect(readLegacyMetrics(once)).toBe(once);
  });

  it("normalizes missing accuracy for both retired and current throughput definitions", () => {
    for (const definition of ["post-first-token", "end-to-end"] as const) {
      const stored = archived();
      const { configs } = recomputeThroughput(stored.configs, definition);
      expect(configs.every((c) => c.stats.informationAccuracy.n === 0)).toBe(
        true,
      );
      expect(
        configs.every((c) =>
          c.trials.every((t) => t.metrics.informationAccuracy === null),
        ),
      ).toBe(true);
      if (definition === "end-to-end") {
        expect(configs[0].stats.throughputTokensPerSec).toEqual(
          stored.configs[0].stats.throughputTokensPerSec,
        );
      }
    }
  });
});
