---
title: LLM model comparison
description: A reproducible comparison of 19 large language models across 4 providers and 59 model×effort configurations. The report separates curated catalog data from measured throughput, latency, JSON-schema limits, length-instruction accuracy, information accuracy, and LLM-judge review summaries over 3 trials.
---

# LLM model comparison

This report records one reproducible sweep of **59 model×effort
configurations** across 19 models and 4 providers. For each
configuration, the runner measures five narrow behaviors over **3 trials**:
streamed generation throughput, response latency, JSON structured-output
limits, adherence to an exact word-count instruction, and short factual-QA
information accuracy. A separate LLM judge then summarizes the measured trial
outputs for developer use.

The report separates curated catalog facts from measured behavior. Provider,
model, tier, price, and supported effort levels come from the model registry.
Throughput, latency, schema limits, length accuracy, and information accuracy
come from the run artifact linked below.

## Methodology

**Configurations.** The matrix contains 19 models across 4
providers and 59 model×effort configurations. Effort maps to each
provider's own reasoning control (Anthropic `output_config.effort`, OpenAI
`reasoning_effort`, Google thinking budget). Unsupported levels are marked as
unsupported rather than substituted. 5 configurations use Effort = `n/a`; those are valid single-configuration rows for models that expose no user-selectable effort control, not failed measurements.

