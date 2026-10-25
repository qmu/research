import { describe, expect, it } from "vitest";
import {
  evaluateAdoption,
  evaluateAllEngines,
  evaluateRule,
} from "./evaluate.js";
import type { EngineMetrics, ThresholdRule, UseCase } from "./types.js";

const rule = (overrides: Partial<ThresholdRule> = {}): ThresholdRule => ({
  metric: "ttft",
  direction: "lower-is-better",
  unit: "s",
  threshold: 1.5,
  rationale: "test",
  ...overrides,
});

describe("evaluateRule", () => {
  it("passes a lower-is-better reading at or under the threshold", () => {
    const atThreshold = evaluateRule({ value: 1.5, unit: "s" }, rule());
    const underThreshold = evaluateRule({ value: 1.0, unit: "s" }, rule());
    expect(atThreshold.outcome).toBe("pass");
    expect(underThreshold.outcome).toBe("pass");
  });

  it("fails a lower-is-better reading over the threshold", () => {
    const verdict = evaluateRule({ value: 1.6, unit: "s" }, rule());
    expect(verdict.outcome).toBe("fail");
  });

  it("widens only the pass side with tolerance", () => {
    const tolerant = rule({ tolerance: 0.2 });
    const atTolerance = evaluateRule({ value: 1.7, unit: "s" }, tolerant);
    const pastTolerance = evaluateRule({ value: 1.71, unit: "s" }, tolerant);
    const underThreshold = evaluateRule({ value: 1.4, unit: "s" }, tolerant);
    expect(atTolerance.outcome).toBe("pass");
    expect(pastTolerance.outcome).toBe("fail");
    expect(underThreshold.outcome).toBe("pass");
  });

  it("passes a higher-is-better reading at or over the threshold", () => {
    const higher = rule({
      metric: "tps",
      direction: "higher-is-better",
      unit: "tokens/s",
      threshold: 20,
    });
    const atThreshold = evaluateRule({ value: 20, unit: "tokens/s" }, higher);
    const underThreshold = evaluateRule(
      { value: 19, unit: "tokens/s" },
      higher,
    );
    expect(atThreshold.outcome).toBe("pass");
    expect(underThreshold.outcome).toBe("fail");
  });

  it("is undetermined, never a pass or fail, when the reading is missing", () => {
    const verdict = evaluateRule({ value: null, reason: "NOT-RUN" }, rule());
    expect(verdict.outcome).toBe("undetermined");
    expect(verdict.reason).toBe("NOT-RUN");
  });

  it("throws on a unit mismatch between the reading and the rule", () => {
    const mismatched = () => evaluateRule({ value: 1, unit: "ms" }, rule());
    expect(mismatched).toThrow(/unit mismatch/);
  });
});

const useCase: UseCase = {
  id: "test-use-case",
  label: "Test use case",
  description: "test",
  rules: [
    rule({
      metric: "ttft",
      direction: "lower-is-better",
      unit: "s",
      threshold: 1.5,
    }),
    rule({
      metric: "tps",
      direction: "higher-is-better",
      unit: "tokens/s",
      threshold: 20,
    }),
  ],
};

const metrics = (
  ttft: EngineMetrics["ttft"],
  tps: EngineMetrics["tps"],
): EngineMetrics => ({
  ttft,
  tps,
  quality: { value: 1, unit: "ratio" },
  peakRss: { value: 1, unit: "MiB" },
});

describe("evaluateAdoption", () => {
  it("adopts only when every rule passes", () => {
    const verdict = evaluateAdoption(
      useCase,
      "ollama",
      metrics({ value: 1, unit: "s" }, { value: 25, unit: "tokens/s" }),
    );
    expect(verdict.decision).toBe("adopt");
  });

  it("rejects when any rule fails, even if another is undetermined", () => {
    const verdict = evaluateAdoption(
      useCase,
      "ollama",
      metrics({ value: 2, unit: "s" }, { value: null, reason: "NOT-RUN" }),
    );
    expect(verdict.decision).toBe("reject");
  });

  it("is undetermined, not adopted, when a rule's reading is missing and nothing failed", () => {
    const verdict = evaluateAdoption(
      useCase,
      "ollama",
      metrics({ value: 1, unit: "s" }, { value: null, reason: "NOT-RUN" }),
    );
    expect(verdict.decision).toBe("undetermined");
  });
});

describe("evaluateAllEngines", () => {
  it("evaluates every engine present in the readings map independently", () => {
    const fast = metrics(
      { value: 1, unit: "s" },
      { value: 25, unit: "tokens/s" },
    );
    const slow = metrics(
      { value: 2, unit: "s" },
      { value: 25, unit: "tokens/s" },
    );
    const verdicts = evaluateAllEngines(useCase, {
      ollama: fast,
      "llama.cpp": slow,
      mlx: fast,
      strata: fast,
    });
    expect(verdicts.map((v) => [v.engine, v.decision])).toEqual([
      ["ollama", "adopt"],
      ["llama.cpp", "reject"],
      ["mlx", "adopt"],
      ["strata", "adopt"],
    ]);
  });
});
