import { renderTimeSeriesChart } from "../../research-report/domain/chart.js";
import type {
  MetricDirection,
  ResearchHistoryFrame,
  ResearchSiteTopic,
} from "./site";
import {
  SNAPSHOT_MAX_SERIES_PER_CHART,
  framesInTendencyWindow,
  snapshotPointsFor,
  type SnapshotPoint,
} from "./snapshot";

/**
 * The "dated survey-article series" composition (ADR 0005, owner direction
 * 2026-07-13): each topic's CURRENT page is the latest run's 7-section article
 * plus two cross-run blocks composed here —
 *
 *   - 推移 / Trend: an inline-SVG chart of each metric across the runs in the
 *     tendency window (reuses the snapshot chart), injected into §4.
 *   - 過去の調査 / Past surveys: links to every earlier dated article,
 *     newest-first, injected into §7.
 *
 * These are rendered as **bold-labelled blocks**, not new headings, so the
 * enforced 7-section H2/H3 outline and the §4 compactness budget stay intact.
 * Composition is a pure string transform over a finished article, kept separate
 * from the per-topic measurement renderers: the runner writes the measurement
 * article, this composes the series view over it.
 */

const directionFor = (
  topic: ResearchSiteTopic,
  metric: string,
): MetricDirection =>
  topic.design.metrics.find((entry) => entry.name === metric)?.direction ??
  "reference";

const unitFor = (topic: ResearchSiteTopic, metric: string): string =>
  topic.design.metrics.find((entry) => entry.name === metric)?.unit ?? "";

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

const TREND_LABEL = "**推移 / Trend across surveys**";

/** Distinct measured dates for a metric — a real trend needs at least two. */
const distinctDates = (
  points: ReadonlyArray<SnapshotPoint>,
  metric: string,
): number =>
  new Set(
    points
      .filter((point) => point.metric === metric)
      .map((point) => point.measuredAt.slice(0, 10)),
  ).size;

/**
 * The 推移 block for a topic. Always present (every article carries a trend
 * section, per the owner direction): a chart per metric that has measured
 * values on **two or more distinct dates**, or a plain note when the series is
 * too young to plot a trend (first comparable survey, or a topic without a
 * point extractor). A single date is not a trend and never draws a degenerate
 * one-column chart.
 */
export const buildTrendBlock = (
  topic: ResearchSiteTopic,
  points: ReadonlyArray<SnapshotPoint>,
  maxSeriesPerChart = SNAPSHOT_MAX_SERIES_PER_CHART,
): string => {
  const metricsWithTrend = topic.design.metrics
    .map((metric) => metric.name)
    .filter((name) => distinctDates(points, name) >= 2);
  if (metricsWithTrend.length === 0) {
    return `${TREND_LABEL}\n\nThis is the first comparable survey in the series, so there is no multi-survey trend to chart yet. A trend chart appears here once a second same-instrument survey is archived; earlier surveys are linked under Verification Data.`;
  }
  const charts = metricsWithTrend
    .map((metric) => {
      const all = seriesForMetric(points, metric);
      const capped = capSeries(
        all,
        directionFor(topic, metric),
        maxSeriesPerChart,
      );
      const capNote =
        all.length > capped.length
          ? `\n\nChart shows the ${capped.length} leading subjects of ${all.length}; every subject is in the linked past surveys.`
          : "";
      const chart = renderTimeSeriesChart({
        id: `${topic.id}-${metric}-trend`,
        title: `${metric} over surveys`,
        description: `${metric} (${unitFor(topic, metric)}) per subject across the survey series.`,
        xLabel: "Survey date",
        yLabel: `${metric} (${unitFor(topic, metric)})`,
        series: capped,
      });
      return `${chart}${capNote}`;
    })
    .join("\n\n");
  return `${TREND_LABEL}\n\nThe measured metrics across the dated surveys in this series (same-instrument runs only):\n\n${charts}`;
};

/** Links are relative to docs/research-reports/, where the current pages live. */
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

/**
 * The 過去の調査 block: links to every earlier dated survey article,
 * newest-first. Returns "" when there are no past surveys yet (first run).
 */
export const buildRelatedBlock = (
  frames: ReadonlyArray<ResearchHistoryFrame>,
): string => {
  const past = [...frames].sort((left, right) =>
    right.generatedAt.localeCompare(left.generatedAt),
  );
  if (past.length === 0) return "";
  return `**過去の調査 / Past surveys in this series**\n\nEarlier dated surveys of this topic, newest first. Each is a complete article for its run.\n\n${past
    .map(frameLine)
    .join("\n")}`;
};

/**
 * Inject the two blocks into a finished 7-section article: the trend before
 * "## 5." (end of §4 Verification Results), the past-surveys block at the end
 * of §7 Verification Data (the last section). Empty blocks inject nothing, so
 * the function is a no-op for a first run. Pure and idempotent-safe only on an
 * un-composed article; the site step always composes from the freshly rendered
 * measurement article.
 */
export const composeCurrentArticle = (
  articleMarkdown: string,
  trendBlock: string,
  relatedBlock: string,
): string => {
  let out = articleMarkdown.replace(/\n+$/, "\n");
  if (trendBlock.trim() !== "") {
    const marker = "\n## 5. ";
    const index = out.indexOf(marker);
    if (index === -1) {
      out = `${out.replace(/\n+$/, "\n")}\n${trendBlock.trim()}\n`;
    } else {
      out = `${out.slice(0, index)}\n${trendBlock.trim()}\n${out.slice(index)}`;
    }
  }
  if (relatedBlock.trim() !== "") {
    out = `${out.replace(/\n+$/, "\n")}\n${relatedBlock.trim()}\n`;
  }
  return out;
};

/** Convenience: the two blocks for a topic given the tendency-window frames and
 * the measured points (current run + past frames) extracted by the caller. */
export const currentArticleBlocks = (
  topic: ResearchSiteTopic,
  frames: ReadonlyArray<ResearchHistoryFrame>,
  points: ReadonlyArray<SnapshotPoint>,
): Readonly<{ trendBlock: string; relatedBlock: string }> => ({
  trendBlock: buildTrendBlock(topic, points),
  relatedBlock: buildRelatedBlock(frames),
});

export { framesInTendencyWindow, snapshotPointsFor };
