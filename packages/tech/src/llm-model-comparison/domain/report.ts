import type {
  Aggregate,
  ComparisonResult,
  ModelRun,
  Provenance,
} from "./types";

// Render the comparison result page as Markdown. The frontmatter carries the
// `description` the corporate site requires. The body is objective: it labels
// every column as curated or measured, renders a non-measurement as
// `n/a (fixtured)` / `n/a (error)` so a key-less or failed row is never mistaken
// for a live figure, reports each measured aspect as a mean over N trials with its
// spread, and points the reader at the raw per-trial run-artifact.

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const usd = (n: number): string => `$${n.toFixed(2)}`;

const notMeasured = (p: Provenance): string =>
  p === "error" ? "n/a (error)" : "n/a (fixtured)";

// A measured cell renders its value; a non-measured cell renders its provenance
// stand-in so the reader can tell a live measurement from a synthetic or failed
// one at a glance.
const cell = (run: ModelRun, value: string): string =>
  run.provenance === "measured" ? value : notMeasured(run.provenance);

// "14.4 ± 1.8 (12–16, n=5)" — a mean with its spread, extent, and sample size.
const spread = (a: Aggregate, digits: number): string =>
  `${a.mean.toFixed(digits)} ± ${a.stdDev.toFixed(digits)} ` +
  `(${a.min.toFixed(digits)}–${a.max.toFixed(digits)}, n=${a.n})`;

const renderRow = (run: ModelRun): string => {
  const s = run.stats;
  const speed = cell(run, `${s.tokensPerSecond.mean.toFixed(1)} tok/s`);
  const depth = cell(run, s.maxNestedJsonDepth.mean.toFixed(1));
  const length = cell(run, `${(s.lengthAccuracy.mean * 100).toFixed(0)}%`);
  return (
    `| ${escapeCell(run.provider)} | ${escapeCell(run.modelName)} | ${run.tier} | ` +
    `${escapeCell(run.released)} | ${usd(run.inputCostPerMTok)} / ${usd(run.outputCostPerMTok)} | ` +
    `${escapeCell(run.effortLevels.join(", "))} | ${speed} | ${depth} | ${length} |`
  );
};

// Per-probe detail exposes the full distribution (mean ± spread, extent, n) for a
// measured model, and masks it for a fixtured/failed one.
const renderDetailRow = (run: ModelRun): string => {
  const s = run.stats;
  const speed = cell(run, spread(s.tokensPerSecond, 1));
  const depth = cell(run, spread(s.maxNestedJsonDepth, 1));
  const length = cell(run, spread(s.lengthAccuracy, 2));
  return `| ${escapeCell(run.modelName)} | ${run.provenance} | ${speed} | ${depth} | ${length} |`;
};

export const renderComparisonReport = (result: ComparisonResult): string => {
  const tableRows = result.runs.map(renderRow).join("\n");
  const detailRows = result.runs.map(renderDetailRow).join("\n");
  const anyNonMeasured = result.runs.some((r) => r.provenance !== "measured");
  const ladder = result.probe.depthLadder.join(", ");

  return `---
title: Fundamental LLM model comparison
description: A reproducible, cited comparison of frontier large language models across three providers — five curated catalog facts and three behavioral probes measured live over ${result.trials} trials with mean and spread.
---

# Fundamental LLM model comparison

This page compares large language models from Anthropic, OpenAI, and Google across
eight aspects. The first five columns — Provider, Model, Tier, Released, Cost, and
Effort levels — are **curated catalog data** with a cited source per model. The
last three — Speed, nested-JSON depth, and length accuracy — are **measured live**
against each provider's API over **${result.trials} trials** each, reported as a
**mean with spread**. The split is deliberate: a reader can always tell a sourced
fact from a behavioral measurement.

## Method

\`\`\`mermaid
flowchart LR
  R[Curated registry: models.ts] --> A[Assemble runs]
  P[Live probes x ${result.trials} trials] --> A
  A --> G[Pure graders + statistics in domain/]
  G --> T[Table + per-probe distributions]
  G --> J[Raw per-trial JSON artifact]
  T --> Page[Result page]
\`\`\`

Each model is sent three probes, **${result.trials} times**, through a
provider-neutral \`CompletionClient\` anti-corruption layer in
\`packages/tech/src/vendors/llm/\`, so providers stay swappable and no SDK type
leaks into the comparison logic. Per-trial values are reduced to a mean and sample
standard deviation by the pure statistics in
\`packages/tech/src/llm-model-comparison/domain/aggregate.ts\`:

- **Speed** — output tokens divided by wall-clock time over a trial's probe calls.
- **Nested-JSON depth** — the model is asked for JSON nested to each depth on a
  fixed ladder (${ladder}); the deepest correctly-nested response is recorded.
- **Length accuracy** — the model is asked for a paragraph of exactly
  ${result.probe.lengthTargetWords} words on "${escapeCell(result.probe.lengthTopic)}";
  accuracy is \`1 - min(1, |actual - target| / target)\`.

The grading and scoring logic is pure and unit-tested in
\`packages/tech/src/llm-model-comparison/domain/\`. Every trial's exact prompt and
raw output is preserved in the raw run-artifact linked below.

### Publication constraints

The curated columns cite each provider's official model or pricing page and use
the provider's official product name. Model ids, prices, and release dates move
quickly and some sit near a model's knowledge cutoff; treat every curated cell as
correct only as of the cited source, and the \`apiModelId\` values are isolated in
\`models.ts\` so a correction is a one-line edit.

## Comparison

| Provider | Model | Tier | Released | Cost (in / out per MTok) | Effort levels | Speed (mean) | Max JSON depth (mean) | Length accuracy (mean) |
| -------- | ----- | ---- | -------- | ------------------------ | ------------- | ------------ | --------------------- | ---------------------- |
${tableRows}

**Legend.** Provider, Model, Tier, Released, Cost, and Effort levels are
**curated** catalog data (cited). Speed, Max JSON depth, and Length accuracy are
**measured** live, each a mean over ${result.trials} trials. A cell shown as
\`n/a (fixtured)\` was produced by the deterministic fixture client (no API key
supplied) and is **not** a live measurement; \`n/a (error)\` means every trial for
that model failed.

### Per-probe detail (mean ± sample SD, min–max, n)

| Model | Provenance | Speed (tok/s) | Max JSON depth | Length accuracy |
| ----- | ---------- | ------------- | -------------- | --------------- |
${detailRows}

The **raw per-trial run-artifact** — every trial's exact prompt and verbatim model
output — is committed alongside this page at
[\`${escapeCell(result.artifactPath)}\`](./${escapeCell(result.artifactPath)}).

## Scope & limitations

This is a deliberately narrow probe set, not an exhaustive evaluation suite:

- **${result.trials} trials** per model×probe — a small sample, enough for a mean
  and a rough spread, not a rigorous statistical study. Numbers vary run to run.
- **Point-in-time.** The measured behavior reflects the models and APIs on the
  date below; the curated facts reflect their cited sources on that date.
- The three probes test narrow, specific behaviors (raw throughput, structural
  nesting, length-instruction following) — they do not measure general
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
# --models <id,id,...> (a subset of models.ts ids).
npm run compare
\`\`\`

The run regenerates this page and the JSON run-artifact. A provider whose key is
missing in a real run is fixtured-and-flagged, never presented as a live
measurement. Pin the \`apiModelId\` values in any published comparison so the
result stays interpretable over time.
`;
};
