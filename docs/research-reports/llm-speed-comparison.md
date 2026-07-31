---
title: LLM response speed
description: A reproducible speed comparison of 22 large language models across 5 providers and 54 model×effort configurations, covering sustained generation throughput, time-to-first-token, and total response latency, over 3 trials. Projected from the shared LLM comparison sweep.
---

# LLM response speed

The numbers here are a **projection of the combined LLM comparison sweep**: the same trials, model×effort matrix, statistics, and provenance, restricted to this topic's probes.

## 1. Research Purpose

This report helps narrow model choices by the measured constraints that matter for this topic. It is not a general model ranking and it does not re-run a separate benchmark.

## 2. Measurement Targets

### Target Models

The report covers **54 model×effort configurations** across 22 models and 5 providers. Curated catalog facts (provider, model, tier, price, effort) come from the model registry.

### Target Metrics

This topic covers sustained generation throughput, time-to-first-token, and total response latency. Metric cells are reported as mean ± 95% confidence interval when n ≥ 2; metrics with n < 2 show the mean and sample count.

## 3. Scope and Constraints

- **3 trials** per configuration×probe. This sample supports a run-level comparison, not a statistical claim about stable provider behavior.
- **Mixed measurement dates — this table is not a single point in time.** Its 54 configurations were measured across 3 dates: 12 on `2026-07-27`, 1 on `2026-07-20`, 41 on `2026-07-12`. Only the 12 measured on `2026-07-27` were re-run in this round; the rest carry forward from earlier frames, so cross-model comparisons between rows of different dates are not like-for-like. The former→new generational comparison in section 7 is unaffected — it is derived only from pairs where both generations were measured in the same frame.
- This topic tests narrow behaviors only (sustained generation throughput, time-to-first-token, and total response latency); it does not measure general capability or reasoning quality.
- **Effort semantics vary by provider**, so effort levels are more comparable within a provider than across providers.
- **This run includes non-measured configurations.** `n/a (fixtured)` and `n/a (error)` cells are not live measurements.

## 4. Verification Results

This run measured **53 of 54 configurations** across 5 providers and 22 models, over 3 trials per configuration×probe.

| Aspect | Best (configuration) | Median | Worst |
| ------ | -------------------- | ------ | ----- |
| Sustained throughput during generation | 2951.7 tok/s — GPT-5.4 mini [high] | 373.7 tok/s | 47.8 tok/s |
| Time to first token | 0 ms — Claude Fable 5 [max] | 6014 ms | 37966 ms |
| Total response time | 1751 ms — GPT-5.4 nano [none] | 7750 ms | 38918 ms |

Values are per-configuration means; "Best"/"Worst" follow each aspect's own direction (higher-is-better or lower-is-better). The full per-configuration tables — every model×effort cell with confidence intervals, min–max, and provenance — are in section 7, Verification Data.

This round includes a controlled former→new generational comparison: paired previous- and current-generation models were swept under identical conditions. The per-metric deltas and mechanically-derived net verdict are in section 7, Verification Data.

## 5. Analysis

Highest measured of the 53 measured configuration(s): **GPT-5.4 mini [high]** at 2952 ± 3461 tok/s (95% CI, n=3). Opposite end of this measurement: GPT-5.5 [none] at 48 ± 4 tok/s (95% CI, n=3).

Lowest measured of the 53 measured configuration(s): **Claude Fable 5 [max]** at 0 ± 0 ms (95% CI, n=3). Opposite end of this measurement: Grok 4.20 Reasoning [n/a] at 37966 ± 16419 ms (95% CI, n=3).

