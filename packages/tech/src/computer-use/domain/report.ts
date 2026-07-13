import { renderEnglishResearchArticle } from "../../research/domain/article-outline";
import { TASK_SUITE } from "./manifest";
import type { ComputerUseModelRun, ComputerUseResult, Stat } from "./types";

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;

const ms = (value: number): string => `${value.toFixed(0)} ms`;

const secs = (value: number): string => `${(value / 1000).toFixed(1)} s`;

const usd = (value: number): string => `$${value.toFixed(3)}`;

const steps = (value: number): string => value.toFixed(1);

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
  value: (run: ComputerUseModelRun) => number;
  format: (value: number) => string;
}>;

// The §4 overview stays decision-relevant and concise: the headline metrics only.
// Per-action latency and recovery rate are in the §7 per-model table.
const OVERVIEW_ASPECTS: ReadonlyArray<Aspect> = [
  {
    title: "Task success rate",
    better: "higher",
    value: (run) => run.stats.taskSuccessRate.mean,
    format: pct,
  },
  {
    title: "Steps to complete",
    better: "lower",
    value: (run) => run.stats.stepsToComplete.mean,
    format: steps,
  },
  {
    title: "Wall-clock per task",
    better: "lower",
    value: (run) => run.stats.wallClockPerTaskMs.mean,
    format: secs,
  },
  {
    title: "Cost per task",
    better: "lower",
    value: (run) => run.stats.costPerTaskUsd.mean,
    format: usd,
  },
];

const overviewSection = (result: ComputerUseResult): string => {
  const measured = result.runs.filter((run) => run.provenance === "measured");
  const counts = `This run has **${measured.length} measured** of ${result.runs.length} subject rows (non-measured rows are \`fixtured\` harness checks or \`error\` rows, never faked numbers). Every subject is driven through the same fixed harness (${escapeCell(result.harness)}); the only variable is the model/tool.`;
  if (measured.length === 0) {
    return `${counts}

There are no measured values to summarize; the committed fixture page proves the scoring pipeline end to end. The per-subject and per-task records are in section 7, Verification Data.`;
  }
  const rows = OVERVIEW_ASPECTS.map((aspect) => {
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
      `| ${aspect.title} | ${aspect.format(aspect.value(best))} — ${escapeCell(best.modelName)} | ` +
      `${aspect.format(medianOf(measured.map(aspect.value)))} | ${aspect.format(aspect.value(worst))} |`
    );
  });
  return `${counts}

| Metric | Best (subject) | Median | Worst |
| ------ | -------------- | ------ | ----- |
${rows.join("\n")}

"Best"/"Worst" follow each metric's own direction (higher success is better; lower steps, wall-clock, and cost are better). Per-action latency and recovery rate are in the section 7 per-subject table.`;
};

const modelTable = (result: ComputerUseResult): string => {
  const header =
    "| Subject | Provider | Provenance | Tool | Token price in/out (USD/MTok) | Success | Steps | Latency/action | Wall-clock/task | Cost/task | Recovery | Note |\n" +
    "| ------- | -------- | ---------- | ---- | ----------------------------- | ------- | ----- | -------------- | --------------- | --------- | -------- | ---- |";
  const rows = result.runs.map(
    (run) =>
      `| ${escapeCell(run.modelName)} | ${run.provider} | ${run.provenance} | \`${escapeCell(run.toolVersion)}\` | ` +
      `${run.inputCostPerMTok} / ${run.outputCostPerMTok} | ` +
      `${statCell(run.stats.taskSuccessRate, pct)} | ` +
      `${statCell(run.stats.stepsToComplete, steps)} | ` +
      `${statCell(run.stats.latencyPerActionMs, ms)} | ` +
      `${statCell(run.stats.wallClockPerTaskMs, secs)} | ` +
      `${statCell(run.stats.costPerTaskUsd, usd)} | ` +
      `${statCell(run.stats.recoveryRate, pct)} | ${escapeCell(run.error ?? "")} |`,
  );
  return `${header}\n${rows.join("\n")}`;
};

const suiteTable = (): string => {
  const header =
    "| Task id | Category | Optimal steps | Success predicate |\n| ------- | -------- | ------------- | ----------------- |";
  const rows = TASK_SUITE.tasks.map(
    (task) =>
      `| ${task.id} | ${task.category} | ${task.optimalSteps} | ${escapeCell(`${task.successPredicate.kind}: ${task.successPredicate.detail}`)} |`,
  );
  return `${header}\n${rows.join("\n")}`;
};

const nonSubjectLines = (result: ComputerUseResult): string =>
  result.nonSubjects
    .map(
      (entry) =>
        `- **${escapeCell(entry.providerName)}** is not a subject: it ${entry.reason} (verified ${entry.lastVerified}).`,
    )
    .join("\n");

