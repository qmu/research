import { renderEnglishResearchArticle } from "../../research/domain/article-outline";
import { PROBE_MANIFEST } from "./manifest";
import type { Stat, TrendModelRun, TrendRecencyResult } from "./types";

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;

const days = (value: number): string => `${value.toFixed(1)} d`;

const ms = (value: number): string => `${value.toFixed(0)} ms`;

const statCell = (stat: Stat, format: (value: number) => string): string =>
  stat.n === 0
    ? "not measured"
    : `${format(stat.mean)} ± ${format(stat.stdDev)} (n=${stat.n})`;

const medianOf = (values: ReadonlyArray<number>): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const lower = sorted[mid - 1];
  const upper = sorted[mid];
  if (upper === undefined) return 0;
  return sorted.length % 2 === 0 && lower !== undefined
    ? (lower + upper) / 2
    : upper;
};

type Aspect = Readonly<{
  title: string;
  better: "higher" | "lower";
  stat: (run: TrendModelRun) => Stat;
  format: (value: number) => string;
}>;

// §4 aspects follow each metric's own direction. Abstention rate is descriptive
// (an honest "I don't know" is neither win nor loss until the hallucination
// judge lands), so it stays in the §7 model table rather than being ranked here.
const ASPECTS: ReadonlyArray<Aspect> = [
  {
    title: "Recency accuracy",
    better: "higher",
    stat: (run) => run.stats.recencyAccuracy,
    format: pct,
  },
  {
    title: "Citation validity",
    better: "higher",
    stat: (run) => run.stats.citationValidity,
    format: pct,
  },
  {
    title: "Citation freshness",
    better: "lower",
    stat: (run) => run.stats.citationFreshnessDays,
    format: days,
  },
  {
    title: "Answer latency",
    better: "lower",
    stat: (run) => run.stats.latencyMs,
    format: ms,
  },
];

/**
 * The §4 overview: one aggregated row per metric over the measured models
 * (best model, median, worst). A run participates in a metric's row only when
 * it actually measured that metric (n > 0) — ungrounded controls, for example,
 * usually carry no dated citation, so they never fake a freshness of zero. The
 * per-model table lives in §7 Verification Data.
 */
const overviewSection = (result: TrendRecencyResult): string => {
  const measured = result.runs.filter((run) => run.provenance === "measured");
  const counts = `This run has **${measured.length} measured** of ${result.runs.length} subject rows (non-measured rows are \`fixtured\` harness checks or \`error\` rows, never faked numbers).`;
  if (measured.length === 0) {
    return `${counts}

There are no measured values to summarize; the committed fixture page proves the harness end to end. The per-subject table is in section 7, Verification Data.`;
  }
  const rows = ASPECTS.map((aspect) => {
    const eligible = measured.filter((run) => aspect.stat(run).n > 0);
    const sorted = [...eligible].sort((a, b) =>
      aspect.better === "higher"
        ? aspect.stat(b).mean - aspect.stat(a).mean
        : aspect.stat(a).mean - aspect.stat(b).mean,
    );
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best === undefined || worst === undefined) {
      return `| ${aspect.title} | n/a | n/a | n/a |`;
    }
    return (
      `| ${aspect.title} | ${aspect.format(aspect.stat(best).mean)} — ${escapeCell(best.modelName)} | ` +
      `${aspect.format(medianOf(eligible.map((run) => aspect.stat(run).mean)))} | ${aspect.format(aspect.stat(worst).mean)} |`
    );
  });
  return `${counts}

| Metric | Best (subject) | Median | Worst |
| ------ | -------------- | ------ | ----- |
${rows.join("\n")}

"Best"/"Worst" follow each metric's own direction (higher recency accuracy and citation validity are better; lower citation age and latency are better). The grounded-vs-control contrast — how much live retrieval adds over parametric memory — is read by comparing each grounded subject with its same-base-model ungrounded control in the section 7 table.`;
};

const modelTable = (result: TrendRecencyResult): string => {
  const header =
    "| Subject | Provider | Grounding | Provenance | Recency (mean±sd) | Abstention (mean±sd) | Citation validity (mean±sd) | Citation age (mean±sd) | Latency (mean±sd) | Search $/1k req | Note |\n" +
    "| ------- | -------- | --------- | ---------- | ----------------- | -------------------- | --------------------------- | ---------------------- | ----------------- | --------------- | ---- |";
  const rows = result.runs.map(
    (run) =>
      `| ${escapeCell(run.modelName)} | ${run.provider} | ${run.grounding} | ${run.provenance} | ` +
      `${statCell(run.stats.recencyAccuracy, pct)} | ` +
      `${statCell(run.stats.abstentionRate, pct)} | ` +
      `${statCell(run.stats.citationValidity, pct)} | ` +
      `${statCell(run.stats.citationFreshnessDays, days)} | ` +
      `${statCell(run.stats.latencyMs, (v) => v.toFixed(0))} | ` +
      `$${run.searchCostPerKRequestsUsd.toFixed(2)} | ${escapeCell(run.error ?? "")} |`,
  );
  return `${header}\n${rows.join("\n")}`;
};

const manifestTable = (): string => {
  const header =
    "| Probe id | Topic | Event date | Expected keywords |\n| -------- | ----- | ---------- | ----------------- |";
  const rows = PROBE_MANIFEST.probes.map(
    (probe) =>
      `| ${probe.id} | ${probe.topic} | ${probe.eventDateIso} | ${probe.expectedKeywords.length} |`,
  );
  return `${header}\n${rows.join("\n")}`;
};