Lowest measured of the 53 measured configuration(s): **GPT-5.4 nano [none]** at 1751 ± 154 ms (95% CI, n=3). Opposite end of this measurement: Grok 4.20 Reasoning [n/a] at 38918 ± 16237 ms (95% CI, n=3).

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
| Anthropic | Claude Fable 5 | frontier | low | $6.00 / $30.00 | 272 ± 14 tok/s (95% CI, n=3) | 9888 ± 729 ms (95% CI, n=3) | 12820 ± 506 ms (95% CI, n=3) |
| Anthropic | Claude Fable 5 | frontier | high | $6.00 / $30.00 | 468 ± 372 tok/s (95% CI, n=3) | 12148 ± 11912 ms (95% CI, n=3) | 21810 ± 1100 ms (95% CI, n=3) |
| Anthropic | Claude Fable 5 | frontier | max | $6.00 / $30.00 | 93 ± 2 tok/s (95% CI, n=3) | 0 ± 0 ms (95% CI, n=3) | 22100 ± 544 ms (95% CI, n=3) |
| Anthropic | Claude Opus 4.8 | flagship | low | $5.00 / $25.00 | 60 ± 10 tok/s (95% CI, n=3) | 1560 ± 1232 ms (95% CI, n=3) | 7750 ± 1962 ms (95% CI, n=3) |
| Anthropic | Claude Opus 4.8 | flagship | high | $5.00 / $25.00 | 63 ± 6 tok/s (95% CI, n=3) | 975 ± 81 ms (95% CI, n=3) | 6977 ± 461 ms (95% CI, n=3) |
| Anthropic | Claude Opus 4.8 | flagship | max | $5.00 / $25.00 | 66 ± 4 tok/s (95% CI, n=3) | 864 ± 212 ms (95% CI, n=3) | 6623 ± 544 ms (95% CI, n=3) |
| Anthropic | Claude Sonnet 5 | mid | low | $3.00 / $15.00 | 79 ± 3 tok/s (95% CI, n=3) | 1196 ± 561 ms (95% CI, n=3) | 5880 ± 529 ms (95% CI, n=3) |
| Anthropic | Claude Sonnet 5 | mid | high | $3.00 / $15.00 | 190 ± 225 tok/s (95% CI, n=3) | 2772 ± 2703 ms (95% CI, n=3) | 7338 ± 1136 ms (95% CI, n=3) |
| Anthropic | Claude Sonnet 5 | mid | max | $3.00 / $15.00 | 124 ± 6 tok/s (95% CI, n=3) | 0 ± 0 ms (95% CI, n=3) | 16526 ± 877 ms (95% CI, n=3) |
| Anthropic | Claude Haiku 4.5 | small | n/a | $1.00 / $5.00 | 85 ± 11 tok/s (95% CI, n=3) | 853 ± 131 ms (95% CI, n=3) | 3882 ± 649 ms (95% CI, n=3) |
| OpenAI | GPT-5.5 | flagship | none | $5.00 / $30.00 | 48 ± 4 tok/s (95% CI, n=3) | 1295 ± 797 ms (95% CI, n=3) | 6264 ± 685 ms (95% CI, n=3) |
| OpenAI | GPT-5.5 | flagship | medium | $5.00 / $30.00 | 534 ± 106 tok/s (95% CI, n=3) | 10768 ± 477 ms (95% CI, n=3) | 12439 ± 474 ms (95% CI, n=3) |
| OpenAI | GPT-5.5 | flagship | high | $5.00 / $30.00 | 706 ± 73 tok/s (95% CI, n=3) | 12353 ± 2045 ms (95% CI, n=3) | 13931 ± 2101 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 | mid | none | $2.50 / $15.00 | 84 ± 3 tok/s (95% CI, n=3) | 559 ± 120 ms (95% CI, n=3) | 3209 ± 30 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 | mid | medium | $2.50 / $15.00 | 1030 ± 116 tok/s (95% CI, n=3) | 6614 ± 732 ms (95% CI, n=3) | 7608 ± 707 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 | mid | high | $2.50 / $15.00 | 1522 ± 786 tok/s (95% CI, n=3) | 7369 ± 3281 ms (95% CI, n=3) | 8246 ± 3266 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 mini | small | none | $0.50 / $2.00 | 130 ± 17 tok/s (95% CI, n=3) | 567 ± 27 ms (95% CI, n=3) | 2388 ± 325 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 mini | small | medium | $0.50 / $2.00 | 1442 ± 154 tok/s (95% CI, n=3) | 5594 ± 246 ms (95% CI, n=3) | 6450 ± 260 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 mini | small | high | $0.50 / $2.00 | 2952 ± 3461 tok/s (95% CI, n=3) | 7211 ± 3669 ms (95% CI, n=3) | 7943 ± 3262 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 nano | small | none | $0.15 / $0.60 | 182 ± 12 tok/s (95% CI, n=3) | 592 ± 79 ms (95% CI, n=3) | 1751 ± 154 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 nano | small | medium | $0.15 / $0.60 | 927 ± 245 tok/s (95% CI, n=3) | 5618 ± 926 ms (95% CI, n=3) | 6918 ± 794 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 nano | small | high | $0.15 / $0.60 | 907 ± 78 tok/s (95% CI, n=3) | 6161 ± 364 ms (95% CI, n=3) | 7551 ± 354 ms (95% CI, n=3) |
| OpenAI | o4-mini | mid | low | $1.10 / $4.40 | 1078 ± 104 tok/s (95% CI, n=3) | 6121 ± 869 ms (95% CI, n=3) | 7380 ± 847 ms (95% CI, n=3) |
| OpenAI | o4-mini | mid | medium | $1.10 / $4.40 | 1000 ± 823 tok/s (95% CI, n=3) | 4896 ± 5005 ms (95% CI, n=3) | 9089 ± 1797 ms (95% CI, n=3) |
| OpenAI | o4-mini | mid | high | $1.10 / $4.40 | 184 ± 4 tok/s (95% CI, n=3) | 0 ± 0 ms (95% CI, n=3) | 11146 ± 249 ms (95% CI, n=3) |
| OpenAI | GPT Realtime | flagship | n/a | $4.00 / $16.00 | 132 ± 4 tok/s (95% CI, n=3) | 1137 ± 656 ms (95% CI, n=3) | 3595 ± 1462 ms (95% CI, n=3) |
| OpenAI | GPT-5.3 Codex | flagship | low | $1.75 / $14.00 | 574 ± 117 tok/s (95% CI, n=3) | 7582 ± 252 ms (95% CI, n=3) | 9396 ± 674 ms (95% CI, n=3) |
| OpenAI | GPT-5.3 Codex | flagship | high | $1.75 / $14.00 | 863 ± 422 tok/s (95% CI, n=3) | 11015 ± 4210 ms (95% CI, n=3) | 12711 ± 4083 ms (95% CI, n=3) |
| OpenAI | GPT-5.3 Codex | flagship | xhigh | $1.75 / $14.00 | 374 ± 732 tok/s (95% CI, n=3) | 10810 ± 11322 ms (95% CI, n=3) | 17586 ± 3612 ms (95% CI, n=3) |
| OpenAI | GPT-5.1 Codex mini | small | low | $0.25 / $2.00 | 731 ± 535 tok/s (95% CI, n=3) | 3795 ± 3067 ms (95% CI, n=3) | 5090 ± 3057 ms (95% CI, n=3) |
| OpenAI | GPT-5.1 Codex mini | small | medium | $0.25 / $2.00 | 576 ± 574 tok/s (95% CI, n=3) | 3814 ± 3858 ms (95% CI, n=3) | 8022 ± 2015 ms (95% CI, n=3) |
| OpenAI | GPT-5.1 Codex mini | small | high | $0.25 / $2.00 | 317 ± 621 tok/s (95% CI, n=3) | 1726 ± 3383 ms (95% CI, n=3) | 8873 ± 2365 ms (95% CI, n=3) |
| Google | Gemini 3.1 Pro | flagship | low | $2.00 / $12.00 | 266 ± 5 tok/s (95% CI, n=3) | 14977 ± 45 ms (95% CI, n=3) | 15276 ± 43 ms (95% CI, n=3) |
| Google | Gemini 3.1 Pro | flagship | medium | $2.00 / $12.00 | 302 ± 45 tok/s (95% CI, n=3) | 15376 ± 903 ms (95% CI, n=3) | 15646 ± 864 ms (95% CI, n=3) |
| Google | Gemini 3.1 Pro | flagship | high | $2.00 / $12.00 | 274 ± 16 tok/s (95% CI, n=3) | 15497 ± 979 ms (95% CI, n=3) | 15782 ± 988 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash | mid | low | $1.50 / $9.00 | 490 ± 204 tok/s (95% CI, n=3) | 7520 ± 661 ms (95% CI, n=3) | 7699 ± 600 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash | mid | medium | $1.50 / $9.00 | 449 ± 87 tok/s (95% CI, n=3) | 7333 ± 351 ms (95% CI, n=3) | 7511 ± 381 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash | mid | high | $1.50 / $9.00 | 684 ± 518 tok/s (95% CI, n=3) | 7852 ± 460 ms (95% CI, n=3) | 8002 ± 413 ms (95% CI, n=3) |
| Google | Gemini 3.1 Flash-Lite | small | low | $0.25 / $1.50 | 216 ± 22 tok/s (95% CI, n=3) | 903 ± 51 ms (95% CI, n=3) | 1980 ± 196 ms (95% CI, n=3) |
| Google | Gemini 3.1 Flash-Lite | small | medium | $0.25 / $1.50 | 1754 ± 1608 tok/s (95% CI, n=3) | 6014 ± 79 ms (95% CI, n=3) | 6079 ± 65 ms (95% CI, n=3) |
| Google | Gemini 3.1 Flash-Lite | small | high | $0.25 / $1.50 | 1290 ± 590 tok/s (95% CI, n=3) | 6180 ± 337 ms (95% CI, n=3) | 6252 ± 369 ms (95% CI, n=3) |
| xAI | Grok 4.3 | frontier | none | $1.25 / $2.50 | 108 ± 13 tok/s (95% CI, n=3) | 524 ± 27 ms (95% CI, n=3) | 2382 ± 186 ms (95% CI, n=3) |
| xAI | Grok 4.3 | frontier | medium | $1.25 / $2.50 | 258 ± 18 tok/s (95% CI, n=3) | 19640 ± 5470 ms (95% CI, n=3) | 20490 ± 5423 ms (95% CI, n=3) |
| xAI | Grok 4.3 | frontier | high | $1.25 / $2.50 | 250 ± 7 tok/s (95% CI, n=3) | 23565 ± 5250 ms (95% CI, n=3) | 24423 ± 5203 ms (95% CI, n=3) |
| xAI | Grok 4.20 Reasoning | flagship | n/a | $1.25 / $2.50 | 229 ± 37 tok/s (95% CI, n=3) | 37966 ± 16419 ms (95% CI, n=3) | 38918 ± 16237 ms (95% CI, n=3) |
| xAI | Grok 4.20 Non-Reasoning | mid | n/a | $1.25 / $2.50 | 100 ± 2 tok/s (95% CI, n=3) | 435 ± 40 ms (95% CI, n=3) | 2919 ± 123 ms (95% CI, n=3) |
| xAI | Grok Build 0.1 | small | n/a | $1.00 / $2.00 | 273 ± 4 tok/s (95% CI, n=3) | 35660 ± 6588 ms (95% CI, n=3) | 36444 ± 6613 ms (95% CI, n=3) |
| AWS Bedrock | Claude Sonnet 5 (Bedrock) | mid | low | $3.00 / $15.00 | n/a (error) | n/a (error) | n/a (error) |
| Google | Gemini 3.6 Flash | mid | low | $1.50 / $7.50 | 509 ± 160 tok/s (95% CI, n=3) | 9078 ± 372 ms (95% CI, n=3) | 9245 ± 412 ms (95% CI, n=3) |
| Google | Gemini 3.6 Flash | mid | medium | $1.50 / $7.50 | 542 ± 154 tok/s (95% CI, n=3) | 9459 ± 399 ms (95% CI, n=3) | 9609 ± 429 ms (95% CI, n=3) |
| Google | Gemini 3.6 Flash | mid | high | $1.50 / $7.50 | 422 ± 28 tok/s (95% CI, n=3) | 9469 ± 743 ms (95% CI, n=3) | 9657 ± 736 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash-Lite | small | low | $0.30 / $2.50 | 470 ± 155 tok/s (95% CI, n=3) | 5424 ± 147 ms (95% CI, n=3) | 5603 ± 87 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash-Lite | small | medium | $0.30 / $2.50 | 755 ± 267 tok/s (95% CI, n=3) | 5052 ± 534 ms (95% CI, n=3) | 5170 ± 566 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash-Lite | small | high | $0.30 / $2.50 | 730 ± 246 tok/s (95% CI, n=3) | 5512 ± 180 ms (95% CI, n=3) | 5628 ± 138 ms (95% CI, n=3) |

