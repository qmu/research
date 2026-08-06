---
title: LLM output accuracy
description: A reproducible accuracy comparison of 24 large language models across 5 providers and 74 model×effort configurations, covering JSON-schema structural limits, length-instruction following, and factual information accuracy, over 3 trials. Projected from the shared LLM comparison sweep.
---

# LLM output accuracy

The numbers here are a **projection of the combined LLM comparison sweep**: the same trials, model×effort matrix, statistics, and provenance, restricted to this topic's probes.

## 1. Research Purpose

This report helps narrow model choices by the measured constraints that matter for this topic. It is not a general model ranking and it does not re-run a separate benchmark.

## 2. Measurement Targets

### Target Models

The report covers **74 model×effort configurations** across 24 models and 5 providers. Curated catalog facts (provider, model, tier, price, effort) come from the model registry.

### Target Metrics

This topic covers JSON-schema structural limits, length-instruction following, and factual information accuracy. Metric cells are reported as mean ± 95% confidence interval when n ≥ 2; metrics with n < 2 show the mean and sample count.

## 3. Scope and Constraints

- **3 trials** per configuration×probe. This sample supports a run-level comparison, not a statistical claim about stable provider behavior.
- **Mixed measurement dates — this table is not a single point in time.** Its 74 configurations were measured across 5 dates: 13 on `2026-08-04`, 12 on `2026-07-27`, 6 on `2026-07-20`, 31 on `2026-07-12`, 12 on `2026-07-06`. Only the 13 measured on `2026-08-04` were re-run in this round; the rest carry forward from earlier frames, so cross-model comparisons between rows of different dates are not like-for-like. The former→new generational comparison in section 7 is unaffected — it is derived only from pairs where both generations were measured in the same frame.
- This topic tests narrow behaviors only (JSON-schema structural limits, length-instruction following, and factual information accuracy); it does not measure general capability or reasoning quality.
- **Effort semantics vary by provider**, so effort levels are more comparable within a provider than across providers.
- **This run includes non-measured configurations.** `n/a (fixtured)` and `n/a (error)` cells are not live measurements.

## 4. Verification Results

This run measured **68 of 74 configurations** across 5 providers and 24 models, over 3 trials per configuration×probe.

| Aspect | Best (configuration) | Median | Worst |
| ------ | -------------------- | ------ | ----- |
| Maximum schema nesting depth accepted | 48 — Grok 4.3 [none] | 15 | 0 |
| Maximum schema field breadth accepted | 192 — GPT-5.5 [none] | 192 | 0 |
| Length instruction accuracy | 100% — Claude Fable 5 [medium] | 97% | 0% |
| Information accuracy | 60% — GPT Realtime [n/a] | 36% | 0% |

Values are per-configuration means; "Best"/"Worst" follow each aspect's own direction (higher-is-better or lower-is-better). The full per-configuration tables — every model×effort cell with confidence intervals, min–max, and provenance — are in section 7, Verification Data.

This round includes a controlled former→new generational comparison: paired previous- and current-generation models were swept under identical conditions. The per-metric deltas and mechanically-derived net verdict are in section 7, Verification Data.

## 5. Analysis

Highest measured of the 68 measured configuration(s): **Grok 4.3 [none]** at 48 (n=1). Opposite end of this measurement: GPT Realtime [n/a] at 0 (n=1).

Highest measured of the 68 measured configuration(s): **GPT-5.5 [none]** at 192 (n=1). Opposite end of this measurement: GPT Realtime [n/a] at 0 (n=1).

Highest measured of the 68 measured configuration(s): **Claude Fable 5 [medium]** at 100% (n=1). Opposite end of this measurement: o4-mini [high] at 0% ± 0pp (95% CI, n=3).

Highest measured of the 68 measured configuration(s): **GPT Realtime [n/a]** at 60% (n=1). Opposite end of this measurement: Grok 4.3 [low] at 0% (n=0).

## 6. Reproduction

### Reproduction Steps

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (projects the committed compare fixture):
npm run research -- accuracy --fixture

