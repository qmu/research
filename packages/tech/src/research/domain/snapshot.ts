import { renderTimeSeriesChart } from "../../research-report/domain/chart.js";
import type {
  MetricDirection,
  ResearchHistoryFrame,
  ResearchSiteTopic,
} from "./site";

/**
 * The snapshot page: a topic's sidebar surface under ADR 0005. It summarizes
 * the trials inside the tendency window (tendency narrative + trend charts)
 * and links to each dated uniform trial report; the full numbers stay in the
 * frames. Everything here is pure — the entrypoint reads frames and artifacts
 * and writes the rendered page.
 *
 * The compactness budget is the guideline's contract: snapshots are loaded
 * into LLM context windows, so the Markdown (SVG chart markup excluded) must
 * stay within SNAPSHOT_CHAR_BUDGET characters — SNAPSHOT_TOKEN_BUDGET tokens
 * at the same 4-characters-per-token approximation the insights cost estimate
 * uses (docs/research-development-guideline.md).
 */

export const SNAPSHOT_TOKEN_BUDGET = 1500;
export const SNAPSHOT_CHARS_PER_TOKEN = 4;
export const SNAPSHOT_CHAR_BUDGET =
  SNAPSHOT_TOKEN_BUDGET * SNAPSHOT_CHARS_PER_TOKEN;

/** Tendency window: the last 5 months of trials, in 30-day months, anchored
 * on the newest frame so the computation never reads the wall clock. */
export const TENDENCY_WINDOW_MONTHS = 5;
const TENDENCY_WINDOW_MS = TENDENCY_WINDOW_MONTHS * 30 * 24 * 60 * 60 * 1000;

/** How many series one trend chart draws; the page states the cap when the
 * subject count exceeds it, so truncation is never silent. */
export const SNAPSHOT_MAX_SERIES_PER_CHART = 8;

export const stripSvgMarkup = (markdown: string): string =>
  markdown.replace(/<svg[\s\S]*?<\/svg>/g, "");

/** The guideline's check method: character count with SVG markup excluded. */
export const snapshotBudgetProblems = (
  markdown: string,
): ReadonlyArray<string> => {
  const length = stripSvgMarkup(markdown).length;
  return length > SNAPSHOT_CHAR_BUDGET
    ? [
        `snapshot is ${length} characters (SVG excluded); the budget is ${SNAPSHOT_CHAR_BUDGET} (${SNAPSHOT_TOKEN_BUDGET} tokens at ${SNAPSHOT_CHARS_PER_TOKEN} chars/token)`,
      ]
    : [];
};

const frameTime = (frame: ResearchHistoryFrame): number =>
  Date.parse(frame.generatedAt);

/** Frames within the tendency window, newest first, anchored on the newest
 * frame's timestamp. Frames with unparsable timestamps are excluded. */
export const framesInTendencyWindow = (
  frames: ReadonlyArray<ResearchHistoryFrame>,
): ReadonlyArray<ResearchHistoryFrame> => {
  const dated = frames.filter((frame) => Number.isFinite(frameTime(frame)));
  const anchor = Math.max(...dated.map(frameTime));
  return dated
    .filter((frame) => anchor - frameTime(frame) <= TENDENCY_WINDOW_MS)
    .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt));
};

/** One measured value of one metric for one subject at one trial. */
export type SnapshotPoint = Readonly<{
  seriesId: string;
  seriesLabel: string;
  metric: string;
  measuredAt: string;
  value: number;
}>;

type ArtifactConfig = Readonly<{
  id?: unknown;
  modelName?: unknown;
  measuredAt?: unknown;
  trials?: unknown;
}>;

type ArtifactTrial = Readonly<{
  ok?: unknown;
  metrics?: unknown;
}>;

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;

const meanOf = (values: ReadonlyArray<number>): number | undefined =>
  values.length === 0
    ? undefined
    : values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * Extract snapshot points from a speed/accuracy-shaped comparison artifact:
 * `{ generatedAt, metrics: [names], configs: [{ id, modelName, measuredAt,
 * trials: [{ ok, metrics: { name: value } }] }] }`. Each subject contributes
 * the mean over its successful trials, one point per metric.
 */