**Legend.** Provider, Model, Tier, Effort, and Cost are curated catalog data. The metric columns are measured values. `n/a (fixtured)` means the deterministic fixture client produced the cell; `n/a (error)` means every trial for that configuration failed.

Each detail table reports observed min-max and contributing trial count for one measured aspect.

**Sustained throughput during generation**

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 272 ± 14 tok/s (95% CI, n=3) | 262.4–285.6 | 3 |
| Claude Fable 5 [high] | 468 ± 372 tok/s (95% CI, n=3) | 89.5–676.5 | 3 |
| Claude Fable 5 [max] | 93 ± 2 tok/s (95% CI, n=3) | 90.4–94.0 | 3 |
| Claude Opus 4.8 [low] | 60 ± 10 tok/s (95% CI, n=3) | 51.4–68.9 | 3 |
| Claude Opus 4.8 [high] | 63 ± 6 tok/s (95% CI, n=3) | 57.2–68.1 | 3 |
| Claude Opus 4.8 [max] | 66 ± 4 tok/s (95% CI, n=3) | 61.8–68.3 | 3 |
| Claude Sonnet 5 [low] | 79 ± 3 tok/s (95% CI, n=3) | 76.1–81.6 | 3 |
| Claude Sonnet 5 [high] | 190 ± 225 tok/s (95% CI, n=3) | 63.6–419.9 | 3 |
| Claude Sonnet 5 [max] | 124 ± 6 tok/s (95% CI, n=3) | 117.7–128.8 | 3 |
| Claude Haiku 4.5 [n/a] | 85 ± 11 tok/s (95% CI, n=3) | 74.2–90.9 | 3 |
| GPT-5.5 [none] | 48 ± 4 tok/s (95% CI, n=3) | 44.4–50.6 | 3 |
| GPT-5.5 [medium] | 534 ± 106 tok/s (95% CI, n=3) | 426.3–599.4 | 3 |
| GPT-5.5 [high] | 706 ± 73 tok/s (95% CI, n=3) | 644.1–773.0 | 3 |
| GPT-5.4 [none] | 84 ± 3 tok/s (95% CI, n=3) | 81.6–86.3 | 3 |
| GPT-5.4 [medium] | 1030 ± 116 tok/s (95% CI, n=3) | 912.6–1099.9 | 3 |
| GPT-5.4 [high] | 1522 ± 786 tok/s (95% CI, n=3) | 1084.4–2322.5 | 3 |
| GPT-5.4 mini [none] | 130 ± 17 tok/s (95% CI, n=3) | 112.5–139.2 | 3 |
| GPT-5.4 mini [medium] | 1442 ± 154 tok/s (95% CI, n=3) | 1298.3–1568.4 | 3 |
| GPT-5.4 mini [high] | 2952 ± 3461 tok/s (95% CI, n=3) | 1076.0–6481.0 | 3 |
| GPT-5.4 nano [none] | 182 ± 12 tok/s (95% CI, n=3) | 171.6–193.2 | 3 |
| GPT-5.4 nano [medium] | 927 ± 245 tok/s (95% CI, n=3) | 730.4–1159.1 | 3 |
| GPT-5.4 nano [high] | 907 ± 78 tok/s (95% CI, n=3) | 829.8–962.9 | 3 |
| o4-mini [low] | 1078 ± 104 tok/s (95% CI, n=3) | 993.8–1176.8 | 3 |
| o4-mini [medium] | 1000 ± 823 tok/s (95% CI, n=3) | 200.0–1620.1 | 3 |
| o4-mini [high] | 184 ± 4 tok/s (95% CI, n=3) | 181.5–188.0 | 3 |
| GPT Realtime [n/a] | 132 ± 4 tok/s (95% CI, n=3) | 128.3–134.5 | 3 |
| GPT-5.3 Codex [low] | 574 ± 117 tok/s (95% CI, n=3) | 458.9–658.4 | 3 |
| GPT-5.3 Codex [high] | 863 ± 422 tok/s (95% CI, n=3) | 646.8–1293.9 | 3 |
| GPT-5.3 Codex [xhigh] | 374 ± 732 tok/s (95% CI, n=3) | 0.0–1121.0 | 3 |
| GPT-5.1 Codex mini [low] | 731 ± 535 tok/s (95% CI, n=3) | 198.2–1099.9 | 3 |
| GPT-5.1 Codex mini [medium] | 576 ± 574 tok/s (95% CI, n=3) | 0.0–955.4 | 3 |
| GPT-5.1 Codex mini [high] | 317 ± 621 tok/s (95% CI, n=3) | 0.0–950.1 | 3 |
| Gemini 3.1 Pro [low] | 266 ± 5 tok/s (95% CI, n=3) | 261.6–270.3 | 3 |
| Gemini 3.1 Pro [medium] | 302 ± 45 tok/s (95% CI, n=3) | 266.4–344.7 | 3 |
| Gemini 3.1 Pro [high] | 274 ± 16 tok/s (95% CI, n=3) | 260.9–288.9 | 3 |
| Gemini 3.5 Flash [low] | 490 ± 204 tok/s (95% CI, n=3) | 283.1–609.0 | 3 |
| Gemini 3.5 Flash [medium] | 449 ± 87 tok/s (95% CI, n=3) | 363.2–512.7 | 3 |
| Gemini 3.5 Flash [high] | 684 ± 518 tok/s (95% CI, n=3) | 411.2–1212.1 | 3 |
| Gemini 3.1 Flash-Lite [low] | 216 ± 22 tok/s (95% CI, n=3) | 192.8–229.8 | 3 |
| Gemini 3.1 Flash-Lite [medium] | 1754 ± 1608 tok/s (95% CI, n=3) | 846.2–3391.3 | 3 |
| Gemini 3.1 Flash-Lite [high] | 1290 ± 590 tok/s (95% CI, n=3) | 690.3–1640.0 | 3 |
| Grok 4.3 [none] | 108 ± 13 tok/s (95% CI, n=3) | 98.7–120.0 | 3 |
| Grok 4.3 [medium] | 258 ± 18 tok/s (95% CI, n=3) | 247.1–275.5 | 3 |
| Grok 4.3 [high] | 250 ± 7 tok/s (95% CI, n=3) | 244.8–256.4 | 3 |
| Grok 4.20 Reasoning [n/a] | 229 ± 37 tok/s (95% CI, n=3) | 192.2–253.3 | 3 |
| Grok 4.20 Non-Reasoning [n/a] | 100 ± 2 tok/s (95% CI, n=3) | 98.9–102.2 | 3 |
| Grok Build 0.1 [n/a] | 273 ± 4 tok/s (95% CI, n=3) | 269.8–277.2 | 3 |
| Claude Sonnet 5 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Gemini 3.6 Flash [low] | 509 ± 160 tok/s (95% CI, n=3) | 346.3–592.6 | 3 |
| Gemini 3.6 Flash [medium] | 542 ± 154 tok/s (95% CI, n=3) | 401.0–672.4 | 3 |
| Gemini 3.6 Flash [high] | 422 ± 28 tok/s (95% CI, n=3) | 395.0–443.2 | 3 |
| Gemini 3.5 Flash-Lite [low] | 470 ± 155 tok/s (95% CI, n=3) | 318.4–585.7 | 3 |
| Gemini 3.5 Flash-Lite [medium] | 755 ± 267 tok/s (95% CI, n=3) | 482.4–901.1 | 3 |
| Gemini 3.5 Flash-Lite [high] | 730 ± 246 tok/s (95% CI, n=3) | 515.9–950.6 | 3 |

