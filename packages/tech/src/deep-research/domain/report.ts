import { renderEnglishResearchArticle } from "../../research/domain/article-outline";
import { QUESTION_MANIFEST } from "./manifest";
import type { DeepResearchResult, Stat, SubjectRun } from "./types";

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;
const usd = (value: number): string => `$${value.toFixed(2)}`;
const secs = (value: number): string => `${(value / 1000).toFixed(1)} s`;
const num = (value: number): string => value.toFixed(1);

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
  value: (run: SubjectRun) => number;
  format: (value: number) => string;
}>;

const ASPECTS: ReadonlyArray<Aspect> = [
  {
    title: "Answer quality (rubric)",
    better: "higher",
    value: (run) => run.stats.answerQuality.mean,
    format: pct,
  },
  {
    title: "Citation validity",
    better: "higher",
    value: (run) => run.stats.citationValidity.mean,
    format: pct,
  },
  {
    title: "Source diversity",
    better: "higher",
    value: (run) => run.stats.sourceDiversity.mean,
    format: num,
  },
  {
    title: "Latency",
    better: "lower",
    value: (run) => run.stats.latencyMs.mean,
    format: secs,
  },
  {
    title: "Cost per query",
    better: "lower",
    value: (run) => run.stats.costUsd.mean,
    format: usd,
  },
];

const overviewSection = (result: DeepResearchResult): string => {
  const measured = result.runs.filter((run) => run.provenance === "measured");
  const counts = `This run has **${measured.length} measured** of ${result.runs.length} subject rows (non-measured rows are \`fixtured\` harness checks or \`error\` rows, never faked numbers).`;
  if (measured.length === 0) {
    return `${counts}

There are no measured values to summarize; the committed fixture page proves the harness end to end. The per-subject table is in section 7, Verification Data.`;
  }
  const rows = ASPECTS.map((aspect) => {
    const sorted = [...measured].sort((a, b) =>
      aspect.better === "higher"
        ? aspect.value(b) - aspect.value(a)
        : aspect.value(a) - aspect.value(b),
    );
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best === undefined || worst === undefined) {
      return `| ${aspect.title} | n/a | n/a | n/a |`;
    }
    return (
      `| ${aspect.title} | ${aspect.format(aspect.value(best))} — ${escapeCell(best.displayName)} | ` +
      `${aspect.format(medianOf(measured.map(aspect.value)))} | ${aspect.format(aspect.value(worst))} |`
    );
  });
  return `${counts}

| Metric | Best (subject) | Median | Worst |
| ------ | -------------- | ------ | ----- |
${rows.join("\n")}

"Best"/"Worst" follow each metric's own direction (higher quality/validity/diversity is better; lower latency and cost are better). The full per-subject and per-question records are in section 7, Verification Data.`;
};

const subjectTable = (result: DeepResearchResult): string => {
  const header =
    "| Subject | Provider | Provenance | Quality (mean±sd) | Citation validity | Source diversity | Latency | Cost/query | Note |\n" +
    "| ------- | -------- | ---------- | ----------------- | ----------------- | ---------------- | ------- | ---------- | ---- |";
  const rows = result.runs.map(
    (run) =>
      `| ${escapeCell(run.displayName)}${run.baseline ? " _(baseline)_" : ""} | ${run.provider} | ${run.provenance} | ` +
      `${statCell(run.stats.answerQuality, pct)} | ` +
      `${statCell(run.stats.citationValidity, pct)} | ` +
      `${statCell(run.stats.sourceDiversity, num)} | ` +
      `${statCell(run.stats.latencyMs, (v) => secs(v))} | ` +
      `${statCell(run.stats.costUsd, usd)} | ${escapeCell(run.error ?? "")} |`,
  );
  return `${header}\n${rows.join("\n")}`;
};

const manifestTable = (): string => {
  const header =
    "| Question id | Rubric size | Prompt |\n| ----------- | ----------- | ------ |";
  const rows = QUESTION_MANIFEST.questions.map(
    (question) =>
      `| ${question.id} | ${question.rubric.length} | ${escapeCell(question.prompt)} |`,
  );
  return `${header}\n${rows.join("\n")}`;
};

