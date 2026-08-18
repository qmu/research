import type { ConfigRun, ModelCard, ProbeStats } from "./types";
import { EFFORT_LEVELS, type EffortLevel } from "./effort";
import { providerDisplayName } from "./provider";

/**
 * The generational-delta insight: quantify, per paired tier, how a provider's new
 * model generation improved over the one it replaced. It reads the former→new
 * pairing from the registry's machine-readable metadata (`ModelCard.supersedes` /
 * `supersededBy`) — never a hardcoded list — so it generalizes to any future
 * pairing under the same strategy.
 *
 * Provenance is load-bearing. A per-metric SPEED/ACCURACY delta is computed only
 * when BOTH sides of the pair are `measured` in the same frame; if either side is
 * `fixtured` or `error`, no measured delta is synthesized and the pair is labelled
 * not-measured. COST deltas are curated registry facts (input/output $/MTok), so
 * they are always computed; but the mechanical net verdict needs the measured
 * metrics, so it too reports `not-measured` whenever the measured deltas are
 * withheld. Every number here is real arithmetic over the two rows — the narrative
 * states the numbers, not adjectives.
 */

// A per-metric delta is "material" (a real move, not noise) when the relative
// change clears this magnitude, or — when the former value is zero and a relative
// change is undefined — when the absolute change clears a tiny epsilon.
export const MATERIAL_RELATIVE = 0.01; // 1%
const ABSOLUTE_EPSILON = 1e-9;

export type MetricGroup = "speed" | "accuracy" | "cost";

export type DeltaMetricSpec = Readonly<{
  key: string;
  title: string;
  group: MetricGroup;
  unit: string; // "" when unitless
  kind: "number" | "percent" | "cost";
  better: "higher" | "lower";
}>;

// The measured metrics come from ProbeStats means; the cost metrics come from the
// curated ModelCard. Order here is the display order.
/**
 * Exported so the precision analysis (`generational-precision.ts`, ticket
 * `20260801124500`) walks exactly the metrics this section publishes, rather
 * than keeping a second list that could drift from this one.
 */
export const STAT_METRICS: ReadonlyArray<
  DeltaMetricSpec & Readonly<{ statKey: keyof ProbeStats }>
> = [
  {
    key: "throughputTokensPerSec",
    statKey: "throughputTokensPerSec",
    title: "Output throughput",
    group: "speed",
    unit: "tok/s",
    kind: "number",
    better: "higher",
  },
  {
    key: "ttftMs",
    statKey: "ttftMs",
    title: "Time to first token",
    group: "speed",
    unit: "ms",
    kind: "number",
    better: "lower",
  },
  {
    key: "totalLatencyMs",
    statKey: "totalLatencyMs",
    title: "Total response time",
    group: "speed",
    unit: "ms",
    kind: "number",
    better: "lower",
  },
  {
    key: "maxSchemaDepth",
    statKey: "maxSchemaDepth",
    title: "Max schema depth",
    group: "accuracy",
    unit: "",
    kind: "number",
    better: "higher",
  },
  {
    key: "maxSchemaBreadth",
    statKey: "maxSchemaBreadth",
    title: "Max schema breadth",
    group: "accuracy",
    unit: "",
    kind: "number",
    better: "higher",
  },
  {
    key: "lengthAccuracy",
    statKey: "lengthAccuracy",
    title: "Length accuracy",
    group: "accuracy",
    unit: "",
    kind: "percent",
    better: "higher",
  },
  {
    key: "informationAccuracy",
    statKey: "informationAccuracy",
    title: "Information accuracy",
    group: "accuracy",
    unit: "",
    kind: "percent",
    better: "higher",
  },
];

const COST_METRICS: ReadonlyArray<
  DeltaMetricSpec &
    Readonly<{ cardKey: "inputCostPerMTok" | "outputCostPerMTok" }>
> = [
  {
    key: "inputCostPerMTok",
    cardKey: "inputCostPerMTok",
    title: "Input cost",
    group: "cost",
    unit: "$/MTok",
    kind: "cost",
    better: "lower",
  },
  {
    key: "outputCostPerMTok",
    cardKey: "outputCostPerMTok",
    title: "Output cost",
    group: "cost",
    unit: "$/MTok",
    kind: "cost",
    better: "lower",
  },
];

export type DeltaOutcome =
  "improved" | "regressed" | "unchanged" | "indistinguishable";

