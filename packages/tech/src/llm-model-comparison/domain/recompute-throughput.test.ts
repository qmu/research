import { describe, it, expect } from "vitest";
import { recomputeThroughput } from "./recompute-throughput";
import type { CallRecord, ConfigRun, TrialResult } from "./types";

const speedCall = (outputTokens: number): CallRecord =>
  ({
    probe: "speed",
    effort: "high",
    prompt: "",
    rawOutput: "",
    outputTokens,
    elapsedMs: 0,
    ttftMs: null,
    schemaAxis: null,
    schemaValue: null,
    schemaConforms: null,
    informationQuestionId: null,
    error: null,
  }) as CallRecord;

const trial = (
  n: number,
  storedRate: number | null,
  totalLatencyMs: number,
  calls: ReadonlyArray<CallRecord>,
): TrialResult =>
  ({
    trial: n,
    ok: true,
    error: null,
    calls,
    metrics: {
      throughputTokensPerSec: storedRate,
      ttftMs: 0,
      totalLatencyMs,
      maxSchemaDepth: null,
      maxSchemaBreadth: null,
      lengthAccuracy: null,
      informationAccuracy: null,
    },
  }) as unknown as TrialResult;

const config = (trials: ReadonlyArray<TrialResult>): ConfigRun =>
  ({ trials, stats: {} }) as unknown as ConfigRun;

describe("recomputeThroughput", () => {
  // The real Opus 5 `max` trials from frame 2026-08-04T07:56:39.415Z. Under the
  // retired definition these stored 89.2, 92.3 and 2160.3 tok/s — a 24x spread
  // across three trials of the same configuration, caused by whether the
  // first-token event was captured. All three are ~90 tok/s end to end.
  it("replaces the retired stored rates with the end-to-end rate", () => {
    const out = recomputeThroughput([
      config([
        trial(1, 89.1597736177623, 22970, [speedCall(2048)]),
        trial(2, 92.3, 22198, [speedCall(2048)]),
        trial(3, 2160.337552742616, 22699, [speedCall(2048)]),
      ]),
    ]);

    const rates = out.configs[0].trials.map(
      (t) => t.metrics.throughputTokensPerSec as number,
    );
    expect(rates[0]).toBeCloseTo(89.16, 1);
    expect(rates[1]).toBeCloseTo(92.26, 1);
    expect(rates[2]).toBeCloseTo(90.22, 1); // was 2160.3
    expect(out.recomputed).toBe(3);
    expect(out.unrecomputable).toBe(0);
  });

  it("re-derives the aggregate so the mean matches the per-trial values", () => {
    const out = recomputeThroughput([
      config([
        trial(1, 89.1597736177623, 22970, [speedCall(2048)]),
        trial(2, 92.3, 22198, [speedCall(2048)]),
        trial(3, 2160.337552742616, 22699, [speedCall(2048)]),
      ]),
    ]);

    const stats = out.configs[0].stats.throughputTokensPerSec;
    // The retired aggregate was mean 780.6 with stdDev 1194.9 — a spread larger
    // than the mean, which is what forced the `indistinguishable` label.
    expect(stats.mean).toBeGreaterThan(85);
    expect(stats.mean).toBeLessThan(95);
    expect(stats.stdDev).toBeLessThan(5);
    expect(stats.n).toBe(3);
  });

  // Path 2: no raw call, but the stored rate is exactly invertible. The retired
  // rate was tokens/(total-ttft); multiplying by (total-ttft)/total gives
  // tokens/total, with the token count cancelling. Here ttft is 0, so the
  // retired window WAS the full total and the rate is already end-to-end.
  it("rescales a stored rate when the raw call is absent", () => {
    const out = recomputeThroughput([config([trial(1, 555, 10_000, [])])]);
    expect(out.configs[0].trials[0].metrics.throughputTokensPerSec).toBeCloseTo(
      555,
      6,
    );
    expect(out.rescaled).toBe(1);
    expect(out.unrecomputable).toBe(0);
  });

  it("rescales by the retired window when ttft was captured", () => {
    // Retired rate 2000 tok/s over a 1000 ms window of a 20000 ms request
    // implies 2000 tokens; end to end that is 100 tok/s.
    const t = {
      trial: 1,
      ok: true,
      error: null,
      calls: [],
      metrics: {
        throughputTokensPerSec: 2000,
        ttftMs: 19_000,
        totalLatencyMs: 20_000,
        maxSchemaDepth: null,
        maxSchemaBreadth: null,
        lengthAccuracy: null,
        informationAccuracy: null,
      },
    } as unknown as TrialResult;
    const out = recomputeThroughput([config([t])]);
    expect(out.configs[0].trials[0].metrics.throughputTokensPerSec).toBeCloseTo(
      100,
      6,
    );
    expect(out.rescaled).toBe(1);
  });

  // Honest degradation: a trial neither path can reach keeps what it recorded
  // and is COUNTED, rather than being silently zeroed into a fabricated
  // 0 tok/s measurement.
  it("leaves a trial with no usable elapsed time untouched and counts it", () => {
    const out = recomputeThroughput([config([trial(1, 555, 0, [])])]);
    expect(out.configs[0].trials[0].metrics.throughputTokensPerSec).toBe(555);
    expect(out.recomputed).toBe(0);
    expect(out.rescaled).toBe(0);
    expect(out.unrecomputable).toBe(1);
  });

  it("leaves a record that already declares end-to-end alone", () => {
    const input = [config([trial(1, 2160.34, 22699, [speedCall(2048)])])];
    const out = recomputeThroughput(input, "end-to-end");
    expect(out.configs[0].trials[0].metrics.throughputTokensPerSec).toBe(
      2160.34,
    );
    expect(out.recomputed).toBe(0);
    expect(out.rescaled).toBe(0);
  });

  it("is idempotent — recomputing an already-recomputed record changes nothing", () => {
    const input = [
      config([trial(1, 2160.337552742616, 22699, [speedCall(2048)])]),
    ];
    const once = recomputeThroughput(input);
    const twice = recomputeThroughput(once.configs);
    expect(twice.configs[0].trials[0].metrics.throughputTokensPerSec).toBe(
      once.configs[0].trials[0].metrics.throughputTokensPerSec,
    );
  });
});
