import type {
  Aggregate,
  ComparisonResult,
  ModelRun,
  Provenance,
  TrialResult,
} from "./types";
import { buildNestedJsonPrompt } from "./nested-json";
import { buildLengthPrompt } from "./length-accuracy";

// Render the comparison result page as Markdown — a comprehensive, objective
// research report, not just a table. Provenance (curated / measured / fixtured /
// error) is conveyed by TEXT and a legend, never by colour, so the page inherits
// VitePress's WCAG-2.2-AA-compliant theme contrast with no custom low-contrast
// styling to get wrong. Every measured aspect is a mean over N trials reported
// with its spread; fixtured and failed rows are flagged and never shown as live;
// the exact prompts are quoted verbatim and the full per-trial raw capture is
// linked as a JSON artifact.

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const usd = (n: number): string => `$${n.toFixed(2)}`;

const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;

const notMeasured = (p: Provenance): string =>
  p === "error" ? "n/a (error)" : "n/a (fixtured)";

const measured = (run: ModelRun, value: string): string =>
  run.provenance === "measured" ? value : notMeasured(run.provenance);

// "14.4 ± 2.2" — a mean with its sample spread, at a fixed precision.
const meanSd = (a: Aggregate, digits: number): string =>
  `${a.mean.toFixed(digits)} ± ${a.stdDev.toFixed(digits)}`;

// "12.0–16.0" — the observed extent.
const range = (a: Aggregate, digits: number): string =>
  `${a.min.toFixed(digits)}–${a.max.toFixed(digits)}`;

// --- headline comparison table -----------------------------------------------

const comparisonTable = (runs: ReadonlyArray<ModelRun>): string => {
  const header =
    "| Provider | Model | Tier | Released | Cost (in / out per MTok) | Effort levels | Speed (mean) | Max JSON depth (mean) | Length accuracy (mean) |\n" +
    "| -------- | ----- | ---- | -------- | ------------------------ | ------------- | ------------ | --------------------- | ---------------------- |";
  const rows = runs.map((run) => {
    const s = run.stats;
    return (
      `| ${escapeCell(run.provider)} | ${escapeCell(run.modelName)} | ${run.tier} | ` +
      `${escapeCell(run.released)} | ${usd(run.inputCostPerMTok)} / ${usd(run.outputCostPerMTok)} | ` +
      `${escapeCell(run.effortLevels.join(", "))} | ` +
      `${measured(run, `${s.tokensPerSecond.mean.toFixed(1)} tok/s`)} | ` +
      `${measured(run, s.maxNestedJsonDepth.mean.toFixed(1))} | ` +
      `${measured(run, pct(s.lengthAccuracy.mean))} |`
    );
  });
  return `${header}\n${rows.join("\n")}`;
};

// --- per-aspect analysis -----------------------------------------------------

type Aspect = Readonly<{
  key: keyof ModelRun["stats"];
  title: string;
  digits: number;
  format: (a: Aggregate) => string; // headline value for the sentence
  better: "higher" | "lower";
}>;