export type DeltaMetric = Readonly<{
  key: string;
  title: string;
  group: MetricGroup;
  unit: string;
  kind: "number" | "percent" | "cost";
  better: "higher" | "lower";
  previous: number;
  current: number;
  absolute: number; // current - previous
  relative: number | null; // (current - previous) / previous; null when previous is 0
  // Combined run-to-run spread of the two measurements (sd_former + sd_new), in
  // the metric's own unit. `null` for curated cost facts, which have no spread.
  spread: number | null;
  // Trials contributing to each mean. A reader cannot judge a direction without
  // the sample behind it: the same configuration re-swept hours apart moved
  // sustained throughput by up to 88%, so "−38%" over 3 trials and "−38%" over
  // 30 are very different claims. `null` for curated cost facts, which are
  // registry values rather than measurements.
  previousTrials: number | null;
  currentTrials: number | null;
  outcome: DeltaOutcome;
}>;

export type Verdict =
  | "improved"
  | "regressed"
  | "mixed"
  | "unchanged"
  | "indistinguishable"
  | "not-measured";

export type GenerationDelta = Readonly<{
  previousId: string;
  currentId: string;
  previousModelName: string;
  currentModelName: string;
  provider: string; // display name
  tier: string;
  effort: EffortLevel;
  // True only when both rows are `measured`; the sole gate that lets a
  // speed/accuracy delta exist.
  measured: boolean;
  notMeasuredReason?: string;
  // Curated registry cost deltas — always present (input/output $/MTok).
  costMetrics: ReadonlyArray<DeltaMetric>;
  // Measured speed/accuracy deltas — present only when `measured`.
  measuredMetrics: ReadonlyArray<DeltaMetric>;
  verdict: Verdict;
  verdictReason: string;
}>;

export type GenerationPair = Readonly<{
  previousId: string;
  currentId: string;
}>;

type PairingCard = Pick<
  ModelCard,
  "id" | "generation" | "supersedes" | "supersededBy"
>;

/**
 * Read the former→new pairings from registry metadata. A pairing is emitted only
 * when BOTH ids are present in the given cards. Both directions are honoured — a
 * current card's `supersedes` and a previous card's `supersededBy` — and the
 * result is de-duplicated, so the pairing is never hardcoded here.
 */