Highest measured of the 53 measured configuration(s): **GPT-5.4 mini [high]** at 2952 ± 3461 tok/s (95% CI, n=3). Opposite end of this measurement: GPT-5.5 [none] at 48 ± 4 tok/s (95% CI, n=3).

**Time to first token**

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 9888 ± 729 ms (95% CI, n=3) | 9286–10568 | 3 |
| Claude Fable 5 [high] | 12148 ± 11912 ms (95% CI, n=3) | 0–18569 | 3 |
| Claude Fable 5 [max] | 0 ± 0 ms (95% CI, n=3) | 0–0 | 3 |
| Claude Opus 4.8 [low] | 1560 ± 1232 ms (95% CI, n=3) | 929–2817 | 3 |
| Claude Opus 4.8 [high] | 975 ± 81 ms (95% CI, n=3) | 916–1055 | 3 |
| Claude Opus 4.8 [max] | 864 ± 212 ms (95% CI, n=3) | 755–1081 | 3 |
| Claude Sonnet 5 [low] | 1196 ± 561 ms (95% CI, n=3) | 739–1723 | 3 |
| Claude Sonnet 5 [high] | 2772 ± 2703 ms (95% CI, n=3) | 1272–5527 | 3 |
| Claude Sonnet 5 [max] | 0 ± 0 ms (95% CI, n=3) | 0–0 | 3 |
| Claude Haiku 4.5 [n/a] | 853 ± 131 ms (95% CI, n=3) | 778–986 | 3 |
| GPT-5.5 [none] | 1295 ± 797 ms (95% CI, n=3) | 722–2082 | 3 |
| GPT-5.5 [medium] | 10768 ± 477 ms (95% CI, n=3) | 10484–11253 | 3 |
| GPT-5.5 [high] | 12353 ± 2045 ms (95% CI, n=3) | 10922–14383 | 3 |
| GPT-5.4 [none] | 559 ± 120 ms (95% CI, n=3) | 487–681 | 3 |
| GPT-5.4 [medium] | 6614 ± 732 ms (95% CI, n=3) | 6151–7353 | 3 |
| GPT-5.4 [high] | 7369 ± 3281 ms (95% CI, n=3) | 5665–10717 | 3 |
| GPT-5.4 mini [none] | 567 ± 27 ms (95% CI, n=3) | 546–593 | 3 |
| GPT-5.4 mini [medium] | 5594 ± 246 ms (95% CI, n=3) | 5449–5844 | 3 |
| GPT-5.4 mini [high] | 7211 ± 3669 ms (95% CI, n=3) | 4935–10923 | 3 |
| GPT-5.4 nano [none] | 592 ± 79 ms (95% CI, n=3) | 511–634 | 3 |
| GPT-5.4 nano [medium] | 5618 ± 926 ms (95% CI, n=3) | 4877–6496 | 3 |
| GPT-5.4 nano [high] | 6161 ± 364 ms (95% CI, n=3) | 5821–6461 | 3 |
| o4-mini [low] | 6121 ± 869 ms (95% CI, n=3) | 5418–6940 | 3 |
| o4-mini [medium] | 4896 ± 5005 ms (95% CI, n=3) | 0–8601 | 3 |
| o4-mini [high] | 0 ± 0 ms (95% CI, n=3) | 0–0 | 3 |
| GPT Realtime [n/a] | 1137 ± 656 ms (95% CI, n=3) | 788–1807 | 3 |
| GPT-5.3 Codex [low] | 7582 ± 252 ms (95% CI, n=3) | 7329–7749 | 3 |
| GPT-5.3 Codex [high] | 11015 ± 4210 ms (95% CI, n=3) | 8341–15264 | 3 |
| GPT-5.3 Codex [xhigh] | 10810 ± 11322 ms (95% CI, n=3) | 0–19746 | 3 |
| GPT-5.1 Codex mini [low] | 3795 ± 3067 ms (95% CI, n=3) | 697–5729 | 3 |
| GPT-5.1 Codex mini [medium] | 3814 ± 3858 ms (95% CI, n=3) | 0–6567 | 3 |
| GPT-5.1 Codex mini [high] | 1726 ± 3383 ms (95% CI, n=3) | 0–5178 | 3 |
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
| Grok 4.3 [medium] | 19640 ± 5470 ms (95% CI, n=3) | 15124–24739 | 3 |
| Grok 4.3 [high] | 23565 ± 5250 ms (95% CI, n=3) | 19629–28680 | 3 |
| Grok 4.20 Reasoning [n/a] | 37966 ± 16419 ms (95% CI, n=3) | 24169–53096 | 3 |
| Grok 4.20 Non-Reasoning [n/a] | 435 ± 40 ms (95% CI, n=3) | 405–474 | 3 |
| Grok Build 0.1 [n/a] | 35660 ± 6588 ms (95% CI, n=3) | 28981–39657 | 3 |
| Claude Sonnet 5 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Gemini 3.6 Flash [low] | 9078 ± 372 ms (95% CI, n=3) | 8699–9292 | 3 |
| Gemini 3.6 Flash [medium] | 9459 ± 399 ms (95% CI, n=3) | 9079–9777 | 3 |
| Gemini 3.6 Flash [high] | 9469 ± 743 ms (95% CI, n=3) | 8898–10186 | 3 |
| Gemini 3.5 Flash-Lite [low] | 5424 ± 147 ms (95% CI, n=3) | 5285–5543 | 3 |
| Gemini 3.5 Flash-Lite [medium] | 5052 ± 534 ms (95% CI, n=3) | 4511–5378 | 3 |
| Gemini 3.5 Flash-Lite [high] | 5512 ± 180 ms (95% CI, n=3) | 5359–5677 | 3 |

