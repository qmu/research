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

const RELATED_LABEL = "**過去の調査 / Past surveys in this series**";

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

export type ArticleLanguage = "en" | "ja";

/** Link a frame's article IN ONE LANGUAGE, relative to docs/research-reports/
 * (where the current pages live). English → the `.md` frame; Japanese → the
 * `.ja.md` frame. Undefined when that language's frame is absent. */
const frameArticleLink = (
  frame: ResearchHistoryFrame,
  language: ArticleLanguage,
): string | undefined => {
  const path = language === "ja" ? frame.japanesePath : frame.sourcePath;
  return path === undefined
    ? undefined
    : `./${path.replace(/^docs\/research-reports\//, "").replace(/\.md$/, "")}`;
};

/**
 * The 過去の調査 block for ONE language: a single link per earlier dated
 * survey, newest-first, to that survey's article in the SAME language as the
 * page it is appended to. This is why it is generated per language (not
 * translated): translation would keep the English URLs, and the English and
 * Japanese pages must each link their own frames so the links resolve in both
 * qmu-co-jp language sections. Returns "" when there is no earlier survey with
 * an article in this language.
 */
export const buildRelatedBlock = (
  frames: ReadonlyArray<ResearchHistoryFrame>,
  language: ArticleLanguage,
): string => {
  const past = [...frames].sort((left, right) =>
    right.generatedAt.localeCompare(left.generatedAt),
  );
  const lines = past.flatMap((frame) => {
    const link = frameArticleLink(frame, language);
    return link === undefined ? [] : [`- [${frame.generatedAt}](${link})`];
  });
  if (lines.length === 0) return "";
  return `**過去の調査 / Past surveys in this series**\n\nEarlier dated surveys of this topic, newest first — each a complete article for its run.\n\n${lines.join(
    "\n",
  )}`;
};

/**
 * Inject the 推移 (trend) block before "## 5." (end of §4 Verification
 * Results). The trend is composed into the English page BEFORE translation, so
 * its caption translates into the Japanese page. An empty block is a no-op.
 * Pure and idempotent: an article that already carries a trend block is
 * returned unchanged (normalized), so re-running a compose pass over an
 * already-composed page can never inject a second block.
 */
export const composeCurrentArticle = (
  articleMarkdown: string,
  trendBlock: string,
): string => {
  const out = articleMarkdown.replace(/\n+$/, "\n");
  if (trendBlock.trim() === "") return out;
  if (out.includes(TREND_LABEL)) return out;
  const marker = "\n## 5. ";
  const index = out.indexOf(marker);
  return index === -1
    ? `${out}\n${trendBlock.trim()}\n`
    : `${out.slice(0, index)}\n${trendBlock.trim()}\n${out.slice(index)}`;
};

/**
 * Append the 過去の調査 (past surveys) block at the end of §7 Verification
 * Data (the last section). Applied AFTER translation, per language, so each
 * page links its own-language frames. An empty block is a no-op. Idempotent:
 * an article that already carries a past-surveys block is returned unchanged,
 * so re-running an append pass can never stack a second block.
 */
export const appendRelatedBlock = (
  articleMarkdown: string,
  relatedBlock: string,
): string =>
  relatedBlock.trim() === "" || articleMarkdown.includes(RELATED_LABEL)
    ? articleMarkdown
    : `${articleMarkdown.replace(/\n+$/, "\n")}\n${relatedBlock.trim()}\n`;

/**
 * The newest dated frame that carries BOTH the English survey article and the
 * data artifact — the pair the current pages are restored from. Frames missing
 * either file (e.g. a partially-written archive) are skipped rather than
 * half-restored.
 */
export const latestCompleteFrame = (
  frames: ReadonlyArray<ResearchHistoryFrame>,
): ResearchHistoryFrame | undefined =>
  [...frames]
    .filter(
      (frame) => frame.sourcePath !== undefined && frame.dataPath !== undefined,
    )
    .sort((left, right) =>
      right.generatedAt.localeCompare(left.generatedAt),
    )[0];

export { framesInTendencyWindow, snapshotPointsFor };