export const renderDeepResearchReport = (result: DeepResearchResult): string =>
  renderEnglishResearchArticle({
    title: "Deep research APIs",
    description:
      "A reproducible comparison of autonomous deep-research API endpoints — rubric answer quality, citation validity, source diversity, latency, and per-query cost — held against a transparent Anthropic build-your-own baseline.",
    introduction:
      "This report compares autonomous **deep-research** endpoints — where one question triggers a multi-minute plan-search-read-synthesize loop that returns a cited report — by **mechanically verifiable** behavior only: a fixed LLM judge answers a deterministic yes/no rubric per report and checks sampled citations; no aesthetic opinion enters the scores.",
    purpose:
      "The purpose is to record which deep-research endpoints exist, how trustworthy and well-cited their reports are, how long they take, and what one query costs — and whether any turnkey product beats an agentic loop we can build ourselves (the Anthropic baseline).",
    targetModels: `The subjects are the ${result.runs.length} deep-research endpoints in the curated registry (\`packages/tech/src/deep-research/models.ts\`), each with a cited source and last-verified date. One subject, the Anthropic build-your-own loop (Claude + \`web_search\`), is the transparent in-house **baseline** the turnkey products are measured against.`,
    targetMetrics:
      "Measured metrics are answer quality against a per-question rubric (satisfied items / total, higher is better), citation validity (resolving, claim-supporting citations / checked, higher is better), source diversity (distinct cited domains, higher is better), latency (seconds end-to-end, lower is better), and cost per query (USD, lower is better).",
    scopeAndConstraints: `- **Judged, but rubric-constrained.** A fixed LLM judge (\`${escapeCell(result.judgeModel)}\`) answers deterministic yes/no questions and checks citations; it never scores prose style. Swapping the judge is an instrument change, not a routine update.
- Question manifest version \`${result.manifestVersion}\`: ${QUESTION_MANIFEST.questions.length} domain-neutral, well-documented research questions chosen for checkable, reproducible answers. History connects same-manifest-version points only.
- **Report text is not committed.** The artifact records report length, timing, cost, citation domains, judge answers, and scores — enough to regenerate this page — never the full report bodies.
- The fixture path is keyless and deterministic; real numbers appear only after an owner runs the real path within the approved cost ceiling (run \`--estimate\` first).
- Point-in-time: measured behavior reflects the endpoints and APIs at \`${result.generatedAt}\`; reference per-query prices are as of each row's last-verified date.`,
    verificationResults: overviewSection(result),
    analysis: result.runs.some((run) => run.provenance === "measured")
      ? "Rows with `measured` provenance can be compared on quality, citation integrity, diversity, latency, and cost. Reading answer quality against citation validity localizes the failure mode that most distinguishes deep-research products — a fluent report with unsupported citations scores high on quality but low on validity. The Anthropic baseline row anchors whether a turnkey endpoint's premium buys better research than a loop we can run ourselves."
      : "This run has no measured rows; every subject was fixtured or errored, so no cross-subject claim is made. The committed fixture page exists to prove the pipeline, not to compare subjects.",
    reproductionSteps: `\`\`\`sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (deterministic fixture clients):
npm run research -- deep-research --fixture

# Cost preview, then the owner-gated real run:
npm run research -- deep-research --estimate
npm run research -- deep-research --real
\`\`\``,
    reproductionCost:
      "The fixture path is keyless and costless. A real trial bills each provider per deep-research query (see the per-subject reference prices) plus the LLM-judge reads; deep-research queries are far costlier and slower than single completions, so `--estimate` must run first and an estimate above the agreed ceiling stops for re-approval.",
    cleanup:
      "No external resources are created. Reports are held in memory for judging and discarded; the run writes only the local Markdown/JSON artifacts — review them before committing.",
    verificationData: `**Per-subject results**

${subjectTable(result)}

**Question manifest (version ${result.manifestVersion})**

${manifestTable()}

**Judge provenance.** Every report was graded by \`${escapeCell(result.judgeModel)}\`; each call's rubric answers, citation checks, and citation domains are preserved verbatim in the artifact.

The complete run record is committed as [\`${escapeCell(result.artifactPath)}\`](./${escapeCell(result.artifactPath)}): per-call latencies, costs, citation domains, judge answers, and scores.

Generated: ${result.generatedAt}`,
  });
