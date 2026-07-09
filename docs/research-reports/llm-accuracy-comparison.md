---
title: LLM output accuracy comparison
description: A reproducible accuracy comparison of 19 large language models across 4 providers and 59 model×effort configurations, covering JSON-schema structural limits and length-instruction following, over 1 trial. Projected from the shared LLM comparison sweep.
---

# LLM output accuracy comparison

The numbers here are a **projection of the combined LLM comparison sweep**: the same trials, model×effort matrix, statistics, and provenance, restricted to this topic's probes.

## 1. Research Purpose

This report helps narrow model choices by the measured constraints that matter for this topic. It is not a general model ranking and it does not re-run a separate benchmark.

## 2. Measurement Targets

### Target Models

The report covers **59 model×effort configurations** across 19 models and 4 providers. Curated catalog facts (provider, model, tier, price, effort) come from the model registry.

### Target Metrics

This topic covers JSON-schema structural limits and length-instruction following. Metric cells are reported as mean ± 95% confidence interval when n ≥ 2; metrics with n < 2 show the mean and sample count.

## 3. Scope and Constraints

- **1 trial** per configuration×probe. This sample supports a run-level comparison, not a statistical claim about stable provider behavior.
- **Point-in-time.** Measured behavior reflects the models and APIs at `2026-07-06T13:08:50.282Z`.
- This topic tests narrow behaviors only (JSON-schema structural limits and length-instruction following); it does not measure general capability or reasoning quality.
- **Effort semantics vary by provider**, so effort levels are more comparable within a provider than across providers.

**Not measured in this run.** Information accuracy — the source sweep (`llm-model-comparison.real.data.json`) predates this probe, so it is omitted here rather than shown as a value. Re-run `compare` to include it.

## 4. Verification Results

