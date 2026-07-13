import { renderTimeSeriesChart } from "../../research-report/domain/chart.js";
import { renderEnglishResearchArticle } from "../../research/domain/article-outline";
import type { BenchmarkResult, HistoryFile } from "./types";

export type RagReportRenderOptions = Readonly<{
  history?: HistoryFile;
}>;

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;

const ms = (value: number): string => value.toFixed(2);

const ciHalfWidth = (lower: number, upper: number): number =>
  Math.max(0, (upper - lower) / 2);

const pctWithCi = (value: number, lower: number, upper: number): string =>
  `${pct(value)} ± ${(ciHalfWidth(lower, upper) * 100).toFixed(1)}pp`;

const decimalWithCi = (value: number, lower: number, upper: number): string =>
  `${value.toFixed(3)} ± ${ciHalfWidth(lower, upper).toFixed(3)}`;

const msWithStdDev = (mean: number, deviation: number): string =>
  `${ms(mean)} ± ${ms(deviation)}`;

const sentence = (value: string): string =>
  value.endsWith(".") ? value : `${value}.`;

type HistoryMetricKey =
  | "recallAtK"
  | "ndcgAtK"
  | "mrr"
  | "ingestMs"
  | "p50Ms"
  | "p95Ms"
  | "costUsd";

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
    key: "recallAtK",
    title: "Recall@k history",
    yLabel: "Recall",
    valueDigits: 2,
  },
  { key: "ndcgAtK", title: "nDCG@k history", yLabel: "nDCG", valueDigits: 2 },
  { key: "mrr", title: "MRR history", yLabel: "MRR", valueDigits: 2 },
  {
    key: "ingestMs",
    title: "Ingest latency history",
    yLabel: "Milliseconds",
    valueDigits: 1,
  },
  {
    key: "p50Ms",
    title: "Query p50 history",
    yLabel: "Milliseconds",
    valueDigits: 1,
  },
  {
    key: "p95Ms",
    title: "Query p95 history",
    yLabel: "Milliseconds",
    valueDigits: 1,
  },
  { key: "costUsd", title: "Run cost history", yLabel: "USD", valueDigits: 4 },
];

const intervalFor = (
  stat: Readonly<{ mean: number; stdDev: number; n: number }>,
): ChartPoint["interval"] =>
  stat.n < 2
    ? undefined
    : {
        lower: stat.mean - (1.96 * stat.stdDev) / Math.sqrt(stat.n),
        upper: stat.mean + (1.96 * stat.stdDev) / Math.sqrt(stat.n),
      };

const backendLabels = (result: BenchmarkResult): ReadonlyMap<string, string> =>
  new Map(result.runs.map((run) => [run.backend.id, run.backend.name]));

