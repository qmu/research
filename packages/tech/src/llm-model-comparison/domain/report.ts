import type {
  Aggregate,
  ComparisonResult,
  ConfigRun,
  HistoryFile,
  HistoryPoint,
  Provenance,
  Review,
  TrialResult,
} from "./types";
import { renderTimeSeriesChart } from "../../research-report/domain/chart.js";
import { buildThroughputPrompt } from "./throughput";
import { buildSchemaPrompt } from "./json-schema";
import { buildLengthPrompt } from "./length-accuracy";
import {
  INFORMATION_ACCURACY_MANIFEST,
  buildInformationAccuracyPrompt,
} from "./information-accuracy";
import { isNoEffortLevel } from "./effort";

// Render the comparison result page as Markdown — a comprehensive, objective
// research report, not just a table. Provenance (curated / measured / fixtured /
// error) is conveyed by TEXT and a legend, never by colour, so the page inherits
// VitePress's WCAG-2.2-AA-compliant theme contrast with no custom low-contrast
// styling to get wrong. Throughput and latency are reported separately with
// units; the JSON metric is the empirically tested max schema complexity; each
// configuration carries a developer review from the LLM judge; and the full
// per-call raw capture is linked as a JSON artifact.
//
// The report is a RENDERING of that artifact, not the source of truth: the same
// artifact can be re-rendered at any `DetailLevel` without re-running the sweep.
//  - "summary"  — headline table + one-line reviews + links.
//  - "standard" — + per-aspect distributions + full reviews + prompts (default).
//  - "full"     — + per-trial tables and inline sample raw outputs.

export type DetailLevel = "summary" | "standard" | "full";

export type ReportRenderOptions = Readonly<{
  history?: HistoryFile;
}>;

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const usd = (n: number): string => `$${n.toFixed(2)}`;

const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;

const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

const notMeasured = (p: Provenance): string =>
  p === "error" ? "n/a (error)" : "n/a (fixtured)";

const measured = (run: ConfigRun, value: string): string =>
  run.provenance === "measured" ? value : notMeasured(run.provenance);

const ci95HalfWidth = (a: Aggregate): number =>
  a.n < 2 ? 0 : (1.96 * a.stdDev) / Math.sqrt(a.n);

const numberWithCi = (a: Aggregate, digits: number, unit = ""): string => {
  const suffix = unit === "" ? "" : ` ${unit}`;
  const meanText = `${a.mean.toFixed(digits)}${suffix}`;
  if (a.n < 2) {
    return `${meanText} (n=${a.n})`;
  }
  return `${a.mean.toFixed(digits)} ± ${ci95HalfWidth(a).toFixed(
    digits,
  )}${suffix} (95% CI, n=${a.n})`;
};

const percentWithCi = (a: Aggregate, digits: number): string => {
  const meanText = `${(a.mean * 100).toFixed(digits)}%`;
  if (a.n < 2) {
    return `${meanText} (n=${a.n})`;
  }
  return `${meanText} ± ${(ci95HalfWidth(a) * 100).toFixed(
    digits,
  )}pp (95% CI, n=${a.n})`;
};

// "12.0–16.0" — the observed extent.
const range = (a: Aggregate, digits: number): string =>
  `${a.min.toFixed(digits)}–${a.max.toFixed(digits)}`;

// A stable anchor/key for a configuration (model slug + effort level).
const configKey = (run: ConfigRun): string => `${run.id}-${run.effort}`;

// --- headline comparison table -----------------------------------------------