| Provider | Model | Tier | Effort | Cost (in / out per MTok) | Max schema depth | Max schema breadth | Length accuracy |
| -------- | ----- | ---- | ------ | ------------------------ | --- | --- | --- |
| Anthropic | Claude Fable 5 | frontier | low | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 100% (n=1) |
| Anthropic | Claude Fable 5 | frontier | medium | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 100% (n=1) |
| Anthropic | Claude Fable 5 | frontier | high | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 100% (n=1) |
| Anthropic | Claude Fable 5 | frontier | xhigh | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 100% (n=1) |
| Anthropic | Claude Fable 5 | frontier | max | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 100% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | low | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 100% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | medium | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 100% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | high | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 100% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | xhigh | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 99% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | max | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 99% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | low | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 93% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | medium | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 95% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | high | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 100% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | xhigh | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 0% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | max | $3.00 / $15.00 | 15 (n=1) | 72 (n=1) | 0% (n=1) |
| Anthropic | Claude Haiku 4.5 | small | n/a | $1.00 / $5.00 | 21 (n=1) | 73 (n=1) | 97% (n=1) |
| OpenAI | GPT-5.5 | flagship | none | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 96% (n=1) |
| OpenAI | GPT-5.5 | flagship | low | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.5 | flagship | medium | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.5 | flagship | high | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 | mid | none | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 93% (n=1) |
| OpenAI | GPT-5.4 | mid | low | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 | mid | medium | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 | mid | high | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 mini | small | none | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 97% (n=1) |
| OpenAI | GPT-5.4 mini | small | low | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 mini | small | medium | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 mini | small | high | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 nano | small | none | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 91% (n=1) |
| OpenAI | GPT-5.4 nano | small | low | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 nano | small | medium | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 nano | small | high | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | o4-mini | mid | low | $1.10 / $4.40 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | o4-mini | mid | medium | $1.10 / $4.40 | 10 (n=1) | 7 (n=1) | 100% (n=1) |
| OpenAI | o4-mini | mid | high | $1.10 / $4.40 | 10 (n=1) | 2 (n=1) | 0% (n=1) |
| OpenAI | GPT Realtime | flagship | n/a | $4.00 / $16.00 | 0 (n=1) | 0 (n=1) | 99% (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | low | $1.75 / $14.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | medium | $1.75 / $14.00 | 10 (n=1) | 127 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | high | $1.75 / $14.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | xhigh | $1.75 / $14.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | low | $0.25 / $2.00 | 10 (n=1) | 13 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | medium | $0.25 / $2.00 | 10 (n=1) | 6 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | high | $0.25 / $2.00 | 10 (n=1) | 57 (n=1) | 0% (n=1) |
| Google | Gemini 3.1 Pro | flagship | low | $2.00 / $12.00 | 15 (n=1) | 192 (n=1) | 100% (n=1) |
| Google | Gemini 3.1 Pro | flagship | medium | $2.00 / $12.00 | 15 (n=1) | 192 (n=1) | 100% (n=1) |
| Google | Gemini 3.1 Pro | flagship | high | $2.00 / $12.00 | 15 (n=1) | 192 (n=1) | 73% (n=1) |
| Google | Gemini 3.5 Flash | mid | low | $0.30 / $2.50 | 15 (n=1) | 192 (n=1) | 100% (n=1) |
| Google | Gemini 3.5 Flash | mid | medium | $0.30 / $2.50 | 15 (n=1) | 192 (n=1) | 27% (n=1) |
| Google | Gemini 3.5 Flash | mid | high | $0.30 / $2.50 | 15 (n=1) | 192 (n=1) | 15% (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | low | $0.10 / $0.40 | 15 (n=1) | 192 (n=1) | 100% (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | medium | $0.10 / $0.40 | 15 (n=1) | 192 (n=1) | 100% (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | high | $0.10 / $0.40 | 15 (n=1) | 192 (n=1) | 66% (n=1) |
| xAI | Grok 4.3 | frontier | none | $1.25 / $2.50 | 48 (n=1) | 192 (n=1) | 99% (n=1) |
| xAI | Grok 4.3 | frontier | low | $1.25 / $2.50 | 48 (n=1) | 192 (n=1) | 100% (n=1) |
| xAI | Grok 4.3 | frontier | medium | $1.25 / $2.50 | 48 (n=1) | 192 (n=1) | 100% (n=1) |
| xAI | Grok 4.3 | frontier | high | $1.25 / $2.50 | 22 (n=1) | 192 (n=1) | 100% (n=1) |
| xAI | Grok 4.20 Reasoning | flagship | n/a | $1.25 / $2.50 | 32 (n=1) | 192 (n=1) | 99% (n=1) |
| xAI | Grok 4.20 Non-Reasoning | mid | n/a | $1.25 / $2.50 | 48 (n=1) | 192 (n=1) | 97% (n=1) |
| xAI | Grok Build 0.1 | small | n/a | $1.00 / $2.00 | 11 (n=1) | 192 (n=1) | 100% (n=1) |

**Legend.** Provider, Model, Tier, Effort, and Cost are curated catalog data. The metric columns are measured values. `n/a (fixtured)` means the deterministic fixture client produced the cell; `n/a (error)` means every trial for that configuration failed.

Each detail table reports observed min-max and contributing trial count for one measured aspect.

**Maximum schema nesting depth accepted**

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 21 (n=1) | 21–21 | 1 |
| Claude Fable 5 [medium] | 21 (n=1) | 21–21 | 1 |
| Claude Fable 5 [high] | 21 (n=1) | 21–21 | 1 |
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
| Grok 4.3 [medium] | 48 (n=1) | 48–48 | 1 |
| Grok 4.3 [high] | 22 (n=1) | 22–22 | 1 |
| Grok 4.20 Reasoning [n/a] | 32 (n=1) | 32–32 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 48 (n=1) | 48–48 | 1 |
| Grok Build 0.1 [n/a] | 11 (n=1) | 11–11 | 1 |

Highest measured of the 59 measured configuration(s): **Grok 4.3 [none]** at 48 (n=1). Opposite end of this measurement: GPT Realtime [n/a] at 0 (n=1).

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
| o4-mini [high] | 2 (n=1) | 2–2 | 1 |
| GPT Realtime [n/a] | 0 (n=1) | 0–0 | 1 |
| GPT-5.3 Codex [low] | 192 (n=1) | 192–192 | 1 |
| GPT-5.3 Codex [medium] | 127 (n=1) | 127–127 | 1 |
| GPT-5.3 Codex [high] | 192 (n=1) | 192–192 | 1 |
| GPT-5.3 Codex [xhigh] | 192 (n=1) | 192–192 | 1 |
| GPT-5.1 Codex mini [low] | 13 (n=1) | 13–13 | 1 |
| GPT-5.1 Codex mini [medium] | 6 (n=1) | 6–6 | 1 |
| GPT-5.1 Codex mini [high] | 57 (n=1) | 57–57 | 1 |
| Gemini 3.1 Pro [low] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.1 Pro [medium] | 192 (n=1) | 192–192 | 1 |
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

Highest measured of the 59 measured configuration(s): **GPT-5.5 [none]** at 192 (n=1). Opposite end of this measurement: GPT Realtime [n/a] at 0 (n=1).

**Length instruction accuracy**

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Fable 5 [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Fable 5 [high] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Fable 5 [xhigh] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Fable 5 [max] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Opus 4.8 [low] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Opus 4.8 [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Opus 4.8 [high] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Opus 4.8 [xhigh] | 99% (n=1) | 0.990–0.990 | 1 |
| Claude Opus 4.8 [max] | 99% (n=1) | 0.990–0.990 | 1 |
| Claude Sonnet 5 [low] | 93% (n=1) | 0.930–0.930 | 1 |
| Claude Sonnet 5 [medium] | 95% (n=1) | 0.950–0.950 | 1 |
| Claude Sonnet 5 [high] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Sonnet 5 [xhigh] | 0% (n=1) | 0.000–0.000 | 1 |
| Claude Sonnet 5 [max] | 0% (n=1) | 0.000–0.000 | 1 |
| Claude Haiku 4.5 [n/a] | 97% (n=1) | 0.970–0.970 | 1 |
| GPT-5.5 [none] | 96% (n=1) | 0.960–0.960 | 1 |
| GPT-5.5 [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.5 [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.5 [high] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 [none] | 93% (n=1) | 0.930–0.930 | 1 |
| GPT-5.4 [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 [high] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 mini [none] | 97% (n=1) | 0.970–0.970 | 1 |
| GPT-5.4 mini [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 mini [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 mini [high] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 nano [none] | 91% (n=1) | 0.910–0.910 | 1 |
| GPT-5.4 nano [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 nano [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 nano [high] | 100% (n=1) | 1.000–1.000 | 1 |
| o4-mini [low] | 100% (n=1) | 1.000–1.000 | 1 |
| o4-mini [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| o4-mini [high] | 0% (n=1) | 0.000–0.000 | 1 |
| GPT Realtime [n/a] | 99% (n=1) | 0.990–0.990 | 1 |
| GPT-5.3 Codex [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.3 Codex [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.3 Codex [high] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.3 Codex [xhigh] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.1 Codex mini [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.1 Codex mini [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.1 Codex mini [high] | 0% (n=1) | 0.000–0.000 | 1 |
| Gemini 3.1 Pro [low] | 100% (n=1) | 1.000–1.000 | 1 |
| Gemini 3.1 Pro [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| Gemini 3.1 Pro [high] | 73% (n=1) | 0.730–0.730 | 1 |
| Gemini 3.5 Flash [low] | 100% (n=1) | 1.000–1.000 | 1 |
| Gemini 3.5 Flash [medium] | 27% (n=1) | 0.270–0.270 | 1 |
| Gemini 3.5 Flash [high] | 15% (n=1) | 0.150–0.150 | 1 |
| Gemini 3.1 Flash-Lite [low] | 100% (n=1) | 1.000–1.000 | 1 |
| Gemini 3.1 Flash-Lite [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| Gemini 3.1 Flash-Lite [high] | 66% (n=1) | 0.660–0.660 | 1 |
| Grok 4.3 [none] | 99% (n=1) | 0.990–0.990 | 1 |
| Grok 4.3 [low] | 100% (n=1) | 1.000–1.000 | 1 |
| Grok 4.3 [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| Grok 4.3 [high] | 100% (n=1) | 1.000–1.000 | 1 |
| Grok 4.20 Reasoning [n/a] | 99% (n=1) | 0.990–0.990 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 97% (n=1) | 0.970–0.970 | 1 |
| Grok Build 0.1 [n/a] | 100% (n=1) | 1.000–1.000 | 1 |

Highest measured of the 59 measured configuration(s): **Claude Fable 5 [low]** at 100% (n=1). Opposite end of this measurement: GPT-5.1 Codex mini [high] at 0% (n=1).

## 5. Analysis

Highest measured of the 59 measured configuration(s): **Grok 4.3 [none]** at 48 (n=1). Opposite end of this measurement: GPT Realtime [n/a] at 0 (n=1).

Highest measured of the 59 measured configuration(s): **GPT-5.5 [none]** at 192 (n=1). Opposite end of this measurement: GPT Realtime [n/a] at 0 (n=1).

Highest measured of the 59 measured configuration(s): **Claude Fable 5 [low]** at 100% (n=1). Opposite end of this measurement: GPT-5.1 Codex mini [high] at 0% (n=1).

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

The projected artifact preserves this topic's prompts, raw trial outputs, token
counts, timing values, and (for accuracy) schema-conformance results and
provider rejection messages. This page can be regenerated from that artifact
without rerunning the providers.

**Schema-complexity probe** (structured-output mode; each axis is
escalated independently — depth up to 48 nesting levels, breadth up
to 192 fields — climbing geometrically then bisecting to the tested
maximum. The first rung on the depth axis asks for):

```text
Produce a JSON object that conforms to the provided schema: an object nested 2 level(s) deep, each level containing 1 string field(s) (and, above the deepest level, a nested "child" object). Fill every string field with a one-or-two-word value.
```

**Length probe:**

```text
Write a single paragraph about the water cycle that is exactly 100 words long. Respond with the paragraph only — no preamble, no word count, no markdown.
```

**Complete raw record.** Every configuration, trial, and this topic's calls are
committed alongside this page as a JSON artifact:
[`llm-accuracy-comparison.data.json`](./llm-accuracy-comparison.data.json).
It is projected from the combined comparison record
`llm-model-comparison.real.data.json` — the same measurements, never re-run.

The projection writes `llm-accuracy-comparison.data.json` and this Markdown page. The source sweep remains `llm-model-comparison.real.data.json`, so speed and accuracy stay auditable back to the same underlying run.
