import type {
  Aggregate,
  ComparisonResult,
  ConfigRun,
  Provenance,
  Review,
  TrialResult,
} from "./types";
import { buildThroughputPrompt } from "./throughput";
import { buildSchemaPrompt } from "./json-schema";
import { buildLengthPrompt } from "./length-accuracy";

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

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const usd = (n: number): string => `$${n.toFixed(2)}`;

const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;

const notMeasured = (p: Provenance): string =>
  p === "error" ? "n/a (error)" : "n/a (fixtured)";

const measured = (run: ConfigRun, value: string): string =>
  run.provenance === "measured" ? value : notMeasured(run.provenance);

// "14.4 ± 2.2" — a mean with its sample spread, at a fixed precision.
const meanSd = (a: Aggregate, digits: number): string =>
  `${a.mean.toFixed(digits)} ± ${a.stdDev.toFixed(digits)}`;

// "12.0–16.0" — the observed extent.
const range = (a: Aggregate, digits: number): string =>
  `${a.min.toFixed(digits)}–${a.max.toFixed(digits)}`;

// A stable anchor/key for a configuration (model slug + effort level).
const configKey = (run: ConfigRun): string => `${run.id}-${run.effort}`;

// --- headline comparison table -----------------------------------------------

const comparisonTable = (configs: ReadonlyArray<ConfigRun>): string => {
  const header =
    "| Provider | Model | Tier | Effort | Cost (in / out per MTok) | Throughput (tok/s) | TTFT (ms) | Total latency (ms) | Max schema complexity | Length accuracy |\n" +
    "| -------- | ----- | ---- | ------ | ------------------------ | ------------------ | --------- | ------------------ | --------------------- | --------------- |";
  const rows = configs.map((run) => {
    const s = run.stats;
    return (
      `| ${escapeCell(run.provider)} | ${escapeCell(run.modelName)} | ${run.tier} | ` +
      `${escapeCell(run.effort)} | ${usd(run.inputCostPerMTok)} / ${usd(run.outputCostPerMTok)} | ` +
      `${measured(run, s.throughputTokensPerSec.mean.toFixed(0))} | ` +
      `${measured(run, s.ttftMs.mean.toFixed(0))} | ` +
      `${measured(run, s.totalLatencyMs.mean.toFixed(0))} | ` +
      `${measured(run, s.maxSchemaComplexity.mean.toFixed(1))} | ` +
      `${measured(run, pct(s.lengthAccuracy.mean))} |`
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
    title: "Sustained throughput (tokens / second during generation)",
    digits: 1,
    format: (a) => `${a.mean.toFixed(0)} tok/s`,
    better: "higher",
  },
  {
    key: "ttftMs",
    title: "Latency — time to first token (ms)",
    digits: 0,
    format: (a) => `${a.mean.toFixed(0)} ms`,
    better: "lower",
  },
  {
    key: "totalLatencyMs",
    title: "Latency — total response time (ms)",
    digits: 0,
    format: (a) => `${a.mean.toFixed(0)} ms`,
    better: "lower",
  },
  {
    key: "maxSchemaComplexity",
    title: "Tested maximum JSON-schema complexity",
    digits: 1,
    format: (a) => a.mean.toFixed(1),
    better: "higher",
  },
  {
    key: "lengthAccuracy",
    title: "Length-instruction accuracy",
    digits: 3,
    format: (a) => pct(a.mean),
    better: "higher",
  },
];

const label = (run: ConfigRun): string =>
  `${escapeCell(run.modelName)} [${escapeCell(run.effort)}]`;

const aspectSentence = (
  aspect: Aspect,
  measuredRuns: ReadonlyArray<ConfigRun>,
): string => {
  if (measuredRuns.length === 0) {
    return "No live measurements in this run — every configuration was fixtured or errored, so this aspect has no comparison.";
  }
  const value = (run: ConfigRun): number => run.stats[aspect.key].mean;
  const sorted = [...measuredRuns].sort((a, b) =>
    aspect.better === "higher" ? value(b) - value(a) : value(a) - value(b),
  );
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const dir = aspect.better === "higher" ? "Best" : "Fastest / lowest";
  return (
    `${dir} of the ${measuredRuns.length} measured configuration(s): ` +
    `**${label(best)}** at ${aspect.format(best.stats[aspect.key])}; ` +
    `other end: ${label(worst)} at ${aspect.format(worst.stats[aspect.key])}.`
  );
};

const aspectSection = (
  aspect: Aspect,
  configs: ReadonlyArray<ConfigRun>,
  measuredRuns: ReadonlyArray<ConfigRun>,
): string => {
  const header =
    "| Configuration | Mean ± SD | Min–Max | n |\n| ------------- | --------- | ------- | - |";
  const rows = configs.map((run) => {
    const a = run.stats[aspect.key];
    return (
      `| ${label(run)} | ${measured(run, meanSd(a, aspect.digits))} | ` +
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
    return `${head}\n\n**Best for:** ${escapeCell(r.bestFor)}${reviewProvenanceNote(r)}`;
  }
  return (
    `${head}${reviewProvenanceNote(r)}\n\n` +
    `- **Strengths:** ${escapeCell(r.strengths)}\n` +
    `- **Weaknesses:** ${escapeCell(r.weaknesses)}\n` +
    `- **Best for:** ${escapeCell(r.bestFor)}`
  );
};

const reviewsSection = (
  configs: ReadonlyArray<ConfigRun>,
  detail: DetailLevel,
): string =>
  `## Per-configuration developer reviews\n\n` +
  `Each review is written by the LLM judge (\`${escapeCell(configs[0]?.review.judgeModel ?? "n/a")}\`) ` +
  `from the configuration's actual trial outputs and measured metrics.\n\n` +
  configs.map((run) => reviewBlock(run, detail)).join("\n\n");

// --- per-trial detail (full only) --------------------------------------------

const perTrialTable = (run: ConfigRun): string => {
  const okTrials = run.trials.filter((t: TrialResult) => t.ok);
  if (okTrials.length === 0) {
    return "";
  }
  const header =
    "| Trial | Throughput (tok/s) | TTFT (ms) | Total (ms) | Max schema | Length acc |\n" +
    "| ----- | ------------------ | --------- | ---------- | ---------- | ---------- |";
  const rows = okTrials.map(
    (t) =>
      `| ${t.trial} | ${t.metrics.throughputTokensPerSec.toFixed(0)} | ` +
      `${t.metrics.ttftMs.toFixed(0)} | ${t.metrics.totalLatencyMs.toFixed(0)} | ` +
      `${t.metrics.maxSchemaComplexity} | ${pct(t.metrics.lengthAccuracy)} |`,
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
  const deepestRung =
    result.probe.schemaLadder[result.probe.schemaLadder.length - 1];
  const schemaPrompt = deepestRung ? buildSchemaPrompt(deepestRung) : "(none)";

  return `## Data transparency

The exact prompts and every trial's verbatim raw output are preserved so the
result can be re-checked, not just trusted, and so a report can be regenerated at
any detail level from the artifact alone.

**Throughput probe** (streamed long generation; sustained tok/s is measured over
the generation window, excluding time-to-first-token):

\`\`\`text
${throughputPrompt}
\`\`\`

**Latency probe** (streamed short prompt; TTFT + total response time):

\`\`\`text
${escapeCell(result.probe.latencyPrompt)}
\`\`\`

**Schema-complexity probe** (structured-output mode; the deepest rung asks for):

\`\`\`text
${schemaPrompt}
\`\`\`

**Length probe:**

\`\`\`text
${lengthPrompt}
\`\`\`

**Complete raw record.** Every configuration, trial, and call — prompt, verbatim
output, token counts, TTFT, per-rung schema conformance, and the judge review —
is committed alongside this page as a JSON run-artifact:
[\`${escapeCell(result.artifactPath)}\`](./${escapeCell(result.artifactPath)}).
This page is a rendering of that record; the artifact is the source of truth.`;
};

// --- cost & time -------------------------------------------------------------

const costSection = (result: ComparisonResult): string => {
  const e = result.estimate;
  return `## Cost & time

A full real sweep of this matrix is **${e.configCount} configurations** (model ×
effort) × the four probes × **${result.trials} trials**, plus one judge call per
configuration — about **${e.callCount} API calls**. The runner prints an
**estimated** call count, rough USD cost (~${usd(e.usdCost)}), and ETA
(~${e.etaMinutes.toFixed(0)} min) *before* making any call, and supports a
\`--estimate\` dry run that prints the estimate without calling any provider. The
estimate uses rough per-call token assumptions; **actual** token usage is captured
per call in the run-artifact. CI never runs the real sweep — only the keyless
\`compare:fixture\` self-test.`;
};

// --- the page ----------------------------------------------------------------

export const renderComparisonReport = (
  result: ComparisonResult,
  detail: DetailLevel = "standard",
): string => {
  const configs = result.configs;
  const measuredRuns = configs.filter((r) => r.provenance === "measured");
  const anyNonMeasured = configs.some((r) => r.provenance !== "measured");
  const providers = [...new Set(configs.map((r) => r.provider))].length;
  const models = [...new Set(configs.map((r) => r.id))].length;
  const ladder = result.probe.schemaLadder
    .map((c) => `${c.depth}×${c.breadth}`)
    .join(", ");

  const aspects =
    detail === "summary"
      ? ""
      : `\n## Per-aspect analysis\n\nEach aspect as a distribution across the configurations — mean ± sample standard\ndeviation, the observed min–max, and the number of contributing trials.\n\n${ASPECTS.map(
          (a) => aspectSection(a, configs, measuredRuns),
        ).join("\n\n")}\n`;

  const perTrial = detail === "full" ? `\n${perTrialSection(configs)}\n` : "";

  return `---
title: Fundamental LLM model comparison
description: A reproducible, cited comparison of ${models} large language models across ${providers} providers over ${configs.length} model×effort configurations — sustained throughput and latency measured separately, empirically tested JSON-schema complexity, length-instruction accuracy, and a per-configuration LLM-judge developer review, each over ${result.trials} trials.
---

# Fundamental LLM model comparison

A routine, reproducible snapshot of how current large language models from
Anthropic, OpenAI, and Google behave across a **matrix of configurations**: each
model is swept over every one of its **effort levels**, and each configuration is
measured on four narrow, auto-gradable behaviors over **${result.trials} trials**,
then read by an LLM judge that writes a developer-facing review. Curated catalog
facts (provider, model, tier, cost, effort levels) stay separated from measured
behavior by the type system.

## Methodology

**Configurations.** ${models} models across ${providers} providers, each swept
over its effort levels — ${configs.length} model×effort configurations. Effort maps
to each provider's own reasoning knob (Anthropic \`output_config.effort\`, OpenAI
\`reasoning_effort\`, Google thinking budget); a level a model does not support is
flagged, never faked.

**Trials & statistics.** Every probe runs **${result.trials} times** per
configuration; the per-trial values are reduced to a **mean and sample standard
deviation** (Bessel's n−1) by the pure functions in
\`packages/tech/src/llm-model-comparison/domain/aggregate.ts\`. A failed trial is
excluded from the aggregates, never counted as a zero, and \`n\` is reported
alongside every mean.

**Probes.** Each configuration is sent four probes through a provider-neutral
\`CompletionClient\` anti-corruption layer in \`packages/tech/src/vendors/llm/\`:

- **Throughput** — a long streamed generation; **sustained tokens/second during
  generation** (output tokens over \`total − time-to-first-token\`). This is
  generation speed, not round-trip latency.
- **Latency** — a short streamed prompt; **time-to-first-token and total response
  time**, reported separately from throughput.
- **JSON-schema complexity** — the provider's **structured-output mode** is driven
  up an escalation ladder over depth × breadth (${ladder}); the **maximum
  complexity that still returns schema-conforming output** is recorded — the
  tested affordance, not the paper spec.
- **Length accuracy** — a paragraph of exactly ${result.probe.lengthTargetWords}
  words on "${escapeCell(result.probe.lengthTopic)}"; accuracy is
  \`1 - min(1, |actual - target| / target)\`.

Every grader is pure and unit-tested in
\`packages/tech/src/llm-model-comparison/domain/\`.

\`\`\`mermaid
flowchart LR
  R[Curated registry: models.ts] --> M[Model × effort matrix]
  M --> P[Live probes x ${result.trials} trials]
  P --> G[Pure graders + statistics in domain/]
  G --> J[LLM judge: per-config review]
  G --> A[Complete raw JSON artifact]
  G --> T[Tables + distributions]
  J --> Page[Result page]
  T --> Page
\`\`\`

_Diagram: the curated registry expands into a model×effort matrix; the live
per-trial probes are reduced by the pure graders and statistics, reviewed by the
judge, and rendered both as this page and as the complete raw JSON artifact._

${costSection(result)}

## Comparison

${comparisonTable(configs)}

**Legend.** Provider, Model, Tier, Effort, and Cost are **curated** catalog data
(cited). Throughput, TTFT, total latency, max schema complexity, and length
accuracy are **measured** live, each a mean over ${result.trials} trials. A cell
reading \`n/a (fixtured)\` was produced by the deterministic fixture client (no
API key) and is **not** a live measurement; \`n/a (error)\` means every trial for
that configuration failed. Provenance is stated in words, never by colour.
${aspects}
${reviewsSection(configs, detail)}
${perTrial}
${transparencySection(result)}

## Scope & limitations

This is a deliberately narrow probe set, not an exhaustive evaluation suite:

- **${result.trials} trials** per configuration×probe — a small sample, enough for
  a mean and rough spread, not a rigorous statistical study.
- **Point-in-time.** The measured behavior reflects the models and APIs on the
  date below; the curated facts reflect their cited sources on that date.
- The four probes test narrow behaviors (generation throughput, responsiveness,
  structured-output complexity, length-instruction following) — they do **not**
  measure general capability or reasoning quality.
- **Effort semantics vary by provider** — a reasoning-effort enum on one, a
  thinking-token budget on another, none on the Realtime surface — so an effort
  level is comparable within a provider more readily than across providers.
${
  anyNonMeasured
    ? "- **This run includes non-measured configurations.** A provider with no API key is a deterministic fixture stand-in flagged `n/a (fixtured)`; a configuration whose every trial failed is flagged `n/a (error)`. Neither is a live measurement.\n"
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
