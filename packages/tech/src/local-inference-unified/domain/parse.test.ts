import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseUnifiedResult } from "./parse";
import { ENGINES } from "./types";

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/sample.json", import.meta.url), "utf8"),
);

function run(overrides: Record<string, unknown> = {}) {
  return {
    engine: "ollama",
    model: "fixture-model",
    runtimeVersion: "0.0.0",
    condition: {},
    status: "measured",
    metrics: {
      ttft: { value: 0.1, unit: "s", source: "client" },
      tps: { value: 20, unit: "tokens/s", source: "client" },
      startup_time: { value: null, unit: "s", reason: "NOT-RUN" },
      quality_score: { value: 0.9, unit: "score", source: "usage" },
      peak_rss: { value: null, unit: "MiB", reason: "NOT-RUN" },
    },
    ...overrides,
  };
}

function result(runs: unknown[]) {
  return {
    schemaVersion: 1,
    generatedAt: "2026-10-25T00:00:00.000Z",
    inputSha256: "a".repeat(64),
    procedure: "single-request-per-engine",
    runs,
  };
}

describe("parseUnifiedResult", () => {
  it("parses the committed fixture", () => {
    const parsed = parseUnifiedResult(fixture);
    expect(parsed.runs).toHaveLength(4);
    expect(parsed.runs.map((r) => r.engine).sort()).toEqual(
      [...ENGINES].sort(),
    );
  });

  it("rejects an unknown gap reason", () => {
    expect(() =>
      parseUnifiedResult(
        result([
          run({
            metrics: {
              ...run().metrics,
              ttft: { value: null, unit: "s", reason: "SOMETHING-ELSE" },
            },
          }),
        ]),
      ),
    ).toThrow();
  });

  it("rejects an unknown failure code", () => {
    expect(() =>
      parseUnifiedResult(
        result([run({ status: "failed", failure: { code: "WHO-KNOWS" } })]),
      ),
    ).toThrow();
  });

  it("requires a failure code on a failed run", () => {
    expect(() =>
      parseUnifiedResult(result([run({ status: "failed" })])),
    ).toThrow();
  });

  it("rejects a failure code on a measured run", () => {
    expect(() =>
      parseUnifiedResult(result([run({ failure: { code: "TIMEOUT" } })])),
    ).toThrow();
  });

  it("rejects an unknown engine", () => {
    expect(() =>
      parseUnifiedResult(result([run({ engine: "gpt4all" })])),
    ).toThrow();
  });

  it("rejects a duplicate engine", () => {
    expect(() => parseUnifiedResult(result([run(), run()]))).toThrow();
  });

  it("rejects a negative measurement", () => {
    expect(() =>
      parseUnifiedResult(
        result([
          run({
            metrics: {
              ...run().metrics,
              tps: { value: -1, unit: "tokens/s", source: "client" },
            },
          }),
        ]),
      ),
    ).toThrow();
  });

  it("accepts a measured run whose quality metric is still a gap", () => {
    const parsed = parseUnifiedResult(
      result([
        run({
          metrics: {
            ...run().metrics,
            quality_score: {
              value: null,
              unit: "score",
              reason: "UNSUPPORTED",
            },
          },
        }),
      ]),
    );
    expect(parsed.runs[0].status).toBe("measured");
    expect(parsed.runs[0].metrics.quality_score).toEqual({
      value: null,
      unit: "score",
      reason: "UNSUPPORTED",
    });
  });

  it("rejects schema versions other than 1", () => {
    expect(() =>
      parseUnifiedResult({ ...result([run()]), schemaVersion: 2 }),
    ).toThrow();
  });

  it("rejects a malformed input digest", () => {
    expect(() =>
      parseUnifiedResult({ ...result([run()]), inputSha256: "not-hex" }),
    ).toThrow();
  });

  it("rejects an empty runs array", () => {
    expect(() => parseUnifiedResult(result([]))).toThrow();
  });

  it("rejects a missing metric", () => {
    const metrics = run().metrics;
    const incomplete = {
      ttft: metrics.ttft,
      tps: metrics.tps,
      startup_time: metrics.startup_time,
      quality_score: metrics.quality_score,
    };
    expect(() =>
      parseUnifiedResult(result([run({ metrics: incomplete })])),
    ).toThrow();
  });
});
