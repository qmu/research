/** Adoption-policy layer for the four local-inference engines (ollama,
 * llama.cpp, mlx, strata). This module decides nothing about how a metric is
 * measured — it only reads a per-engine metric already shaped like a
 * common-JSON measurement (a present `value`, or an explicit missing
 * `reason`) and checks it against a use case's threshold rules. Measurement,
 * evaluation and the rule catalog are three separate concerns so a threshold
 * change never touches the harness. */

export const engines = ["ollama", "llama.cpp", "mlx", "strata"] as const;
export type Engine = (typeof engines)[number];

export const metricIds = ["ttft", "tps", "quality", "peakRss"] as const;
export type MetricId = (typeof metricIds)[number];

/** A metric reading for one engine. Mirrors the common-JSON measurement shape
 * (present value, or a missing reading with a stated reason) so this module can
 * consume that JSON directly once a real trial exists — it never substitutes 0
 * or an estimate for an absent value. */
export type MetricReading =
  | Readonly<{ value: number; unit: string }>
  | Readonly<{
      value: null;
      reason: "NO-FIELD" | "NOT-RUN" | "MEASURE-FAILED";
    }>;

export type EngineMetrics = Readonly<Record<MetricId, MetricReading>>;

export type Direction = "lower-is-better" | "higher-is-better";

/** One pass/fail boundary for one metric. `tolerance` only widens the pass side
 * (a reading just past the boundary by at most `tolerance` still passes), it
 * never narrows it — matching the bench-spec tolerance rule this mirrors. */
export type ThresholdRule = Readonly<{
  metric: MetricId;
  direction: Direction;
  unit: string;
  /** The boundary value a reading must clear to pass, in `unit`. */
  threshold: number;
  tolerance?: number;
  /** Why this use case cares about the metric, for the explanation page. */
  rationale: string;
}>;

export type UseCase = Readonly<{
  id: string;
  label: string;
  description: string;
  rules: ReadonlyArray<ThresholdRule>;
}>;

export type RuleVerdict = Readonly<{
  metric: MetricId;
  outcome: "pass" | "fail" | "undetermined";
  reading: MetricReading;
  rule: ThresholdRule;
  /** Present only when `outcome` is "undetermined". */
  reason?: "NO-FIELD" | "NOT-RUN" | "MEASURE-FAILED";
}>;

export type AdoptionVerdict = Readonly<{
  useCase: string;
  engine: Engine;
  /** "adopt" requires every rule to pass. One undetermined rule makes the whole
   * verdict "undetermined" — a missing reading is never treated as a pass. */
  decision: "adopt" | "reject" | "undetermined";
  rules: ReadonlyArray<RuleVerdict>;
}>;