Lowest measured of the 53 measured configuration(s): **Claude Fable 5 [max]** at 0 ± 0 ms (95% CI, n=3). Opposite end of this measurement: Grok 4.20 Reasoning [n/a] at 37966 ± 16419 ms (95% CI, n=3).

**Total response time**

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 12820 ± 506 ms (95% CI, n=3) | 12449–13317 | 3 |
| Claude Fable 5 [high] | 21810 ± 1100 ms (95% CI, n=3) | 21013–22893 | 3 |
| Claude Fable 5 [max] | 22100 ± 544 ms (95% CI, n=3) | 21792–22654 | 3 |
| Claude Opus 4.8 [low] | 7750 ± 1962 ms (95% CI, n=3) | 6392–9703 | 3 |
| Claude Opus 4.8 [high] | 6977 ± 461 ms (95% CI, n=3) | 6669–7439 | 3 |
| Claude Opus 4.8 [max] | 6623 ± 544 ms (95% CI, n=3) | 6068–6904 | 3 |
| Claude Sonnet 5 [low] | 5880 ± 529 ms (95% CI, n=3) | 5351–6238 | 3 |
| Claude Sonnet 5 [high] | 7338 ± 1136 ms (95% CI, n=3) | 6325–8333 | 3 |
| Claude Sonnet 5 [max] | 16526 ± 877 ms (95% CI, n=3) | 15904–17394 | 3 |
| Claude Haiku 4.5 [n/a] | 3882 ± 649 ms (95% CI, n=3) | 3540–4544 | 3 |
| GPT-5.5 [none] | 6264 ± 685 ms (95% CI, n=3) | 5602–6789 | 3 |
| GPT-5.5 [medium] | 12439 ± 474 ms (95% CI, n=3) | 12192–12923 | 3 |
| GPT-5.5 [high] | 13931 ± 2101 ms (95% CI, n=3) | 12447–16013 | 3 |
| GPT-5.4 [none] | 3209 ± 30 ms (95% CI, n=3) | 3180–3231 | 3 |
| GPT-5.4 [medium] | 7608 ± 707 ms (95% CI, n=3) | 7062–8289 | 3 |
| GPT-5.4 [high] | 8246 ± 3266 ms (95% CI, n=3) | 6570–11579 | 3 |
| GPT-5.4 mini [none] | 2388 ± 325 ms (95% CI, n=3) | 2196–2718 | 3 |
| GPT-5.4 mini [medium] | 6450 ± 260 ms (95% CI, n=3) | 6301–6714 | 3 |
| GPT-5.4 mini [high] | 7943 ± 3262 ms (95% CI, n=3) | 5895–11239 | 3 |
| GPT-5.4 nano [none] | 1751 ± 154 ms (95% CI, n=3) | 1598–1858 | 3 |
| GPT-5.4 nano [medium] | 6918 ± 794 ms (95% CI, n=3) | 6305–7684 | 3 |
| GPT-5.4 nano [high] | 7551 ± 354 ms (95% CI, n=3) | 7255–7878 | 3 |
| o4-mini [low] | 7380 ± 847 ms (95% CI, n=3) | 6702–8184 | 3 |
| o4-mini [medium] | 9089 ± 1797 ms (95% CI, n=3) | 7278–10242 | 3 |
| o4-mini [high] | 11146 ± 249 ms (95% CI, n=3) | 10892–11281 | 3 |
| GPT Realtime [n/a] | 3595 ± 1462 ms (95% CI, n=3) | 2579–5049 | 3 |
| GPT-5.3 Codex [low] | 9396 ± 674 ms (95% CI, n=3) | 8860–10037 | 3 |
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
| Grok 4.3 [medium] | 20490 ± 5423 ms (95% CI, n=3) | 15982–25523 | 3 |
| Grok 4.3 [high] | 24423 ± 5203 ms (95% CI, n=3) | 20529–29495 | 3 |
| Grok 4.20 Reasoning [n/a] | 38918 ± 16237 ms (95% CI, n=3) | 25329–53921 | 3 |
| Grok 4.20 Non-Reasoning [n/a] | 2919 ± 123 ms (95% CI, n=3) | 2843–3043 | 3 |
| Grok Build 0.1 [n/a] | 36444 ± 6613 ms (95% CI, n=3) | 29735–40428 | 3 |
| Claude Sonnet 5 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Gemini 3.6 Flash [low] | 9245 ± 412 ms (95% CI, n=3) | 8833–9523 | 3 |
| Gemini 3.6 Flash [medium] | 9609 ± 429 ms (95% CI, n=3) | 9218–9974 | 3 |
| Gemini 3.6 Flash [high] | 9657 ± 736 ms (95% CI, n=3) | 9098–10371 | 3 |
| Gemini 3.5 Flash-Lite [low] | 5603 ± 87 ms (95% CI, n=3) | 5530–5683 | 3 |
| Gemini 3.5 Flash-Lite [medium] | 5170 ± 566 ms (95% CI, n=3) | 4602–5548 | 3 |
| Gemini 3.5 Flash-Lite [high] | 5628 ± 138 ms (95% CI, n=3) | 5516–5758 | 3 |