export const findGenerationPairs = (
  cards: ReadonlyArray<PairingCard>,
): ReadonlyArray<GenerationPair> => {
  const ids = new Set(cards.map((card) => card.id));
  const seen = new Set<string>();
  const pairs: GenerationPair[] = [];
  const add = (previousId: string, currentId: string): void => {
    if (!ids.has(previousId) || !ids.has(currentId)) return;
    const key = `${previousId}->${currentId}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push({ previousId, currentId });
  };
  for (const card of cards) {
    if (card.generation === "current" && card.supersedes !== undefined) {
      add(card.supersedes, card.id);
    }
    if (card.generation === "previous" && card.supersededBy !== undefined) {
      add(card.id, card.supersededBy);
    }
  }
  return pairs;
};

const material = (absolute: number, relative: number | null): boolean =>
  relative === null
    ? Math.abs(absolute) > ABSOLUTE_EPSILON
    : Math.abs(relative) >= MATERIAL_RELATIVE;

const outcomeOf = (
  spec: DeltaMetricSpec,
  previous: number,
  current: number,
  spread: number | null,
): DeltaOutcome => {
  const absolute = current - previous;
  const relative = previous === 0 ? null : absolute / previous;
  // Materiality first: a metric that did not move stays `unchanged`. Two
  // generations landing on the same value (a saturated metric, say) is a finding
  // in its own right, and the spread test must not erase it.
  if (!material(absolute, relative)) return "unchanged";
  // Then the spread test, applied only to a change that claims to have moved: a
  // measured metric earns a direction only when the gap between the two means
  // clears their combined run-to-run spread. Re-running an identical scoped sweep
  // hours apart moved sustained throughput by up to 88% on the same
  // configuration, so at this trial count a bare percentage is not evidence of a
  // generational direction. Cost facts carry no spread and skip this test.
  if (spread !== null && Math.abs(absolute) <= spread) {
    return "indistinguishable";
  }
  const currentIsBetter =
    spec.better === "higher" ? current > previous : current < previous;
  return currentIsBetter ? "improved" : "regressed";
};

const buildMetric = (
  spec: DeltaMetricSpec,
  previous: number,
  current: number,
  spread: number | null = null,
  previousTrials: number | null = null,
  currentTrials: number | null = null,
): DeltaMetric => {
  const absolute = current - previous;
  return {
    key: spec.key,
    title: spec.title,
    group: spec.group,
    unit: spec.unit,
    kind: spec.kind,
    better: spec.better,
    previous,
    current,
    absolute,
    relative: previous === 0 ? null : absolute / previous,
    spread,
    previousTrials,
    currentTrials,
    outcome: outcomeOf(spec, previous, current, spread),
  };
};

const verdictOver = (metrics: ReadonlyArray<DeltaMetric>): Verdict => {
  const improved = metrics.filter((m) => m.outcome === "improved").length;
  const regressed = metrics.filter((m) => m.outcome === "regressed").length;
  if (improved > 0 && regressed === 0) return "improved";
  if (regressed > 0 && improved === 0) return "regressed";
  if (improved > 0 && regressed > 0) return "mixed";
  // Nothing moved. Distinguish "every metric genuinely held steady" from "every
  // metric that moved was swamped by its own spread" — reporting the latter as
  // `unchanged` would assert a stability the data cannot support.
  const indistinguishable = metrics.filter(
    (m) => m.outcome === "indistinguishable",
  ).length;
  return indistinguishable > 0 ? "indistinguishable" : "unchanged";
};

const countsSentence = (metrics: ReadonlyArray<DeltaMetric>): string => {
  const improved = metrics.filter((m) => m.outcome === "improved").length;
  const regressed = metrics.filter((m) => m.outcome === "regressed").length;
  const indistinguishable = metrics.filter(
    (m) => m.outcome === "indistinguishable",
  ).length;
  const unchanged = metrics.length - improved - regressed - indistinguishable;
  const base = `${improved} improved, ${regressed} regressed, ${unchanged} unchanged of ${metrics.length} metrics`;
  return indistinguishable === 0
    ? base
    : `${base}; ${indistinguishable} indistinguishable from run-to-run spread and excluded`;
};

const costDeltasFor = (
  previous: ConfigRun,
  current: ConfigRun,
): ReadonlyArray<DeltaMetric> =>
  COST_METRICS.map((spec) =>
    buildMetric(spec, previous[spec.cardKey], current[spec.cardKey]),
  );

const measuredDeltasFor = (
  previous: ConfigRun,
  current: ConfigRun,
): ReadonlyArray<DeltaMetric> =>
  STAT_METRICS.map((spec) =>
    buildMetric(
      spec,
      previous.stats[spec.statKey].mean,
      current.stats[spec.statKey].mean,
      previous.stats[spec.statKey].stdDev + current.stats[spec.statKey].stdDev,
      previous.stats[spec.statKey].n,
      current.stats[spec.statKey].n,
    ),
  );

/** Compute a single pair×effort delta between two configuration rows. The
 * measured-metric guard: both rows must be `measured`, else only registry cost
 * deltas are produced and the verdict is `not-measured`. */
export const computeGenerationDelta = (
  previous: ConfigRun,
  current: ConfigRun,
): GenerationDelta => {
  const costMetrics = costDeltasFor(previous, current);
  const bothMeasured =
    previous.provenance === "measured" && current.provenance === "measured";
  const base = {
    previousId: previous.id,
    currentId: current.id,
    previousModelName: previous.modelName,
    currentModelName: current.modelName,
    provider: providerDisplayName(current.provider),
    tier: current.tier,
    effort: current.effort,
    costMetrics,
  };
  if (!bothMeasured) {
    const which = [
      previous.provenance !== "measured"
        ? `former (${previous.provenance})`
        : "",
      current.provenance !== "measured" ? `new (${current.provenance})` : "",
    ]
      .filter((s) => s !== "")
      .join(" and ");
    return {
      ...base,
      measured: false,
      notMeasuredReason: `${which} not measured in this frame`,
      measuredMetrics: [],
      verdict: "not-measured",
      verdictReason:
        "Speed and accuracy were not measured for both generations in this frame, so no net verdict is derived.",
    };
  }
  const measuredMetrics = measuredDeltasFor(previous, current);
  const all = [...measuredMetrics, ...costMetrics];
  return {
    ...base,
    measured: true,
    measuredMetrics,
    verdict: verdictOver(all),
    verdictReason: countsSentence(all),
  };
};

const effortIndex = (effort: EffortLevel): number => {
  const i = EFFORT_LEVELS.indexOf(effort);
  return i === -1 ? EFFORT_LEVELS.length : i;
};

/**
 * Build every generational delta present in a sweep: for each registry pairing,
 * one delta per effort level measured on BOTH sides, ordered by pairing then by
 * the canonical effort order. Deterministic — the same configs always yield the
 * same ordered deltas.
 */
export const buildGenerationDeltas = (
  configs: ReadonlyArray<ConfigRun>,
): ReadonlyArray<GenerationDelta> => {
  const pairs = findGenerationPairs(configs);
  const byId = new Map<string, ConfigRun[]>();
  for (const config of configs) {
    const list = byId.get(config.id) ?? [];
    list.push(config);
    byId.set(config.id, list);
  }
  const deltas: GenerationDelta[] = [];
  for (const pair of pairs) {
    const prevRuns = byId.get(pair.previousId) ?? [];
    const currRuns = byId.get(pair.currentId) ?? [];
    const efforts = [...new Set(currRuns.map((r) => r.effort))]
      .filter((effort) => prevRuns.some((r) => r.effort === effort))
      .sort((a, b) => effortIndex(a) - effortIndex(b));
    for (const effort of efforts) {
      const previous = prevRuns.find((r) => r.effort === effort);
      const current = currRuns.find((r) => r.effort === effort);
      if (previous === undefined || current === undefined) continue;
      deltas.push(computeGenerationDelta(previous, current));
    }
  }
  return deltas;
};

// --- markdown rendering ------------------------------------------------------

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const formatValue = (metric: DeltaMetric, value: number): string => {
  if (metric.kind === "percent") return `${(value * 100).toFixed(0)}%`;
  if (metric.kind === "cost") return `$${value.toFixed(2)}`;
  const digits = metric.unit === "tok/s" ? 1 : 0;
  return metric.unit === ""
    ? value.toFixed(digits)
    : `${value.toFixed(digits)} ${metric.unit}`;
};

const signed = (value: number, digits: number): string =>
  `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}`;

// The Change cell: signed absolute move in the metric's own unit, plus the signed
// relative percentage when the former value was non-zero.
const formatChange = (metric: DeltaMetric): string => {
  if (metric.kind === "percent") {
    const abs = `${signed(metric.absolute * 100, 0)}pp`;
    return metric.relative === null
      ? abs
      : `${abs} (${signed(metric.relative * 100, 0)}%)`;
  }
  const digits = metric.kind === "cost" ? 2 : metric.unit === "tok/s" ? 1 : 0;
  const unitSuffix =
    metric.kind === "cost"
      ? " $/MTok"
      : metric.unit === ""
        ? ""
        : ` ${metric.unit}`;
  const abs = `${signed(metric.absolute, digits)}${unitSuffix}`;
  return metric.relative === null
    ? abs
    : `${abs} (${signed(metric.relative * 100, 0)}%)`;
};

const metricRow = (metric: DeltaMetric): string => {
  // Show the spread that the change had to clear, so a reader can see why a
  // direction was or was not assigned rather than taking the label on trust.
  const spreadCell =
    metric.spread === null
      ? "—"
      : `±${formatValue(metric, metric.spread).replace(/^[+-]/, "")}`;
  // State the sample beside the direction. Without it a reader cannot tell
  // whether a labelled direction rests on 3 trials or 30, and the whole point
  // of this section is that at 3 the spread swamps most throughput moves.
  const trialsCell =
    metric.previousTrials === null || metric.currentTrials === null
      ? "—"
      : metric.previousTrials === metric.currentTrials
        ? `${metric.currentTrials}`
        : `${metric.previousTrials} / ${metric.currentTrials}`;
  return (
    `| ${escapeCell(metric.title)} | ${formatValue(metric, metric.previous)} | ` +
    `${formatValue(metric, metric.current)} | ${formatChange(metric)} | ` +
    `${spreadCell} | ${trialsCell} | ${metric.outcome} |`
  );
};

export type DeltaRenderOptions = Readonly<{
  // Which measured metric groups to render as rows. Cost rows are always shown
  // (curated facts). Defaults to both measured groups. The NET VERDICT always
  // reflects the full cross-metric picture regardless of what is displayed.
  displayGroups?: ReadonlyArray<MetricGroup>;
  // Top heading depth (2 → `##` for the combined report; 3 → `###` when embedded
  // in a split report's §7). Defaults to 3.
  headingLevel?: number;
}>;