const comparisonTable = (configs: ReadonlyArray<ConfigRun>): string => {
  const header =
    "| Provider | Model | Tier | Effort | Cost (in / out per MTok) | Throughput (tok/s) | TTFT (ms) | Total latency (ms) | Max schema depth | Max schema breadth | Length accuracy | Information accuracy |\n" +
    "| -------- | ----- | ---- | ------ | ------------------------ | ------------------ | --------- | ------------------ | ---------------- | ------------------ | --------------- | -------------------- |";
  const rows = configs.map((run) => {
    const s = run.stats;
    return (
      `| ${escapeCell(run.provider)} | ${escapeCell(run.modelName)} | ${run.tier} | ` +
      `${escapeCell(run.effort)} | ${usd(run.inputCostPerMTok)} / ${usd(run.outputCostPerMTok)} | ` +
      `${measured(run, numberWithCi(s.throughputTokensPerSec, 0))} | ` +
      `${measured(run, numberWithCi(s.ttftMs, 0))} | ` +
      `${measured(run, numberWithCi(s.totalLatencyMs, 0))} | ` +
      `${measured(run, numberWithCi(s.maxSchemaDepth, 0))} | ` +
      `${measured(run, numberWithCi(s.maxSchemaBreadth, 0))} | ` +
      `${measured(run, percentWithCi(s.lengthAccuracy, 0))} | ` +
      `${measured(run, percentWithCi(s.informationAccuracy, 0))} |`
    );
  });
  return `${header}\n${rows.join("\n")}`;
};

// --- per-aspect analysis -----------------------------------------------------

type Aspect = Readonly<{
  key: keyof ConfigRun["stats"];
  title: string;
  digits: number;
  format: (a: Aggregate) => string;
  better: "higher" | "lower";
}>;

const ASPECTS: ReadonlyArray<Aspect> = [
  {
    key: "throughputTokensPerSec",
    title: "Sustained throughput during generation",
    digits: 1,
    format: (a) => numberWithCi(a, 0, "tok/s"),
    better: "higher",
  },
  {
    key: "ttftMs",
    title: "Time to first token",
    digits: 0,
    format: (a) => numberWithCi(a, 0, "ms"),
    better: "lower",
  },
  {
    key: "totalLatencyMs",
    title: "Total response time",
    digits: 0,
    format: (a) => numberWithCi(a, 0, "ms"),
    better: "lower",
  },
  {
    key: "maxSchemaDepth",
    title: "Maximum schema nesting depth accepted",
    digits: 0,
    format: (a) => numberWithCi(a, 0),
    better: "higher",
  },
  {
    key: "maxSchemaBreadth",
    title: "Maximum schema field breadth accepted",
    digits: 0,
    format: (a) => numberWithCi(a, 0),
    better: "higher",
  },
  {
    key: "lengthAccuracy",
    title: "Length instruction accuracy",
    digits: 3,
    format: (a) => percentWithCi(a, 0),
    better: "higher",
  },
  {
    key: "informationAccuracy",
    title: "Information accuracy",
    digits: 3,
    format: (a) => percentWithCi(a, 0),
    better: "higher",
  },
];

type HistoryMetricKey =
  | "throughputTokensPerSec"
  | "ttftMs"
  | "totalLatencyMs"
  | "maxSchemaDepth"
  | "maxSchemaBreadth"
  | "lengthAccuracy"
  | "informationAccuracy";

type HistoryMetric = Readonly<{
  key: HistoryMetricKey;
  title: string;
  yLabel: string;
  valueDigits: number;
}>;

type ChartPoint = Readonly<{
  measuredAt: string;
  value: number;
  n: number;
  interval?: Readonly<{ lower: number; upper: number }>;
}>;

type ChartSeries = Readonly<{
  id: string;
  label: string;
  points: ReadonlyArray<ChartPoint>;
}>;

const HISTORY_METRICS: ReadonlyArray<HistoryMetric> = [
  {
    key: "throughputTokensPerSec",
    title: "Throughput history",
    yLabel: "Tokens/sec",
    valueDigits: 1,
  },
  {
    key: "ttftMs",
    title: "TTFT history",
    yLabel: "Milliseconds",
    valueDigits: 0,
  },
  {
    key: "totalLatencyMs",
    title: "Total latency history",
    yLabel: "Milliseconds",
    valueDigits: 0,
  },
  {
    key: "maxSchemaDepth",
    title: "Schema depth history",
    yLabel: "Maximum accepted depth",
    valueDigits: 0,
  },
  {
    key: "maxSchemaBreadth",
    title: "Schema breadth history",
    yLabel: "Maximum accepted fields",
    valueDigits: 0,
  },
  {
    key: "lengthAccuracy",
    title: "Length accuracy history",
    yLabel: "Accuracy",
    valueDigits: 2,
  },
  {
    key: "informationAccuracy",
    title: "Information accuracy history",
    yLabel: "F1",
    valueDigits: 2,
  },
];