Lowest measured of the 53 measured configuration(s): **GPT-5.4 nano [none]** at 1751 ± 154 ms (95% CI, n=3). Opposite end of this measurement: Grok 4.20 Reasoning [n/a] at 38918 ± 16237 ms (95% CI, n=3).

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

For each provider tier that turned a generation this round, the former and the new model were swept under identical conditions (same tier, same effort ladder — only the model id differs), so these deltas isolate the generational change. A speed or accuracy delta appears only when both generations were `measured` in this frame; cost figures are curated registry facts. The net verdict is a mechanical rule over the per-metric deltas (each metric counts as moved only past a 1% relative threshold): **improved** when at least one metric improved and none regressed, **regressed** in the mirror case, **mixed** when both occur, and **unchanged** when every metric held within the threshold. A measured metric is additionally labelled **indistinguishable**, and excluded from the verdict, when the gap between the two means does not clear their combined run-to-run spread (the sum of the two standard deviations, shown in its own column). Each measurement is three trials, and re-running an identical sweep hours apart moved sustained throughput by up to 88% on the same configuration — so at this trial count a bare percentage change is not by itself evidence of a generational direction. Cost figures are registry facts and carry no spread. Cheaper is an improvement; a faster-but-pricier result reads as mixed, never silently netted to improved.