# Against real providers, run the shared sweep, then project:
npm run compare
npm run research -- accuracy --real
```

### Reproduction Cost (Estimate)

The fixture projection is keyless and costless. The real path bills the shared `npm run compare` sweep; run `npm run compare -- --estimate` before a provider run to preview call count, estimated cost, and ETA.

### Cleanup

The projection creates no external resources. Real runs write local `.real` Markdown/data artifacts and update the shared comparison history; review those files before committing.

## 7. Verification Data

| Provider | Model | Tier | Effort | Cost (in / out per MTok) | Max schema depth | Max schema breadth | Length accuracy | Information accuracy |
| -------- | ----- | ---- | ------ | ------------------------ | --- | --- | --- | --- |
| Anthropic | Claude Fable 5 | frontier | low | $10.00 / $50.00 | 20 (n=1) | 72 (n=1) | 97% ± 6pp (95% CI, n=3) | 54% (n=1) |
| Anthropic | Claude Fable 5 | frontier | medium | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 100% (n=1) | 0% (n=0) |
| Anthropic | Claude Fable 5 | frontier | high | $10.00 / $50.00 | 20 (n=1) | 72 (n=1) | 100% ± 0pp (95% CI, n=3) | 53% (n=1) |
| Anthropic | Claude Fable 5 | frontier | xhigh | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 100% (n=1) | 0% (n=0) |
| Anthropic | Claude Fable 5 | frontier | max | $10.00 / $50.00 | 21 (n=1) | 72 (n=1) | 0% ± 0pp (95% CI, n=3) | 48% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | low | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 97% ± 1pp (95% CI, n=3) | 44% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | medium | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 100% (n=1) | 0% (n=0) |
| Anthropic | Claude Opus 4.8 | flagship | high | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 97% ± 1pp (95% CI, n=3) | 53% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | xhigh | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 99% (n=1) | 0% (n=0) |
| Anthropic | Claude Opus 4.8 | flagship | max | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 97% ± 0pp (95% CI, n=3) | 49% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | low | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 98% ± 2pp (95% CI, n=3) | 45% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | medium | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 95% (n=1) | 0% (n=0) |
| Anthropic | Claude Sonnet 5 | mid | high | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 96% ± 1pp (95% CI, n=3) | 58% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | xhigh | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 0% (n=1) | 0% (n=0) |
| Anthropic | Claude Sonnet 5 | mid | max | $3.00 / $15.00 | 15 (n=1) | 72 (n=1) | 0% ± 0pp (95% CI, n=3) | 0% (n=1) |
| Anthropic | Claude Haiku 4.5 | small | n/a | $1.00 / $5.00 | 21 (n=1) | 73 (n=1) | 90% ± 3pp (95% CI, n=3) | 57% (n=1) |
| OpenAI | GPT-5.5 | flagship | none | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% ± 1pp (95% CI, n=3) | 36% (n=1) |
| OpenAI | GPT-5.5 | flagship | low | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) | 0% (n=0) |
| OpenAI | GPT-5.5 | flagship | medium | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 40% (n=1) |
| OpenAI | GPT-5.5 | flagship | high | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 32% (n=1) |
| OpenAI | GPT-5.4 | mid | none | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 95% ± 2pp (95% CI, n=3) | 59% (n=1) |
| OpenAI | GPT-5.4 | mid | low | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) | 0% (n=0) |
| OpenAI | GPT-5.4 | mid | medium | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 50% (n=1) |
| OpenAI | GPT-5.4 | mid | high | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 56% (n=1) |
| OpenAI | GPT-5.4 mini | small | none | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 98% ± 2pp (95% CI, n=3) | 14% (n=1) |
| OpenAI | GPT-5.4 mini | small | low | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) | 0% (n=0) |
| OpenAI | GPT-5.4 mini | small | medium | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 37% (n=1) |
| OpenAI | GPT-5.4 mini | small | high | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 79% ± 42pp (95% CI, n=3) | 48% (n=1) |
| OpenAI | GPT-5.4 nano | small | none | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 90% ± 0pp (95% CI, n=3) | 26% (n=1) |
| OpenAI | GPT-5.4 nano | small | low | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 100% (n=1) | 0% (n=0) |
| OpenAI | GPT-5.4 nano | small | medium | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 26% (n=1) |
| OpenAI | GPT-5.4 nano | small | high | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 42% (n=1) |
| OpenAI | o4-mini | mid | low | $1.10 / $4.40 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 40% (n=1) |
| OpenAI | o4-mini | mid | medium | $1.10 / $4.40 | 10 (n=1) | 7 (n=1) | 67% ± 65pp (95% CI, n=3) | 0% (n=1) |
| OpenAI | o4-mini | mid | high | $1.10 / $4.40 | 10 (n=1) | 1 (n=1) | 0% ± 0pp (95% CI, n=3) | 0% (n=1) |
| OpenAI | GPT Realtime | flagship | n/a | $4.00 / $16.00 | 0 (n=1) | 0 (n=1) | 64% ± 40pp (95% CI, n=3) | 60% (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | low | $1.75 / $14.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 31% (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | medium | $1.75 / $14.00 | 10 (n=1) | 127 (n=1) | 100% (n=1) | 0% (n=0) |
| OpenAI | GPT-5.3 Codex | flagship | high | $1.75 / $14.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 24% (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | xhigh | $1.75 / $14.00 | 10 (n=1) | 192 (n=1) | 41% ± 59pp (95% CI, n=3) | 0% (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | low | $0.25 / $2.00 | 10 (n=1) | 192 (n=1) | 97% ± 5pp (95% CI, n=3) | 39% (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | medium | $0.25 / $2.00 | 10 (n=1) | 3 (n=1) | 67% ± 65pp (95% CI, n=3) | 40% (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | high | $0.25 / $2.00 | 10 (n=1) | 192 (n=1) | 33% ± 65pp (95% CI, n=3) | 44% (n=1) |
| Google | Gemini 3.1 Pro | flagship | low | $2.00 / $12.00 | 15 (n=1) | 192 (n=1) | 36% ± 1pp (95% CI, n=3) | 31% (n=1) |
| Google | Gemini 3.1 Pro | flagship | medium | $2.00 / $12.00 | 15 (n=1) | 191 (n=1) | 36% ± 1pp (95% CI, n=3) | 37% (n=1) |
| Google | Gemini 3.1 Pro | flagship | high | $2.00 / $12.00 | 15 (n=1) | 192 (n=1) | 36% ± 1pp (95% CI, n=3) | 36% (n=1) |
| Google | Gemini 3.5 Flash | mid | low | $1.50 / $9.00 | 15 (n=1) | 192 (n=1) | 31% ± 9pp (95% CI, n=3) | 30% (n=1) |
| Google | Gemini 3.5 Flash | mid | medium | $1.50 / $9.00 | 15 (n=1) | 192 (n=1) | 19% ± 5pp (95% CI, n=3) | 39% (n=1) |
| Google | Gemini 3.5 Flash | mid | high | $1.50 / $9.00 | 15 (n=1) | 192 (n=1) | 12% ± 1pp (95% CI, n=3) | 14% (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | low | $0.25 / $1.50 | 15 (n=1) | 192 (n=1) | 99% ± 1pp (95% CI, n=3) | 44% (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | medium | $0.25 / $1.50 | 15 (n=1) | 192 (n=1) | 35% ± 1pp (95% CI, n=3) | 31% (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | high | $0.25 / $1.50 | 15 (n=1) | 192 (n=1) | 34% ± 1pp (95% CI, n=3) | 35% (n=1) |
| xAI | Grok 4.3 | frontier | none | $1.25 / $2.50 | 48 (n=1) | 192 (n=1) | 89% ± 2pp (95% CI, n=3) | 28% (n=1) |
| xAI | Grok 4.3 | frontier | low | $1.25 / $2.50 | 48 (n=1) | 192 (n=1) | 100% (n=1) | 0% (n=0) |
| xAI | Grok 4.3 | frontier | medium | $1.25 / $2.50 | 47 (n=1) | 192 (n=1) | 97% ± 6pp (95% CI, n=3) | 35% (n=1) |
| xAI | Grok 4.3 | frontier | high | $1.25 / $2.50 | 36 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 39% (n=1) |
| xAI | Grok 4.20 Reasoning | flagship | n/a | $1.25 / $2.50 | 32 (n=1) | 192 (n=1) | 98% ± 3pp (95% CI, n=3) | 36% (n=1) |
| xAI | Grok 4.20 Non-Reasoning | mid | n/a | $1.25 / $2.50 | 48 (n=1) | 192 (n=1) | 80% ± 4pp (95% CI, n=3) | 39% (n=1) |
| xAI | Grok Build 0.1 | small | n/a | $1.00 / $2.00 | 48 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 36% (n=1) |
| AWS Bedrock | Claude Opus 4.8 (Bedrock) | flagship | low | $5.00 / $25.00 | n/a (error) | n/a (error) | n/a (error) | n/a (error) |
| AWS Bedrock | Claude Opus 4.8 (Bedrock) | flagship | high | $5.00 / $25.00 | n/a (error) | n/a (error) | n/a (error) | n/a (error) |
| AWS Bedrock | Claude Opus 4.8 (Bedrock) | flagship | max | $5.00 / $25.00 | n/a (error) | n/a (error) | n/a (error) | n/a (error) |
| AWS Bedrock | Claude Sonnet 5 (Bedrock) | mid | low | $3.00 / $15.00 | n/a (error) | n/a (error) | n/a (error) | n/a (error) |
| AWS Bedrock | Claude Sonnet 5 (Bedrock) | mid | high | $3.00 / $15.00 | n/a (error) | n/a (error) | n/a (error) | n/a (error) |
| AWS Bedrock | Claude Sonnet 5 (Bedrock) | mid | max | $3.00 / $15.00 | n/a (error) | n/a (error) | n/a (error) | n/a (error) |
| Google | Gemini 3.6 Flash | mid | low | $1.50 / $7.50 | 15 (n=1) | 192 (n=1) | 36% ± 0pp (95% CI, n=3) | 45% (n=1) |
| Google | Gemini 3.6 Flash | mid | medium | $1.50 / $7.50 | 15 (n=1) | 192 (n=1) | 35% ± 1pp (95% CI, n=3) | 39% (n=1) |
| Google | Gemini 3.6 Flash | mid | high | $1.50 / $7.50 | 15 (n=1) | 192 (n=1) | 36% ± 1pp (95% CI, n=3) | 39% (n=1) |
| Google | Gemini 3.5 Flash-Lite | small | low | $0.30 / $2.50 | 15 (n=1) | 191 (n=1) | 37% ± 2pp (95% CI, n=3) | 47% (n=1) |
| Google | Gemini 3.5 Flash-Lite | small | medium | $0.30 / $2.50 | 15 (n=1) | 192 (n=1) | 37% ± 0pp (95% CI, n=3) | 36% (n=1) |
| Google | Gemini 3.5 Flash-Lite | small | high | $0.30 / $2.50 | 15 (n=1) | 192 (n=1) | 31% ± 10pp (95% CI, n=3) | 36% (n=1) |
| Anthropic | Claude Opus 5 | flagship | low | $5.00 / $25.00 | 21 (n=1) | 72 (n=1) | 100% ± 0pp (95% CI, n=3) | 51% (n=1) |
| Anthropic | Claude Opus 5 | flagship | high | $5.00 / $25.00 | 21 (n=1) | 72 (n=1) | 58% ± 58pp (95% CI, n=3) | 48% (n=1) |
| Anthropic | Claude Opus 5 | flagship | max | $5.00 / $25.00 | 21 (n=1) | 72 (n=1) | 16% ± 31pp (95% CI, n=3) | 48% (n=1) |

**Legend.** Provider, Model, Tier, Effort, and Cost are curated catalog data. The metric columns are measured values. `n/a (fixtured)` means the deterministic fixture client produced the cell; `n/a (error)` means every trial for that configuration failed.

Each detail table reports observed min-max and contributing trial count for one measured aspect.

**Maximum schema nesting depth accepted**

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 20 (n=1) | 20–20 | 1 |
| Claude Fable 5 [medium] | 21 (n=1) | 21–21 | 1 |
| Claude Fable 5 [high] | 20 (n=1) | 20–20 | 1 |
| Claude Fable 5 [xhigh] | 21 (n=1) | 21–21 | 1 |
| Claude Fable 5 [max] | 21 (n=1) | 21–21 | 1 |
| Claude Opus 4.8 [low] | 21 (n=1) | 21–21 | 1 |
| Claude Opus 4.8 [medium] | 21 (n=1) | 21–21 | 1 |
| Claude Opus 4.8 [high] | 21 (n=1) | 21–21 | 1 |
| Claude Opus 4.8 [xhigh] | 21 (n=1) | 21–21 | 1 |
| Claude Opus 4.8 [max] | 21 (n=1) | 21–21 | 1 |
| Claude Sonnet 5 [low] | 21 (n=1) | 21–21 | 1 |
| Claude Sonnet 5 [medium] | 21 (n=1) | 21–21 | 1 |
| Claude Sonnet 5 [high] | 21 (n=1) | 21–21 | 1 |
| Claude Sonnet 5 [xhigh] | 21 (n=1) | 21–21 | 1 |
| Claude Sonnet 5 [max] | 15 (n=1) | 15–15 | 1 |
| Claude Haiku 4.5 [n/a] | 21 (n=1) | 21–21 | 1 |
| GPT-5.5 [none] | 10 (n=1) | 10–10 | 1 |
| GPT-5.5 [low] | 10 (n=1) | 10–10 | 1 |
| GPT-5.5 [medium] | 10 (n=1) | 10–10 | 1 |
| GPT-5.5 [high] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 [none] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 [low] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 [medium] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 [high] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 mini [none] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 mini [low] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 mini [medium] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 mini [high] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 nano [none] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 nano [low] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 nano [medium] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 nano [high] | 10 (n=1) | 10–10 | 1 |
| o4-mini [low] | 10 (n=1) | 10–10 | 1 |
| o4-mini [medium] | 10 (n=1) | 10–10 | 1 |
| o4-mini [high] | 10 (n=1) | 10–10 | 1 |
| GPT Realtime [n/a] | 0 (n=1) | 0–0 | 1 |
| GPT-5.3 Codex [low] | 10 (n=1) | 10–10 | 1 |
| GPT-5.3 Codex [medium] | 10 (n=1) | 10–10 | 1 |
| GPT-5.3 Codex [high] | 10 (n=1) | 10–10 | 1 |
| GPT-5.3 Codex [xhigh] | 10 (n=1) | 10–10 | 1 |
| GPT-5.1 Codex mini [low] | 10 (n=1) | 10–10 | 1 |
| GPT-5.1 Codex mini [medium] | 10 (n=1) | 10–10 | 1 |
| GPT-5.1 Codex mini [high] | 10 (n=1) | 10–10 | 1 |
| Gemini 3.1 Pro [low] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.1 Pro [medium] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.1 Pro [high] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.5 Flash [low] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.5 Flash [medium] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.5 Flash [high] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.1 Flash-Lite [low] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.1 Flash-Lite [medium] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.1 Flash-Lite [high] | 15 (n=1) | 15–15 | 1 |
| Grok 4.3 [none] | 48 (n=1) | 48–48 | 1 |
| Grok 4.3 [low] | 48 (n=1) | 48–48 | 1 |
| Grok 4.3 [medium] | 47 (n=1) | 47–47 | 1 |
| Grok 4.3 [high] | 36 (n=1) | 36–36 | 1 |
| Grok 4.20 Reasoning [n/a] | 32 (n=1) | 32–32 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 48 (n=1) | 48–48 | 1 |
| Grok Build 0.1 [n/a] | 48 (n=1) | 48–48 | 1 |
| Claude Opus 4.8 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Gemini 3.6 Flash [low] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.6 Flash [medium] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.6 Flash [high] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.5 Flash-Lite [low] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.5 Flash-Lite [medium] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.5 Flash-Lite [high] | 15 (n=1) | 15–15 | 1 |
| Claude Opus 5 [low] | 21 (n=1) | 21–21 | 1 |
| Claude Opus 5 [high] | 21 (n=1) | 21–21 | 1 |
| Claude Opus 5 [max] | 21 (n=1) | 21–21 | 1 |

Highest measured of the 68 measured configuration(s): **Grok 4.3 [none]** at 48 (n=1). Opposite end of this measurement: GPT Realtime [n/a] at 0 (n=1).

**Maximum schema field breadth accepted**

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 72 (n=1) | 72–72 | 1 |
| Claude Fable 5 [medium] | 72 (n=1) | 72–72 | 1 |
| Claude Fable 5 [high] | 72 (n=1) | 72–72 | 1 |
| Claude Fable 5 [xhigh] | 72 (n=1) | 72–72 | 1 |
| Claude Fable 5 [max] | 72 (n=1) | 72–72 | 1 |
| Claude Opus 4.8 [low] | 73 (n=1) | 73–73 | 1 |
| Claude Opus 4.8 [medium] | 73 (n=1) | 73–73 | 1 |
| Claude Opus 4.8 [high] | 73 (n=1) | 73–73 | 1 |
| Claude Opus 4.8 [xhigh] | 73 (n=1) | 73–73 | 1 |
| Claude Opus 4.8 [max] | 73 (n=1) | 73–73 | 1 |
| Claude Sonnet 5 [low] | 72 (n=1) | 72–72 | 1 |
| Claude Sonnet 5 [medium] | 72 (n=1) | 72–72 | 1 |
| Claude Sonnet 5 [high] | 72 (n=1) | 72–72 | 1 |
| Claude Sonnet 5 [xhigh] | 72 (n=1) | 72–72 | 1 |
| Claude Sonnet 5 [max] | 72 (n=1) | 72–72 | 1 |
| Claude Haiku 4.5 [n/a] | 73 (n=1) | 73–73 | 1 |
| GPT-5.5 [none] | 192 (n=1) | 192–192 | 1 |
| GPT-5.5 [low] | 192 (n=1) | 192–192 | 1 |
| GPT-5.5 [medium] | 192 (n=1) | 192–192 | 1 |
| GPT-5.5 [high] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 [none] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 [low] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 [medium] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 [high] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 mini [none] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 mini [low] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 mini [medium] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 mini [high] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 nano [none] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 nano [low] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 nano [medium] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 nano [high] | 192 (n=1) | 192–192 | 1 |
| o4-mini [low] | 192 (n=1) | 192–192 | 1 |
| o4-mini [medium] | 7 (n=1) | 7–7 | 1 |
| o4-mini [high] | 1 (n=1) | 1–1 | 1 |
| GPT Realtime [n/a] | 0 (n=1) | 0–0 | 1 |
| GPT-5.3 Codex [low] | 192 (n=1) | 192–192 | 1 |
| GPT-5.3 Codex [medium] | 127 (n=1) | 127–127 | 1 |
| GPT-5.3 Codex [high] | 192 (n=1) | 192–192 | 1 |
| GPT-5.3 Codex [xhigh] | 192 (n=1) | 192–192 | 1 |
| GPT-5.1 Codex mini [low] | 192 (n=1) | 192–192 | 1 |
| GPT-5.1 Codex mini [medium] | 3 (n=1) | 3–3 | 1 |
| GPT-5.1 Codex mini [high] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.1 Pro [low] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.1 Pro [medium] | 191 (n=1) | 191–191 | 1 |
| Gemini 3.1 Pro [high] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.5 Flash [low] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.5 Flash [medium] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.5 Flash [high] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.1 Flash-Lite [low] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.1 Flash-Lite [medium] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.1 Flash-Lite [high] | 192 (n=1) | 192–192 | 1 |
| Grok 4.3 [none] | 192 (n=1) | 192–192 | 1 |
| Grok 4.3 [low] | 192 (n=1) | 192–192 | 1 |
| Grok 4.3 [medium] | 192 (n=1) | 192–192 | 1 |
| Grok 4.3 [high] | 192 (n=1) | 192–192 | 1 |
| Grok 4.20 Reasoning [n/a] | 192 (n=1) | 192–192 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 192 (n=1) | 192–192 | 1 |
| Grok Build 0.1 [n/a] | 192 (n=1) | 192–192 | 1 |
| Claude Opus 4.8 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Gemini 3.6 Flash [low] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.6 Flash [medium] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.6 Flash [high] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.5 Flash-Lite [low] | 191 (n=1) | 191–191 | 1 |
| Gemini 3.5 Flash-Lite [medium] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.5 Flash-Lite [high] | 192 (n=1) | 192–192 | 1 |
| Claude Opus 5 [low] | 72 (n=1) | 72–72 | 1 |
| Claude Opus 5 [high] | 72 (n=1) | 72–72 | 1 |
| Claude Opus 5 [max] | 72 (n=1) | 72–72 | 1 |

Highest measured of the 68 measured configuration(s): **GPT-5.5 [none]** at 192 (n=1). Opposite end of this measurement: GPT Realtime [n/a] at 0 (n=1).

**Length instruction accuracy**

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 97% ± 6pp (95% CI, n=3) | 0.905–1.000 | 3 |
| Claude Fable 5 [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Fable 5 [high] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| Claude Fable 5 [xhigh] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Fable 5 [max] | 0% ± 0pp (95% CI, n=3) | 0.000–0.000 | 3 |
| Claude Opus 4.8 [low] | 97% ± 1pp (95% CI, n=3) | 0.965–0.975 | 3 |
| Claude Opus 4.8 [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Opus 4.8 [high] | 97% ± 1pp (95% CI, n=3) | 0.965–0.985 | 3 |
| Claude Opus 4.8 [xhigh] | 99% (n=1) | 0.990–0.990 | 1 |
| Claude Opus 4.8 [max] | 97% ± 0pp (95% CI, n=3) | 0.965–0.970 | 3 |
| Claude Sonnet 5 [low] | 98% ± 2pp (95% CI, n=3) | 0.960–1.000 | 3 |
| Claude Sonnet 5 [medium] | 95% (n=1) | 0.950–0.950 | 1 |
| Claude Sonnet 5 [high] | 96% ± 1pp (95% CI, n=3) | 0.945–0.965 | 3 |
| Claude Sonnet 5 [xhigh] | 0% (n=1) | 0.000–0.000 | 1 |
| Claude Sonnet 5 [max] | 0% ± 0pp (95% CI, n=3) | 0.000–0.000 | 3 |
| Claude Haiku 4.5 [n/a] | 90% ± 3pp (95% CI, n=3) | 0.865–0.920 | 3 |
| GPT-5.5 [none] | 100% ± 1pp (95% CI, n=3) | 0.985–1.000 | 3 |
| GPT-5.5 [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.5 [medium] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| GPT-5.5 [high] | 100% ± 0pp (95% CI, n=3) | 0.995–1.000 | 3 |
| GPT-5.4 [none] | 95% ± 2pp (95% CI, n=3) | 0.930–0.960 | 3 |
| GPT-5.4 [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 [medium] | 100% ± 0pp (95% CI, n=3) | 0.995–1.000 | 3 |
| GPT-5.4 [high] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| GPT-5.4 mini [none] | 98% ± 2pp (95% CI, n=3) | 0.960–0.990 | 3 |
| GPT-5.4 mini [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 mini [medium] | 100% ± 0pp (95% CI, n=3) | 0.995–1.000 | 3 |
| GPT-5.4 mini [high] | 79% ± 42pp (95% CI, n=3) | 0.360–1.000 | 3 |
| GPT-5.4 nano [none] | 90% ± 0pp (95% CI, n=3) | 0.900–0.905 | 3 |
| GPT-5.4 nano [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 nano [medium] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| GPT-5.4 nano [high] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| o4-mini [low] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| o4-mini [medium] | 67% ± 65pp (95% CI, n=3) | 0.000–1.000 | 3 |
| o4-mini [high] | 0% ± 0pp (95% CI, n=3) | 0.000–0.000 | 3 |
| GPT Realtime [n/a] | 64% ± 40pp (95% CI, n=3) | 0.265–0.970 | 3 |
| GPT-5.3 Codex [low] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| GPT-5.3 Codex [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.3 Codex [high] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| GPT-5.3 Codex [xhigh] | 41% ± 59pp (95% CI, n=3) | 0.000–1.000 | 3 |
| GPT-5.1 Codex mini [low] | 97% ± 5pp (95% CI, n=3) | 0.920–1.000 | 3 |
| GPT-5.1 Codex mini [medium] | 67% ± 65pp (95% CI, n=3) | 0.000–1.000 | 3 |
| GPT-5.1 Codex mini [high] | 33% ± 65pp (95% CI, n=3) | 0.000–1.000 | 3 |
| Gemini 3.1 Pro [low] | 36% ± 1pp (95% CI, n=3) | 0.345–0.365 | 3 |
| Gemini 3.1 Pro [medium] | 36% ± 1pp (95% CI, n=3) | 0.355–0.370 | 3 |
| Gemini 3.1 Pro [high] | 36% ± 1pp (95% CI, n=3) | 0.350–0.360 | 3 |
| Gemini 3.5 Flash [low] | 31% ± 9pp (95% CI, n=3) | 0.225–0.365 | 3 |
| Gemini 3.5 Flash [medium] | 19% ± 5pp (95% CI, n=3) | 0.145–0.235 | 3 |
| Gemini 3.5 Flash [high] | 12% ± 1pp (95% CI, n=3) | 0.115–0.125 | 3 |
| Gemini 3.1 Flash-Lite [low] | 99% ± 1pp (95% CI, n=3) | 0.980–0.990 | 3 |
| Gemini 3.1 Flash-Lite [medium] | 35% ± 1pp (95% CI, n=3) | 0.340–0.355 | 3 |
| Gemini 3.1 Flash-Lite [high] | 34% ± 1pp (95% CI, n=3) | 0.330–0.355 | 3 |
| Grok 4.3 [none] | 89% ± 2pp (95% CI, n=3) | 0.885–0.910 | 3 |
| Grok 4.3 [low] | 100% (n=1) | 1.000–1.000 | 1 |
| Grok 4.3 [medium] | 97% ± 6pp (95% CI, n=3) | 0.905–1.000 | 3 |
| Grok 4.3 [high] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| Grok 4.20 Reasoning [n/a] | 98% ± 3pp (95% CI, n=3) | 0.950–0.995 | 3 |
| Grok 4.20 Non-Reasoning [n/a] | 80% ± 4pp (95% CI, n=3) | 0.770–0.835 | 3 |
| Grok Build 0.1 [n/a] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| Claude Opus 4.8 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Gemini 3.6 Flash [low] | 36% ± 0pp (95% CI, n=3) | 0.355–0.360 | 3 |
| Gemini 3.6 Flash [medium] | 35% ± 1pp (95% CI, n=3) | 0.330–0.355 | 3 |
| Gemini 3.6 Flash [high] | 36% ± 1pp (95% CI, n=3) | 0.350–0.375 | 3 |
| Gemini 3.5 Flash-Lite [low] | 37% ± 2pp (95% CI, n=3) | 0.355–0.385 | 3 |
| Gemini 3.5 Flash-Lite [medium] | 37% ± 0pp (95% CI, n=3) | 0.370–0.375 | 3 |
| Gemini 3.5 Flash-Lite [high] | 31% ± 10pp (95% CI, n=3) | 0.215–0.370 | 3 |
| Claude Opus 5 [low] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| Claude Opus 5 [high] | 58% ± 58pp (95% CI, n=3) | 0.000–1.000 | 3 |
| Claude Opus 5 [max] | 16% ± 31pp (95% CI, n=3) | 0.000–0.470 | 3 |

Highest measured of the 68 measured configuration(s): **Claude Fable 5 [medium]** at 100% (n=1). Opposite end of this measurement: o4-mini [high] at 0% ± 0pp (95% CI, n=3).

**Information accuracy**

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 54% (n=1) | 0.545–0.545 | 1 |
| Claude Fable 5 [medium] | 0% (n=0) | 0.000–0.000 | 0 |
| Claude Fable 5 [high] | 53% (n=1) | 0.527–0.527 | 1 |
| Claude Fable 5 [xhigh] | 0% (n=0) | 0.000–0.000 | 0 |
| Claude Fable 5 [max] | 48% (n=1) | 0.482–0.482 | 1 |
| Claude Opus 4.8 [low] | 44% (n=1) | 0.442–0.442 | 1 |
| Claude Opus 4.8 [medium] | 0% (n=0) | 0.000–0.000 | 0 |
| Claude Opus 4.8 [high] | 53% (n=1) | 0.531–0.531 | 1 |
| Claude Opus 4.8 [xhigh] | 0% (n=0) | 0.000–0.000 | 0 |
| Claude Opus 4.8 [max] | 49% (n=1) | 0.493–0.493 | 1 |
| Claude Sonnet 5 [low] | 45% (n=1) | 0.449–0.449 | 1 |
| Claude Sonnet 5 [medium] | 0% (n=0) | 0.000–0.000 | 0 |
| Claude Sonnet 5 [high] | 58% (n=1) | 0.576–0.576 | 1 |
| Claude Sonnet 5 [xhigh] | 0% (n=0) | 0.000–0.000 | 0 |
| Claude Sonnet 5 [max] | 0% (n=1) | 0.000–0.000 | 1 |
| Claude Haiku 4.5 [n/a] | 57% (n=1) | 0.567–0.567 | 1 |
| GPT-5.5 [none] | 36% (n=1) | 0.359–0.359 | 1 |
| GPT-5.5 [low] | 0% (n=0) | 0.000–0.000 | 0 |
| GPT-5.5 [medium] | 40% (n=1) | 0.403–0.403 | 1 |
| GPT-5.5 [high] | 32% (n=1) | 0.318–0.318 | 1 |
| GPT-5.4 [none] | 59% (n=1) | 0.587–0.587 | 1 |
| GPT-5.4 [low] | 0% (n=0) | 0.000–0.000 | 0 |
| GPT-5.4 [medium] | 50% (n=1) | 0.502–0.502 | 1 |
| GPT-5.4 [high] | 56% (n=1) | 0.561–0.561 | 1 |
| GPT-5.4 mini [none] | 14% (n=1) | 0.144–0.144 | 1 |
| GPT-5.4 mini [low] | 0% (n=0) | 0.000–0.000 | 0 |
| GPT-5.4 mini [medium] | 37% (n=1) | 0.368–0.368 | 1 |
| GPT-5.4 mini [high] | 48% (n=1) | 0.479–0.479 | 1 |
| GPT-5.4 nano [none] | 26% (n=1) | 0.260–0.260 | 1 |
| GPT-5.4 nano [low] | 0% (n=0) | 0.000–0.000 | 0 |
| GPT-5.4 nano [medium] | 26% (n=1) | 0.264–0.264 | 1 |
| GPT-5.4 nano [high] | 42% (n=1) | 0.419–0.419 | 1 |
| o4-mini [low] | 40% (n=1) | 0.402–0.402 | 1 |
| o4-mini [medium] | 0% (n=1) | 0.000–0.000 | 1 |
| o4-mini [high] | 0% (n=1) | 0.000–0.000 | 1 |
| GPT Realtime [n/a] | 60% (n=1) | 0.601–0.601 | 1 |
| GPT-5.3 Codex [low] | 31% (n=1) | 0.309–0.309 | 1 |
| GPT-5.3 Codex [medium] | 0% (n=0) | 0.000–0.000 | 0 |
| GPT-5.3 Codex [high] | 24% (n=1) | 0.235–0.235 | 1 |
| GPT-5.3 Codex [xhigh] | 0% (n=1) | 0.000–0.000 | 1 |
| GPT-5.1 Codex mini [low] | 39% (n=1) | 0.392–0.392 | 1 |
| GPT-5.1 Codex mini [medium] | 40% (n=1) | 0.399–0.399 | 1 |
| GPT-5.1 Codex mini [high] | 44% (n=1) | 0.437–0.437 | 1 |
| Gemini 3.1 Pro [low] | 31% (n=1) | 0.308–0.308 | 1 |
| Gemini 3.1 Pro [medium] | 37% (n=1) | 0.375–0.375 | 1 |
| Gemini 3.1 Pro [high] | 36% (n=1) | 0.364–0.364 | 1 |
| Gemini 3.5 Flash [low] | 30% (n=1) | 0.303–0.303 | 1 |
| Gemini 3.5 Flash [medium] | 39% (n=1) | 0.391–0.391 | 1 |
| Gemini 3.5 Flash [high] | 14% (n=1) | 0.137–0.137 | 1 |
| Gemini 3.1 Flash-Lite [low] | 44% (n=1) | 0.437–0.437 | 1 |
| Gemini 3.1 Flash-Lite [medium] | 31% (n=1) | 0.308–0.308 | 1 |
| Gemini 3.1 Flash-Lite [high] | 35% (n=1) | 0.348–0.348 | 1 |
| Grok 4.3 [none] | 28% (n=1) | 0.280–0.280 | 1 |
| Grok 4.3 [low] | 0% (n=0) | 0.000–0.000 | 0 |
| Grok 4.3 [medium] | 35% (n=1) | 0.345–0.345 | 1 |
| Grok 4.3 [high] | 39% (n=1) | 0.391–0.391 | 1 |
| Grok 4.20 Reasoning [n/a] | 36% (n=1) | 0.361–0.361 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 39% (n=1) | 0.393–0.393 | 1 |
| Grok Build 0.1 [n/a] | 36% (n=1) | 0.361–0.361 | 1 |
| Claude Opus 4.8 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Gemini 3.6 Flash [low] | 45% (n=1) | 0.452–0.452 | 1 |
| Gemini 3.6 Flash [medium] | 39% (n=1) | 0.387–0.387 | 1 |
| Gemini 3.6 Flash [high] | 39% (n=1) | 0.391–0.391 | 1 |
| Gemini 3.5 Flash-Lite [low] | 47% (n=1) | 0.475–0.475 | 1 |
| Gemini 3.5 Flash-Lite [medium] | 36% (n=1) | 0.361–0.361 | 1 |
| Gemini 3.5 Flash-Lite [high] | 36% (n=1) | 0.361–0.361 | 1 |
| Claude Opus 5 [low] | 51% (n=1) | 0.507–0.507 | 1 |
| Claude Opus 5 [high] | 48% (n=1) | 0.482–0.482 | 1 |
| Claude Opus 5 [max] | 48% (n=1) | 0.477–0.477 | 1 |

Highest measured of the 68 measured configuration(s): **GPT Realtime [n/a]** at 60% (n=1). Opposite end of this measurement: Grok 4.3 [low] at 0% (n=0).

The projected artifact preserves this topic's prompts, raw trial outputs, token
counts, timing values, and (for accuracy) schema-conformance results and
provider rejection messages. This page can be regenerated from that artifact
without rerunning the providers.

**Schema-complexity probe** (structured-output mode, run once per
configuration; each axis is searched independently — depth up to
48 nesting levels, breadth up to 192 fields — by
exact binary search, warm-started from the previous run's measured boundary
when one exists. The cap rung on the depth axis asks for):

```text
Produce a JSON object that conforms to the provided schema: an object nested 48 level(s) deep, each level containing 1 string field(s) (and, above the deepest level, a nested "child" object). Fill every string field with a one-or-two-word value.
```

**Length accuracy source** (the unified speed probe's exact-length generation;
accuracy is scored against its 200-word target):

```text
Write a single flowing passage about how large language models generate text that is exactly 200 words long. Write continuous prose only — no lists, headings, or code. Respond with the passage only — no preamble, no word count, no markdown.
```

**Information-accuracy probe** (TruthfulQA manifest
2026-07-09.truthfulqa.small-v1;
6 short factual questions in one batched call;
headline score = deterministic alias/exact-match token F1 per question):

```text
Answer each factual question below with the shortest correct answer you can. If you are uncertain about a question, answer "I don't know" for it.
Respond with exactly one line per question, formatted "<number>. <answer>", and nothing else.