const metricStat = (
  value: unknown,
): Readonly<{ mean: number; stdDev: number; n: number }> | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { mean: value, stdDev: 0, n: 1 };
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "mean" in value &&
    "stdDev" in value &&
    "n" in value &&
    typeof value.mean === "number" &&
    typeof value.stdDev === "number" &&
    typeof value.n === "number" &&
    Number.isFinite(value.mean) &&
    Number.isFinite(value.stdDev) &&
    Number.isFinite(value.n)
  ) {
    return { mean: value.mean, stdDev: value.stdDev, n: value.n };
  }
  return undefined;
};

const historyPointLabel = (point: HistoryPoint): string =>
  `${point.modelName} [${point.effort}]`;

const intervalFor = (
  stat: Readonly<{ mean: number; stdDev: number; n: number }>,
): ChartPoint["interval"] =>
  stat.n < 2
    ? undefined
    : {
        lower: stat.mean - (1.96 * stat.stdDev) / Math.sqrt(stat.n),
        upper: stat.mean + (1.96 * stat.stdDev) / Math.sqrt(stat.n),
      };

const historySeries = (
  history: HistoryFile,
  metric: HistoryMetric,
): ChartSeries[] => {
  const grouped = new Map<
    string,
    { id: string; label: string; points: ChartPoint[] }
  >();
  for (const entry of history.entries) {
    for (const point of entry.points) {
      if (point.provenance !== "measured") continue;
      const stat = metricStat(point[metric.key]);
      if (stat === undefined) continue;
      const id = `${point.id}-${point.effort}`;
      let series = grouped.get(id);
      if (series === undefined) {
        series = { id, label: historyPointLabel(point), points: [] };
        grouped.set(id, series);
      }
      series.points.push({
        measuredAt: point.measuredAt,
        value: stat.mean,
        n: stat.n,
        interval: intervalFor(stat),
      });
    }
  }
  return [...grouped.values()];
};

const historyCaption = (series: ReadonlyArray<ChartSeries>): string => {
  const points = series.flatMap((s) => s.points);
  const dates = new Set(points.map((point) => point.measuredAt));
  const ns = points.map((point) => point.n);
  const minN = Math.min(...ns);
  const maxN = Math.max(...ns);
  const nText = minN === maxN ? `n=${minN}` : `n range ${minN}-${maxN}`;
  return (
    `Sample count: ${plural(points.length, "plotted point")} across ` +
    `${plural(dates.size, "manual run date")}; metric sample ${nText}. ` +
    `Cadence: manual on-demand runs only, not scheduled. The numeric tables ` +
    `below remain the accessible text alternative.`
  );
};

const historyChartsSection = (history: HistoryFile | undefined): string => {
  if (history === undefined) {
    return "";
  }
  const charts = HISTORY_METRICS.map((metric) => {
    const series = historySeries(history, metric);
    const pointCount = series.reduce((sum, s) => sum + s.points.length, 0);
    if (pointCount === 0) return "";
    return `### ${metric.title}

${renderTimeSeriesChart({
  id: `llm-${metric.key}-history`,
  title: `LLM ${metric.title}`,
  description: `${metric.title} by model and effort over manual measurement history. Single-date histories are marked as one data point and do not draw a trend line.`,
  xLabel: "Measured at",
  yLabel: metric.yLabel,
  valueDigits: metric.valueDigits,
  series,
})}

_Caption: ${historyCaption(series)}_`;
  }).filter((chart) => chart !== "");

  return charts.length === 0
    ? ""
    : `## Measurement history charts

These inline SVG charts are generated from committed measurement history and are additive to the numeric tables. They are not used on the fixture path.

${charts.join("\n\n")}\n`;
};

const label = (run: ConfigRun): string =>
  `${escapeCell(run.modelName)} [${escapeCell(run.effort)}]`;