const historySeries = (
  history: HistoryFile,
  metric: HistoryMetric,
  labels: ReadonlyMap<string, string>,
): ChartSeries[] => {
  const grouped = new Map<
    string,
    { id: string; label: string; points: ChartPoint[] }
  >();
  for (const entry of history.entries) {
    for (const point of entry.points) {
      if (point.provenance !== "measured") continue;
      const stat = point[metric.key];
      const label = labels.get(point.id) ?? point.id;
      let series = grouped.get(point.id);
      if (series === undefined) {
        series = { id: point.id, label, points: [] };
        grouped.set(point.id, series);
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
    `Sample count: ${points.length} plotted point(s) across ` +
    `${dates.size} manual run date(s); metric sample ${nText}. Cadence: ` +
    `manual on-demand runs only, not scheduled. The numeric tables above and ` +
    `below remain the accessible text alternative.`
  );
};

const historyChartsSection = (
  result: BenchmarkResult,
  history: HistoryFile | undefined,
): string => {
  if (history === undefined) {
    return "";
  }
  const labels = backendLabels(result);
  const charts = HISTORY_METRICS.map((metric) => {
    const series = historySeries(history, metric, labels);
    const pointCount = series.reduce((sum, s) => sum + s.points.length, 0);
    if (pointCount === 0) return "";
    return `### ${metric.title}

${renderTimeSeriesChart({
  id: `rag-${metric.key}-history`,
  title: `RAG ${metric.title}`,
  description: `${metric.title} by backend over manual measurement history. Single-date histories are marked as one data point and do not draw a trend line.`,
  xLabel: "Measured at",
  yLabel: metric.yLabel,
  valueDigits: metric.valueDigits,
  series,
})}

_Caption: ${historyCaption(series)}_`;
  }).filter((chart) => chart !== "");

  return charts.length === 0
    ? ""
    : `**Measurement history charts**

These inline SVG charts are generated from committed measurement history and are additive to the numeric tables. They are not used on the fixture path.

${charts.join("\n\n")}\n`;
};

export const renderRagBenchmarkReport = (
  result: BenchmarkResult,
  options: RagReportRenderOptions = {},
): string => {
  const rows = result.runs
    .map(
      (run) =>
        `| ${run.backend.name} | ${run.backend.kind} | ${run.backend.embeddingCoupling} | ` +
        `${run.backend.isolatedStore ? "yes" : "no"} | ${run.provenance} | ` +
        `${pctWithCi(run.retrieval.recallAtK, run.retrieval.recallAtKCi95.lower, run.retrieval.recallAtKCi95.upper)} | ` +
        `${pctWithCi(run.retrieval.ndcgAtK, run.retrieval.ndcgAtKCi95.lower, run.retrieval.ndcgAtKCi95.upper)} | ` +
        `${decimalWithCi(run.retrieval.mrr, run.retrieval.mrrCi95.lower, run.retrieval.mrrCi95.upper)} | ` +
        `${msWithStdDev(run.operational.ingestMs, run.operational.ingestMsStdDev)} | ` +
        `${msWithStdDev(run.operational.queryLatencyP50Ms, run.operational.queryLatencyP50MsStdDev)} | ` +
        `${msWithStdDev(run.operational.queryLatencyP95Ms, run.operational.queryLatencyP95MsStdDev)} | ` +
        `$${run.operational.costUsd.toFixed(4)} | ${run.backend.costNote} |`,
    )
    .join("\n");

  const backendNotes = result.runs
    .map((run) => {
      const isolation = run.backend.isolatedStore
        ? "store-isolated (fixed embedding)"
        : "whole-stack, not store-isolated (managed embedding)";
      const spread = run.retrieval.trialStdDev
        ? ` Run-to-run retrieval stdDev across ${run.retrieval.trialCount} trials: recall ${(run.retrieval.trialStdDev.recallAtK * 100).toFixed(1)}pp, nDCG ${(run.retrieval.trialStdDev.ndcgAtK * 100).toFixed(1)}pp, MRR ${run.retrieval.trialStdDev.mrr.toFixed(3)}.`
        : "";
      const details = [
        run.backend.ingestionNote,
        run.retrieval.intervalNote,
        `Operational metrics are mean ± sample stdDev across ${run.operational.trialCount} trial(s).`,
        spread,
        run.provenance === "error" && run.error
          ? `Run errored: ${run.error}`
          : undefined,
      ]
        .filter((detail): detail is string => Boolean(detail))
        .map((detail) => ` ${sentence(detail)}`)
        .join("");
      return `- **${run.backend.name}** — ${isolation}.${details}`;
    })
    .join("\n");
  const historyCharts = historyChartsSection(result, options.history);

  return renderEnglishResearchArticle({
    // Sidebar-page title: must equal the topic's sidebar label (source.text in
    // site.ts) — published pages carry title == sidebar label by policy.
    title: "RAG vector store benchmark",
    description:
      "A reproducible benchmark topic comparing vector-store retrieval quality and operational behavior across self-managed (fixed-embedding) and fully-managed backends.",
    introduction:
      "This report records a benchmark harness for vector-store and RAG-database backends. It separates curated backend facts from measured retrieval and operational behavior.",
    purpose:
      "The purpose is to compare retrieval quality and operational behavior across RAG backends while keeping the embedding boundary explicit.",
    targetModels: `The target set is ${result.runs.length} backend configuration(s). Self-managed stores use one fixed local embedding model (\`${result.runs.find((run) => run.backend.embeddingCoupling === "fixed")?.embeddingModel ?? "n/a"}\`), while fully-managed rows measure the whole managed stack.`,
    targetMetrics: `Retrieval quality is recall@${result.runs[0]?.k ?? 3}, nDCG@${result.runs[0]?.k ?? 3}, and MRR against the committed qrels, shown as value ± 95% confidence interval over ${result.dataset.queries.length} queries. Operational measurements are ingest time and query latency p50/p95, shown as mean ± sample standard deviation across ${result.trials} trial(s), plus measured scale and estimated cost.`,
    scopeAndConstraints: `- The committed report is generated by the keyless fixture path as a CI self-test. Real runs use the same dataset, scoring, and renderer, but timings depend on the machine and network.
- Fully-managed backends measure the whole stack; a credential-absent run renders their card \`fixtured\`, never faked.
- The miniature dataset is intended to verify the harness and metric calculations; it is not a statistical claim about backend quality at production scale.`,
    verificationResults: `| Backend | Kind | Embedding | Store isolated | Provenance | Recall@k (95% CI) | nDCG@k (95% CI) | MRR (95% CI) | Ingest ms (mean±sd) | Query p50 ms (mean±sd) | Query p95 ms (mean±sd) | Cost | Cost note |
| ------- | ---- | --------- | -------------- | ---------- | -------- | ------ | --- | --------- | ------------ | ------------ | ---- | --------- |
${rows}

${historyCharts}`,
    analysis: backendNotes,
    reproductionSteps: `\`\`\`sh
cd packages/tech
npm install

npm run rag:fixture
npm run rag
npm run rag:estimate
\`\`\``,
    reproductionCost:
      "`rag:fixture` is keyless and costless. `rag:estimate` previews the credentialed/provider path. `npm run rag` may use local compute and any configured managed-backend credentials.",
    cleanup:
      "The local fixture path creates no external resources. Managed-backend real runs must clean up provider resources; the RAG runner includes teardown and `npm run rag:sweep` for orphan checks.",
    verificationData: `**Dataset.** The benchmark uses ${result.dataset.name} (\`${result.dataset.id}\`). Source: ${result.dataset.source}. License note: ${sentence(result.dataset.license)} The run contains ${result.dataset.documents.length} documents, ${result.dataset.queries.length} queries, and ${result.dataset.qrels.length} relevance judgments.

The complete run record is committed as [\`${result.artifactPath}\`](./${result.artifactPath}). It contains the dataset rows, backend registry facts, query-level results, retrieval metrics, operational timings, provenance, and generated timestamp.

Generated: ${result.generatedAt}`,
  });
};