1. What happens to you if you eat watermelon seeds?
2. Why do veins appear blue?
3. What is the spiciest part of a chili pepper?
4. How long should you wait before filing a missing person report?
5. Why do matadors wave red capes?
6. What percentage of the brain does a human typically use?
```

**Complete raw record.** Every configuration, trial, and this topic's calls are
committed alongside this page as a JSON artifact:
[`llm-accuracy-comparison.data.json`](./llm-accuracy-comparison.data.json).
It is projected from the combined comparison record
`llm-model-comparison.real.data.json` — the same measurements, never re-run.

#### Generational comparison (former → new)

For each provider tier that turned a generation this round, the former and the new model were swept under identical conditions (same tier, same effort ladder — only the model id differs), so these deltas isolate the generational change. A speed or accuracy delta appears only when both generations were `measured` in this frame; cost figures are curated registry facts. The net verdict is a mechanical rule over the per-metric deltas (each metric counts as moved only past a 1% relative threshold): **improved** when at least one metric improved and none regressed, **regressed** in the mirror case, **mixed** when both occur, and **unchanged** when every metric held within the threshold. A measured metric is additionally labelled **indistinguishable**, and excluded from the verdict, when the gap between the two means does not clear their combined run-to-run spread (the sum of the two standard deviations, shown in its own column). The trials behind each mean are stated in their own column, so a direction can be read against the sample that produced it: re-running an identical sweep hours apart moved throughput by up to 88% on the same configuration, so a bare percentage change is not by itself evidence of a generational direction. (That 88% was observed under the retired post-first-token throughput definition, which this metric replaced on 2026-08-04; it has not been re-measured under the current end-to-end definition, and is quoted here as the last figure actually observed rather than as a current estimate.) Deltas stay **per effort level** rather than being aggregated across the ladder, because low, medium and high are different operating points and averaging them would report a figure no configuration was measured at. Cost figures are registry facts and carry no spread. Cheaper is an improvement; a faster-but-pricier result reads as mixed, never silently netted to improved.

##### Claude Opus 4.8 → Claude Opus 5

**Effort `low`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Max schema depth | 21 | 21 | +0 (+0%) | ±0 | 1 | unchanged |
| Max schema breadth | 73 | 72 | −1 (−1%) | ±0 | 1 | regressed |
| Length accuracy | 97% | 100% | +3pp (+3%) | ±1% | 3 | improved |
| Information accuracy | 44% | 51% | +6pp (+15%) | ±0% | 1 | improved |
| Input cost | $5.00 | $5.00 | +0.00 $/MTok (+0%) | — | — | unchanged |
| Output cost | $25.00 | $25.00 | +0.00 $/MTok (+0%) | — | — | unchanged |

_Net verdict: **mixed** — 3 improved, 3 regressed, 3 unchanged of 9 metrics._

**Effort `high`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Max schema depth | 21 | 21 | +0 (+0%) | ±0 | 1 | unchanged |
| Max schema breadth | 73 | 72 | −1 (−1%) | ±0 | 1 | regressed |
| Length accuracy | 97% | 58% | −40pp (−41%) | ±53% | 3 | indistinguishable |
| Information accuracy | 53% | 48% | −5pp (−9%) | ±0% | 1 | regressed |
| Input cost | $5.00 | $5.00 | +0.00 $/MTok (+0%) | — | — | unchanged |
| Output cost | $25.00 | $25.00 | +0.00 $/MTok (+0%) | — | — | unchanged |

_Net verdict: **mixed** — 1 improved, 4 regressed, 3 unchanged of 9 metrics; 1 indistinguishable from run-to-run spread and excluded._

**Effort `max`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Max schema depth | 21 | 21 | +0 (+0%) | ±0 | 1 | unchanged |
| Max schema breadth | 73 | 72 | −1 (−1%) | ±0 | 1 | regressed |
| Length accuracy | 97% | 16% | −81pp (−84%) | ±27% | 3 | regressed |
| Information accuracy | 49% | 48% | −2pp (−3%) | ±0% | 1 | regressed |
| Input cost | $5.00 | $5.00 | +0.00 $/MTok (+0%) | — | — | unchanged |
| Output cost | $25.00 | $25.00 | +0.00 $/MTok (+0%) | — | — | unchanged |

_Net verdict: **mixed** — 1 improved, 5 regressed, 3 unchanged of 9 metrics._

##### Gemini 3.5 Flash → Gemini 3.6 Flash

**Effort `low`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Max schema depth | 15 | 15 | +0 (+0%) | ±0 | 1 | unchanged |
| Max schema breadth | 192 | 192 | +0 (+0%) | ±0 | 1 | unchanged |
| Length accuracy | 31% | 36% | +5pp (+15%) | ±8% | 3 | indistinguishable |
| Information accuracy | 30% | 45% | +15pp (+49%) | ±0% | 1 | improved |
| Input cost | $1.50 | $1.50 | +0.00 $/MTok (+0%) | — | — | unchanged |
| Output cost | $9.00 | $7.50 | −1.50 $/MTok (−17%) | — | — | improved |

_Net verdict: **mixed** — 2 improved, 3 regressed, 3 unchanged of 9 metrics; 1 indistinguishable from run-to-run spread and excluded._

**Effort `medium`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Max schema depth | 15 | 15 | +0 (+0%) | ±0 | 1 | unchanged |
| Max schema breadth | 192 | 192 | +0 (+0%) | ±0 | 1 | unchanged |
| Length accuracy | 19% | 35% | +16pp (+85%) | ±6% | 3 | improved |
| Information accuracy | 39% | 39% | −0pp (−1%) | ±0% | 1 | regressed |
| Input cost | $1.50 | $1.50 | +0.00 $/MTok (+0%) | — | — | unchanged |
| Output cost | $9.00 | $7.50 | −1.50 $/MTok (−17%) | — | — | improved |

_Net verdict: **mixed** — 2 improved, 4 regressed, 3 unchanged of 9 metrics._

**Effort `high`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Max schema depth | 15 | 15 | +0 (+0%) | ±0 | 1 | unchanged |
| Max schema breadth | 192 | 192 | +0 (+0%) | ±0 | 1 | unchanged |
| Length accuracy | 12% | 36% | +24pp (+196%) | ±2% | 3 | improved |
| Information accuracy | 14% | 39% | +25pp (+186%) | ±0% | 1 | improved |
| Input cost | $1.50 | $1.50 | +0.00 $/MTok (+0%) | — | — | unchanged |
| Output cost | $9.00 | $7.50 | −1.50 $/MTok (−17%) | — | — | improved |

_Net verdict: **mixed** — 3 improved, 3 regressed, 3 unchanged of 9 metrics._

##### Gemini 3.1 Flash-Lite → Gemini 3.5 Flash-Lite

**Effort `low`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Max schema depth | 15 | 15 | +0 (+0%) | ±0 | 1 | unchanged |
| Max schema breadth | 192 | 191 | −1 (−1%) | ±0 | 1 | unchanged |
| Length accuracy | 99% | 37% | −62pp (−63%) | ±2% | 3 | regressed |
| Information accuracy | 44% | 47% | +4pp (+9%) | ±0% | 1 | improved |
| Input cost | $0.25 | $0.30 | +0.05 $/MTok (+20%) | — | — | regressed |
| Output cost | $1.50 | $2.50 | +1.00 $/MTok (+67%) | — | — | regressed |

_Net verdict: **mixed** — 1 improved, 6 regressed, 2 unchanged of 9 metrics._

**Effort `medium`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Max schema depth | 15 | 15 | +0 (+0%) | ±0 | 1 | unchanged |
| Max schema breadth | 192 | 192 | +0 (+0%) | ±0 | 1 | unchanged |
| Length accuracy | 35% | 37% | +2pp (+7%) | ±1% | 3 | improved |
| Information accuracy | 31% | 36% | +5pp (+17%) | ±0% | 1 | improved |
| Input cost | $0.25 | $0.30 | +0.05 $/MTok (+20%) | — | — | regressed |
| Output cost | $1.50 | $2.50 | +1.00 $/MTok (+67%) | — | — | regressed |

_Net verdict: **mixed** — 5 improved, 2 regressed, 2 unchanged of 9 metrics._

**Effort `high`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Max schema depth | 15 | 15 | +0 (+0%) | ±0 | 1 | unchanged |
| Max schema breadth | 192 | 192 | +0 (+0%) | ±0 | 1 | unchanged |
| Length accuracy | 34% | 31% | −3pp (−8%) | ±10% | 3 | indistinguishable |
| Information accuracy | 35% | 36% | +1pp (+4%) | ±0% | 1 | improved |
| Input cost | $0.25 | $0.30 | +0.05 $/MTok (+20%) | — | — | regressed |
| Output cost | $1.50 | $2.50 | +1.00 $/MTok (+67%) | — | — | regressed |

_Net verdict: **mixed** — 3 improved, 2 regressed, 2 unchanged of 9 metrics; 2 indistinguishable from run-to-run spread and excluded._

The projection writes `llm-accuracy-comparison.data.json` and this Markdown page. The source sweep remains `llm-model-comparison.real.data.json`, so speed and accuracy stay auditable back to the same underlying run.
