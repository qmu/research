import type {
  AdoptionVerdict,
  Engine,
  EngineMetrics,
  MetricReading,
  RuleVerdict,
  ThresholdRule,
  UseCase,
} from "./types.js";

/** Whether `value` clears `rule`'s boundary, tolerance applied on the pass side
 * only (a reading that misses by no more than `tolerance` still passes; a
 * reading that already clears the boundary is never failed by tolerance). */
function clears(value: number, rule: ThresholdRule): boolean {
  const tolerance = rule.tolerance ?? 0;
  return rule.direction === "lower-is-better"
    ? value <= rule.threshold + tolerance
    : value >= rule.threshold - tolerance;
}

export function evaluateRule(
  reading: MetricReading,
  rule: ThresholdRule,
): RuleVerdict {
  if (reading.value === null)
    return {
      metric: rule.metric,
      outcome: "undetermined",
      reading,
      rule,
      reason: reading.reason,
    };
  if (reading.unit !== rule.unit)
    throw new Error(
      `unit mismatch for ${rule.metric}: reading is ${reading.unit}, rule expects ${rule.unit}`,
    );
  return {
    metric: rule.metric,
    outcome: clears(reading.value, rule) ? "pass" : "fail",
    reading,
    rule,
  };
}

/** Rolls up a use case's rule verdicts into one decision. Any `fail` rejects
 * outright (a missing reading cannot rescue a rule that already failed); absent
 * a fail, any `undetermined` reading keeps the whole verdict undetermined — it
 * is never counted as a pass. Only all-pass adopts. */
function decide(
  rules: ReadonlyArray<RuleVerdict>,
): AdoptionVerdict["decision"] {
  if (rules.some((r) => r.outcome === "fail")) return "reject";
  if (rules.some((r) => r.outcome === "undetermined")) return "undetermined";
  return "adopt";
}

export function evaluateAdoption(
  useCase: UseCase,
  engine: Engine,
  metrics: EngineMetrics,
): AdoptionVerdict {
  const rules = useCase.rules.map((rule) =>
    evaluateRule(metrics[rule.metric], rule),
  );
  return { useCase: useCase.id, engine, decision: decide(rules), rules };
}

export function evaluateAllEngines(
  useCase: UseCase,
  readings: Readonly<Record<Engine, EngineMetrics>>,
): ReadonlyArray<AdoptionVerdict> {
  const entries = Object.entries(readings) as ReadonlyArray<
    [Engine, EngineMetrics]
  >;
  return entries.map(([engine, metrics]) =>
    evaluateAdoption(useCase, engine, metrics),
  );
}
