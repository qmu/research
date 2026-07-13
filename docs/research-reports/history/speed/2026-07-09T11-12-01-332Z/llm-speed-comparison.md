---
title: LLM response speed comparison
description: A reproducible speed comparison of 19 large language models across 4 providers and 59 model×effort configurations, covering sustained generation throughput, time-to-first-token, and total response latency, over 3 trials. Projected from the shared LLM comparison sweep.
---

# LLM response speed comparison

This report compares **59 model×effort configurations** across
19 models and 4 providers on sustained generation throughput, time-to-first-token, and total response latency, over
**3 trials**.

The numbers here are a **projection of the combined LLM comparison sweep** — the
same trials, model×effort matrix, statistics, and provenance, restricted to this
topic's probes. They are not a separate measurement, so they match the combined
report cell-for-cell. Curated catalog facts (provider, model, tier, price,
effort) come from the model registry; measured values come from the projected
run artifact linked below.

## Comparison

| Provider | Model | Tier | Effort | Cost (in / out per MTok) | Throughput (tok/s) | TTFT (ms) | Total latency (ms) |
| -------- | ----- | ---- | ------ | ------------------------ | --- | --- | --- |
| anthropic | Claude Fable 5 | frontier | low | $6.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Fable 5 | frontier | medium | $6.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Fable 5 | frontier | high | $6.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Fable 5 | frontier | xhigh | $6.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Fable 5 | frontier | max | $6.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Opus 4.8 | flagship | low | $5.00 / $25.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Opus 4.8 | flagship | medium | $5.00 / $25.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Opus 4.8 | flagship | high | $5.00 / $25.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Opus 4.8 | flagship | xhigh | $5.00 / $25.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Opus 4.8 | flagship | max | $5.00 / $25.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Sonnet 5 | mid | low | $3.00 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Sonnet 5 | mid | medium | $3.00 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Sonnet 5 | mid | high | $3.00 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Sonnet 5 | mid | xhigh | $3.00 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Sonnet 5 | mid | max | $3.00 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| anthropic | Claude Haiku 4.5 | small | n/a | $1.00 / $5.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.5 | flagship | none | $5.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.5 | flagship | low | $5.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.5 | flagship | medium | $5.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.5 | flagship | high | $5.00 / $30.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 | mid | none | $2.50 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 | mid | low | $2.50 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 | mid | medium | $2.50 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 | mid | high | $2.50 / $15.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 mini | small | none | $0.50 / $2.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 mini | small | low | $0.50 / $2.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 mini | small | medium | $0.50 / $2.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 mini | small | high | $0.50 / $2.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 nano | small | none | $0.15 / $0.60 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 nano | small | low | $0.15 / $0.60 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 nano | small | medium | $0.15 / $0.60 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.4 nano | small | high | $0.15 / $0.60 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | o4-mini | mid | low | $1.10 / $4.40 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | o4-mini | mid | medium | $1.10 / $4.40 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | o4-mini | mid | high | $1.10 / $4.40 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT Realtime | flagship | n/a | $4.00 / $16.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.3 Codex | flagship | low | $1.75 / $14.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.3 Codex | flagship | medium | $1.75 / $14.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.3 Codex | flagship | high | $1.75 / $14.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.3 Codex | flagship | xhigh | $1.75 / $14.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.1 Codex mini | small | low | $0.25 / $2.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.1 Codex mini | small | medium | $0.25 / $2.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| openai | GPT-5.1 Codex mini | small | high | $0.25 / $2.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.1 Pro | flagship | low | $2.00 / $12.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.1 Pro | flagship | medium | $2.00 / $12.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.1 Pro | flagship | high | $2.00 / $12.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.5 Flash | mid | low | $0.30 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.5 Flash | mid | medium | $0.30 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.5 Flash | mid | high | $0.30 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.1 Flash-Lite | small | low | $0.10 / $0.40 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.1 Flash-Lite | small | medium | $0.10 / $0.40 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| google | Gemini 3.1 Flash-Lite | small | high | $0.10 / $0.40 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| xai | Grok 4.3 | frontier | none | $1.25 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| xai | Grok 4.3 | frontier | low | $1.25 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| xai | Grok 4.3 | frontier | medium | $1.25 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| xai | Grok 4.3 | frontier | high | $1.25 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| xai | Grok 4.20 Reasoning | flagship | n/a | $1.25 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| xai | Grok 4.20 Non-Reasoning | mid | n/a | $1.25 / $2.50 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| xai | Grok Build 0.1 | small | n/a | $1.00 / $2.00 | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |

**Legend.** Provider, Model, Tier, Effort, and Cost are curated catalog data.
The metric columns are measured values, each reported as mean ± 95% confidence
interval (1.96 × sample standard deviation / √n) with n over 3 trials.
`n/a (fixtured)` means the deterministic fixture client produced the cell (no
API key was used); `n/a (error)` means every trial for that configuration
failed. Provenance is written in the cell text, never encoded only by color.


## Per-aspect measurements

Each table reports the mean ± 95% confidence interval, observed min–max, and
contributing trial count for one measured aspect. A metric with n < 2 is shown
as a mean only and labelled with its n.

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

## Data transparency

The projected artifact preserves this topic's prompts, raw trial outputs, token
counts, timing values, and (for accuracy) schema-conformance results and
provider rejection messages. This page can be regenerated from that artifact
without rerunning the providers.

**Throughput probe** (streamed long generation; sustained tok/s is
measured over the generation window, excluding time-to-first-token):

```text
Write a detailed, flowing explanation of how large language models generate text of at least 400 words. Write continuous prose only — no lists, headings, or code. Do not stop early; keep going until you have written at least 400 words.
```

**Latency probe** (streamed short prompt; TTFT + total response time):

```text
In one short sentence, state a single interesting fact about the water cycle.
```

**Complete raw record.** Every configuration, trial, and this topic's calls are
committed alongside this page as a JSON artifact:
[`llm-speed-comparison.data.json`](./llm-speed-comparison.data.json).
It is projected from the combined comparison record
`llm-model-comparison.data.json` — the same measurements, never re-run.

## Scope & limitations

- **3 trials** per configuration×probe. This sample supports a run-level
  comparison, not a statistical claim about stable provider behavior.
- **Point-in-time.** Measured behavior reflects the models and APIs at the
  generated timestamp below.
- This topic tests narrow behaviors only (sustained generation throughput, time-to-first-token, and total response latency); it does not
  measure general capability or reasoning quality.
- **Effort semantics vary by provider**, so effort levels are more comparable
  within a provider than across providers.
- **This run includes non-measured configurations.** `n/a (fixtured)` and `n/a (error)` cells are not live measurements.
- **Generated:** 2026-01-01T00:00:00.000Z

## Reproduce

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (projects the committed compare fixture):
npm run research -- speed --fixture

# Against real providers, run the shared sweep, then project:
npm run compare        # measures every probe once
npm run research -- speed --real
```

This page is a projection of the combined comparison; run `compare` to measure
and `research speed` to regenerate this focused view.
