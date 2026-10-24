// Pure domain types for a bench spec: the minimal, topic-agnostic declaration
// of what a benchmark run holds fixed, what it varies, and what it expects to
// measure. This mirrors the five-element proposal in
// `docs/research-development-guideline.md` (§2 "Comparison subjects" and
// "Metrics") as data, so a topic's design can be validated before it is coded
// as an entrypoint. No vendor or entrypoint types appear here.

/** A deterministic input held fixed across every model condition, so a
 * metric difference reflects the model condition and not the input. */
export type FixedInput = Readonly<{
  id: string;
  description: string;
  itemCount: number;
}>;

/** One experimental condition under test — a model and the parameters that
 * distinguish this condition from another run of the same model. */
export type ModelCondition = Readonly<{
  id: string;
  model: string;
  params?: Readonly<Record<string, string | number | boolean>>;
}>;

export type MetricDirection = "higher-is-better" | "lower-is-better";

/** The closed set of units a metric may declare. A unit is part of the
 * metric's identity: `ratio` is 0..1 and `percent` is 0..100, so the two are
 * never interchangeable, and time is fixed to `ms` or `s` rather than free
 * text. Extend this list (and docs/bench-spec.md) to add a unit. */
export const METRIC_UNITS = [
  "ratio",
  "percent",
  "ms",
  "s",
  "tokens",
  "tokens-per-second",
  "usd",
  "count",
] as const;

export type MetricUnit = (typeof METRIC_UNITS)[number];

/** Allowed deviation from the threshold, in the metric's unit (`absolute`) or
 * as a fraction of the threshold's magnitude (`relative`, 0.1 = 10%). It only
 * ever widens the pass side: a value worse than the threshold by no more than
 * the tolerance still passes; a better value always passes. */
export type MetricTolerance = Readonly<{
  kind: "absolute" | "relative";
  value: number;
}>;

/** What to do when a trial yields no value for the metric (call failed,
 * field absent, NaN). `fail` counts the metric as failed; `exclude` drops it
 * from the pass/fail verdict and reports it as missing. A missing value is
 * never imputed as zero — zero is a measurement and a gap is not. */
export type MissingPolicy = "fail" | "exclude";

/** An indicator the comparison is decided by, with its unit and the
 * direction that reads as better (research-development-guideline.md §2.3). */
export type ExpectedMetric = Readonly<{
  name: string;
  unit: MetricUnit;
  direction: MetricDirection;
  /** Optional pass/fail threshold in the metric's unit, when the topic
   * declares one (not every metric is gated — some are purely observational). */
  threshold?: number;
  /** Optional slack around `threshold`; requires `threshold`. Absent means
   * zero tolerance: the value must meet the threshold exactly. */
  tolerance?: MetricTolerance;
  /** Absent means `fail`. */
  onMissing?: MissingPolicy;
}>;

export type BenchSpec = Readonly<{
  topicId: string;
  fixedInputs: ReadonlyArray<FixedInput>;
  modelConditions: ReadonlyArray<ModelCondition>;
  expectedMetrics: ReadonlyArray<ExpectedMetric>;
}>;