const noEffortCount = (configs: ReadonlyArray<ConfigRun>): number =>
  configs.filter((run) => isNoEffortLevel(run.effort)).length;

const reviewText = (text: string): string =>
  escapeCell(text).replace(/^Best for:\s*/i, "");

const aspectSentence = (
  aspect: Aspect,
  measuredRuns: ReadonlyArray<ConfigRun>,
): string => {
  if (measuredRuns.length === 0) {
    return "This run has no measured values for this aspect; every configuration was fixtured or errored.";
  }
  const value = (run: ConfigRun): number => run.stats[aspect.key].mean;
  const sorted = [...measuredRuns].sort((a, b) =>
    aspect.better === "higher" ? value(b) - value(a) : value(a) - value(b),
  );
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const dir =
    aspect.better === "higher" ? "Highest measured" : "Lowest measured";
  return (
    `${dir} of the ${measuredRuns.length} measured configuration(s): ` +
    `**${label(best)}** at ${aspect.format(best.stats[aspect.key])}. ` +
    `Opposite end of this measurement: ${label(worst)} at ${aspect.format(worst.stats[aspect.key])}.`
  );
};

const aspectSection = (
  aspect: Aspect,
  configs: ReadonlyArray<ConfigRun>,
  measuredRuns: ReadonlyArray<ConfigRun>,
): string => {
  const header =
    "| Configuration | Mean ± 95% CI | Min–Max | n |\n| ------------- | ------------ | ------- | - |";
  const rows = configs.map((run) => {
    const a = run.stats[aspect.key];
    return (
      `| ${label(run)} | ${measured(run, aspect.format(a))} | ` +
      `${measured(run, range(a, aspect.digits))} | ${measured(run, String(a.n))} |`
    );
  });
  return (
    `### ${aspect.title}\n\n${header}\n${rows.join("\n")}\n\n` +
    `${aspectSentence(aspect, measuredRuns)}`
  );
};

// --- per-configuration developer reviews -------------------------------------

const reviewProvenanceNote = (r: Review): string => {
  if (r.provenance === "judged") return "";
  if (r.provenance === "skipped")
    return " _(no review — every trial failed for this configuration)_";
  return ` _(fixtured judge — a deterministic stand-in, not a live review)_`;
};

const reviewBlock = (run: ConfigRun, detail: DetailLevel): string => {
  const r = run.review;
  const head = `### ${label(run)} — ${escapeCell(run.provider)} · ${run.tier} {#${configKey(run)}}`;
  if (r.provenance === "skipped") {
    return `${head}\n\n_No developer review: every trial failed for this configuration._`;
  }
  if (detail === "summary") {
    return `${head}\n\n**Observed fit:** ${reviewText(r.bestFor)}${reviewProvenanceNote(r)}`;
  }
  return (
    `${head}${reviewProvenanceNote(r)}\n\n` +
    `- **Observed advantages:** ${reviewText(r.strengths)}\n` +
    `- **Observed constraints:** ${reviewText(r.weaknesses)}\n` +
    `- **Observed fit:** ${reviewText(r.bestFor)}`
  );
};

const reviewsSection = (
  configs: ReadonlyArray<ConfigRun>,
  detail: DetailLevel,
): string =>
  `## Per-configuration developer reviews\n\n` +
  `The LLM judge (\`${escapeCell(configs[0]?.review.judgeModel ?? "n/a")}\`) wrote each review from that configuration's trial outputs and measured metrics. ` +
  `Treat these bullets as measured-run summaries, not independent capability claims.\n\n` +
  configs.map((run) => reviewBlock(run, detail)).join("\n\n");

// --- per-trial detail (full only) --------------------------------------------