export const renderTrendRecencyReport = (result: TrendRecencyResult): string =>
  renderEnglishResearchArticle({
    title: "Trend recency",
    description:
      "A reproducible comparison of search-augmented AI systems on web-grounded knowledge recency — how correctly each answers questions about recent real-world events, with citation validity, citation freshness, latency, and search-billing cost, against paired ungrounded controls.",
    introduction:
      "This report compares how well **search-augmented systems catch up to the present**: each subject answers the same recent-event probes, and every grounded subject is paired with an **ungrounded control** of the same base model, so the numbers isolate what live retrieval adds over parametric memory. All scores on this page are computed **mechanically** from the answer text and its citations — keyword-proxy recency, abstention, citation URL validity, and cited-source age; the semantic LLM-judge grade and the hallucination-rate metric arrive with a later instrument version.",
    purpose:
      "The purpose is to record which AI systems actually know what is happening right now — not what a model memorized at training time, but what it retrieves and correctly reports about events from the trailing window — and what that freshness costs in latency and search billing. The monthly series answers who is keeping up as the world moves, a question none of the other topics (speed, accuracy, availability, OCR, RAG) measures.",
    targetModels: `The subjects are the ${result.runs.length} configurations in the curated registry (\`packages/tech/src/trend-recency/models.ts\`): one search-augmented surface per provider (Grok with the Agent Tools web-search tool, Perplexity Sonar and Sonar Pro, Gemini with Google Search grounding, GPT with the web-search tool, Claude with the web-search tool), each — where the base model exists ungrounded — paired with a no-search control of the same model. Every row carries a cited source and last-verified date.`,
    targetMetrics: `Measured metrics are recency accuracy (fraction of trailing-window event probes answered with every expected keyword — the mechanical proxy for the semantic judge, higher is better), abstention rate (honest declines, descriptive), citation validity (fraction of returned citations with a well-formed http(s) URL — live resolution is a later instrument version, higher is better), citation freshness (median age in days of dated citations relative to the event, lower is better; a citation counts as dated when the provider returns a date or the cited URL embeds one, and rows whose citations carry neither are reported as not measured rather than as age zero), and answer latency (ms, lower is better). Search billing per 1000 requests is a curated reference column, refined by real trials.`,
    scopeAndConstraints: `- **Mechanical, not semantic (yet).** Scores read only the answer text and its citations; the LLM-judge recency grade and the hallucination-rate metric are a later instrument version, exactly as the SVG topic deferred its vision-judge metric.
- **Probe manifest version \`${result.manifestVersion}\`** (${PROBE_MANIFEST.probes.length} probes, ${result.windowDays}-day window). Each real trial draws a fresh probe set from events in the trailing window before it and commits that set — with its ground truth and the dated sources backing it — under \`docs/research-reports/trend-recency-history/\`, so the metric stays "events from the last ${result.windowDays} days relative to this trial" by construction and every trial is auditable. History/trend series connect same-instrument-version points only.
- **Paired controls.** Every grounded chat subject has an ungrounded control of the same base model; Perplexity Sonar is search-native and has no ungrounded twin.
- **Grounded tool wiring follows current provider documentation** (xAI Agent Tools \`web_search\`, Gemini \`googleSearch\`, OpenAI Responses \`web_search\`, Anthropic \`web_search\`). The 2026-07-17 first real trial verified the Gemini, OpenAI, and Anthropic wiring live and retired the xAI Live Search surface, which answered \`410 "Live search is deprecated"\`; that adapter was migrated to the Agent Tools \`web_search\` (Responses) surface and verified live on 2026-07-18, turning the Grok grounded row into a measured row. Perplexity Sonar and Sonar Pro remain error rows until \`PERPLEXITY_API_KEY\` is provisioned; no row is ever an assumed-working one.
- The fixture path is keyless and deterministic; real numbers appear only after an owner runs the real path within the approved ceiling ($30/trial — run \`--estimate\` first; search surcharges dominate).
- Point-in-time: measured behavior reflects the models, search products, and the web itself at \`${result.generatedAt}\`.`,
    verificationResults: overviewSection(result),
    analysis: result.runs.some((run) => run.provenance === "measured")
      ? "Rows with `measured` provenance can be compared on recency accuracy, citation validity, freshness, and latency; search billing is reference context. The paired-control design localizes the finding: a grounded subject beating its own control on recency accuracy shows live retrieval working, while a control matching its grounded twin means the events were already in parametric memory and the probe window should tighten."
      : "This run has no measured rows; every configuration was fixtured or errored, so no cross-system claim is made. The committed fixture page exists to prove the pipeline — including the grounded-vs-control separation the fixture client simulates — not to compare systems.",
    reproductionSteps: `\`\`\`sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (deterministic fixture client):
npm run research -- trend-recency --fixture

# Cost preview, then the owner-gated real run:
npm run research -- trend-recency --estimate
npm run research -- trend-recency --real
\`\`\``,
    reproductionCost:
      "The fixture path is keyless and costless. A real trial bills each provider for answer tokens PLUS its search surcharge (billed per request or per grounded query — the dominant cost); the agreed ceiling is $30 per trial and `--estimate` must run first. An estimate above the ceiling stops for re-approval.",
    cleanup:
      "No persistent provider resources are created. Answers and citations are scored in memory; the run writes only the local Markdown/JSON artifacts — review them before committing.",
    verificationData: `**Per-subject results**

${modelTable(result)}

**Probe manifest (version ${result.manifestVersion}, ${result.windowDays}-day window)**

${manifestTable()}

The complete run record is committed as [\`${escapeCell(result.artifactPath)}\`](./${escapeCell(result.artifactPath)}): per-call questions, answers, citations, latencies, output-token counts, and every score.

Generated: ${result.generatedAt}`,
  });
