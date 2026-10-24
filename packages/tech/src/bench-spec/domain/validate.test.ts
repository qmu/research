import { describe, it, expect } from "vitest";
import { validateBenchSpec, isValidBenchSpec } from "./validate";
import type { BenchSpec, MetricDirection } from "./types";

const VALID_SPEC: BenchSpec = {
  topicId: "llm-benchmark",
  fixedInputs: [
    {
      id: "exact-match-tasks",
      description: "5 short-answer prompts",
      itemCount: 5,
    },
  ],
  modelConditions: [
    { id: "sonnet-5-5", model: "claude-sonnet-5-5" },
    { id: "haiku-5-5", model: "claude-haiku-5-5", params: { effort: "low" } },
  ],
  expectedMetrics: [
    {
      name: "accuracy",
      unit: "ratio",
      direction: "higher-is-better",
      threshold: 0.8,
    },
  ],
};

describe("validateBenchSpec", () => {
  it("accepts a well-formed spec", () => {
    expect(validateBenchSpec(VALID_SPEC)).toEqual([]);
    expect(isValidBenchSpec(VALID_SPEC)).toBe(true);
  });

  it("rejects an empty topicId", () => {
    const errors = validateBenchSpec({ ...VALID_SPEC, topicId: "  " });
    expect(errors).toContain("topicId must not be empty");
  });

  it("rejects a spec with no fixed inputs", () => {
    const errors = validateBenchSpec({ ...VALID_SPEC, fixedInputs: [] });
    expect(errors).toContain(
      "fixedInputs must declare at least one fixed input",
    );
  });

  it("rejects a fixed input with a negative itemCount", () => {
    const errors = validateBenchSpec({
      ...VALID_SPEC,
      fixedInputs: [{ id: "tasks", description: "bad count", itemCount: -1 }],
    });
    expect(
      errors.some((error) =>
        error.includes("itemCount must be a non-negative"),
      ),
    ).toBe(true);
  });

  it("rejects duplicate fixed input ids", () => {
    const errors = validateBenchSpec({
      ...VALID_SPEC,
      fixedInputs: [
        { id: "tasks", description: "a", itemCount: 1 },
        { id: "tasks", description: "b", itemCount: 2 },
      ],
    });
    expect(errors).toContain("fixedInputs: duplicate id 'tasks'");
  });

  it("rejects a spec with no model conditions", () => {
    const errors = validateBenchSpec({ ...VALID_SPEC, modelConditions: [] });
    expect(errors).toContain(
      "modelConditions must declare at least one model condition",
    );
  });

  it("rejects a model condition with an empty model name", () => {
    const errors = validateBenchSpec({
      ...VALID_SPEC,
      modelConditions: [{ id: "cond-a", model: "" }],
    });
    expect(errors).toContain(
      "modelConditions 'cond-a': model must not be empty",
    );
  });

  it("rejects duplicate model condition ids", () => {
    const errors = validateBenchSpec({
      ...VALID_SPEC,
      modelConditions: [
        { id: "cond-a", model: "model-x" },
        { id: "cond-a", model: "model-y" },
      ],
    });
    expect(errors).toContain("modelConditions: duplicate id 'cond-a'");
  });

  it("rejects a spec with no expected metrics", () => {
    const errors = validateBenchSpec({ ...VALID_SPEC, expectedMetrics: [] });
    expect(errors).toContain(
      "expectedMetrics must declare at least one expected metric",
    );
  });

  it("rejects an expected metric with an invalid direction", () => {
    const errors = validateBenchSpec({
      ...VALID_SPEC,
      expectedMetrics: [
        {
          name: "accuracy",
          unit: "ratio",
          direction: "sideways" as unknown as MetricDirection,
        },
      ],
    });
    expect(
      errors.some((error) => error.includes("direction must be one of")),
    ).toBe(true);
  });

  it("rejects an expected metric with a non-finite threshold", () => {
    const errors = validateBenchSpec({
      ...VALID_SPEC,
      expectedMetrics: [
        {
          name: "accuracy",
          unit: "ratio",
          direction: "higher-is-better",
          threshold: Infinity,
        },
      ],
    });
    expect(
      errors.some((error) =>
        error.includes("threshold must be a finite number"),
      ),
    ).toBe(true);
  });

  it("rejects duplicate expected metric names", () => {
    const errors = validateBenchSpec({
      ...VALID_SPEC,
      expectedMetrics: [
        { name: "accuracy", unit: "ratio", direction: "higher-is-better" },
        { name: "accuracy", unit: "ratio", direction: "higher-is-better" },
      ],
    });
    expect(errors).toContain("expectedMetrics: duplicate name 'accuracy'");
  });

  it("accumulates multiple errors in one pass", () => {
    const errors = validateBenchSpec({
      topicId: "",
      fixedInputs: [],
      modelConditions: [],
      expectedMetrics: [],
    });
    expect(errors.length).toBe(4);
  });
});