export const comparisonSnapshotPoints = (
  artifact: unknown,
): ReadonlyArray<SnapshotPoint> => {
  const root = asRecord(artifact);
  if (root === undefined) return [];
  const generatedAt =
    typeof root.generatedAt === "string" ? root.generatedAt : "";
  const metricNames = Array.isArray(root.metrics)
    ? root.metrics.filter((name): name is string => typeof name === "string")
    : [];
  const configs = Array.isArray(root.configs)
    ? (root.configs as ReadonlyArray<ArtifactConfig>)
    : [];

  const points: SnapshotPoint[] = [];
  for (const config of configs) {
    const id = typeof config.id === "string" ? config.id : undefined;
    if (id === undefined) continue;
    const label = typeof config.modelName === "string" ? config.modelName : id;
    const measuredAt =
      typeof config.measuredAt === "string" ? config.measuredAt : generatedAt;
    const trials = Array.isArray(config.trials)
      ? (config.trials as ReadonlyArray<ArtifactTrial>)
      : [];
    for (const metric of metricNames) {
      const mean = meanOf(
        trials.flatMap((trial) => {
          if (trial.ok !== true) return [];
          const metrics = asRecord(trial.metrics);
          const value = metrics?.[metric];
          return typeof value === "number" && Number.isFinite(value)
            ? [value]
            : [];
        }),
      );
      if (mean === undefined) continue;
      points.push({
        seriesId: id,
        seriesLabel: label,
        metric,
        measuredAt,
        value: mean,
      });
    }
  }
  return points;
};

const snapshotPointExtractors: Readonly<
  Record<string, (artifact: unknown) => ReadonlyArray<SnapshotPoint>>
> = {
  speed: comparisonSnapshotPoints,
  accuracy: comparisonSnapshotPoints,
};

/** Points for one topic's artifact; topics without an extractor chart nothing. */
export const snapshotPointsFor = (
  topicId: string,
  artifact: unknown,
): ReadonlyArray<SnapshotPoint> =>
  snapshotPointExtractors[topicId]?.(artifact) ?? [];

/**
 * A deterministic, clearly-labelled tendency placeholder (the analogue of
 * `insightsFixtureBody`): structural facts only, never mistakable for a real
 * reading. A real run supplies the LLM-written narrative instead.
 */
export const snapshotFixtureNarrative = (
  input: Pick<SnapshotInput, "topic" | "frames">,
): string => {
  const { topic, frames } = input;
  const newest = frames[0]?.generatedAt;
  const oldest = frames[frames.length - 1]?.generatedAt;
  const span =
    newest === undefined || oldest === undefined
      ? "no dated trials yet"
      : newest === oldest
        ? `one dated trial (${newest.slice(0, 10)})`
        : `${frames.length} dated trials between ${oldest.slice(0, 10)} and ${newest.slice(0, 10)}`;
  return [
    `_Deterministic snapshot skeleton — a real run adds the LLM-written`,
    `tendency narrative._`,
    ``,
    `This snapshot covers ${span} for ${topic.design.subjects}.`,
  ].join("\n");
};

export type SnapshotInput = Readonly<{
  topic: ResearchSiteTopic;
  /** Frames already reduced to the tendency window, newest first. */
  frames: ReadonlyArray<ResearchHistoryFrame>;
  points: ReadonlyArray<SnapshotPoint>;
  /** LLM-written tendency narrative; the fixture skeleton when absent. */
  narrative?: string;
  maxSeriesPerChart?: number;
}>;

const directionFor = (
  topic: ResearchSiteTopic,
  metric: string,
): MetricDirection =>
  topic.design.metrics.find((entry) => entry.name === metric)?.direction ??
  "reference";

const unitFor = (topic: ResearchSiteTopic, metric: string): string =>
  topic.design.metrics.find((entry) => entry.name === metric)?.unit ?? "";

/** Links are relative to docs/research-reports/, where snapshots live. */
const frameLink = (path: string): string =>
  `./${path.replace(/^docs\/research-reports\//, "").replace(/\.md$/, "")}`;

const frameLine = (frame: ResearchHistoryFrame): string => {
  const links = [
    frame.sourcePath === undefined
      ? undefined
      : `[English](${frameLink(frame.sourcePath)})`,
    frame.japanesePath === undefined
      ? undefined
      : `[Japanese](${frameLink(frame.japanesePath)})`,
    frame.dataPath === undefined
      ? undefined
      : `[data.json](${frameLink(frame.dataPath)})`,
  ].filter((link): link is string => link !== undefined);
  return `- ${frame.generatedAt}: ${links.join(" · ")}`;
};

type Series = Readonly<{
  id: string;
  label: string;
  points: ReadonlyArray<{ measuredAt: string; value: number }>;
}>;