##### Gemini 3.5 Flash → Gemini 3.6 Flash

**Effort `low`.**

| Metric | Former | New | Change | Run-to-run spread | Direction |
| ------ | ------ | --- | ------ | ----------------- | --------- |
| Sustained throughput | 490.4 tok/s | 509.5 tok/s | +19.1 tok/s (+4%) | ±321.4 tok/s | indistinguishable |
| Time to first token | 7520 ms | 9078 ms | +1558 ms (+21%) | ±914 ms | regressed |
| Total response time | 7699 ms | 9245 ms | +1545 ms (+20%) | ±894 ms | regressed |
| Input cost | $1.50 | $1.50 | +0.00 $/MTok (+0%) | — | unchanged |
| Output cost | $9.00 | $7.50 | −1.50 $/MTok (−17%) | — | improved |

_Net verdict: **mixed** — 2 improved, 2 regressed, 3 unchanged of 9 metrics; 2 indistinguishable from run-to-run spread and excluded._

**Effort `medium`.**

| Metric | Former | New | Change | Run-to-run spread | Direction |
| ------ | ------ | --- | ------ | ----------------- | --------- |
| Sustained throughput | 448.6 tok/s | 542.5 tok/s | +93.9 tok/s (+21%) | ±213.0 tok/s | indistinguishable |
| Time to first token | 7333 ms | 9459 ms | +2126 ms (+29%) | ±663 ms | regressed |
| Total response time | 7511 ms | 9609 ms | +2098 ms (+28%) | ±716 ms | regressed |
| Input cost | $1.50 | $1.50 | +0.00 $/MTok (+0%) | — | unchanged |
| Output cost | $9.00 | $7.50 | −1.50 $/MTok (−17%) | — | improved |

