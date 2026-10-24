import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { evaluateMetric, toleranceMargin } from "./evaluate";
import { validateBenchSpec } from "./validate";
import type { BenchSpec, ExpectedMetric } from "./types";

const fixture = JSON.parse(
  readFileSync(
    new URL("../fixtures/llm-benchmark.spec.json", import.meta.url),
    "utf8",
  ),
) as BenchSpec;

const metric = (name: string): ExpectedMetric => {
  const found = fixture.expectedMetrics.find((m) => m.name === name);
  if (!found) throw new Error(`fixture lacks metric ${name}`);
  return found;
};

describe("bench-spec fixture", () => {
  it("is a valid spec", () => {
    expect(validateBenchSpec(fixture)).toEqual([]);
  });
});

describe("evaluateMetric", () => {
  const accuracy = metric("accuracy");
  const latency = metric("latency-p50");
  const cost = metric("cost-per-run");

  it("higher-is-better passes at or above threshold minus tolerance", () => {
    expect(evaluateMetric(accuracy, 0.9)).toBe("pass");
    expect(evaluateMetric(accuracy, 0.8)).toBe("pass");
    expect(evaluateMetric(accuracy, 0.76)).toBe("pass");
    expect(evaluateMetric(accuracy, 0.7)).toBe("fail");
  });

  it("lower-is-better passes at or below threshold plus relative tolerance", () => {
    expect(toleranceMargin(latency)).toBeCloseTo(200);
    expect(evaluateMetric(latency, 1500)).toBe("pass");
    expect(evaluateMetric(latency, 2150)).toBe("pass");
    expect(evaluateMetric(latency, 2300)).toBe("fail");
  });

  it("zero is a measurement, not a gap", () => {
    expect(evaluateMetric(accuracy, 0)).toBe("fail");
    expect(evaluateMetric(latency, 0)).toBe("pass");
  });

  it("reports ungated metrics as observed", () => {
    expect(evaluateMetric(cost, 0.42)).toBe("observed");
  });

  it("applies onMissing to undefined, null and non-finite values", () => {
    for (const gap of [undefined, null, Number.NaN, Infinity]) {
      expect(evaluateMetric(accuracy, gap)).toBe("missing-fail");
      expect(evaluateMetric(latency, gap)).toBe("missing-excluded");
      // onMissing defaults to fail even for an ungated metric.
      expect(evaluateMetric(cost, gap)).toBe("missing-fail");
    }
  });
});

describe("validateBenchSpec tolerance, unit and onMissing", () => {
  const withMetric = (m: unknown): BenchSpec => ({
    ...fixture,
    expectedMetrics: [m as ExpectedMetric],
  });
  const base = {
    name: "m",
    unit: "ratio",
    direction: "higher-is-better",
    threshold: 1,
  };

  it("rejects a unit outside the closed set", () => {
    const errors = validateBenchSpec(withMetric({ ...base, unit: "fps" }));
    expect(errors.join("\n")).toContain("unit must be one of");
  });

  it("rejects a negative tolerance", () => {
    const errors = validateBenchSpec(
      withMetric({ ...base, tolerance: { kind: "absolute", value: -1 } }),
    );
    expect(errors.join("\n")).toContain("tolerance value");
  });

  it("rejects a tolerance without a threshold", () => {
    const errors = validateBenchSpec(
      withMetric({
        name: "m",
        unit: "ratio",
        direction: "higher-is-better",
        tolerance: { kind: "relative", value: 0.1 },
      }),
    );
    expect(errors).toContain(
      "expectedMetrics 'm': tolerance requires a threshold",
    );
  });

  it("rejects an unknown onMissing policy", () => {
    const errors = validateBenchSpec(
      withMetric({ ...base, onMissing: "zero" }),
    );
    expect(errors.join("\n")).toContain("onMissing must be one of");
  });
});
