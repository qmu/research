import type { ComparisonResult, ComparisonRow } from "./types";

// Render the comparison result page as Markdown. The frontmatter carries the
// `description` the corporate site requires. The body is objective: it labels
// every column as curated or measured, renders a non-measurement as
// `n/a (fixtured)` so a key-less row is never mistaken for a live figure, and
// states the scope and publication constraints plainly.

const escapeCell = (text: string): string =>
  text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

const usd = (n: number): string => `$${n.toFixed(2)}`;

// A measured cell renders its value; a fixtured cell renders `n/a (fixtured)` so
// the reader can tell a live measurement from a synthetic stand-in at a glance.
const measuredCell = (measured: boolean, value: string): string =>
  measured ? value : "n/a (fixtured)";

const renderRow = (row: ComparisonRow): string => {
  const m = row.measurement;
  const speed = measuredCell(
    m.measured,
    `${m.tokensPerSecond.toFixed(1)} tok/s`,
  );
  const depth = measuredCell(m.measured, String(m.maxNestedJsonDepth));
  const length = measuredCell(
    m.measured,
    `${(m.lengthAccuracy * 100).toFixed(0)}%`,
  );
  return (
    `| ${escapeCell(row.provider)} | ${escapeCell(row.modelName)} | ` +
    `${escapeCell(row.released)} | ${usd(row.inputCostPerMTok)} / ${usd(row.outputCostPerMTok)} | ` +
    `${escapeCell(row.effortLevels.join(", "))} | ${speed} | ${depth} | ${length} |`
  );
};

// Per-probe detail rows expose the raw `elapsedMs`/`outputTokens` for measured
// rows (transparency/reproduction) but mask them for fixtured rows so no bare
// number could be mistaken for a live measurement.
const renderDetailRow = (row: ComparisonRow): string => {
  const m = row.measurement;
  const elapsed = measuredCell(m.measured, `${m.elapsedMs} ms`);
  const tokens = measuredCell(m.measured, String(m.outputTokens));
  const provenance = m.measured ? "measured" : "fixtured";
  return `| ${escapeCell(row.modelName)} | ${provenance} | ${elapsed} | ${tokens} |`;
};

export const renderComparisonReport = (result: ComparisonResult): string => {
  const tableRows = result.rows.map(renderRow).join("\n");
  const detailRows = result.rows.map(renderDetailRow).join("\n");
  const anyFixtured = result.rows.some((row) => !row.measurement.measured);
  const ladder = result.probe.depthLadder.join(", ");

  return `---
title: Fundamental LLM model comparison
description: A reproducible, cited comparison of frontier large language models across eight aspects — five curated catalog facts and three live-measured behavioral probes.
---

# Fundamental LLM model comparison

This page compares frontier large language models from Anthropic, OpenAI, and
Google across eight aspects. The first five columns — Provider, Model, Released,
Cost, and Effort levels — are **curated catalog data** with a cited source per
model. The last three — Speed, nested-JSON depth, and length accuracy — are
**measured live** against each provider's API. The split is deliberate: a reader
can always tell a sourced fact from a behavioral measurement.

## Method

\`\`\`mermaid
flowchart LR
  R[Curated registry: models.ts] --> A[Assemble rows]
  P[Live probes: speed, JSON depth, length] --> A
  A --> G[Pure graders in domain/]
  G --> T[8-column table + legend]
  T --> Page[Result page]
\`\`\`

Each measured model is sent three probes through a provider-neutral
\`CompletionClient\` anti-corruption layer in
\`packages/tech/src/vendors/llm/\`, so providers stay swappable and no SDK type
leaks into the comparison logic:

- **Speed** — output tokens divided by wall-clock time for the probe calls.
- **Nested-JSON depth** — the model is asked for JSON nested to each depth on a
  fixed ladder (${ladder}); the deepest correctly-nested response is recorded.
- **Length accuracy** — the model is asked for a paragraph of exactly
  ${result.probe.lengthTargetWords} words on "${escapeCell(result.probe.lengthTopic)}";
  accuracy is \`1 - min(1, |actual - target| / target)\`.

The grading and scoring logic is pure and unit-tested in
\`packages/tech/src/llm-model-comparison/domain/\`.

### Publication constraints

The curated columns cite each provider's official model or pricing page and use
the provider's official product name. Model ids, prices, and release dates move
quickly and some sit near a model's knowledge cutoff; treat every curated cell as
correct only as of the cited source, and the \`apiModelId\` values are isolated in
\`models.ts\` so a correction is a one-line edit.

## Comparison

| Provider | Model | Released | Cost (in / out per MTok) | Effort levels | Speed | Max JSON depth | Length accuracy |
| -------- | ----- | -------- | ------------------------ | ------------- | ----- | -------------- | --------------- |
${tableRows}

**Legend.** Provider, Model, Released, Cost, and Effort levels are **curated**
catalog data (cited). Speed, Max JSON depth, and Length accuracy are **measured**
live. A cell shown as \`n/a (fixtured)\` means that row was produced by the
deterministic fixture client — no API key was supplied for that provider — and is
**not** a live measurement.

### Per-probe detail

| Model | Provenance | Elapsed | Output tokens |
| ----- | ---------- | ------- | ------------- |
${detailRows}

## Scope & limitations

This is a deliberately minimal probe, not an exhaustive evaluation suite:

- **One model per provider** and **one run** of each probe — a single sample, not
  a statistical average. Numbers will vary run to run.
- **Point-in-time.** The measured behavior reflects the models and APIs on the
  date below; the curated facts reflect their cited sources on that date.
- The three probes test narrow, specific behaviors (raw throughput, structural
  nesting, length-instruction following) — they do not measure general
  capability, reasoning quality, or task success.
${
  anyFixtured
    ? "- **This run includes fixtured rows.** At least one provider had no API key, so its row is a deterministic stand-in flagged `n/a (fixtured)` above, not a live measurement.\n"
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
npm run compare
\`\`\`

The run regenerates this page at
\`docs/research-reports/llm-model-comparison.md\`. A provider whose key is missing
in a real run is fixtured-and-flagged, never presented as a live measurement. Pin
the \`apiModelId\` values in any published comparison so the result stays
interpretable over time.
`;
};