_Net verdict: **mixed** — 2 improved, 3 regressed, 3 unchanged of 9 metrics; 1 indistinguishable from run-to-run spread and excluded._

**Effort `high`.**

| Metric | Former | New | Change | Run-to-run spread | Direction |
| ------ | ------ | --- | ------ | ----------------- | --------- |
| Sustained throughput | 683.7 tok/s | 422.0 tok/s | −261.7 tok/s (−38%) | ±482.3 tok/s | indistinguishable |
| Time to first token | 7852 ms | 9469 ms | +1617 ms (+21%) | ±1063 ms | regressed |
| Total response time | 8002 ms | 9657 ms | +1656 ms (+21%) | ±1015 ms | regressed |
| Input cost | $1.50 | $1.50 | +0.00 $/MTok (+0%) | — | unchanged |
| Output cost | $9.00 | $7.50 | −1.50 $/MTok (−17%) | — | improved |

_Net verdict: **mixed** — 3 improved, 2 regressed, 3 unchanged of 9 metrics; 1 indistinguishable from run-to-run spread and excluded._

##### Gemini 3.1 Flash-Lite → Gemini 3.5 Flash-Lite

**Effort `low`.**

| Metric | Former | New | Change | Run-to-run spread | Direction |
| ------ | ------ | --- | ------ | ----------------- | --------- |
| Sustained throughput | 215.5 tok/s | 470.2 tok/s | +254.7 tok/s (+118%) | ±157.2 tok/s | improved |
| Time to first token | 903 ms | 5424 ms | +4521 ms (+501%) | ±175 ms | regressed |
| Total response time | 1980 ms | 5603 ms | +3623 ms (+183%) | ±250 ms | regressed |
| Input cost | $0.25 | $0.30 | +0.05 $/MTok (+20%) | — | regressed |
| Output cost | $1.50 | $2.50 | +1.00 $/MTok (+67%) | — | regressed |

_Net verdict: **mixed** — 2 improved, 5 regressed, 2 unchanged of 9 metrics._

**Effort `medium`.**

| Metric | Former | New | Change | Run-to-run spread | Direction |
| ------ | ------ | --- | ------ | ----------------- | --------- |
| Sustained throughput | 1754.2 tok/s | 754.6 tok/s | −999.5 tok/s (−57%) | ±1656.7 tok/s | indistinguishable |
| Time to first token | 6014 ms | 5052 ms | −962 ms (−16%) | ±542 ms | improved |
| Total response time | 6079 ms | 5170 ms | −909 ms (−15%) | ±558 ms | improved |
| Input cost | $0.25 | $0.30 | +0.05 $/MTok (+20%) | — | regressed |
| Output cost | $1.50 | $2.50 | +1.00 $/MTok (+67%) | — | regressed |

_Net verdict: **mixed** — 4 improved, 2 regressed, 2 unchanged of 9 metrics; 1 indistinguishable from run-to-run spread and excluded._

**Effort `high`.**

| Metric | Former | New | Change | Run-to-run spread | Direction |
| ------ | ------ | --- | ------ | ----------------- | --------- |
| Sustained throughput | 1289.6 tok/s | 730.4 tok/s | −559.1 tok/s (−43%) | ±738.9 tok/s | indistinguishable |
| Time to first token | 6180 ms | 5512 ms | −668 ms (−11%) | ±458 ms | improved |
| Total response time | 6252 ms | 5628 ms | −624 ms (−10%) | ±448 ms | improved |
| Input cost | $0.25 | $0.30 | +0.05 $/MTok (+20%) | — | regressed |
| Output cost | $1.50 | $2.50 | +1.00 $/MTok (+67%) | — | regressed |

_Net verdict: **mixed** — 3 improved, 2 regressed, 2 unchanged of 9 metrics; 2 indistinguishable from run-to-run spread and excluded._

The projection writes `llm-speed-comparison.data.json` and this Markdown page. The source sweep remains `llm-model-comparison.real.data.json`, so speed and accuracy stay auditable back to the same underlying run.
