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
    "| Provider | Model | Tier | Effort | Cost (in / out per MTok) | Throughput (tok/s) | TTFT (ms) | Total latency (ms) | Max schema depth | Max schema breadth | Length accuracy |\n" +
    "| -------- | ----- | ---- | ------ | ------------------------ | ------------------ | --------- | ------------------ | ---------------- | ------------------ | --------------- |";
  const rows = configs.map((run) => {
    const s = run.stats;
    return (
      `| ${escapeCell(run.provider)} | ${escapeCell(run.modelName)} | ${run.tier} | ` +
      `${escapeCell(run.effort)} | ${usd(run.inputCostPerMTok)} / ${usd(run.outputCostPerMTok)} | ` +
      `${measured(run, s.throughputTokensPerSec.mean.toFixed(0))} | ` +
      `${measured(run, s.ttftMs.mean.toFixed(0))} | ` +
      `${measured(run, s.totalLatencyMs.mean.toFixed(0))} | ` +
      `${measured(run, s.maxSchemaDepth.mean.toFixed(0))} | ` +
      `${measured(run, s.maxSchemaBreadth.mean.toFixed(0))} | ` +
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
    title: "Sustained throughput during generation",
    digits: 1,
    format: (a) => `${a.mean.toFixed(0)} tok/s`,
    better: "higher",
  },
  {
    key: "ttftMs",
    title: "Time to first token",
    digits: 0,
    format: (a) => `${a.mean.toFixed(0)} ms`,
    better: "lower",
  },
  {
    key: "totalLatencyMs",
    title: "Total response time",
    digits: 0,
    format: (a) => `${a.mean.toFixed(0)} ms`,
    better: "lower",
  },
  {
    key: "maxSchemaDepth",
    title: "Maximum schema nesting depth accepted",
    digits: 0,
    format: (a) => a.mean.toFixed(0),
    better: "higher",
  },
  {
    key: "maxSchemaBreadth",
    title: "Maximum schema field breadth accepted",
    digits: 0,
    format: (a) => a.mean.toFixed(0),
    better: "higher",
  },
  {
    key: "lengthAccuracy",
    title: "Length instruction accuracy",
    digits: 3,
    format: (a) => pct(a.mean),
    better: "higher",
  },
];

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
    "| Trial | Throughput (tok/s) | TTFT (ms) | Total (ms) | Max depth | Max breadth | Length acc |\n" +
    "| ----- | ------------------ | --------- | ---------- | --------- | ----------- | ---------- |";
  const rows = okTrials.map(
    (t) =>
      `| ${t.trial} | ${t.metrics.throughputTokensPerSec.toFixed(0)} | ` +
      `${t.metrics.ttftMs.toFixed(0)} | ${t.metrics.totalLatencyMs.toFixed(0)} | ` +
      `${t.metrics.maxSchemaDepth} | ${t.metrics.maxSchemaBreadth} | ${pct(t.metrics.lengthAccuracy)} |`,
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
effort) × the four probes × **${plural(result.trials, "trial")}**, plus one judge call per
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
      : `\n## Per-aspect measurements\n\nEach table reports the mean, sample standard deviation, observed min–max, and contributing trial count for one measured aspect.\n\n${ASPECTS.map(
          (a) => aspectSection(a, configs, measuredRuns),
        ).join("\n\n")}\n`;

  const perTrial = detail === "full" ? `\n${perTrialSection(configs)}\n` : "";

  return `---
title: LLM model comparison
description: A reproducible comparison of ${models} large language models across ${providers} providers and ${configs.length} model×effort configurations. The report separates curated catalog data from measured throughput, latency, JSON-schema limits, length-instruction accuracy, and LLM-judge review summaries over ${trialCount}.
---

# LLM model comparison

This report records one reproducible sweep of **${configs.length} model×effort
configurations** across ${models} models and ${providers} providers. For each
configuration, the runner measures four narrow behaviors over **${trialCount}**:
streamed generation throughput, response latency, JSON structured-output
limits, and adherence to an exact word-count instruction. A separate LLM judge
then summarizes the measured trial outputs for developer use.

The report separates curated catalog facts from measured behavior. Provider,
model, tier, price, and supported effort levels come from the model registry.
Throughput, latency, schema limits, and length accuracy come from the run artifact
linked below.

## Methodology

**Configurations.** The matrix contains ${models} models across ${providers}
providers and ${configs.length} model×effort configurations. Effort maps to each
provider's own reasoning control (Anthropic \`output_config.effort\`, OpenAI
\`reasoning_effort\`, Google thinking budget). Unsupported levels are marked as
unsupported rather than substituted.${noEffortText}

**Trials and statistics.** Every probe runs **${trialCount}** per
configuration. The pure functions in
\`packages/tech/src/llm-model-comparison/domain/aggregate.ts\` reduce successful
trial values to a mean and sample standard deviation (Bessel's n−1). Failed
trials are excluded from aggregates, not counted as zero, and each table reports
\`n\` beside the mean.

**Probes.** Each configuration is sent four probes through a provider-neutral
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
Throughput, TTFT, total latency, max schema depth, max schema breadth, and length
accuracy are measured values, each reported as a mean over ${trialCount}. Effort
\`n/a\` means the model has no user-selectable effort control. \`n/a (fixtured)\`
means the deterministic fixture client produced the metric cell because no API key
was used. \`n/a (error)\` means every trial for that
configuration failed. Provenance is written in the cell text rather than encoded
only by color.
${aspects}
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
- The four probes test narrow behaviors (generation throughput, responsiveness,
  structured-output complexity, length-instruction following) — they do **not**
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