const ASPECTS: ReadonlyArray<Aspect> = [
  {
    key: "tokensPerSecond",
    title: "Speed (output tokens / second)",
    digits: 1,
    format: (a) => `${a.mean.toFixed(1)} tok/s`,
    better: "higher",
  },
  {
    key: "maxNestedJsonDepth",
    title: "Maximum nested-JSON depth",
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

const aspectSentence = (
  aspect: Aspect,
  measuredRuns: ReadonlyArray<ModelRun>,
): string => {
  if (measuredRuns.length === 0) {
    return "No live measurements in this run — every model was fixtured or errored, so this aspect has no comparison.";
  }
  const value = (run: ModelRun): number => run.stats[aspect.key].mean;
  const sorted = [...measuredRuns].sort((a, b) =>
    aspect.better === "higher" ? value(b) - value(a) : value(a) - value(b),
  );
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  return (
    `Best of the ${measuredRuns.length} measured model(s): **${escapeCell(best.modelName)}** ` +
    `at ${aspect.format(best.stats[aspect.key])}; lowest: ${escapeCell(worst.modelName)} ` +
    `at ${aspect.format(worst.stats[aspect.key])}.`
  );
};

const aspectSection = (
  aspect: Aspect,
  runs: ReadonlyArray<ModelRun>,
  measuredRuns: ReadonlyArray<ModelRun>,
): string => {
  const header =
    "| Model | Mean ± SD | Min–Max | n |\n| ----- | --------- | ------- | - |";
  const rows = runs.map((run) => {
    const a = run.stats[aspect.key];
    return (
      `| ${escapeCell(run.modelName)} | ${measured(run, meanSd(a, aspect.digits))} | ` +
      `${measured(run, range(a, aspect.digits))} | ${measured(run, String(a.n))} |`
    );
  });
  return (
    `### ${aspect.title}\n\n${header}\n${rows.join("\n")}\n\n` +
    `${aspectSentence(aspect, measuredRuns)}`
  );
};

// --- per-model profiles ------------------------------------------------------

const profile = (run: ModelRun): string => {
  const s = run.stats;
  const curated =
    `- **Curated:** released ${escapeCell(run.released)}, cost ${usd(run.inputCostPerMTok)} / ` +
    `${usd(run.outputCostPerMTok)} per MTok, effort levels ${escapeCell(run.effortLevels.join(", "))}, ` +
    `[source](${escapeCell(run.source)}).`;
  const meas =
    run.provenance === "measured"
      ? `- **Measured (n=${s.tokensPerSecond.n}):** speed ${meanSd(s.tokensPerSecond, 1)} tok/s · ` +
        `max JSON depth ${meanSd(s.maxNestedJsonDepth, 1)} · length accuracy ${pct(s.lengthAccuracy.mean)} (± ${(s.lengthAccuracy.stdDev * 100).toFixed(0)} pts).`
      : run.provenance === "error"
        ? "- **Measured:** every trial failed for this model (`n/a (error)`); see the run-artifact for the errors."
        : "- **Measured:** fixtured — no live measurement (`n/a (fixtured)`).";
  return `### ${escapeCell(run.modelName)} — ${escapeCell(run.provider)} · ${run.tier}\n\n${curated}\n${meas}`;
};

// --- data transparency -------------------------------------------------------

const perTrialTable = (run: ModelRun): string => {
  const okTrials = run.trials.filter((t: TrialResult) => t.ok);
  if (okTrials.length === 0) {
    return "";
  }
  const header =
    "| Trial | Speed (tok/s) | Max JSON depth | Length accuracy |\n" +
    "| ----- | ------------- | -------------- | --------------- |";
  const rows = okTrials.map(
    (t) =>
      `| ${t.trial} | ${t.metrics.tokensPerSecond.toFixed(1)} | ` +
      `${t.metrics.maxNestedJsonDepth} | ${pct(t.metrics.lengthAccuracy)} |`,
  );
  return `#### ${escapeCell(run.modelName)}\n\n${header}\n${rows.join("\n")}`;
};

const transparencySection = (result: ComparisonResult): string => {
  const deepest = Math.max(...result.probe.depthLadder);
  const nestedPrompt = buildNestedJsonPrompt(deepest);
  const lengthPrompt = buildLengthPrompt(
    result.probe.lengthTargetWords,
    result.probe.lengthTopic,
  );
  const measuredRuns = result.runs.filter((r) => r.provenance === "measured");
  const perTrial = measuredRuns
    .map(perTrialTable)
    .filter((s) => s !== "")
    .join("\n\n");

  return `## Data transparency

The exact prompts and every trial's verbatim raw output are preserved so the
result can be re-checked, not just trusted.

**Exact prompts.** The nested-JSON probe sends one prompt per ladder rung; the
deepest (depth ${deepest}) rung is:

\`\`\`text
${nestedPrompt}
\`\`\`

The length probe sends a single prompt:

\`\`\`text
${lengthPrompt}
\`\`\`

**Raw per-trial capture.** Every trial's exact prompt and verbatim model output —
for every model, including fixtured and failed ones — is committed alongside this
page as a JSON run-artifact:
[\`${escapeCell(result.artifactPath)}\`](./${escapeCell(result.artifactPath)}).

${
  perTrial === ""
    ? "No measured models in this run, so there are no per-trial measured values to tabulate here; the fixtured/failed trials are in the artifact above."
    : `**Per-trial measured values** (measured models only; full raw output in the artifact):\n\n${perTrial}`
}`;
};

// --- the page ----------------------------------------------------------------

export const renderComparisonReport = (result: ComparisonResult): string => {
  const runs = result.runs;
  const measuredRuns = runs.filter((r) => r.provenance === "measured");
  const anyNonMeasured = runs.some((r) => r.provenance !== "measured");
  const ladder = result.probe.depthLadder.join(", ");
  const providers = [...new Set(runs.map((r) => r.provider))].length;

  const aspects = ASPECTS.map((a) => aspectSection(a, runs, measuredRuns)).join(
    "\n\n",
  );
  const profiles = runs.map(profile).join("\n\n");

  return `---
title: Fundamental LLM model comparison
description: A reproducible, cited comparison of ${runs.length} large language models across ${providers} providers — five curated catalog facts and three behavioral probes measured live over ${result.trials} trials each, reported with mean and spread.
---

# Fundamental LLM model comparison

A routine, reproducible snapshot of what current large language models from
Anthropic, OpenAI, and Google do on three narrow, auto-gradable behaviors. Each
model is scored on eight aspects: five are **curated catalog data** (a cited
in-code registry — provider, model, tier, released, cost, effort levels) and three
are **measured live** against each provider's API over **${result.trials} trials**
each and reported as a **mean with spread**. The split is deliberate and the type
system enforces it: a reader can always tell a sourced fact from a behavioral
measurement.

## Methodology

**Models.** ${runs.length} models across ${providers} providers, spanning each
provider's flagship, mid, and small tiers, so the comparison shows the real spread
of behavior — and cost — from a provider's largest model to its smallest.

**Trials & statistics.** Every probe is run **${result.trials} times** per model.
The per-trial values are reduced to a **mean and sample standard deviation**
(Bessel's n−1) by the pure functions in
\`packages/tech/src/llm-model-comparison/domain/aggregate.ts\`; a failed trial is
excluded from the aggregates, never counted as a zero. Only **successful (ok)**
trials contribute, and \`n\` is reported alongside every mean.

**Probes.** Each model is sent three probes through a provider-neutral
\`CompletionClient\` anti-corruption layer in \`packages/tech/src/vendors/llm/\`, so
providers stay swappable and no SDK type leaks into the comparison logic:

- **Speed** — output tokens divided by wall-clock time over a trial's probe calls.
- **Nested-JSON depth** — the model is asked for JSON nested to each depth on a
  fixed ladder (${ladder}); the deepest correctly-nested response is recorded.
- **Length accuracy** — the model is asked for a paragraph of exactly
  ${result.probe.lengthTargetWords} words on "${escapeCell(result.probe.lengthTopic)}";
  accuracy is \`1 - min(1, |actual - target| / target)\`, in [0, 1].

The grading and scoring logic is pure and unit-tested in
\`packages/tech/src/llm-model-comparison/domain/\`.

\`\`\`mermaid
flowchart LR
  R[Curated registry: models.ts] --> A[Assemble runs]
  P[Live probes x ${result.trials} trials] --> A
  A --> G[Pure graders + statistics in domain/]
  G --> T[Tables + per-aspect distributions]
  G --> J[Raw per-trial JSON artifact]
  T --> Page[Result page]
\`\`\`

_Diagram: the curated registry and the live per-trial probes are assembled into
runs, reduced by the pure graders and statistics, and rendered both as this page's
tables and as the raw JSON run-artifact._

### Publication constraints

The curated columns cite each provider's official model or pricing page and use
the provider's official product name. Model ids, prices, and release dates move
quickly and some sit near a model's knowledge cutoff; treat every curated cell as
correct only as of the cited source, and the \`apiModelId\` values are isolated in
\`models.ts\` so a correction is a one-line edit.

## Comparison

${comparisonTable(runs)}

**Legend.** Provider, Model, Tier, Released, Cost, and Effort levels are
**curated** catalog data (cited). Speed, Max JSON depth, and Length accuracy are
**measured** live, each a mean over ${result.trials} trials. A cell reading
\`n/a (fixtured)\` was produced by the deterministic fixture client (no API key
supplied) and is **not** a live measurement; \`n/a (error)\` means every trial for
that model failed. Provenance is stated in words, never by colour, so the table
reads the same for every reader.

## Per-aspect analysis

Each aspect as a distribution across the models — mean ± sample standard
deviation, the observed min–max, and the number of contributing trials.

${aspects}

## Per-model profiles

${profiles}

${transparencySection(result)}

## Scope & limitations

This is a deliberately narrow probe set, not an exhaustive evaluation suite:

- **${result.trials} trials** per model×probe — a small sample, enough for a mean
  and a rough spread, not a rigorous statistical study. Numbers vary run to run.
- **Point-in-time.** The measured behavior reflects the models and APIs on the
  date below; the curated facts reflect their cited sources on that date.
- The three probes test narrow, specific behaviors (raw throughput, structural
  nesting, length-instruction following) — they do **not** measure general
  capability, reasoning quality, or task success.
${
  anyNonMeasured
    ? "- **This run includes non-measured rows.** A provider with no API key is a deterministic fixture stand-in flagged `n/a (fixtured)`; a model whose every trial failed is flagged `n/a (error)`. Neither is a live measurement.\n"
    : ""
}
- **Generated:** ${escapeCell(result.generatedAt)}

## Reproduce

\`\`\`sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Pipeline self-test, no API keys or cost (deterministic fixture clients):
npm run compare:fixture

# Against the real providers (populate .env first; see .env.example):
#   ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY
# Optionally bound the run: --trials <n> (default ${result.trials}) and
# --models <id,id,...> (a subset of the models.ts ids). A full real matrix is
# roughly ${runs.length} models x (${result.probe.depthLadder.length}-rung ladder + 1 length) x ${result.trials} trials of API calls.
npm run compare
\`\`\`

The run regenerates this page and the JSON run-artifact. A provider whose key is
missing in a real run is fixtured-and-flagged, never presented as a live
measurement. Pin the \`apiModelId\` values in any published comparison so the
result stays interpretable over time.
`;
};
