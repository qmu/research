import type { ComparisonResult, ConfigRun, Probe, ProbeStats } from "./types";

/**
 * The per-topic split of the combined LLM comparison into two focused topics:
 * SPEED (sustained throughput, TTFT, total latency) and ACCURACY (schema depth /
 * breadth, length-instruction following, information accuracy).
 *
 * Design decision (recorded per the ticket's "wrapper vs split" question): the
 * combined `compare` sweep is the single source of measurement and is left
 * completely untouched (its committed fixture stays byte-stable and is the CI
 * self-test). `speed` and `accuracy` are PROJECTIONS of that one sweep — each
 * produces its own data artifact, report, and fixture, restricted to its own
 * metrics and probe raw-captures. This shares the model×effort matrix, trial
 * count, intervals, and history (no re-measurement, so the split values are
 * identical to the combined run by construction) while giving each topic an
 * independent artifact and page. Projecting, rather than running two separate
 * sweeps, is what guarantees "各指標の値・provenance・試行数・区間が分割前と一致する".
 */

export type ProbeGroup = "speed" | "accuracy";

export type SplitMetricKey = keyof ProbeStats;

export type SplitAspect = Readonly<{
  key: SplitMetricKey;
  title: string;
  header: string;
  kind: "number" | "percent";
  unit?: string;
  better: "higher" | "lower";
  digits: number;
}>;

/** Display metadata for every metric, shared by the table and per-aspect
 * sections so a metric is described identically wherever it appears. */
export const ASPECT_META: Readonly<Record<SplitMetricKey, SplitAspect>> = {
  throughputTokensPerSec: {
    key: "throughputTokensPerSec",
    title: "Sustained throughput during generation",
    header: "Throughput (tok/s)",
    kind: "number",
    unit: "tok/s",
    better: "higher",
    digits: 1,
  },
  ttftMs: {
    key: "ttftMs",
    title: "Time to first token",
    header: "TTFT (ms)",
    kind: "number",
    unit: "ms",
    better: "lower",
    digits: 0,
  },
  totalLatencyMs: {
    key: "totalLatencyMs",
    title: "Total response time",
    header: "Total latency (ms)",
    kind: "number",
    unit: "ms",
    better: "lower",
    digits: 0,
  },
  maxSchemaDepth: {
    key: "maxSchemaDepth",
    title: "Maximum schema nesting depth accepted",
    header: "Max schema depth",
    kind: "number",
    better: "higher",
    digits: 0,
  },
  maxSchemaBreadth: {
    key: "maxSchemaBreadth",
    title: "Maximum schema field breadth accepted",
    header: "Max schema breadth",
    kind: "number",
    better: "higher",
    digits: 0,
  },
  lengthAccuracy: {
    key: "lengthAccuracy",
    title: "Length instruction accuracy",
    header: "Length accuracy",
    kind: "percent",
    better: "higher",
    digits: 3,
  },
  informationAccuracy: {
    key: "informationAccuracy",
    title: "Information accuracy",
    header: "Information accuracy",
    kind: "percent",
    better: "higher",
    digits: 3,
  },
};

export type GroupSpec = Readonly<{
  group: ProbeGroup;
  title: string;
  summary: string;
  metrics: ReadonlyArray<SplitMetricKey>;
  probes: ReadonlyArray<Probe>;
  artifactBase: string;
}>;

export const GROUP_SPECS: Readonly<Record<ProbeGroup, GroupSpec>> = {
  speed: {
    group: "speed",
    title: "LLM response speed comparison",
    summary:
      "sustained generation throughput, time-to-first-token, and total response latency",
    metrics: ["throughputTokensPerSec", "ttftMs", "totalLatencyMs"],
    probes: ["throughput", "latency"],
    artifactBase: "llm-speed-comparison",
  },
  accuracy: {
    group: "accuracy",
    title: "LLM output accuracy comparison",
    summary:
      "JSON-schema structural limits, length-instruction following, and factual information accuracy",
    metrics: [
      "maxSchemaDepth",
      "maxSchemaBreadth",
      "lengthAccuracy",
      "informationAccuracy",
    ],
    probes: ["schema", "length", "information"],
    artifactBase: "llm-accuracy-comparison",
  },
};

/** A group-scoped projection of a full comparison. Carries only the group's
 * metrics and, per configuration, only the group's probe raw-captures — a
 * complete record for that group, derived (never re-measured) from `compare`. */
export type SplitArtifact = Readonly<{
  group: ProbeGroup;
  title: string;
  summary: string;
  generatedAt: string;
  trials: number;
  judgeModel: string;
  probe: ComparisonResult["probe"];
  metrics: ReadonlyArray<SplitMetricKey>;
  /**
   * Group metrics absent from the source artifact (e.g. a probe added after the
   * sweep that produced the data). Reported as "not measured in this run" rather
   * than crashing or fabricating a value.
   */
  omittedMetrics: ReadonlyArray<SplitMetricKey>;
  /** The compare artifact this view was projected from (provenance). */
  sourceArtifact: string;
  /** ConfigRun rows with each trial's calls filtered to this group's probes. */
  configs: ReadonlyArray<ConfigRun>;
  artifactPath: string;
}>;

const filterConfigToGroup = (
  config: ConfigRun,
  probes: ReadonlyArray<Probe>,
): ConfigRun => ({
  ...config,
  trials: config.trials.map((trial) => ({
    ...trial,
    calls: trial.calls.filter((call) => probes.includes(call.probe)),
  })),
});

/**
 * Project a full comparison result into one group's focused artifact. Pure: the
 * metrics, stats, provenance, trial count, and per-config timestamps are carried
 * across unchanged, so the projected values equal the combined run exactly.
 */
/** Whether every config exposes a finite Aggregate for a metric (a metric added
 * after the sweep that produced the data is absent from older artifacts). */
const metricPresent = (
  configs: ReadonlyArray<ConfigRun>,
  key: SplitMetricKey,
): boolean =>
  configs.length > 0 &&
  configs.every((config) => {
    const stat = config.stats[key];
    return stat !== undefined && typeof stat.n === "number";
  });

export const projectComparison = (
  result: ComparisonResult,
  group: ProbeGroup,
  sourceArtifact: string,
): SplitArtifact => {
  const spec = GROUP_SPECS[group];
  const present = spec.metrics.filter((key) =>
    metricPresent(result.configs, key),
  );
  const omitted = spec.metrics.filter((key) => !present.includes(key));
  return {
    group,
    title: spec.title,
    summary: spec.summary,
    generatedAt: result.generatedAt,
    trials: result.trials,
    judgeModel: result.judgeModel,
    probe: result.probe,
    metrics: present,
    omittedMetrics: omitted,
    sourceArtifact,
    configs: result.configs.map((config) =>
      filterConfigToGroup(config, spec.probes),
    ),
    artifactPath: `${spec.artifactBase}.data.json`,
  };
};

export const aspectsForGroup = (
  group: ProbeGroup,
): ReadonlyArray<SplitAspect> =>
  GROUP_SPECS[group].metrics.map((key) => ASPECT_META[key]);

export const aspectsForMetrics = (
  metrics: ReadonlyArray<SplitMetricKey>,
): ReadonlyArray<SplitAspect> => metrics.map((key) => ASPECT_META[key]);
