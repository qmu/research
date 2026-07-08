import { renderTimeSeriesChart } from "../../research-report/domain/chart.js";
import type {
  AvailabilitySamplingSpec,
  AvailabilitySummary,
} from "./availability";
import type { HistoryFile } from "./types";

export type AvailabilityRunReport = Readonly<{
  generatedAt: string;
  samplingSpec: AvailabilitySamplingSpec;
  summaries: ReadonlyArray<AvailabilitySummary>;
  artifactPath: string;
  fixture: boolean;
}>;

type ChartPoint = Readonly<{
  measuredAt: string;
  value: number;
  n: number;
}>;

type ChartSeries = Readonly<{
  id: string;
  label: string;
  points: ReadonlyArray<ChartPoint>;
}>;

const pct = (value: number): string => `${(value * 100).toFixed(0)}%`;

const ms = (value: number | null): string =>
  value === null ? "n/a" : `${value.toFixed(0)} ms`;

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

const availabilitySeries = (
  history: HistoryFile | undefined,
): ChartSeries[] => {
  const grouped = new Map<string, ChartSeries & { points: ChartPoint[] }>();
  for (const entry of history?.entries ?? []) {
    for (const point of entry.availability ?? []) {
      const id = point.provider;
      let series = grouped.get(id);
      if (series === undefined) {
        series = { id, label: point.provider, points: [] };
        grouped.set(id, series);
      }
      series.points.push({
        measuredAt: point.measuredAt,
        value: point.successRate,
        n: point.n,
      });
    }
  }
  return [...grouped.values()];
};

const availabilityChartCaption = (
  series: ReadonlyArray<ChartSeries>,
): string => {
  const points = series.flatMap((s) => s.points);
  const dates = new Set(points.map((point) => point.measuredAt));
  const ns = points.map((point) => point.n);
  const minN = Math.min(...ns);
  const maxN = Math.max(...ns);
  const nText = minN === maxN ? `n=${minN}` : `n range ${minN}-${maxN}`;
  return (
    `Sample count: ${plural(points.length, "provider-run point")} across ` +
    `${plural(dates.size, "manual run date")}; health-probe samples ${nText}. ` +
    `Cadence: manual on-demand runs only, not scheduled. This chart is manual ` +
    `health-probe observations, not an availability ranking or downtime trend.`
  );
};

const historyChart = (history: HistoryFile | undefined): string => {
  const series = availabilitySeries(history);
  const pointCount = series.reduce((sum, item) => sum + item.points.length, 0);
  if (pointCount === 0) {
    return "No committed measured availability history points yet.";
  }
  return `${renderTimeSeriesChart({
    id: "llm-availability-success-rate-history",
    title: "LLM availability manual health-probe success rate",
    description:
      "Provider health-probe success rates from manual on-demand runs. Sparse manual samples are not a downtime trend or availability ranking.",
    xLabel: "Measured at",
    yLabel: "Success rate",
    valueDigits: 2,
    series,
  })}

_Caption: ${availabilityChartCaption(series)}_`;
};

const summaryTable = (
  summaries: ReadonlyArray<AvailabilitySummary>,
): string => {
  const header =
    "| Provider | Probe target | n | Observation window | Success rate | Mean response | Failure breakdown | Rate limits | Down runs | Observed down duration |\n" +
    "| -------- | ------------ | - | ------------------ | ------------ | ------------- | ----------------- | ----------- | --------- | ---------------------- |";
  const rows = summaries.map((summary) => {
    const failureText = Object.entries(summary.failureTypeBreakdown)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${type}: ${count}`)
      .join(", ");
    const windowText =
      summary.observationWindow === null
        ? "undefined"
        : `${summary.observationWindow.durationMs} ms`;
    return (
      `| ${summary.provider} | ${escapeCell(summary.targetModelName)} | ` +
      `${summary.n} | ${windowText} | ${pct(summary.successRate)} | ` +
      `${ms(summary.meanResponseTimeMs)} | ${failureText || "none"} | ` +
      `${summary.rateLimitCount} | ${summary.downFrequency ?? "withheld"} | ` +
      `${summary.downtimeDurationMs === null ? "withheld" : ms(summary.downtimeDurationMs)} |`
    );
  });
  return `${header}\n${rows.join("\n")}`;
};

export const renderAvailabilityReport = (
  report: AvailabilityRunReport,
  history: HistoryFile | undefined,
): string => `---
title: LLM availability manual health-probe observations
description: Manual on-demand health-probe observations for LLM provider APIs. Sparse manual samples are not an availability ranking or downtime trend.
---

# LLM availability manual health-probe observations

This report records **manual health-probe observations**. The runner does not run
on a schedule, so these points are not an availability ranking and do not support
assertive downtime-frequency or downtime-duration comparisons.

Fixture: ${report.fixture ? "yes (keyless deterministic self-test)" : "no (owner-triggered real probe)"}

## Sampling spec

| Field | Value |
| ----- | ----- |
| Version | ${report.samplingSpec.version} |
| Cadence | ${report.samplingSpec.cadence} |
| Interval | ${report.samplingSpec.intervalMs} ms |
| Timeout | ${report.samplingSpec.timeoutMs} ms |
| Samples per provider | ${report.samplingSpec.samplesPerProvider} |
| Observation origin | ${escapeCell(report.samplingSpec.requestOrigin)} |
| Rate-limit classification | ${escapeCell(report.samplingSpec.rateLimitClassification)} |
| Censoring | ${escapeCell(report.samplingSpec.censoring)} |
| Down definition | ${escapeCell(report.samplingSpec.downDefinition)} |

## Current run observations

${summaryTable(report.summaries)}

## History chart

${historyChart(history)}

## Artifact

Complete observations and the sampling spec are stored in
[\`${escapeCell(report.artifactPath)}\`](./${escapeCell(report.artifactPath)}).
`;
