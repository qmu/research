---
title: LLM response speed
description: A reproducible speed comparison of 24 large language models across 5 providers and 74 model×effort configurations, covering sustained generation throughput, time-to-first-token, and total response latency, over 3 trials. Projected from the shared LLM comparison sweep.
---

# LLM response speed

The numbers here are a **projection of the combined LLM comparison sweep**: the same trials, model×effort matrix, statistics, and provenance, restricted to this topic's probes.

## 1. Research Purpose

This report helps narrow model choices by the measured constraints that matter for this topic. It is not a general model ranking and it does not re-run a separate benchmark.

## 2. Measurement Targets

### Target Models

The report covers **74 model×effort configurations** across 24 models and 5 providers. Curated catalog facts (provider, model, tier, price, effort) come from the model registry.

### Target Metrics

This topic covers sustained generation throughput, time-to-first-token, and total response latency. Metric cells are reported as mean ± 95% confidence interval when n ≥ 2; metrics with n < 2 show the mean and sample count.

## 3. Scope and Constraints

- **3 trials** per configuration×probe. This sample supports a run-level comparison, not a statistical claim about stable provider behavior.
- **Mixed measurement dates — this table is not a single point in time.** Its 74 configurations were measured across 5 dates: 13 on `2026-08-04`, 12 on `2026-07-27`, 6 on `2026-07-20`, 31 on `2026-07-12`, 12 on `2026-07-06`. Only the 13 measured on `2026-08-04` were re-run in this round; the rest carry forward from earlier frames, so cross-model comparisons between rows of different dates are not like-for-like. The former→new generational comparison in section 7 is unaffected — it is derived only from pairs where both generations were measured in the same frame.
- This topic tests narrow behaviors only (sustained generation throughput, time-to-first-token, and total response latency); it does not measure general capability or reasoning quality.
- **Effort semantics vary by provider**, so effort levels are more comparable within a provider than across providers.
- **This run includes non-measured configurations.** `n/a (fixtured)` and `n/a (error)` cells are not live measurements.

## 4. Verification Results

This run measured **68 of 74 configurations** across 5 providers and 24 models, over 3 trials per configuration×probe.

| Aspect | Best (configuration) | Median | Worst |
| ------ | -------------------- | ------ | ----- |
| Output throughput over the whole request | 194.4 tok/s — o4-mini [medium] | 55.9 tok/s | 4.1 tok/s |
| Time to first token | 0 ms — Claude Fable 5 [max] | 5553 ms | 37966 ms |
| Total response time | 623 ms — GPT-5.4 nano [low] | 7531 ms | 38918 ms |

Values are per-configuration means; "Best"/"Worst" follow each aspect's own direction (higher-is-better or lower-is-better). The full per-configuration tables — every model×effort cell with confidence intervals, min–max, and provenance — are in section 7, Verification Data.

This round includes a controlled former→new generational comparison: paired previous- and current-generation models were swept under identical conditions. The per-metric deltas and mechanically-derived net verdict are in section 7, Verification Data.

## 5. Analysis

Highest measured of the 68 measured configuration(s): **o4-mini [medium]** at 194 ± 6 tok/s (95% CI, n=3). Opposite end of this measurement: Grok 4.3 [low] at 4 tok/s (n=1).

Lowest measured of the 68 measured configuration(s): **Claude Fable 5 [max]** at 0 ms (n=0). Opposite end of this measurement: Grok 4.20 Reasoning [n/a] at 37966 ± 16419 ms (95% CI, n=3).

Lowest measured of the 68 measured configuration(s): **GPT-5.4 nano [low]** at 623 ms (n=1). Opposite end of this measurement: Grok 4.20 Reasoning [n/a] at 38918 ± 16237 ms (95% CI, n=3).

## 6. Reproduction

### Reproduction Steps

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (projects the committed compare fixture):
npm run research -- speed --fixture