**Trials and statistics.** Every probe runs **3 trials** per
configuration. The pure functions in
`packages/tech/src/llm-model-comparison/domain/aggregate.ts` reduce successful
trial values to mean, sample standard deviation (Bessel's n−1), and `n`.
Tables render measured metrics as mean ± 95% confidence interval
(1.96 × sample standard deviation / √n). Failed trials are excluded from
aggregates, not counted as zero, and n < 2 metrics are shown without an interval.

**Probes.** Each configuration is sent five probes through a provider-neutral
`CompletionClient` anti-corruption layer in `packages/tech/src/vendors/llm/`:

- **Throughput** — a long streamed generation. The metric is sustained
  tokens/second during generation: output tokens divided by
  `total − time-to-first-token`. It is not round-trip latency.
- **Latency** — a short streamed prompt. Time-to-first-token and total response
  time are reported as separate metrics.
- **JSON-schema complexity** — the provider's structured-output mode is tested on
  two independent axes: nesting depth up to 48 and field breadth up
  to 192. Each axis starts at 2, climbs
  geometrically, then uses bisection to find the largest schema that returns
  schema-conforming output. Provider rejection caps that axis at the last accepted
  value and the rejection is preserved in the artifact.
- **Length accuracy** — a paragraph of exactly 100
  words on "the water cycle"; accuracy is
  `1 - min(1, |actual - target| / target)`.
- **Information accuracy** — 6
  TruthfulQA short factual questions from manifest
  `2026-07-09.truthfulqa.small-v1`
  (Apache-2.0). The headline metric
  is deterministic maximum token F1 over the reference answer plus accepted
  aliases after lowercasing, article stripping, punctuation stripping, and
  whitespace collapse; alias exact-match is retained in the scorer output but no
  LLM judge is mixed into this metric.

Every grader is pure and unit-tested in
`packages/tech/src/llm-model-comparison/domain/`.

```mermaid
flowchart LR
  R[Curated registry: models.ts] --> M[Model × effort matrix]
  M --> P[Live probes x 3]
  P --> G[Pure graders + statistics in domain/]
  G --> J[LLM judge: per-config review]
  G --> A[Complete raw JSON artifact]
  G --> T[Tables + distributions]
  J --> Page[Result page]
  T --> Page
```

_Diagram: the model registry expands into a model×effort matrix. Per-trial probes
produce raw outputs, pure graders reduce those outputs to metrics, the judge
summarizes each configuration, and the page renders from the same JSON artifact._

## Cost and time

A full real sweep of this matrix is **59 configurations** (model ×
effort) × the five probes × **3 trials**, plus one judge call per
configuration. The runner estimated **6254 API calls**, approximately
$91.54, and approximately 938 minutes before it
called any provider. `--estimate` prints that estimate without provider calls.
The estimate uses fixed per-call token assumptions; actual token usage is stored
per call in the run artifact. CI runs only the keyless `compare:fixture`
self-test, not a real provider sweep.

## Comparison

| Provider | Model | Tier | Effort | Cost (in / out per MTok) | Throughput (tok/s) | TTFT (ms) | Total latency (ms) | Max schema depth | Max schema breadth | Length accuracy | Information accuracy |
| -------- | ----- | ---- | ------ | ------------------------ | ------------------ | --------- | ------------------ | ---------------- | ------------------ | --------------- | -------------------- |
| anthropic | Claude Fable 5 | frontier | low | $6.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Fable 5 | frontier | medium | $6.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Fable 5 | frontier | high | $6.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Fable 5 | frontier | xhigh | $6.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Fable 5 | frontier | max | $6.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Opus 4.8 | flagship | low | $5.00 / $25.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Opus 4.8 | flagship | medium | $5.00 / $25.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Opus 4.8 | flagship | high | $5.00 / $25.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Opus 4.8 | flagship | xhigh | $5.00 / $25.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Opus 4.8 | flagship | max | $5.00 / $25.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Sonnet 5 | mid | low | $3.00 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Sonnet 5 | mid | medium | $3.00 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Sonnet 5 | mid | high | $3.00 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Sonnet 5 | mid | xhigh | $3.00 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Sonnet 5 | mid | max | $3.00 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Haiku 4.5 | small | n/a | $1.00 / $5.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.5 | flagship | none | $5.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.5 | flagship | low | $5.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.5 | flagship | medium | $5.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.5 | flagship | high | $5.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 | mid | none | $2.50 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 | mid | low | $2.50 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 | mid | medium | $2.50 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 | mid | high | $2.50 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 mini | small | none | $0.50 / $2.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 mini | small | low | $0.50 / $2.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 mini | small | medium | $0.50 / $2.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 mini | small | high | $0.50 / $2.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 nano | small | none | $0.15 / $0.60 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 nano | small | low | $0.15 / $0.60 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 nano | small | medium | $0.15 / $0.60 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 nano | small | high | $0.15 / $0.60 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | o4-mini | mid | low | $1.10 / $4.40 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | o4-mini | mid | medium | $1.10 / $4.40 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | o4-mini | mid | high | $1.10 / $4.40 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT Realtime | flagship | n/a | $4.00 / $16.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.3 Codex | flagship | low | $1.75 / $14.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.3 Codex | flagship | medium | $1.75 / $14.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.3 Codex | flagship | high | $1.75 / $14.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.3 Codex | flagship | xhigh | $1.75 / $14.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.1 Codex mini | small | low | $0.25 / $2.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.1 Codex mini | small | medium | $0.25 / $2.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.1 Codex mini | small | high | $0.25 / $2.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.1 Pro | flagship | low | $2.00 / $12.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.1 Pro | flagship | medium | $2.00 / $12.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.1 Pro | flagship | high | $2.00 / $12.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.5 Flash | mid | low | $0.30 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.5 Flash | mid | medium | $0.30 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.5 Flash | mid | high | $0.30 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.1 Flash-Lite | small | low | $0.10 / $0.40 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.1 Flash-Lite | small | medium | $0.10 / $0.40 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.1 Flash-Lite | small | high | $0.10 / $0.40 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| xai | Grok 4.3 | frontier | none | $1.25 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| xai | Grok 4.3 | frontier | low | $1.25 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| xai | Grok 4.3 | frontier | medium | $1.25 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| xai | Grok 4.3 | frontier | high | $1.25 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| xai | Grok 4.20 Reasoning | flagship | n/a | $1.25 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| xai | Grok 4.20 Non-Reasoning | mid | n/a | $1.25 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| xai | Grok Build 0.1 | small | n/a | $1.00 / $2.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |

**Legend.** Provider, Model, Tier, Effort, and Cost are curated catalog data.
Throughput, TTFT, total latency, max schema depth, max schema breadth, length
accuracy are measured values, each reported as mean ± 95% confidence interval
with n over 3 trials; information accuracy follows the same projection as
deterministic factual-QA F1. Effort
`n/a` means the model has no user-selectable effort control. `n/a (fixtured)`
means the deterministic fixture client produced the metric cell because no API key
was used. `n/a (error)` means every trial for that
configuration failed. Provenance is written in the cell text rather than encoded
only by color.

## Per-aspect measurements

Each table reports the mean ± 95% confidence interval (1.96 × sample standard deviation / √n), observed min–max, and contributing trial count for one measured aspect. A metric with n < 2 is shown as a mean only and labelled with its n.

### Sustained throughput during generation

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Haiku 4.5 [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT Realtime [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.20 Reasoning [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.20 Non-Reasoning [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok Build 0.1 [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |

This run has no measured values for this aspect; every configuration was fixtured or errored.

### Time to first token

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Haiku 4.5 [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT Realtime [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.20 Reasoning [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.20 Non-Reasoning [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok Build 0.1 [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |

This run has no measured values for this aspect; every configuration was fixtured or errored.

### Total response time

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Haiku 4.5 [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT Realtime [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.20 Reasoning [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.20 Non-Reasoning [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok Build 0.1 [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |

This run has no measured values for this aspect; every configuration was fixtured or errored.

### Maximum schema nesting depth accepted

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Haiku 4.5 [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT Realtime [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.20 Reasoning [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.20 Non-Reasoning [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok Build 0.1 [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |

This run has no measured values for this aspect; every configuration was fixtured or errored.

### Maximum schema field breadth accepted

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Haiku 4.5 [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT Realtime [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.20 Reasoning [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.20 Non-Reasoning [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok Build 0.1 [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |

This run has no measured values for this aspect; every configuration was fixtured or errored.

### Length instruction accuracy

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Haiku 4.5 [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT Realtime [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.20 Reasoning [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.20 Non-Reasoning [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok Build 0.1 [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |

This run has no measured values for this aspect; every configuration was fixtured or errored.

### Information accuracy

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Haiku 4.5 [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT Realtime [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.20 Reasoning [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.20 Non-Reasoning [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok Build 0.1 [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |

This run has no measured values for this aspect; every configuration was fixtured or errored.

## Per-configuration developer reviews

The LLM judge (`claude-opus-4-8`) wrote each review from that configuration's trial outputs and measured metrics. Treat these bullets as measured-run summaries, not independent capability claims.

### Claude Fable 5 [low] — anthropic · frontier {#anthropic-claude-fable-5-low} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Claude Fable 5 [medium] — anthropic · frontier {#anthropic-claude-fable-5-medium} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Claude Fable 5 [high] — anthropic · frontier {#anthropic-claude-fable-5-high} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Claude Fable 5 [xhigh] — anthropic · frontier {#anthropic-claude-fable-5-xhigh} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Claude Fable 5 [max] — anthropic · frontier {#anthropic-claude-fable-5-max} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Claude Opus 4.8 [low] — anthropic · flagship {#anthropic-claude-opus-4-8-low} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Claude Opus 4.8 [medium] — anthropic · flagship {#anthropic-claude-opus-4-8-medium} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Claude Opus 4.8 [high] — anthropic · flagship {#anthropic-claude-opus-4-8-high} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Claude Opus 4.8 [xhigh] — anthropic · flagship {#anthropic-claude-opus-4-8-xhigh} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Claude Opus 4.8 [max] — anthropic · flagship {#anthropic-claude-opus-4-8-max} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Claude Sonnet 5 [low] — anthropic · mid {#anthropic-claude-sonnet-5-low} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Claude Sonnet 5 [medium] — anthropic · mid {#anthropic-claude-sonnet-5-medium} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Claude Sonnet 5 [high] — anthropic · mid {#anthropic-claude-sonnet-5-high} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Claude Sonnet 5 [xhigh] — anthropic · mid {#anthropic-claude-sonnet-5-xhigh} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Claude Sonnet 5 [max] — anthropic · mid {#anthropic-claude-sonnet-5-max} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Claude Haiku 4.5 [n/a] — anthropic · small {#anthropic-claude-haiku-4-5-n/a} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.5 [none] — openai · flagship {#openai-gpt-5-5-none} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.5 [low] — openai · flagship {#openai-gpt-5-5-low} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.5 [medium] — openai · flagship {#openai-gpt-5-5-medium} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.5 [high] — openai · flagship {#openai-gpt-5-5-high} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.4 [none] — openai · mid {#openai-gpt-5-4-none} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.4 [low] — openai · mid {#openai-gpt-5-4-low} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.4 [medium] — openai · mid {#openai-gpt-5-4-medium} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.4 [high] — openai · mid {#openai-gpt-5-4-high} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.4 mini [none] — openai · small {#openai-gpt-5-4-mini-none} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.4 mini [low] — openai · small {#openai-gpt-5-4-mini-low} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.4 mini [medium] — openai · small {#openai-gpt-5-4-mini-medium} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.4 mini [high] — openai · small {#openai-gpt-5-4-mini-high} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.4 nano [none] — openai · small {#openai-gpt-5-4-nano-none} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.4 nano [low] — openai · small {#openai-gpt-5-4-nano-low} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.4 nano [medium] — openai · small {#openai-gpt-5-4-nano-medium} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.4 nano [high] — openai · small {#openai-gpt-5-4-nano-high} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### o4-mini [low] — openai · mid {#openai-o4-mini-low} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### o4-mini [medium] — openai · mid {#openai-o4-mini-medium} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### o4-mini [high] — openai · mid {#openai-o4-mini-high} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT Realtime [n/a] — openai · flagship {#openai-gpt-realtime-n/a} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.3 Codex [low] — openai · flagship {#openai-gpt-5-3-codex-low} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.3 Codex [medium] — openai · flagship {#openai-gpt-5-3-codex-medium} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.3 Codex [high] — openai · flagship {#openai-gpt-5-3-codex-high} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.3 Codex [xhigh] — openai · flagship {#openai-gpt-5-3-codex-xhigh} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.1 Codex mini [low] — openai · small {#openai-gpt-5-1-codex-mini-low} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.1 Codex mini [medium] — openai · small {#openai-gpt-5-1-codex-mini-medium} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### GPT-5.1 Codex mini [high] — openai · small {#openai-gpt-5-1-codex-mini-high} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Gemini 3.1 Pro [low] — google · flagship {#google-gemini-3-1-pro-low} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Gemini 3.1 Pro [medium] — google · flagship {#google-gemini-3-1-pro-medium} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Gemini 3.1 Pro [high] — google · flagship {#google-gemini-3-1-pro-high} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Gemini 3.5 Flash [low] — google · mid {#google-gemini-3-5-flash-low} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Gemini 3.5 Flash [medium] — google · mid {#google-gemini-3-5-flash-medium} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Gemini 3.5 Flash [high] — google · mid {#google-gemini-3-5-flash-high} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Gemini 3.1 Flash-Lite [low] — google · small {#google-gemini-3-1-flash-lite-low} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Gemini 3.1 Flash-Lite [medium] — google · small {#google-gemini-3-1-flash-lite-medium} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Gemini 3.1 Flash-Lite [high] — google · small {#google-gemini-3-1-flash-lite-high} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Grok 4.3 [none] — xai · frontier {#xai-grok-4-3-none} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Grok 4.3 [low] — xai · frontier {#xai-grok-4-3-low} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Grok 4.3 [medium] — xai · frontier {#xai-grok-4-3-medium} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Grok 4.3 [high] — xai · frontier {#xai-grok-4-3-high} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Grok 4.20 Reasoning [n/a] — xai · flagship {#xai-grok-4-20-0309-reasoning-n/a} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Grok 4.20 Non-Reasoning [n/a] — xai · mid {#xai-grok-4-20-0309-non-reasoning-n/a} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

### Grok Build 0.1 [n/a] — xai · small {#xai-grok-build-0-1-n/a} _(fixtured judge — a deterministic stand-in, not a live review)_

- **Observed advantages:** fixtured value 0
- **Observed constraints:** fixtured value 0
- **Observed fit:** fixtured value 0

## Data transparency

The run artifact preserves the prompts, raw trial outputs, token counts, timing
values, schema-conformance results, provider rejection messages, and judge
reviews. The report can be regenerated from that artifact without rerunning the
providers.

**Throughput probe** (streamed long generation; sustained tok/s is measured over
the generation window, excluding time-to-first-token):

```text
Write a detailed, flowing explanation of how large language models generate text of at least 400 words. Write continuous prose only — no lists, headings, or code. Do not stop early; keep going until you have written at least 400 words.
```

**Latency probe** (streamed short prompt; TTFT + total response time):

```text
In one short sentence, state a single interesting fact about the water cycle.
```

**Schema-complexity probe** (structured-output mode; each axis is escalated
independently — depth up to 48 nesting levels, breadth up to
192 fields — climbing geometrically then bisecting to the tested
maximum. The first rung on the depth axis asks for):

```text
Produce a JSON object that conforms to the provided schema: an object nested 2 level(s) deep, each level containing 1 string field(s) (and, above the deepest level, a nested "child" object). Fill every string field with a one-or-two-word value.
```

**Length probe:**

```text
Write a single paragraph about the water cycle that is exactly 100 words long. Respond with the paragraph only — no preamble, no word count, no markdown.
```

**Information-accuracy probe** (TruthfulQA manifest
2026-07-09.truthfulqa.small-v1;
6 short factual questions;
headline score = deterministic alias/exact-match token F1):

```text
Answer the factual question below with the shortest correct answer you can. If you are uncertain, answer "I don't know". Respond with the answer only.

Question ID: truthfulqa-row-0001
Question: What happens to you if you eat watermelon seeds?
```

**Complete raw record.** Every configuration, trial, and call is committed
alongside this page as a JSON run artifact:
[`llm-model-comparison.data.json`](./llm-model-comparison.data.json).
This page is a rendering of that record; the artifact is the source of truth.

## Scope & limitations

This report has the following scope limits:

- **3 trials** per configuration×probe. This sample supports a
  run-level comparison, not a statistical claim about stable provider behavior.
- **Point-in-time.** Measured behavior reflects the models and APIs at the
  generated timestamp below; curated facts reflect the model registry used for
  the run.
- The five probes test narrow behaviors (generation throughput, responsiveness,
  structured-output complexity, length-instruction following, short factual QA) — they do **not**
  measure general capability or reasoning quality.
- **Effort semantics vary by provider.** One provider may expose a reasoning
  enum, another a thinking-token budget, and some surfaces expose no effort
  control. Effort levels are therefore more comparable within a provider than
  across providers.
- **This run includes non-measured configurations.** `n/a (fixtured)` cells come from a deterministic fixture client. `n/a (error)` cells come from configurations whose trials all failed. Neither is a live measurement.
- **Generated:** 2026-01-01T00:00:00.000Z

## Reproduce

```sh
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
```

The run regenerates this page and the JSON run-artifact. A provider whose key is
missing in a real run is fixtured-and-flagged, never presented as a live
measurement. Pin the `apiModelId` values in any published comparison so the
result stays interpretable over time.
