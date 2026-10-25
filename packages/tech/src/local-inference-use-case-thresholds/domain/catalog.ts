import rawCatalog from "../use-cases.json";
import {
  metricIds,
  type Direction,
  type MetricId,
  type ThresholdRule,
  type UseCase,
} from "./types.js";

/** `use-cases.json` is the hand-authored source of truth (reviewable without
 * touching code); this module only type-checks it on load. A malformed entry
 * throws at import time rather than producing a silently-wrong threshold. */

type RawRule = Readonly<{
  metric: string;
  direction: string;
  unit: string;
  threshold: number;
  tolerance?: number;
  rationale: string;
}>;

type RawUseCase = Readonly<{
  id: string;
  label: string;
  description: string;
  rules: ReadonlyArray<RawRule>;
}>;

type RawCatalog = Readonly<{
  status: string;
  note: string;
  useCases: ReadonlyArray<RawUseCase>;
}>;

// The JSON import's inferred type is derived structurally from the literal
// file and varies with which optional fields happen to be present on each
// entry; routing it through `unknown` avoids relying on that inference
// overlapping with the hand-written shape below, which this module validates
// at runtime regardless.
const catalog = rawCatalog as unknown as RawCatalog;

const directions: ReadonlyArray<Direction> = [
  "lower-is-better",
  "higher-is-better",
];

function isMetricId(value: string): value is MetricId {
  return (metricIds as ReadonlyArray<string>).includes(value);
}

function parseRule(rule: RawRule, useCaseId: string): ThresholdRule {
  if (!isMetricId(rule.metric))
    throw new Error(
      `use case "${useCaseId}": unknown metric "${rule.metric}"`,
    );
  if (!directions.includes(rule.direction as Direction))
    throw new Error(
      `use case "${useCaseId}": unknown direction "${rule.direction}" for metric "${rule.metric}"`,
    );
  if (!Number.isFinite(rule.threshold))
    throw new Error(
      `use case "${useCaseId}": non-finite threshold for metric "${rule.metric}"`,
    );
  if (rule.tolerance !== undefined && !(rule.tolerance >= 0))
    throw new Error(
      `use case "${useCaseId}": tolerance for metric "${rule.metric}" must be >= 0`,
    );
  return {
    metric: rule.metric,
    direction: rule.direction as Direction,
    unit: rule.unit,
    threshold: rule.threshold,
    tolerance: rule.tolerance,
    rationale: rule.rationale,
  };
}

function parseUseCase(useCase: RawUseCase): UseCase {
  const seen = new Set<string>();
  for (const rule of useCase.rules) {
    if (seen.has(rule.metric))
      throw new Error(
        `use case "${useCase.id}": duplicate rule for metric "${rule.metric}"`,
      );
    seen.add(rule.metric);
  }
  return {
    id: useCase.id,
    label: useCase.label,
    description: useCase.description,
    rules: useCase.rules.map((rule) => parseRule(rule, useCase.id)),
  };
}

export const useCaseCatalogStatus: string = catalog.status;
export const useCaseCatalogNote: string = catalog.note;

export const useCases: ReadonlyArray<UseCase> =
  catalog.useCases.map(parseUseCase);

export function useCaseById(id: string): UseCase {
  const useCase = useCases.find((candidate) => candidate.id === id);
  if (!useCase) throw new Error(`unknown use case "${id}"`);
  return useCase;
}