# Against real providers, run the shared sweep, then project:
npm run compare
npm run research -- speed --real
```

### Reproduction Cost (Estimate)

The fixture projection is keyless and costless. The real path bills the shared `npm run compare` sweep; run `npm run compare -- --estimate` before a provider run to preview call count, estimated cost, and ETA.

### Cleanup

The projection creates no external resources. Real runs write local `.real` Markdown/data artifacts and update the shared comparison history; review those files before committing.

## 7. Verification Data

| Provider | Model | Tier | Effort | Cost (in / out per MTok) | Throughput (tok/s) | TTFT (ms) | Total latency (ms) |
| -------- | ----- | ---- | ------ | ------------------------ | --- | --- | --- |
| Anthropic | Claude Fable 5 | frontier | low | $10.00 / $50.00 | 82 ± 11 tok/s (95% CI, n=3) | 15753 ± 1690 ms (95% CI, n=3) | 18494 ± 1864 ms (95% CI, n=3) |
| Anthropic | Claude Fable 5 | frontier | medium | $6.00 / $30.00 | 15 tok/s (n=1) | 3434 ms (n=1) | 4418 ms (n=1) |
| Anthropic | Claude Fable 5 | frontier | high | $10.00 / $50.00 | 86 ± 3 tok/s (95% CI, n=3) | 17777 ± 955 ms (95% CI, n=3) | 20659 ± 1020 ms (95% CI, n=3) |
| Anthropic | Claude Fable 5 | frontier | xhigh | $6.00 / $30.00 | 12 tok/s (n=1) | 3466 ms (n=1) | 4253 ms (n=1) |
| Anthropic | Claude Fable 5 | frontier | max | $10.00 / $50.00 | 90 ± 2 tok/s (95% CI, n=3) | 0 ms (n=0) | 22807 ± 460 ms (95% CI, n=3) |
| Anthropic | Claude Opus 4.8 | flagship | low | $5.00 / $25.00 | 54 ± 5 tok/s (95% CI, n=3) | 1180 ± 179 ms (95% CI, n=3) | 7058 ± 652 ms (95% CI, n=3) |
| Anthropic | Claude Opus 4.8 | flagship | medium | $5.00 / $25.00 | 23 tok/s (n=1) | 1176 ms (n=1) | 1935 ms (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | high | $5.00 / $25.00 | 53 ± 1 tok/s (95% CI, n=3) | 1072 ± 56 ms (95% CI, n=3) | 7141 ± 255 ms (95% CI, n=3) |
| Anthropic | Claude Opus 4.8 | flagship | xhigh | $5.00 / $25.00 | 16 tok/s (n=1) | 2143 ms (n=1) | 2896 ms (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | max | $5.00 / $25.00 | 59 ± 6 tok/s (95% CI, n=3) | 890 ± 153 ms (95% CI, n=3) | 6444 ± 872 ms (95% CI, n=3) |
| Anthropic | Claude Sonnet 5 | mid | low | $3.00 / $15.00 | 47 ± 9 tok/s (95% CI, n=3) | 3373 ± 1454 ms (95% CI, n=3) | 8304 ± 1913 ms (95% CI, n=3) |
| Anthropic | Claude Sonnet 5 | mid | medium | $3.00 / $15.00 | 38 tok/s (n=1) | 938 ms (n=1) | 1757 ms (n=1) |
| Anthropic | Claude Sonnet 5 | mid | high | $3.00 / $15.00 | 58 ± 18 tok/s (95% CI, n=3) | 4568 ± 2883 ms (95% CI, n=3) | 8670 ± 1450 ms (95% CI, n=3) |
| Anthropic | Claude Sonnet 5 | mid | xhigh | $3.00 / $15.00 | 36 tok/s (n=1) | 961 ms (n=1) | 1589 ms (n=1) |
| Anthropic | Claude Sonnet 5 | mid | max | $3.00 / $15.00 | 104 ± 6 tok/s (95% CI, n=3) | 0 ms (n=0) | 19642 ± 1159 ms (95% CI, n=3) |
| Anthropic | Claude Haiku 4.5 | small | n/a | $1.00 / $5.00 | 70 ± 7 tok/s (95% CI, n=3) | 1005 ± 320 ms (95% CI, n=3) | 3816 ± 271 ms (95% CI, n=3) |
| OpenAI | GPT-5.5 | flagship | none | $5.00 / $30.00 | 38 ± 4 tok/s (95% CI, n=3) | 1295 ± 797 ms (95% CI, n=3) | 6264 ± 685 ms (95% CI, n=3) |
| OpenAI | GPT-5.5 | flagship | low | $5.00 / $30.00 | 13 tok/s (n=1) | 912 ms (n=1) | 1380 ms (n=1) |
| OpenAI | GPT-5.5 | flagship | medium | $5.00 / $30.00 | 72 ± 17 tok/s (95% CI, n=3) | 10768 ± 477 ms (95% CI, n=3) | 12439 ± 474 ms (95% CI, n=3) |
| OpenAI | GPT-5.5 | flagship | high | $5.00 / $30.00 | 80 ± 6 tok/s (95% CI, n=3) | 12353 ± 2045 ms (95% CI, n=3) | 13931 ± 2101 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 | mid | none | $2.50 / $15.00 | 69 ± 2 tok/s (95% CI, n=3) | 559 ± 120 ms (95% CI, n=3) | 3209 ± 30 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 | mid | low | $2.50 / $15.00 | 10 tok/s (n=1) | 1099 ms (n=1) | 1387 ms (n=1) |
| OpenAI | GPT-5.4 | mid | medium | $2.50 / $15.00 | 134 ± 12 tok/s (95% CI, n=3) | 6614 ± 732 ms (95% CI, n=3) | 7608 ± 707 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 | mid | high | $2.50 / $15.00 | 158 ± 15 tok/s (95% CI, n=3) | 7369 ± 3281 ms (95% CI, n=3) | 8246 ± 3266 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 mini | small | none | $0.50 / $2.00 | 99 ± 11 tok/s (95% CI, n=3) | 567 ± 27 ms (95% CI, n=3) | 2388 ± 325 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 mini | small | low | $0.50 / $2.00 | 54 tok/s (n=1) | 410 ms (n=1) | 678 ms (n=1) |
| OpenAI | GPT-5.4 mini | small | medium | $0.50 / $2.00 | 191 ± 12 tok/s (95% CI, n=3) | 5594 ± 246 ms (95% CI, n=3) | 6450 ± 260 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 mini | small | high | $0.50 / $2.00 | 179 ± 4 tok/s (95% CI, n=3) | 7211 ± 3669 ms (95% CI, n=3) | 7943 ± 3262 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 nano | small | none | $0.15 / $0.60 | 121 ± 11 tok/s (95% CI, n=3) | 592 ± 79 ms (95% CI, n=3) | 1751 ± 154 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 nano | small | low | $0.15 / $0.60 | 57 tok/s (n=1) | 368 ms (n=1) | 623 ms (n=1) |
| OpenAI | GPT-5.4 nano | small | medium | $0.15 / $0.60 | 171 ± 8 tok/s (95% CI, n=3) | 5618 ± 926 ms (95% CI, n=3) | 6918 ± 794 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 nano | small | high | $0.15 / $0.60 | 167 ± 3 tok/s (95% CI, n=3) | 6161 ± 364 ms (95% CI, n=3) | 7551 ± 354 ms (95% CI, n=3) |
| OpenAI | o4-mini | mid | low | $1.10 / $4.40 | 184 ± 7 tok/s (95% CI, n=3) | 6121 ± 869 ms (95% CI, n=3) | 7380 ± 847 ms (95% CI, n=3) |
| OpenAI | o4-mini | mid | medium | $1.10 / $4.40 | 194 ± 6 tok/s (95% CI, n=3) | 7345 ± 2463 ms (95% CI, n=2) | 9089 ± 1797 ms (95% CI, n=3) |
| OpenAI | o4-mini | mid | high | $1.10 / $4.40 | 184 ± 4 tok/s (95% CI, n=3) | 0 ms (n=0) | 11146 ± 249 ms (95% CI, n=3) |
| OpenAI | GPT Realtime | flagship | n/a | $4.00 / $16.00 | 91 ± 9 tok/s (95% CI, n=3) | 1137 ± 656 ms (95% CI, n=3) | 3595 ± 1462 ms (95% CI, n=3) |
| OpenAI | GPT-5.3 Codex | flagship | low | $1.75 / $14.00 | 108 ± 6 tok/s (95% CI, n=3) | 7582 ± 252 ms (95% CI, n=3) | 9396 ± 674 ms (95% CI, n=3) |
| OpenAI | GPT-5.3 Codex | flagship | medium | $1.75 / $14.00 | 29 tok/s (n=1) | 760 ms (n=1) | 1529 ms (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | high | $1.75 / $14.00 | 112 ± 11 tok/s (95% CI, n=3) | 11015 ± 4210 ms (95% CI, n=3) | 12711 ± 4083 ms (95% CI, n=3) |
| OpenAI | GPT-5.3 Codex | flagship | xhigh | $1.75 / $14.00 | 40 ± 78 tok/s (95% CI, n=3) | 16216 ± 6920 ms (95% CI, n=2) | 17586 ± 3612 ms (95% CI, n=3) |
| OpenAI | GPT-5.1 Codex mini | small | low | $0.25 / $2.00 | 172 ± 43 tok/s (95% CI, n=3) | 3795 ± 3067 ms (95% CI, n=3) | 5090 ± 3057 ms (95% CI, n=3) |
| OpenAI | GPT-5.1 Codex mini | small | medium | $0.25 / $2.00 | 117 ± 119 tok/s (95% CI, n=3) | 5721 ± 1659 ms (95% CI, n=2) | 8022 ± 2015 ms (95% CI, n=3) |
| OpenAI | GPT-5.1 Codex mini | small | high | $0.25 / $2.00 | 63 ± 123 tok/s (95% CI, n=3) | 5178 ms (n=1) | 8873 ± 2365 ms (95% CI, n=3) |
| Google | Gemini 3.1 Pro | flagship | low | $2.00 / $12.00 | 5 ± 0 tok/s (95% CI, n=3) | 14977 ± 45 ms (95% CI, n=3) | 15276 ± 43 ms (95% CI, n=3) |
| Google | Gemini 3.1 Pro | flagship | medium | $2.00 / $12.00 | 5 ± 0 tok/s (95% CI, n=3) | 15376 ± 903 ms (95% CI, n=3) | 15646 ± 864 ms (95% CI, n=3) |
| Google | Gemini 3.1 Pro | flagship | high | $2.00 / $12.00 | 5 ± 0 tok/s (95% CI, n=3) | 15497 ± 979 ms (95% CI, n=3) | 15782 ± 988 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash | mid | low | $1.50 / $9.00 | 10 ± 0 tok/s (95% CI, n=3) | 7520 ± 661 ms (95% CI, n=3) | 7699 ± 600 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash | mid | medium | $1.50 / $9.00 | 10 ± 1 tok/s (95% CI, n=3) | 7333 ± 351 ms (95% CI, n=3) | 7511 ± 381 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash | mid | high | $1.50 / $9.00 | 10 ± 1 tok/s (95% CI, n=3) | 7852 ± 460 ms (95% CI, n=3) | 8002 ± 413 ms (95% CI, n=3) |
| Google | Gemini 3.1 Flash-Lite | small | low | $0.25 / $1.50 | 117 ± 8 tok/s (95% CI, n=3) | 903 ± 51 ms (95% CI, n=3) | 1980 ± 196 ms (95% CI, n=3) |
| Google | Gemini 3.1 Flash-Lite | small | medium | $0.25 / $1.50 | 13 ± 1 tok/s (95% CI, n=3) | 6014 ± 79 ms (95% CI, n=3) | 6079 ± 65 ms (95% CI, n=3) |
| Google | Gemini 3.1 Flash-Lite | small | high | $0.25 / $1.50 | 13 ± 1 tok/s (95% CI, n=3) | 6180 ± 337 ms (95% CI, n=3) | 6252 ± 369 ms (95% CI, n=3) |
| xAI | Grok 4.3 | frontier | none | $1.25 / $2.50 | 84 ± 8 tok/s (95% CI, n=3) | 524 ± 27 ms (95% CI, n=3) | 2382 ± 186 ms (95% CI, n=3) |
| xAI | Grok 4.3 | frontier | low | $1.25 / $2.50 | 4 tok/s (n=1) | 3083 ms (n=1) | 3258 ms (n=1) |
| xAI | Grok 4.3 | frontier | medium | $1.25 / $2.50 | 11 ± 3 tok/s (95% CI, n=3) | 19640 ± 5470 ms (95% CI, n=3) | 20490 ± 5423 ms (95% CI, n=3) |
| xAI | Grok 4.3 | frontier | high | $1.25 / $2.50 | 9 ± 2 tok/s (95% CI, n=3) | 23565 ± 5250 ms (95% CI, n=3) | 24423 ± 5203 ms (95% CI, n=3) |
| xAI | Grok 4.20 Reasoning | flagship | n/a | $1.25 / $2.50 | 6 ± 3 tok/s (95% CI, n=3) | 37966 ± 16419 ms (95% CI, n=3) | 38918 ± 16237 ms (95% CI, n=3) |
| xAI | Grok 4.20 Non-Reasoning | mid | n/a | $1.25 / $2.50 | 85 ± 2 tok/s (95% CI, n=3) | 435 ± 40 ms (95% CI, n=3) | 2919 ± 123 ms (95% CI, n=3) |
| xAI | Grok Build 0.1 | small | n/a | $1.00 / $2.00 | 6 ± 1 tok/s (95% CI, n=3) | 35660 ± 6588 ms (95% CI, n=3) | 36444 ± 6613 ms (95% CI, n=3) |
| AWS Bedrock | Claude Opus 4.8 (Bedrock) | flagship | low | $5.00 / $25.00 | n/a (error) | n/a (error) | n/a (error) |
| AWS Bedrock | Claude Opus 4.8 (Bedrock) | flagship | high | $5.00 / $25.00 | n/a (error) | n/a (error) | n/a (error) |
| AWS Bedrock | Claude Opus 4.8 (Bedrock) | flagship | max | $5.00 / $25.00 | n/a (error) | n/a (error) | n/a (error) |
| AWS Bedrock | Claude Sonnet 5 (Bedrock) | mid | low | $3.00 / $15.00 | n/a (error) | n/a (error) | n/a (error) |
| AWS Bedrock | Claude Sonnet 5 (Bedrock) | mid | high | $3.00 / $15.00 | n/a (error) | n/a (error) | n/a (error) |
| AWS Bedrock | Claude Sonnet 5 (Bedrock) | mid | max | $3.00 / $15.00 | n/a (error) | n/a (error) | n/a (error) |
| Google | Gemini 3.6 Flash | mid | low | $1.50 / $7.50 | 9 ± 0 tok/s (95% CI, n=3) | 9078 ± 372 ms (95% CI, n=3) | 9245 ± 412 ms (95% CI, n=3) |
| Google | Gemini 3.6 Flash | mid | medium | $1.50 / $7.50 | 8 ± 0 tok/s (95% CI, n=3) | 9459 ± 399 ms (95% CI, n=3) | 9609 ± 429 ms (95% CI, n=3) |
| Google | Gemini 3.6 Flash | mid | high | $1.50 / $7.50 | 8 ± 0 tok/s (95% CI, n=3) | 9469 ± 743 ms (95% CI, n=3) | 9657 ± 736 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash-Lite | small | low | $0.30 / $2.50 | 14 ± 0 tok/s (95% CI, n=3) | 5424 ± 147 ms (95% CI, n=3) | 5603 ± 87 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash-Lite | small | medium | $0.30 / $2.50 | 16 ± 2 tok/s (95% CI, n=3) | 5052 ± 534 ms (95% CI, n=3) | 5170 ± 566 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash-Lite | small | high | $0.30 / $2.50 | 14 ± 1 tok/s (95% CI, n=3) | 5512 ± 180 ms (95% CI, n=3) | 5628 ± 138 ms (95% CI, n=3) |
| Anthropic | Claude Opus 5 | flagship | low | $5.00 / $25.00 | 97 ± 8 tok/s (95% CI, n=3) | 13378 ± 3470 ms (95% CI, n=3) | 16046 ± 3430 ms (95% CI, n=3) |
| Anthropic | Claude Opus 5 | flagship | high | $5.00 / $25.00 | 92 ± 2 tok/s (95% CI, n=3) | 15689 ± 8297 ms (95% CI, n=2) | 19883 ± 4784 ms (95% CI, n=3) |
| Anthropic | Claude Opus 5 | flagship | max | $5.00 / $25.00 | 91 ± 2 tok/s (95% CI, n=3) | 21751 ms (n=1) | 22622 ± 443 ms (95% CI, n=3) |

**Legend.** Provider, Model, Tier, Effort, and Cost are curated catalog data. The metric columns are measured values. `n/a (fixtured)` means the deterministic fixture client produced the cell; `n/a (error)` means every trial for that configuration failed.

Each detail table reports observed min-max and contributing trial count for one measured aspect.

**Output throughput over the whole request**

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 82 ± 11 tok/s (95% CI, n=3) | 70.5–87.8 | 3 |
| Claude Fable 5 [medium] | 15 tok/s (n=1) | 14.6–14.6 | 1 |
| Claude Fable 5 [high] | 86 ± 3 tok/s (95% CI, n=3) | 84.4–89.6 | 3 |
| Claude Fable 5 [xhigh] | 12 tok/s (n=1) | 12.3–12.3 | 1 |
| Claude Fable 5 [max] | 90 ± 2 tok/s (95% CI, n=3) | 88.8–91.7 | 3 |
| Claude Opus 4.8 [low] | 54 ± 5 tok/s (95% CI, n=3) | 50.1–58.2 | 3 |
| Claude Opus 4.8 [medium] | 23 tok/s (n=1) | 23.5–23.5 | 1 |
| Claude Opus 4.8 [high] | 53 ± 1 tok/s (95% CI, n=3) | 51.9–54.3 | 3 |
| Claude Opus 4.8 [xhigh] | 16 tok/s (n=1) | 16.3–16.3 | 1 |
| Claude Opus 4.8 [max] | 59 ± 6 tok/s (95% CI, n=3) | 52.1–61.7 | 3 |
| Claude Sonnet 5 [low] | 47 ± 9 tok/s (95% CI, n=3) | 39.2–55.2 | 3 |
| Claude Sonnet 5 [medium] | 38 tok/s (n=1) | 38.4–38.4 | 1 |
| Claude Sonnet 5 [high] | 58 ± 18 tok/s (95% CI, n=3) | 47.2–76.4 | 3 |
| Claude Sonnet 5 [xhigh] | 36 tok/s (n=1) | 35.5–35.5 | 1 |
| Claude Sonnet 5 [max] | 104 ± 6 tok/s (95% CI, n=3) | 98.4–108.5 | 3 |
| Claude Haiku 4.5 [n/a] | 70 ± 7 tok/s (95% CI, n=3) | 65.3–76.6 | 3 |
| GPT-5.5 [none] | 38 ± 4 tok/s (95% CI, n=3) | 35.1–42.1 | 3 |
| GPT-5.5 [low] | 13 tok/s (n=1) | 13.0–13.0 | 1 |
| GPT-5.5 [medium] | 72 ± 17 tok/s (95% CI, n=3) | 55.1–80.5 | 3 |
| GPT-5.5 [high] | 80 ± 6 tok/s (95% CI, n=3) | 76.3–85.7 | 3 |
| GPT-5.4 [none] | 69 ± 2 tok/s (95% CI, n=3) | 68.1–71.4 | 3 |
| GPT-5.4 [low] | 10 tok/s (n=1) | 9.9–9.9 | 1 |
| GPT-5.4 [medium] | 134 ± 12 tok/s (95% CI, n=3) | 121.6–141.9 | 3 |
| GPT-5.4 [high] | 158 ± 15 tok/s (95% CI, n=3) | 148.7–172.9 | 3 |
| GPT-5.4 mini [none] | 99 ± 11 tok/s (95% CI, n=3) | 87.9–104.4 | 3 |
| GPT-5.4 mini [low] | 54 tok/s (n=1) | 54.5–54.5 | 1 |
| GPT-5.4 mini [medium] | 191 ± 12 tok/s (95% CI, n=3) | 181.4–201.9 | 3 |
| GPT-5.4 mini [high] | 179 ± 4 tok/s (95% CI, n=3) | 175.2–182.2 | 3 |
| GPT-5.4 nano [none] | 121 ± 11 tok/s (95% CI, n=3) | 113.0–131.4 | 3 |
| GPT-5.4 nano [low] | 57 tok/s (n=1) | 57.3–57.3 | 1 |
| GPT-5.4 nano [medium] | 171 ± 8 tok/s (95% CI, n=3) | 165.4–179.2 | 3 |
| GPT-5.4 nano [high] | 167 ± 3 tok/s (95% CI, n=3) | 164.0–169.1 | 3 |
| o4-mini [low] | 184 ± 7 tok/s (95% CI, n=3) | 178.9–190.4 | 3 |
| o4-mini [medium] | 194 ± 6 tok/s (95% CI, n=3) | 190.3–200.0 | 3 |
| o4-mini [high] | 184 ± 4 tok/s (95% CI, n=3) | 181.5–188.0 | 3 |
| GPT Realtime [n/a] | 91 ± 9 tok/s (95% CI, n=3) | 82.4–98.9 | 3 |
| GPT-5.3 Codex [low] | 108 ± 6 tok/s (95% CI, n=3) | 104.6–113.8 | 3 |
| GPT-5.3 Codex [medium] | 29 tok/s (n=1) | 29.2–29.2 | 1 |
| GPT-5.3 Codex [high] | 112 ± 11 tok/s (95% CI, n=3) | 101.8–120.3 | 3 |
| GPT-5.3 Codex [xhigh] | 40 ± 78 tok/s (95% CI, n=3) | 0.0–118.8 | 3 |
| GPT-5.1 Codex mini [low] | 172 ± 43 tok/s (95% CI, n=3) | 129.1–199.7 | 3 |
| GPT-5.1 Codex mini [medium] | 117 ± 119 tok/s (95% CI, n=3) | 0.0–201.3 | 3 |
| GPT-5.1 Codex mini [high] | 63 ± 123 tok/s (95% CI, n=3) | 0.0–188.5 | 3 |
| Gemini 3.1 Pro [low] | 5 ± 0 tok/s (95% CI, n=3) | 5.2–5.2 | 3 |
| Gemini 3.1 Pro [medium] | 5 ± 0 tok/s (95% CI, n=3) | 4.9–5.4 | 3 |
| Gemini 3.1 Pro [high] | 5 ± 0 tok/s (95% CI, n=3) | 4.7–5.2 | 3 |
| Gemini 3.5 Flash [low] | 10 ± 0 tok/s (95% CI, n=3) | 9.8–10.5 | 3 |
| Gemini 3.5 Flash [medium] | 10 ± 1 tok/s (95% CI, n=3) | 9.8–11.3 | 3 |
| Gemini 3.5 Flash [high] | 10 ± 1 tok/s (95% CI, n=3) | 9.7–10.7 | 3 |
| Gemini 3.1 Flash-Lite [low] | 117 ± 8 tok/s (95% CI, n=3) | 108.4–122.6 | 3 |
| Gemini 3.1 Flash-Lite [medium] | 13 ± 1 tok/s (95% CI, n=3) | 12.6–13.6 | 3 |
| Gemini 3.1 Flash-Lite [high] | 13 ± 1 tok/s (95% CI, n=3) | 11.9–13.9 | 3 |
| Grok 4.3 [none] | 84 ± 8 tok/s (95% CI, n=3) | 78.9–91.8 | 3 |
| Grok 4.3 [low] | 4 tok/s (n=1) | 4.1–4.1 | 1 |
| Grok 4.3 [medium] | 11 ± 3 tok/s (95% CI, n=3) | 8.5–13.3 | 3 |
| Grok 4.3 [high] | 9 ± 2 tok/s (95% CI, n=3) | 7.1–10.9 | 3 |
| Grok 4.20 Reasoning [n/a] | 6 ± 3 tok/s (95% CI, n=3) | 3.9–8.8 | 3 |
| Grok 4.20 Non-Reasoning [n/a] | 85 ± 2 tok/s (95% CI, n=3) | 83.5–87.8 | 3 |
| Grok Build 0.1 [n/a] | 6 ± 1 tok/s (95% CI, n=3) | 5.1–7.0 | 3 |
| Claude Opus 4.8 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Gemini 3.6 Flash [low] | 9 ± 0 tok/s (95% CI, n=3) | 8.4–8.9 | 3 |
| Gemini 3.6 Flash [medium] | 8 ± 0 tok/s (95% CI, n=3) | 7.9–8.4 | 3 |
| Gemini 3.6 Flash [high] | 8 ± 0 tok/s (95% CI, n=3) | 7.9–8.7 | 3 |
| Gemini 3.5 Flash-Lite [low] | 14 ± 0 tok/s (95% CI, n=3) | 13.8–14.4 | 3 |
| Gemini 3.5 Flash-Lite [medium] | 16 ± 2 tok/s (95% CI, n=3) | 14.8–17.8 | 3 |
| Gemini 3.5 Flash-Lite [high] | 14 ± 1 tok/s (95% CI, n=3) | 13.4–14.7 | 3 |
| Claude Opus 5 [low] | 97 ± 8 tok/s (95% CI, n=3) | 88.8–100.8 | 3 |
| Claude Opus 5 [high] | 92 ± 2 tok/s (95% CI, n=3) | 90.0–93.7 | 3 |
| Claude Opus 5 [max] | 91 ± 2 tok/s (95% CI, n=3) | 89.2–92.3 | 3 |

Highest measured of the 68 measured configuration(s): **o4-mini [medium]** at 194 ± 6 tok/s (95% CI, n=3). Opposite end of this measurement: Grok 4.3 [low] at 4 tok/s (n=1).

**Time to first token**

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 15753 ± 1690 ms (95% CI, n=3) | 14089–16976 | 3 |
| Claude Fable 5 [medium] | 3434 ms (n=1) | 3434–3434 | 1 |
| Claude Fable 5 [high] | 17777 ± 955 ms (95% CI, n=3) | 17205–18746 | 3 |
| Claude Fable 5 [xhigh] | 3466 ms (n=1) | 3466–3466 | 1 |
| Claude Fable 5 [max] | 0 ms (n=0) | 0–0 | 0 |
| Claude Opus 4.8 [low] | 1180 ± 179 ms (95% CI, n=3) | 1071–1361 | 3 |
| Claude Opus 4.8 [medium] | 1176 ms (n=1) | 1176–1176 | 1 |
| Claude Opus 4.8 [high] | 1072 ± 56 ms (95% CI, n=3) | 1028–1126 | 3 |
| Claude Opus 4.8 [xhigh] | 2143 ms (n=1) | 2143–2143 | 1 |
| Claude Opus 4.8 [max] | 890 ± 153 ms (95% CI, n=3) | 743–1008 | 3 |
| Claude Sonnet 5 [low] | 3373 ± 1454 ms (95% CI, n=3) | 2612–4856 | 3 |
| Claude Sonnet 5 [medium] | 938 ms (n=1) | 938–938 | 1 |
| Claude Sonnet 5 [high] | 4568 ± 2883 ms (95% CI, n=3) | 2151–7229 | 3 |
| Claude Sonnet 5 [xhigh] | 961 ms (n=1) | 961–961 | 1 |
| Claude Sonnet 5 [max] | 0 ms (n=0) | 0–0 | 0 |
| Claude Haiku 4.5 [n/a] | 1005 ± 320 ms (95% CI, n=3) | 781–1323 | 3 |
| GPT-5.5 [none] | 1295 ± 797 ms (95% CI, n=3) | 722–2082 | 3 |
| GPT-5.5 [low] | 912 ms (n=1) | 912–912 | 1 |
| GPT-5.5 [medium] | 10768 ± 477 ms (95% CI, n=3) | 10484–11253 | 3 |
| GPT-5.5 [high] | 12353 ± 2045 ms (95% CI, n=3) | 10922–14383 | 3 |
| GPT-5.4 [none] | 559 ± 120 ms (95% CI, n=3) | 487–681 | 3 |
| GPT-5.4 [low] | 1099 ms (n=1) | 1099–1099 | 1 |
| GPT-5.4 [medium] | 6614 ± 732 ms (95% CI, n=3) | 6151–7353 | 3 |
| GPT-5.4 [high] | 7369 ± 3281 ms (95% CI, n=3) | 5665–10717 | 3 |
| GPT-5.4 mini [none] | 567 ± 27 ms (95% CI, n=3) | 546–593 | 3 |
| GPT-5.4 mini [low] | 410 ms (n=1) | 410–410 | 1 |
| GPT-5.4 mini [medium] | 5594 ± 246 ms (95% CI, n=3) | 5449–5844 | 3 |
| GPT-5.4 mini [high] | 7211 ± 3669 ms (95% CI, n=3) | 4935–10923 | 3 |
| GPT-5.4 nano [none] | 592 ± 79 ms (95% CI, n=3) | 511–634 | 3 |
| GPT-5.4 nano [low] | 368 ms (n=1) | 368–368 | 1 |
| GPT-5.4 nano [medium] | 5618 ± 926 ms (95% CI, n=3) | 4877–6496 | 3 |
| GPT-5.4 nano [high] | 6161 ± 364 ms (95% CI, n=3) | 5821–6461 | 3 |
| o4-mini [low] | 6121 ± 869 ms (95% CI, n=3) | 5418–6940 | 3 |
| o4-mini [medium] | 7345 ± 2463 ms (95% CI, n=2) | 6088–8601 | 2 |
| o4-mini [high] | 0 ms (n=0) | 0–0 | 0 |
| GPT Realtime [n/a] | 1137 ± 656 ms (95% CI, n=3) | 788–1807 | 3 |
| GPT-5.3 Codex [low] | 7582 ± 252 ms (95% CI, n=3) | 7329–7749 | 3 |
| GPT-5.3 Codex [medium] | 760 ms (n=1) | 760–760 | 1 |
| GPT-5.3 Codex [high] | 11015 ± 4210 ms (95% CI, n=3) | 8341–15264 | 3 |
| GPT-5.3 Codex [xhigh] | 16216 ± 6920 ms (95% CI, n=2) | 12685–19746 | 2 |
| GPT-5.1 Codex mini [low] | 3795 ± 3067 ms (95% CI, n=3) | 697–5729 | 3 |
| GPT-5.1 Codex mini [medium] | 5721 ± 1659 ms (95% CI, n=2) | 4874–6567 | 2 |
| GPT-5.1 Codex mini [high] | 5178 ms (n=1) | 5178–5178 | 1 |
| Gemini 3.1 Pro [low] | 14977 ± 45 ms (95% CI, n=3) | 14932–15008 | 3 |
| Gemini 3.1 Pro [medium] | 15376 ± 903 ms (95% CI, n=3) | 14633–16220 | 3 |
| Gemini 3.1 Pro [high] | 15497 ± 979 ms (95% CI, n=3) | 14636–16367 | 3 |
| Gemini 3.5 Flash [low] | 7520 ± 661 ms (95% CI, n=3) | 7035–8169 | 3 |
| Gemini 3.5 Flash [medium] | 7333 ± 351 ms (95% CI, n=3) | 7021–7641 | 3 |
| Gemini 3.5 Flash [high] | 7852 ± 460 ms (95% CI, n=3) | 7384–8122 | 3 |
| Gemini 3.1 Flash-Lite [low] | 903 ± 51 ms (95% CI, n=3) | 868–954 | 3 |
| Gemini 3.1 Flash-Lite [medium] | 6014 ± 79 ms (95% CI, n=3) | 5936–6070 | 3 |
| Gemini 3.1 Flash-Lite [high] | 6180 ± 337 ms (95% CI, n=3) | 5851–6432 | 3 |
| Grok 4.3 [none] | 524 ± 27 ms (95% CI, n=3) | 505–551 | 3 |
| Grok 4.3 [low] | 3083 ms (n=1) | 3083–3083 | 1 |
| Grok 4.3 [medium] | 19640 ± 5470 ms (95% CI, n=3) | 15124–24739 | 3 |
| Grok 4.3 [high] | 23565 ± 5250 ms (95% CI, n=3) | 19629–28680 | 3 |
| Grok 4.20 Reasoning [n/a] | 37966 ± 16419 ms (95% CI, n=3) | 24169–53096 | 3 |
| Grok 4.20 Non-Reasoning [n/a] | 435 ± 40 ms (95% CI, n=3) | 405–474 | 3 |
| Grok Build 0.1 [n/a] | 35660 ± 6588 ms (95% CI, n=3) | 28981–39657 | 3 |
| Claude Opus 4.8 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Gemini 3.6 Flash [low] | 9078 ± 372 ms (95% CI, n=3) | 8699–9292 | 3 |
| Gemini 3.6 Flash [medium] | 9459 ± 399 ms (95% CI, n=3) | 9079–9777 | 3 |
| Gemini 3.6 Flash [high] | 9469 ± 743 ms (95% CI, n=3) | 8898–10186 | 3 |
| Gemini 3.5 Flash-Lite [low] | 5424 ± 147 ms (95% CI, n=3) | 5285–5543 | 3 |
| Gemini 3.5 Flash-Lite [medium] | 5052 ± 534 ms (95% CI, n=3) | 4511–5378 | 3 |
| Gemini 3.5 Flash-Lite [high] | 5512 ± 180 ms (95% CI, n=3) | 5359–5677 | 3 |
| Claude Opus 5 [low] | 13378 ± 3470 ms (95% CI, n=3) | 10825–16779 | 3 |
| Claude Opus 5 [high] | 15689 ± 8297 ms (95% CI, n=2) | 11456–19922 | 2 |
| Claude Opus 5 [max] | 21751 ms (n=1) | 21751–21751 | 1 |

Lowest measured of the 68 measured configuration(s): **Claude Fable 5 [max]** at 0 ms (n=0). Opposite end of this measurement: Grok 4.20 Reasoning [n/a] at 37966 ± 16419 ms (95% CI, n=3).

**Total response time**

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 18494 ± 1864 ms (95% CI, n=3) | 16646–19808 | 3 |
| Claude Fable 5 [medium] | 4418 ms (n=1) | 4418–4418 | 1 |
| Claude Fable 5 [high] | 20659 ± 1020 ms (95% CI, n=3) | 19756–21559 | 3 |
| Claude Fable 5 [xhigh] | 4253 ms (n=1) | 4253–4253 | 1 |
| Claude Fable 5 [max] | 22807 ± 460 ms (95% CI, n=3) | 22338–23055 | 3 |
| Claude Opus 4.8 [low] | 7058 ± 652 ms (95% CI, n=3) | 6446–7590 | 3 |
| Claude Opus 4.8 [medium] | 1935 ms (n=1) | 1935–1935 | 1 |
| Claude Opus 4.8 [high] | 7141 ± 255 ms (95% CI, n=3) | 6985–7400 | 3 |
| Claude Opus 4.8 [xhigh] | 2896 ms (n=1) | 2896–2896 | 1 |
| Claude Opus 4.8 [max] | 6444 ± 872 ms (95% CI, n=3) | 5638–7174 | 3 |
| Claude Sonnet 5 [low] | 8304 ± 1913 ms (95% CI, n=3) | 6826–10148 | 3 |
| Claude Sonnet 5 [medium] | 1757 ms (n=1) | 1757–1757 | 1 |
| Claude Sonnet 5 [high] | 8670 ± 1450 ms (95% CI, n=3) | 7373–9935 | 3 |
| Claude Sonnet 5 [xhigh] | 1589 ms (n=1) | 1589–1589 | 1 |
| Claude Sonnet 5 [max] | 19642 ± 1159 ms (95% CI, n=3) | 18872–20804 | 3 |
| Claude Haiku 4.5 [n/a] | 3816 ± 271 ms (95% CI, n=3) | 3602–4075 | 3 |
| GPT-5.5 [none] | 6264 ± 685 ms (95% CI, n=3) | 5602–6789 | 3 |
| GPT-5.5 [low] | 1380 ms (n=1) | 1380–1380 | 1 |
| GPT-5.5 [medium] | 12439 ± 474 ms (95% CI, n=3) | 12192–12923 | 3 |
| GPT-5.5 [high] | 13931 ± 2101 ms (95% CI, n=3) | 12447–16013 | 3 |
| GPT-5.4 [none] | 3209 ± 30 ms (95% CI, n=3) | 3180–3231 | 3 |
| GPT-5.4 [low] | 1387 ms (n=1) | 1387–1387 | 1 |
| GPT-5.4 [medium] | 7608 ± 707 ms (95% CI, n=3) | 7062–8289 | 3 |
| GPT-5.4 [high] | 8246 ± 3266 ms (95% CI, n=3) | 6570–11579 | 3 |
| GPT-5.4 mini [none] | 2388 ± 325 ms (95% CI, n=3) | 2196–2718 | 3 |
| GPT-5.4 mini [low] | 678 ms (n=1) | 678–678 | 1 |
| GPT-5.4 mini [medium] | 6450 ± 260 ms (95% CI, n=3) | 6301–6714 | 3 |
| GPT-5.4 mini [high] | 7943 ± 3262 ms (95% CI, n=3) | 5895–11239 | 3 |
| GPT-5.4 nano [none] | 1751 ± 154 ms (95% CI, n=3) | 1598–1858 | 3 |
| GPT-5.4 nano [low] | 623 ms (n=1) | 623–623 | 1 |
| GPT-5.4 nano [medium] | 6918 ± 794 ms (95% CI, n=3) | 6305–7684 | 3 |
| GPT-5.4 nano [high] | 7551 ± 354 ms (95% CI, n=3) | 7255–7878 | 3 |
| o4-mini [low] | 7380 ± 847 ms (95% CI, n=3) | 6702–8184 | 3 |
| o4-mini [medium] | 9089 ± 1797 ms (95% CI, n=3) | 7278–10242 | 3 |
| o4-mini [high] | 11146 ± 249 ms (95% CI, n=3) | 10892–11281 | 3 |
| GPT Realtime [n/a] | 3595 ± 1462 ms (95% CI, n=3) | 2579–5049 | 3 |
| GPT-5.3 Codex [low] | 9396 ± 674 ms (95% CI, n=3) | 8860–10037 | 3 |
| GPT-5.3 Codex [medium] | 1529 ms (n=1) | 1529–1529 | 1 |
| GPT-5.3 Codex [high] | 12711 ± 4083 ms (95% CI, n=3) | 10105–16829 | 3 |
| GPT-5.3 Codex [xhigh] | 17586 ± 3612 ms (95% CI, n=3) | 14189–20523 | 3 |
| GPT-5.1 Codex mini [low] | 5090 ± 3057 ms (95% CI, n=3) | 1999–7000 | 3 |
| GPT-5.1 Codex mini [medium] | 8022 ± 2015 ms (95% CI, n=3) | 6175–9729 | 3 |
| GPT-5.1 Codex mini [high] | 8873 ± 2365 ms (95% CI, n=3) | 6460–10115 | 3 |
| Gemini 3.1 Pro [low] | 15276 ± 43 ms (95% CI, n=3) | 15234–15307 | 3 |
| Gemini 3.1 Pro [medium] | 15646 ± 864 ms (95% CI, n=3) | 14937–16455 | 3 |
| Gemini 3.1 Pro [high] | 15782 ± 988 ms (95% CI, n=3) | 14921–16666 | 3 |
| Gemini 3.5 Flash [low] | 7699 ± 600 ms (95% CI, n=3) | 7307–8302 | 3 |
| Gemini 3.5 Flash [medium] | 7511 ± 381 ms (95% CI, n=3) | 7179–7853 | 3 |
| Gemini 3.5 Flash [high] | 8002 ± 413 ms (95% CI, n=3) | 7581–8236 | 3 |
| Gemini 3.1 Flash-Lite [low] | 1980 ± 196 ms (95% CI, n=3) | 1860–2178 | 3 |
| Gemini 3.1 Flash-Lite [medium] | 6079 ± 65 ms (95% CI, n=3) | 6016–6128 | 3 |
| Gemini 3.1 Flash-Lite [high] | 6252 ± 369 ms (95% CI, n=3) | 5901–6545 | 3 |
| Grok 4.3 [none] | 2382 ± 186 ms (95% CI, n=3) | 2201–2521 | 3 |
| Grok 4.3 [low] | 3258 ms (n=1) | 3258–3258 | 1 |
| Grok 4.3 [medium] | 20490 ± 5423 ms (95% CI, n=3) | 15982–25523 | 3 |
| Grok 4.3 [high] | 24423 ± 5203 ms (95% CI, n=3) | 20529–29495 | 3 |
| Grok 4.20 Reasoning [n/a] | 38918 ± 16237 ms (95% CI, n=3) | 25329–53921 | 3 |
| Grok 4.20 Non-Reasoning [n/a] | 2919 ± 123 ms (95% CI, n=3) | 2843–3043 | 3 |
| Grok Build 0.1 [n/a] | 36444 ± 6613 ms (95% CI, n=3) | 29735–40428 | 3 |
| Claude Opus 4.8 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Gemini 3.6 Flash [low] | 9245 ± 412 ms (95% CI, n=3) | 8833–9523 | 3 |
| Gemini 3.6 Flash [medium] | 9609 ± 429 ms (95% CI, n=3) | 9218–9974 | 3 |
| Gemini 3.6 Flash [high] | 9657 ± 736 ms (95% CI, n=3) | 9098–10371 | 3 |
| Gemini 3.5 Flash-Lite [low] | 5603 ± 87 ms (95% CI, n=3) | 5530–5683 | 3 |
| Gemini 3.5 Flash-Lite [medium] | 5170 ± 566 ms (95% CI, n=3) | 4602–5548 | 3 |
| Gemini 3.5 Flash-Lite [high] | 5628 ± 138 ms (95% CI, n=3) | 5516–5758 | 3 |
| Claude Opus 5 [low] | 16046 ± 3430 ms (95% CI, n=3) | 13562–19423 | 3 |
| Claude Opus 5 [high] | 19883 ± 4784 ms (95% CI, n=3) | 15029–22763 | 3 |
| Claude Opus 5 [max] | 22622 ± 443 ms (95% CI, n=3) | 22198–22970 | 3 |

Lowest measured of the 68 measured configuration(s): **GPT-5.4 nano [low]** at 623 ms (n=1). Opposite end of this measurement: Grok 4.20 Reasoning [n/a] at 38918 ± 16237 ms (95% CI, n=3).

The projected artifact preserves this topic's prompts, raw trial outputs, token
counts, timing values, and (for accuracy) schema-conformance results and
provider rejection messages. This page can be regenerated from that artifact
without rerunning the providers.

**Unified speed probe** (streamed exact-length generation, repeated
3× per configuration; one call yields sustained
tok/s over the generation window — excluding time-to-first-token — plus TTFT
and total response time):

```text
Write a single flowing passage about how large language models generate text that is exactly 200 words long. Write continuous prose only — no lists, headings, or code. Respond with the passage only — no preamble, no word count, no markdown.
```

**Complete raw record.** Every configuration, trial, and this topic's calls are
committed alongside this page as a JSON artifact:
[`llm-speed-comparison.data.json`](./llm-speed-comparison.data.json).
It is projected from the combined comparison record
`llm-model-comparison.real.data.json` — the same measurements, never re-run.

#### Generational comparison (former → new)

For each provider tier that turned a generation this round, the former and the new model were swept under identical conditions (same tier, same effort ladder — only the model id differs), so these deltas isolate the generational change. A speed or accuracy delta appears only when both generations were `measured` in this frame; cost figures are curated registry facts. The net verdict is a mechanical rule over the per-metric deltas (each metric counts as moved only past a 1% relative threshold): **improved** when at least one metric improved and none regressed, **regressed** in the mirror case, **mixed** when both occur, and **unchanged** when every metric held within the threshold. A measured metric is additionally labelled **indistinguishable**, and excluded from the verdict, when the gap between the two means does not clear their combined run-to-run spread (the sum of the two standard deviations, shown in its own column). The trials behind each mean are stated in their own column, so a direction can be read against the sample that produced it: re-running an identical sweep hours apart moved throughput by up to 88% on the same configuration, so a bare percentage change is not by itself evidence of a generational direction. (That 88% was observed under the retired post-first-token throughput definition, which this metric replaced on 2026-08-04; it has not been re-measured under the current end-to-end definition, and is quoted here as the last figure actually observed rather than as a current estimate.) Deltas stay **per effort level** rather than being aggregated across the ladder, because low, medium and high are different operating points and averaging them would report a figure no configuration was measured at. Cost figures are registry facts and carry no spread. Cheaper is an improvement; a faster-but-pricier result reads as mixed, never silently netted to improved.

##### Claude Opus 4.8 → Claude Opus 5

**Effort `low`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Output throughput | 54.2 tok/s | 96.5 tok/s | +42.4 tok/s (+78%) | ±10.8 tok/s | 3 | improved |
| Time to first token | 1180 ms | 13378 ms | +12198 ms (+1034%) | ±3224 ms | 3 | regressed |
| Total response time | 7058 ms | 16046 ms | +8988 ms (+127%) | ±3607 ms | 3 | regressed |
| Input cost | $5.00 | $5.00 | +0.00 $/MTok (+0%) | — | — | unchanged |
| Output cost | $25.00 | $25.00 | +0.00 $/MTok (+0%) | — | — | unchanged |

_Net verdict: **mixed** — 3 improved, 3 regressed, 3 unchanged of 9 metrics._

**Effort `high`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Output throughput | 53.2 tok/s | 92.3 tok/s | +39.1 tok/s (+73%) | ±3.3 tok/s | 3 | improved |
| Time to first token | 1072 ms | 15689 ms | +14617 ms (+1364%) | ±6036 ms | 3 / 2 | regressed |
| Total response time | 7141 ms | 19883 ms | +12741 ms (+178%) | ±4453 ms | 3 | regressed |
| Input cost | $5.00 | $5.00 | +0.00 $/MTok (+0%) | — | — | unchanged |
| Output cost | $25.00 | $25.00 | +0.00 $/MTok (+0%) | — | — | unchanged |

_Net verdict: **mixed** — 1 improved, 4 regressed, 3 unchanged of 9 metrics; 1 indistinguishable from run-to-run spread and excluded._

**Effort `max`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Output throughput | 58.5 tok/s | 90.5 tok/s | +32.0 tok/s (+55%) | ±7.1 tok/s | 3 | improved |
| Time to first token | 890 ms | 21751 ms | +20861 ms (+2343%) | ±135 ms | 3 / 1 | regressed |
| Total response time | 6444 ms | 22622 ms | +16178 ms (+251%) | ±1162 ms | 3 | regressed |
| Input cost | $5.00 | $5.00 | +0.00 $/MTok (+0%) | — | — | unchanged |
| Output cost | $25.00 | $25.00 | +0.00 $/MTok (+0%) | — | — | unchanged |

_Net verdict: **mixed** — 1 improved, 5 regressed, 3 unchanged of 9 metrics._

##### Gemini 3.5 Flash → Gemini 3.6 Flash

**Effort `low`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Output throughput | 10.2 tok/s | 8.6 tok/s | −1.6 tok/s (−15%) | ±0.7 tok/s | 3 | regressed |
| Time to first token | 7520 ms | 9078 ms | +1558 ms (+21%) | ±914 ms | 3 | regressed |
| Total response time | 7699 ms | 9245 ms | +1545 ms (+20%) | ±894 ms | 3 | regressed |
| Input cost | $1.50 | $1.50 | +0.00 $/MTok (+0%) | — | — | unchanged |
| Output cost | $9.00 | $7.50 | −1.50 $/MTok (−17%) | — | — | improved |

_Net verdict: **mixed** — 2 improved, 3 regressed, 3 unchanged of 9 metrics; 1 indistinguishable from run-to-run spread and excluded._

**Effort `medium`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Output throughput | 10.5 tok/s | 8.1 tok/s | −2.4 tok/s (−23%) | ±1.0 tok/s | 3 | regressed |
| Time to first token | 7333 ms | 9459 ms | +2126 ms (+29%) | ±663 ms | 3 | regressed |
| Total response time | 7511 ms | 9609 ms | +2098 ms (+28%) | ±716 ms | 3 | regressed |
| Input cost | $1.50 | $1.50 | +0.00 $/MTok (+0%) | — | — | unchanged |
| Output cost | $9.00 | $7.50 | −1.50 $/MTok (−17%) | — | — | improved |

_Net verdict: **mixed** — 2 improved, 4 regressed, 3 unchanged of 9 metrics._

**Effort `high`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Output throughput | 10.1 tok/s | 8.2 tok/s | −1.8 tok/s (−18%) | ±0.9 tok/s | 3 | regressed |
| Time to first token | 7852 ms | 9469 ms | +1617 ms (+21%) | ±1063 ms | 3 | regressed |
| Total response time | 8002 ms | 9657 ms | +1656 ms (+21%) | ±1015 ms | 3 | regressed |
| Input cost | $1.50 | $1.50 | +0.00 $/MTok (+0%) | — | — | unchanged |
| Output cost | $9.00 | $7.50 | −1.50 $/MTok (−17%) | — | — | improved |

_Net verdict: **mixed** — 3 improved, 3 regressed, 3 unchanged of 9 metrics._

##### Gemini 3.1 Flash-Lite → Gemini 3.5 Flash-Lite

**Effort `low`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Output throughput | 116.8 tok/s | 14.1 tok/s | −102.7 tok/s (−88%) | ±7.8 tok/s | 3 | regressed |
| Time to first token | 903 ms | 5424 ms | +4521 ms (+501%) | ±175 ms | 3 | regressed |
| Total response time | 1980 ms | 5603 ms | +3623 ms (+183%) | ±250 ms | 3 | regressed |
| Input cost | $0.25 | $0.30 | +0.05 $/MTok (+20%) | — | — | regressed |
| Output cost | $1.50 | $2.50 | +1.00 $/MTok (+67%) | — | — | regressed |

_Net verdict: **mixed** — 1 improved, 6 regressed, 2 unchanged of 9 metrics._

**Effort `medium`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Output throughput | 13.0 tok/s | 15.9 tok/s | +2.9 tok/s (+22%) | ±2.2 tok/s | 3 | improved |
| Time to first token | 6014 ms | 5052 ms | −962 ms (−16%) | ±542 ms | 3 | improved |
| Total response time | 6079 ms | 5170 ms | −909 ms (−15%) | ±558 ms | 3 | improved |
| Input cost | $0.25 | $0.30 | +0.05 $/MTok (+20%) | — | — | regressed |
| Output cost | $1.50 | $2.50 | +1.00 $/MTok (+67%) | — | — | regressed |

_Net verdict: **mixed** — 5 improved, 2 regressed, 2 unchanged of 9 metrics._

**Effort `high`.**

| Metric | Former | New | Change | Run-to-run spread | Trials | Direction |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| Output throughput | 12.8 tok/s | 14.0 tok/s | +1.2 tok/s (+9%) | ±1.7 tok/s | 3 | indistinguishable |
| Time to first token | 6180 ms | 5512 ms | −668 ms (−11%) | ±458 ms | 3 | improved |
| Total response time | 6252 ms | 5628 ms | −624 ms (−10%) | ±448 ms | 3 | improved |
| Input cost | $0.25 | $0.30 | +0.05 $/MTok (+20%) | — | — | regressed |
| Output cost | $1.50 | $2.50 | +1.00 $/MTok (+67%) | — | — | regressed |

_Net verdict: **mixed** — 3 improved, 2 regressed, 2 unchanged of 9 metrics; 2 indistinguishable from run-to-run spread and excluded._

The projection writes `llm-speed-comparison.data.json` and this Markdown page. The source sweep remains `llm-model-comparison.real.data.json`, so speed and accuracy stay auditable back to the same underlying run.