const pairKey = (delta: GenerationDelta): string =>
  `${delta.previousId}->${delta.currentId}`;

/**
 * Render the generational-delta section as Markdown. Returns "" when the sweep
 * carries no registry pairing, so a report over unpaired models is unchanged
 * (byte-stable). Deterministic for a given ordered set of configs.
 */
export const renderGenerationDeltaSection = (
  configs: ReadonlyArray<ConfigRun>,
  options: DeltaRenderOptions = {},
): string => {
  const deltas = buildGenerationDeltas(configs);
  if (deltas.length === 0) return "";
  const displayGroups = options.displayGroups ?? ["speed", "accuracy"];
  const top = "#".repeat(options.headingLevel ?? 3);
  const pairHead = `${top}#`;

  const header =
    "| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |\n" +
    "| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |";

  const renderDelta = (delta: GenerationDelta): string => {
    const shownMeasured = delta.measuredMetrics.filter((m) =>
      displayGroups.includes(m.group),
    );
    const rows = [...shownMeasured, ...delta.costMetrics];
    const table = `${header}\n${rows.map((m) => metricRow(m)).join("\n")}`;
    const notMeasuredNote = delta.measured
      ? ""
      : `\n\n_Speed and accuracy deltas are omitted: ${escapeCell(
          delta.notMeasuredReason ?? "not measured in this frame",
        )}. No values are synthesized; only curated cost deltas are shown._`;
    return (
      `**Effort \`${escapeCell(delta.effort)}\`.**${notMeasuredNote}\n\n` +
      `${table}\n\n` +
      `_Net verdict: **${delta.verdict}** — ${escapeCell(delta.verdictReason)}._`
    );
  };

  const byPair = new Map<string, GenerationDelta[]>();
  const order: string[] = [];
  for (const delta of deltas) {
    const key = pairKey(delta);
    if (!byPair.has(key)) {
      byPair.set(key, []);
      order.push(key);
    }
    byPair.get(key)?.push(delta);
  }

  const pairBlocks = order.map((key) => {
    const group = byPair.get(key) ?? [];
    const first = group[0];
    if (first === undefined) return "";
    const heading = `${pairHead} ${escapeCell(first.previousModelName)} → ${escapeCell(
      first.currentModelName,
    )}`;
    return `${heading}\n\n${group.map(renderDelta).join("\n\n")}`;
  });

  const intro =
    `${top} Generational comparison (former → new)\n\n` +
    "For each provider tier that turned a generation this round, the former and " +
    "the new model were swept under identical conditions (same tier, same effort " +
    "ladder — only the model id differs), so these deltas isolate the generational " +
    "change. A speed or accuracy delta appears only when both generations were " +
    "`measured` in this frame; cost figures are curated registry facts. The net " +
    "verdict is a mechanical rule over the per-metric deltas (each metric counts as " +
    "moved only past a 1% relative threshold): **improved** when at least one metric " +
    "improved and none regressed, **regressed** in the mirror case, **mixed** when " +
    "both occur, and **unchanged** when every metric held within the threshold. " +
    "A measured metric is additionally labelled **indistinguishable**, and excluded " +
    "from the verdict, when the gap between the two means does not clear their " +
    "combined run-to-run spread (the sum of the two standard deviations, shown in " +
    "its own column). The trials behind each mean are stated in their own column, " +
    "so a direction can be read against the sample that produced it: re-running an " +
    "identical sweep hours apart moved throughput by up to 88% on the same " +
    "configuration, so a bare percentage change is not by itself evidence of a " +
    "generational direction. (That 88% was observed under the retired " +
    "post-first-token throughput definition, which this metric replaced on " +
    "2026-08-04; it has not been re-measured under the current end-to-end " +
    "definition, and is quoted here as the last figure actually observed rather " +
    "than as a current estimate.) Deltas stay **per effort level** rather than being " +
    "aggregated across the ladder, because low, medium and high are different " +
    "operating points and averaging them would report a figure no configuration " +
    "was measured at. Cost figures are registry facts and carry no spread. " +
    "Cheaper is an improvement; a faster-but-pricier result reads as mixed, never " +
    "silently netted to improved.";

  return `${intro}\n\n${pairBlocks.join("\n\n")}`;
};