const perTrialTable = (run: ConfigRun): string => {
  const okTrials = run.trials.filter((t: TrialResult) => t.ok);
  if (okTrials.length === 0) {
    return "";
  }
  const header =
    "| Trial | Throughput (tok/s) | TTFT (ms) | Total (ms) | Max depth | Max breadth | Length acc | Information acc |\n" +
    "| ----- | ------------------ | --------- | ---------- | --------- | ----------- | ---------- | --------------- |";
  const rows = okTrials.map(
    (t) =>
      `| ${t.trial} | ${t.metrics.throughputTokensPerSec.toFixed(0)} | ` +
      `${t.metrics.ttftMs.toFixed(0)} | ${t.metrics.totalLatencyMs.toFixed(0)} | ` +
      `${t.metrics.maxSchemaDepth} | ${t.metrics.maxSchemaBreadth} | ${pct(t.metrics.lengthAccuracy)} | ` +
      `${pct(t.metrics.informationAccuracy)} |`,
  );
  return `#### ${label(run)}\n\n${header}\n${rows.join("\n")}`;
};

const perTrialSection = (configs: ReadonlyArray<ConfigRun>): string => {
  const measuredRuns = configs.filter((r) => r.provenance === "measured");
  const perTrial = measuredRuns
    .map(perTrialTable)
    .filter((s) => s !== "")
    .join("\n\n");
  return `## Per-trial measured values\n\n${
    perTrial === ""
      ? "No measured configurations in this run; the fixtured/failed trials are in the artifact."
      : `Every successful trial's derived metrics (full raw output in the artifact):\n\n${perTrial}`
  }`;
};

// --- data transparency -------------------------------------------------------

const transparencySection = (result: ComparisonResult): string => {
  const throughputPrompt = buildThroughputPrompt(
    result.probe.throughputTargetWords,
    result.probe.throughputTopic,
  );
  const lengthPrompt = buildLengthPrompt(
    result.probe.lengthTargetWords,
    result.probe.lengthTopic,
  );
  const informationPrompt = buildInformationAccuracyPrompt(
    INFORMATION_ACCURACY_MANIFEST.questions[0],
  );
  const sp = result.probe.schemaProbe;
  const schemaPrompt = buildSchemaPrompt({ depth: sp.depth.start, breadth: 1 });

  return `## Data transparency

The run artifact preserves the prompts, raw trial outputs, token counts, timing
values, schema-conformance results, provider rejection messages, and judge
reviews. The report can be regenerated from that artifact without rerunning the
providers.

**Throughput probe** (streamed long generation; sustained tok/s is measured over
the generation window, excluding time-to-first-token):

\`\`\`text
${throughputPrompt}
\`\`\`

**Latency probe** (streamed short prompt; TTFT + total response time):

\`\`\`text
${escapeCell(result.probe.latencyPrompt)}
\`\`\`

**Schema-complexity probe** (structured-output mode; each axis is escalated
independently — depth up to ${sp.depth.cap} nesting levels, breadth up to
${sp.breadth.cap} fields — climbing geometrically then bisecting to the tested
maximum. The first rung on the depth axis asks for):

\`\`\`text
${schemaPrompt}
\`\`\`

**Length probe:**

\`\`\`text
${lengthPrompt}
\`\`\`

**Information-accuracy probe** (TruthfulQA manifest
${escapeCell(result.probe.informationAccuracy.manifestVersion)};
${result.probe.informationAccuracy.questionCount} short factual questions;
headline score = deterministic alias/exact-match token F1):

\`\`\`text
${informationPrompt}
\`\`\`

**Complete raw record.** Every configuration, trial, and call is committed
alongside this page as a JSON run artifact:
[\`${escapeCell(result.artifactPath)}\`](./${escapeCell(result.artifactPath)}).
This page is a rendering of that record; the artifact is the source of truth.`;
};

// --- cost & time -------------------------------------------------------------

const costSection = (result: ComparisonResult): string => {
  const e = result.estimate;
  return `## Cost and time

A full real sweep of this matrix is **${e.configCount} configurations** (model ×
effort) × the five probes × **${plural(result.trials, "trial")}**, plus one judge call per
configuration. The runner estimated **${e.callCount} API calls**, approximately
${usd(e.usdCost)}, and approximately ${e.etaMinutes.toFixed(0)} minutes before it
called any provider. \`--estimate\` prints that estimate without provider calls.
The estimate uses fixed per-call token assumptions; actual token usage is stored
per call in the run artifact. CI runs only the keyless \`compare:fixture\`
self-test, not a real provider sweep.`;
};

