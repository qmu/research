import { METRIC_UNITS } from "./types";
import type { BenchSpec, MetricDirection, MissingPolicy } from "./types";

export type BenchSpecError = string;

const MISSING_POLICIES: ReadonlyArray<MissingPolicy> = ["fail", "exclude"];

const METRIC_DIRECTIONS: ReadonlyArray<MetricDirection> = [
  "higher-is-better",
  "lower-is-better",
];

const duplicates = (ids: ReadonlyArray<string>): ReadonlyArray<string> => {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  return [...dupes];
};

/**
 * Validate a bench spec's structural and referential integrity: non-empty
 * required fields, unique ids within each list, non-negative counts, and
 * finite thresholds. This checks the data a spec declares, not whether the
 * topic it describes has actually been built.
 */
export const validateBenchSpec = (
  spec: BenchSpec,
): ReadonlyArray<BenchSpecError> => {
  const errors: BenchSpecError[] = [];

  if (spec.topicId.trim() === "") {
    errors.push("topicId must not be empty");
  }

  if (spec.fixedInputs.length === 0) {
    errors.push("fixedInputs must declare at least one fixed input");
  }
  for (const input of spec.fixedInputs) {
    if (input.id.trim() === "") {
      errors.push("fixedInputs: id must not be empty");
    }
    if (!Number.isFinite(input.itemCount) || input.itemCount < 0) {
      errors.push(
        `fixedInputs '${input.id}': itemCount must be a non-negative finite number`,
      );
    }
  }
  for (const id of duplicates(spec.fixedInputs.map((input) => input.id))) {
    errors.push(`fixedInputs: duplicate id '${id}'`);
  }

  if (spec.modelConditions.length === 0) {
    errors.push("modelConditions must declare at least one model condition");
  }
  for (const condition of spec.modelConditions) {
    if (condition.id.trim() === "") {
      errors.push("modelConditions: id must not be empty");
    }
    if (condition.model.trim() === "") {
      errors.push(`modelConditions '${condition.id}': model must not be empty`);
    }
  }
  for (const id of duplicates(spec.modelConditions.map((c) => c.id))) {
    errors.push(`modelConditions: duplicate id '${id}'`);
  }

  if (spec.expectedMetrics.length === 0) {
    errors.push("expectedMetrics must declare at least one expected metric");
  }
  for (const metric of spec.expectedMetrics) {
    if (metric.name.trim() === "") {
      errors.push("expectedMetrics: name must not be empty");
    }
    if (!(METRIC_UNITS as ReadonlyArray<string>).includes(metric.unit)) {
      const allowed = METRIC_UNITS.join(", ");
      errors.push(
        `expectedMetrics '${metric.name}': unit must be one of ${allowed}`,
      );
    }
    if (!METRIC_DIRECTIONS.includes(metric.direction)) {
      const allowed = METRIC_DIRECTIONS.join(", ");
      errors.push(
        `expectedMetrics '${metric.name}': direction must be one of ${allowed}`,
      );
    }
    if (metric.threshold !== undefined && !Number.isFinite(metric.threshold)) {
      errors.push(
        `expectedMetrics '${metric.name}': threshold must be a finite number`,
      );
    }
    if (metric.tolerance !== undefined) {
      const { kind, value } = metric.tolerance;
      if (metric.threshold === undefined) {
        errors.push(
          `expectedMetrics '${metric.name}': tolerance requires a threshold`,
        );
      }
      if (kind !== "absolute" && kind !== "relative") {
        errors.push(
          `expectedMetrics '${metric.name}': tolerance kind must be absolute or relative`,
        );
      }
      if (!Number.isFinite(value) || value < 0) {
        errors.push(
          `expectedMetrics '${metric.name}': tolerance value must be a non-negative finite number`,
        );
      }
    }
    if (
      metric.onMissing !== undefined &&
      !MISSING_POLICIES.includes(metric.onMissing)
    ) {
      const allowed = MISSING_POLICIES.join(", ");
      errors.push(
        `expectedMetrics '${metric.name}': onMissing must be one of ${allowed}`,
      );
    }
  }
  for (const name of duplicates(spec.expectedMetrics.map((m) => m.name))) {
    errors.push(`expectedMetrics: duplicate name '${name}'`);
  }

  return errors;
};

export const isValidBenchSpec = (spec: BenchSpec): boolean =>
  validateBenchSpec(spec).length === 0;