const seriesForMetric = (
  points: ReadonlyArray<SnapshotPoint>,
  metric: string,
): ReadonlyArray<Series> => {
  const byId = new Map<
    string,
    { label: string; points: { measuredAt: string; value: number }[] }
  >();
  for (const point of points) {
    if (point.metric !== metric) continue;
    const entry = byId.get(point.seriesId) ?? {
      label: point.seriesLabel,
      points: [],
    };
    entry.points.push({ measuredAt: point.measuredAt, value: point.value });
    byId.set(point.seriesId, entry);
  }
  return [...byId.entries()].map(([id, entry]) => ({
    id,
    label: entry.label,
    points: [...entry.points].sort((left, right) =>
      left.measuredAt.localeCompare(right.measuredAt),
    ),
  }));
};

const latestValue = (series: Series): number =>
  series.points[series.points.length - 1]?.value ?? Number.NaN;

/** Keep the chart legible: the `max` best series by latest value, direction
 * aware. Ties and NaN sink to the end. */
const capSeries = (
  series: ReadonlyArray<Series>,
  direction: MetricDirection,
  max: number,
): ReadonlyArray<Series> =>
  [...series]
    .sort((left, right) => {
      const a = latestValue(left);
      const b = latestValue(right);
      if (Number.isNaN(a)) return 1;
      if (Number.isNaN(b)) return -1;
      return direction === "higher-is-better" ? b - a : a - b;
    })
    .slice(0, max);

const chartSection = (
  topic: ResearchSiteTopic,
  points: ReadonlyArray<SnapshotPoint>,
  metric: string,
  maxSeries: number,
): string => {
  const all = seriesForMetric(points, metric);
  if (all.length === 0) return "";
  const direction = directionFor(topic, metric);
  const capped = capSeries(all, direction, maxSeries);
  const capNote =
    all.length > capped.length
      ? `\n\nChart shows the ${capped.length} leading subjects of ${all.length}; every subject is in the trial reports below.`
      : "";
  const chart = renderTimeSeriesChart({
    id: `${topic.id}-${metric}`,
    title: `${metric} over trials`,
    description: `${metric} (${unitFor(topic, metric)}) per subject across the tendency window.`,
    xLabel: "Trial date",
    yLabel: `${metric} (${unitFor(topic, metric)})`,
    series: capped,
  });
  return `\n\n${chart}${capNote}`;
};

const designLines = (topic: ResearchSiteTopic): string => {
  const { design } = topic;
  const metrics = design.metrics
    .map((metric) => `${metric.name} (${metric.unit}, ${metric.direction})`)
    .join(", ");
  const trials =
    design.trialsPerRun.minimum === design.trialsPerRun.maximum
      ? `${design.trialsPerRun.minimum}`
      : `${design.trialsPerRun.minimum}–${design.trialsPerRun.maximum}`;
  return [
    `- Cadence: ${design.cadence} (off-cadence: ${design.offCadenceTrigger})`,
    `- Subjects: ${design.subjects}`,
    `- Metrics: ${metrics}`,
    `- Trials per run: ${trials} — ${design.trialsPerRun.premises}`,
    `- Cost per run: ≤ $${design.costPerRun.ceilingUsd} — ${design.costPerRun.premises}`,
  ].join("\n");
};

/** Render the snapshot page. The caller validates the result against
 * `snapshotBudgetProblems` before writing it. */
export const renderSnapshot = (input: SnapshotInput): string => {
  const { topic, frames, points } = input;
  const maxSeries = input.maxSeriesPerChart ?? SNAPSHOT_MAX_SERIES_PER_CHART;
  const narrative = input.narrative ?? snapshotFixtureNarrative(input);
  const metricsWithPoints = topic.design.metrics
    .map((metric) => metric.name)
    .filter((name) => points.some((point) => point.metric === name));
  const charts = metricsWithPoints
    .map((metric) => chartSection(topic, points, metric, maxSeries))
    .join("");
  const trials =
    frames.length === 0
      ? "No dated trial reports are in the tendency window yet."
      : frames.map(frameLine).join("\n");

  return `---
title: ${topic.source.text}
description: ${topic.source.summary}
---

# ${topic.source.text}

Snapshot over the last ${TENDENCY_WINDOW_MONTHS} months of trials. Full
numbers live in the dated trial reports listed below; the research design
follows the [research development guideline](../research-development-guideline).

## Tendency

${narrative.trim()}${charts}

## Trials

${trials}

## Design

${designLines(topic)}
`;
};