export const renderComputerUseReport = (result: ComputerUseResult): string =>
  renderEnglishResearchArticle({
    // Sidebar-page title: must equal the topic's sidebar label (source.text in
    // site.ts) — published pages carry title == sidebar label by policy.
    title: "Computer use",
    description:
      "A reproducible comparison of API-native computer-use agents — task success, steps, latency, wall-clock, and per-task cost over a pinned deterministic browser-task suite, every subject driven through one fixed Playwright harness.",
    introduction:
      "This report compares computer-use models by **mechanically verifiable** task outcomes only — each subject drives the same fixed browser harness over a pinned task suite, and success is decided by a declarative predicate against the final page state; no aesthetic or trajectory-opinion judgement enters the scores.",
    purpose:
      "The purpose is to record which API-native computer-use tools exist, how reliably each completes a fixed set of browser tasks, how many steps and how much wall-clock a solve takes, and what one task costs — the properties that decide whether a provider's agent can be integrated for real web work.",
    targetModels: `The subjects are the ${result.runs.length} API-native computer-use tools in the curated registry (\`packages/tech/src/computer-use/models.ts\`), one configuration per provider, each with a cited source and last-verified date. All are driven through the same fixed harness (${escapeCell(result.harness)}) so the only variable is the model/tool.

${nonSubjectLines(result)}`,
    targetMetrics:
      "Measured metrics are task success rate (satisfied predicates / attempts, higher is better), steps to complete (actions per successful attempt, lower is better), per-action latency (ms, lower is better), wall-clock per task (s, lower is better), cost per task (USD from token usage, lower is better), and recovery rate (attempts needing a recovery / attempts, lower is better — a secondary robustness signal).",
    scopeAndConstraints: `- **Predicate-decided, never judged.** Each task's success is a declarative check against the final DOM/URL (a URL suffix, present text, an input value, an element count); no LLM-as-judge and no aesthetic score. Changing the suite is a version bump.
- Task suite version \`${result.suiteVersion}\`: ${TASK_SUITE.tasks.length} tasks over a pinned, self-contained fixture site (\`${escapeCell(TASK_SUITE.siteBase)}\`). Public suites (OSWorld 2.0, WebArena, WebVoyager) are the reference our metric definitions follow; v1 pins its own deterministic suite because live-site and fragmented-variant suites are not themselves reproducible. History connects same-suite-version, same-harness points only.
- **Browser-only, one config per provider.** Desktop-OS (OSWorld) and mobile (AndroidWorld) tasks are out of scope for v1, as is a second DOM-first harness (browser-use).
- The fixture path is keyless and deterministic and never launches a browser; real, discriminating numbers appear only after an owner runs the real path within the approved cost ceiling (run \`--estimate\` first).
- Point-in-time: measured behavior reflects the models, tools, and APIs at \`${result.generatedAt}\`; catalog token prices are as of each row's last-verified date.`,
    verificationResults: overviewSection(result),
    analysis: result.runs.some((run) => run.provenance === "measured")
      ? "Rows with `measured` provenance can be compared on success, steps, latency, wall-clock, and cost. A high success rate with many steps or high wall-clock localizes a model that gets there slowly; a low success rate with low cost is a model that gives up cheaply. Recovery rate separates models that self-correct from those that fail on the first misstep."
      : "This run has no measured rows; every subject was fixtured or errored, so no cross-model claim is made. The committed fixture page exists to prove the pipeline, not to compare models. On the real path, a subject whose harness loop is not yet wired records an honest `error` row rather than a fabricated score.",
    reproductionSteps: `\`\`\`sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (deterministic fixture client; no browser, no key):
npm run research -- computer-use --fixture

# Cost preview, then the owner-gated real run:
npm run research -- computer-use --estimate
npm run research -- computer-use --real
\`\`\``,
    reproductionCost:
      "The fixture path is keyless and costless. A real trial bills each provider at the underlying model's token rates (no separate per-action fee); screenshots dominate the input side across a multi-turn loop. The agreed ceiling is $40 per trial and `--estimate` must run first.",
    cleanup:
      "No external resources are created. The browser session is ephemeral and screenshots are held in memory for the loop and discarded; the run writes only the local Markdown/JSON artifacts — review them before committing.",
    verificationData: `**Per-subject results**

${modelTable(result)}

**Task suite (version ${result.suiteVersion}, site \`${escapeCell(TASK_SUITE.siteBase)}\`)**

${suiteTable()}

**Harness.** Every subject was driven through ${escapeCell(result.harness)}; each attempt's full action trajectory, timings, and token usage are preserved verbatim in the artifact.

The complete run record is committed as [\`${escapeCell(result.artifactPath)}\`](./${escapeCell(result.artifactPath)}): per-attempt trajectories, per-action latencies, token counts, and scores.

Generated: ${result.generatedAt}`,
  });