// --- the page ----------------------------------------------------------------

export const renderComparisonReport = (
  result: ComparisonResult,
  detail: DetailLevel = "standard",
  options: ReportRenderOptions = {},
): string => {
  const configs = result.configs;
  const measuredRuns = configs.filter((r) => r.provenance === "measured");
  const anyNonMeasured = configs.some((r) => r.provenance !== "measured");
  const providers = [...new Set(configs.map((r) => r.provider))].length;
  const models = [...new Set(configs.map((r) => r.id))].length;
  const sp = result.probe.schemaProbe;
  const trialCount = plural(result.trials, "trial");
  const noEffortRows = noEffortCount(configs);
  const noEffortText =
    noEffortRows > 0
      ? ` ${plural(noEffortRows, "configuration")} use Effort = \`n/a\`; those are valid single-configuration rows for models that expose no user-selectable effort control, not failed measurements.`
      : "";

  const aspects =
    detail === "summary"
      ? ""
      : `\n## Per-aspect measurements\n\nEach table reports the mean ± 95% confidence interval (1.96 × sample standard deviation / √n), observed min–max, and contributing trial count for one measured aspect. A metric with n < 2 is shown as a mean only and labelled with its n.\n\n${ASPECTS.map(
          (a) => aspectSection(a, configs, measuredRuns),
        ).join("\n\n")}\n`;

  const perTrial = detail === "full" ? `\n${perTrialSection(configs)}\n` : "";
  const historyCharts = historyChartsSection(options.history);

  return `---
title: LLM model comparison
description: A reproducible comparison of ${models} large language models across ${providers} providers and ${configs.length} model×effort configurations. The report separates curated catalog data from measured throughput, latency, JSON-schema limits, length-instruction accuracy, information accuracy, and LLM-judge review summaries over ${trialCount}.
---

# LLM model comparison

This report records one reproducible sweep of **${configs.length} model×effort
configurations** across ${models} models and ${providers} providers. For each
configuration, the runner measures five narrow behaviors over **${trialCount}**:
streamed generation throughput, response latency, JSON structured-output
limits, adherence to an exact word-count instruction, and short factual-QA
information accuracy. A separate LLM judge then summarizes the measured trial
outputs for developer use.

The report separates curated catalog facts from measured behavior. Provider,
model, tier, price, and supported effort levels come from the model registry.
Throughput, latency, schema limits, length accuracy, and information accuracy
come from the run artifact linked below.

## Methodology

**Configurations.** The matrix contains ${models} models across ${providers}
providers and ${configs.length} model×effort configurations. Effort maps to each
provider's own reasoning control (Anthropic \`output_config.effort\`, OpenAI
\`reasoning_effort\`, Google thinking budget). Unsupported levels are marked as
unsupported rather than substituted.${noEffortText}

**Trials and statistics.** Every probe runs **${trialCount}** per
configuration. The pure functions in
\`packages/tech/src/llm-model-comparison/domain/aggregate.ts\` reduce successful
trial values to mean, sample standard deviation (Bessel's n−1), and \`n\`.
Tables render measured metrics as mean ± 95% confidence interval
(1.96 × sample standard deviation / √n). Failed trials are excluded from
aggregates, not counted as zero, and n < 2 metrics are shown without an interval.

**Probes.** Each configuration is sent five probes through a provider-neutral
\`CompletionClient\` anti-corruption layer in \`packages/tech/src/vendors/llm/\`:

- **Throughput** — a long streamed generation. The metric is sustained
  tokens/second during generation: output tokens divided by
  \`total − time-to-first-token\`. It is not round-trip latency.
- **Latency** — a short streamed prompt. Time-to-first-token and total response
  time are reported as separate metrics.
- **JSON-schema complexity** — the provider's structured-output mode is tested on
  two independent axes: nesting depth up to ${sp.depth.cap} and field breadth up
  to ${sp.breadth.cap}. Each axis starts at ${sp.depth.start}, climbs
  geometrically, then uses bisection to find the largest schema that returns
  schema-conforming output. Provider rejection caps that axis at the last accepted
  value and the rejection is preserved in the artifact.
- **Length accuracy** — a paragraph of exactly ${result.probe.lengthTargetWords}
  words on "${escapeCell(result.probe.lengthTopic)}"; accuracy is
  \`1 - min(1, |actual - target| / target)\`.
- **Information accuracy** — ${result.probe.informationAccuracy.questionCount}
  TruthfulQA short factual questions from manifest
  \`${escapeCell(result.probe.informationAccuracy.manifestVersion)}\`
  (${escapeCell(result.probe.informationAccuracy.license)}). The headline metric
  is deterministic maximum token F1 over the reference answer plus accepted
  aliases after lowercasing, article stripping, punctuation stripping, and
  whitespace collapse; alias exact-match is retained in the scorer output but no
  LLM judge is mixed into this metric.

Every grader is pure and unit-tested in
\`packages/tech/src/llm-model-comparison/domain/\`.

\`\`\`mermaid
flowchart LR
  R[Curated registry: models.ts] --> M[Model × effort matrix]
  M --> P[Live probes x ${result.trials}]
  P --> G[Pure graders + statistics in domain/]
  G --> J[LLM judge: per-config review]
  G --> A[Complete raw JSON artifact]
  G --> T[Tables + distributions]
  J --> Page[Result page]
  T --> Page
\`\`\`

_Diagram: the model registry expands into a model×effort matrix. Per-trial probes
produce raw outputs, pure graders reduce those outputs to metrics, the judge
summarizes each configuration, and the page renders from the same JSON artifact._

${costSection(result)}

## Comparison

${comparisonTable(configs)}

**Legend.** Provider, Model, Tier, Effort, and Cost are curated catalog data.
Throughput, TTFT, total latency, max schema depth, max schema breadth, length
accuracy are measured values, each reported as mean ± 95% confidence interval
with n over ${trialCount}; information accuracy follows the same projection as
deterministic factual-QA F1. Effort
\`n/a\` means the model has no user-selectable effort control. \`n/a (fixtured)\`
means the deterministic fixture client produced the metric cell because no API key
was used. \`n/a (error)\` means every trial for that
configuration failed. Provenance is written in the cell text rather than encoded
only by color.
${historyCharts}${aspects}
${reviewsSection(configs, detail)}
${perTrial}
${transparencySection(result)}

## Scope & limitations

This report has the following scope limits:

- **${trialCount}** per configuration×probe. This sample supports a
  run-level comparison, not a statistical claim about stable provider behavior.
- **Point-in-time.** Measured behavior reflects the models and APIs at the
  generated timestamp below; curated facts reflect the model registry used for
  the run.
- The five probes test narrow behaviors (generation throughput, responsiveness,
  structured-output complexity, length-instruction following, short factual QA) — they do **not**
  measure general capability or reasoning quality.
- **Effort semantics vary by provider.** One provider may expose a reasoning
  enum, another a thinking-token budget, and some surfaces expose no effort
  control. Effort levels are therefore more comparable within a provider than
  across providers.
${
  anyNonMeasured
    ? "- **This run includes non-measured configurations.** `n/a (fixtured)` cells come from a deterministic fixture client. `n/a (error)` cells come from configurations whose trials all failed. Neither is a live measurement.\n"
    : ""
}- **Generated:** ${escapeCell(result.generatedAt)}

## Reproduce

\`\`\`sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Pipeline self-test, no API keys or cost (deterministic fixture clients + judge):
npm run compare:fixture

# See the estimated call count / cost / ETA WITHOUT making any call:
npm run compare -- --estimate

# Against the real providers (populate .env first; see .env.example):
#   ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY
# Bound the run with --models <id,...>, --effort <level,...>, --trials <n>,
# and choose report detail with --detail summary|standard|full.
npm run compare
\`\`\`

The run regenerates this page and the JSON run-artifact. A provider whose key is
missing in a real run is fixtured-and-flagged, never presented as a live
measurement. Pin the \`apiModelId\` values in any published comparison so the
result stays interpretable over time.
`;
};
