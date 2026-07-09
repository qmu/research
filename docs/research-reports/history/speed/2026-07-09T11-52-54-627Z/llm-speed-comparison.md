---
title: LLM response speed comparison
description: A reproducible speed comparison of 19 large language models across 4 providers and 59 model×effort configurations, covering sustained generation throughput, time-to-first-token, and total response latency, over 1 trial. Projected from the shared LLM comparison sweep.
---

# LLM response speed comparison

This report compares **59 model×effort configurations** across
19 models and 4 providers on sustained generation throughput, time-to-first-token, and total response latency, over
**1 trial**.

The numbers here are a **projection of the combined LLM comparison sweep** — the
same trials, model×effort matrix, statistics, and provenance, restricted to this
topic's probes. They are not a separate measurement, so they match the combined
report cell-for-cell. Curated catalog facts (provider, model, tier, price,
effort) come from the model registry; measured values come from the projected
run artifact linked below.

## Comparison

| Provider | Model | Tier | Effort | Cost (in / out per MTok) | Throughput (tok/s) | TTFT (ms) | Total latency (ms) |
| -------- | ----- | ---- | ------ | ------------------------ | --- | --- | --- |
| Anthropic | Claude Fable 5 | frontier | low | $6.00 / $30.00 | 70 tok/s (n=1) | 3613 ms (n=1) | 4678 ms (n=1) |
| Anthropic | Claude Fable 5 | frontier | medium | $6.00 / $30.00 | 66 tok/s (n=1) | 3434 ms (n=1) | 4418 ms (n=1) |
| Anthropic | Claude Fable 5 | frontier | high | $6.00 / $30.00 | 71 tok/s (n=1) | 4103 ms (n=1) | 4545 ms (n=1) |
| Anthropic | Claude Fable 5 | frontier | xhigh | $6.00 / $30.00 | 66 tok/s (n=1) | 3466 ms (n=1) | 4253 ms (n=1) |
| Anthropic | Claude Fable 5 | frontier | max | $6.00 / $30.00 | 131 tok/s (n=1) | 5842 ms (n=1) | 6826 ms (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | low | $5.00 / $25.00 | 67 tok/s (n=1) | 1237 ms (n=1) | 1783 ms (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | medium | $5.00 / $25.00 | 60 tok/s (n=1) | 1176 ms (n=1) | 1935 ms (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | high | $5.00 / $25.00 | 66 tok/s (n=1) | 1078 ms (n=1) | 2014 ms (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | xhigh | $5.00 / $25.00 | 63 tok/s (n=1) | 2143 ms (n=1) | 2896 ms (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | max | $5.00 / $25.00 | 61 tok/s (n=1) | 1643 ms (n=1) | 2343 ms (n=1) |
| Anthropic | Claude Sonnet 5 | mid | low | $3.00 / $15.00 | 85 tok/s (n=1) | 792 ms (n=1) | 1665 ms (n=1) |
| Anthropic | Claude Sonnet 5 | mid | medium | $3.00 / $15.00 | 82 tok/s (n=1) | 938 ms (n=1) | 1757 ms (n=1) |
| Anthropic | Claude Sonnet 5 | mid | high | $3.00 / $15.00 | 84 tok/s (n=1) | 872 ms (n=1) | 1678 ms (n=1) |
| Anthropic | Claude Sonnet 5 | mid | xhigh | $3.00 / $15.00 | 90 tok/s (n=1) | 961 ms (n=1) | 1589 ms (n=1) |
| Anthropic | Claude Sonnet 5 | mid | max | $3.00 / $15.00 | 154 tok/s (n=1) | 16739 ms (n=1) | 16758 ms (n=1) |
| Anthropic | Claude Haiku 4.5 | small | n/a | $1.00 / $5.00 | 83 tok/s (n=1) | 842 ms (n=1) | 1148 ms (n=1) |
| OpenAI | GPT-5.5 | flagship | none | $5.00 / $30.00 | 33 tok/s (n=1) | 1405 ms (n=1) | 1868 ms (n=1) |
| OpenAI | GPT-5.5 | flagship | low | $5.00 / $30.00 | 38 tok/s (n=1) | 912 ms (n=1) | 1380 ms (n=1) |
| OpenAI | GPT-5.5 | flagship | medium | $5.00 / $30.00 | 28 tok/s (n=1) | 1057 ms (n=1) | 1580 ms (n=1) |
| OpenAI | GPT-5.5 | flagship | high | $5.00 / $30.00 | 34 tok/s (n=1) | 1098 ms (n=1) | 1326 ms (n=1) |
| OpenAI | GPT-5.4 | mid | none | $2.50 / $15.00 | 61 tok/s (n=1) | 677 ms (n=1) | 1349 ms (n=1) |
| OpenAI | GPT-5.4 | mid | low | $2.50 / $15.00 | 48 tok/s (n=1) | 1099 ms (n=1) | 1387 ms (n=1) |
| OpenAI | GPT-5.4 | mid | medium | $2.50 / $15.00 | 64 tok/s (n=1) | 1194 ms (n=1) | 1617 ms (n=1) |
| OpenAI | GPT-5.4 | mid | high | $2.50 / $15.00 | 71 tok/s (n=1) | 837 ms (n=1) | 1081 ms (n=1) |
| OpenAI | GPT-5.4 mini | small | none | $0.50 / $2.00 | 109 tok/s (n=1) | 853 ms (n=1) | 1279 ms (n=1) |
| OpenAI | GPT-5.4 mini | small | low | $0.50 / $2.00 | 138 tok/s (n=1) | 410 ms (n=1) | 678 ms (n=1) |
| OpenAI | GPT-5.4 mini | small | medium | $0.50 / $2.00 | 142 tok/s (n=1) | 946 ms (n=1) | 1209 ms (n=1) |
| OpenAI | GPT-5.4 mini | small | high | $0.50 / $2.00 | 146 tok/s (n=1) | 596 ms (n=1) | 827 ms (n=1) |
| OpenAI | GPT-5.4 nano | small | none | $0.15 / $0.60 | 162 tok/s (n=1) | 1130 ms (n=1) | 1858 ms (n=1) |
| OpenAI | GPT-5.4 nano | small | low | $0.15 / $0.60 | 140 tok/s (n=1) | 368 ms (n=1) | 623 ms (n=1) |
| OpenAI | GPT-5.4 nano | small | medium | $0.15 / $0.60 | 158 tok/s (n=1) | 399 ms (n=1) | 643 ms (n=1) |
| OpenAI | GPT-5.4 nano | small | high | $0.15 / $0.60 | 165 tok/s (n=1) | 467 ms (n=1) | 596 ms (n=1) |
| OpenAI | o4-mini | mid | low | $1.10 / $4.40 | 147 tok/s (n=1) | 930 ms (n=1) | 1136 ms (n=1) |
| OpenAI | o4-mini | mid | medium | $1.10 / $4.40 | 223 tok/s (n=1) | 2876 ms (n=1) | 3254 ms (n=1) |
| OpenAI | o4-mini | mid | high | $1.10 / $4.40 | 202 tok/s (n=1) | 7409 ms (n=1) | 7633 ms (n=1) |
| OpenAI | GPT Realtime | flagship | n/a | $4.00 / $16.00 | 127 tok/s (n=1) | 1137 ms (n=1) | 1336 ms (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | low | $1.75 / $14.00 | 51 tok/s (n=1) | 873 ms (n=1) | 1383 ms (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | medium | $1.75 / $14.00 | 58 tok/s (n=1) | 760 ms (n=1) | 1529 ms (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | high | $1.75 / $14.00 | 58 tok/s (n=1) | 1783 ms (n=1) | 4284 ms (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | xhigh | $1.75 / $14.00 | 0 tok/s (n=1) | 2430 ms (n=1) | 3072 ms (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | low | $0.25 / $2.00 | 184 tok/s (n=1) | 725 ms (n=1) | 944 ms (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | medium | $0.25 / $2.00 | 219 tok/s (n=1) | 641 ms (n=1) | 932 ms (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | high | $0.25 / $2.00 | 193 tok/s (n=1) | 522 ms (n=1) | 818 ms (n=1) |
| Google | Gemini 3.1 Pro | flagship | low | $2.00 / $12.00 | 167 tok/s (n=1) | 6530 ms (n=1) | 6530 ms (n=1) |
| Google | Gemini 3.1 Pro | flagship | medium | $2.00 / $12.00 | 155 tok/s (n=1) | 4206 ms (n=1) | 4394 ms (n=1) |
| Google | Gemini 3.1 Pro | flagship | high | $2.00 / $12.00 | 146 tok/s (n=1) | 7122 ms (n=1) | 7123 ms (n=1) |
| Google | Gemini 3.5 Flash | mid | low | $0.30 / $2.50 | 267 tok/s (n=1) | 2762 ms (n=1) | 2762 ms (n=1) |
| Google | Gemini 3.5 Flash | mid | medium | $0.30 / $2.50 | 255 tok/s (n=1) | 2680 ms (n=1) | 2680 ms (n=1) |
| Google | Gemini 3.5 Flash | mid | high | $0.30 / $2.50 | 221 tok/s (n=1) | 3082 ms (n=1) | 3084 ms (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | low | $0.10 / $0.40 | 250 tok/s (n=1) | 928 ms (n=1) | 931 ms (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | medium | $0.10 / $0.40 | 453 tok/s (n=1) | 1250 ms (n=1) | 1250 ms (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | high | $0.10 / $0.40 | 460 tok/s (n=1) | 1259 ms (n=1) | 1259 ms (n=1) |
| xAI | Grok 4.3 | frontier | none | $1.25 / $2.50 | 99 tok/s (n=1) | 584 ms (n=1) | 779 ms (n=1) |
| xAI | Grok 4.3 | frontier | low | $1.25 / $2.50 | 76 tok/s (n=1) | 3083 ms (n=1) | 3258 ms (n=1) |
| xAI | Grok 4.3 | frontier | medium | $1.25 / $2.50 | 177 tok/s (n=1) | 7150 ms (n=1) | 7273 ms (n=1) |
| xAI | Grok 4.3 | frontier | high | $1.25 / $2.50 | 196 tok/s (n=1) | 3735 ms (n=1) | 3962 ms (n=1) |
| xAI | Grok 4.20 Reasoning | flagship | n/a | $1.25 / $2.50 | 104 tok/s (n=1) | 2532 ms (n=1) | 2637 ms (n=1) |
| xAI | Grok 4.20 Non-Reasoning | mid | n/a | $1.25 / $2.50 | 96 tok/s (n=1) | 362 ms (n=1) | 522 ms (n=1) |
| xAI | Grok Build 0.1 | small | n/a | $1.00 / $2.00 | 227 tok/s (n=1) | 9531 ms (n=1) | 9681 ms (n=1) |

**Legend.** Provider, Model, Tier, Effort, and Cost are curated catalog data.
The metric columns are measured values, each reported as mean ± 95% confidence
interval (1.96 × sample standard deviation / √n) with n over 1 trial.
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
| Claude Fable 5 [low] | 70 tok/s (n=1) | 69.8–69.8 | 1 |
| Claude Fable 5 [medium] | 66 tok/s (n=1) | 65.6–65.6 | 1 |
| Claude Fable 5 [high] | 71 tok/s (n=1) | 71.3–71.3 | 1 |
| Claude Fable 5 [xhigh] | 66 tok/s (n=1) | 66.3–66.3 | 1 |
| Claude Fable 5 [max] | 131 tok/s (n=1) | 130.7–130.7 | 1 |
| Claude Opus 4.8 [low] | 67 tok/s (n=1) | 66.6–66.6 | 1 |
| Claude Opus 4.8 [medium] | 60 tok/s (n=1) | 59.8–59.8 | 1 |
| Claude Opus 4.8 [high] | 66 tok/s (n=1) | 66.4–66.4 | 1 |
| Claude Opus 4.8 [xhigh] | 63 tok/s (n=1) | 62.5–62.5 | 1 |
| Claude Opus 4.8 [max] | 61 tok/s (n=1) | 60.6–60.6 | 1 |
| Claude Sonnet 5 [low] | 85 tok/s (n=1) | 85.1–85.1 | 1 |
| Claude Sonnet 5 [medium] | 82 tok/s (n=1) | 82.3–82.3 | 1 |
| Claude Sonnet 5 [high] | 84 tok/s (n=1) | 83.8–83.8 | 1 |
| Claude Sonnet 5 [xhigh] | 90 tok/s (n=1) | 89.9–89.9 | 1 |
| Claude Sonnet 5 [max] | 154 tok/s (n=1) | 154.3–154.3 | 1 |
| Claude Haiku 4.5 [n/a] | 83 tok/s (n=1) | 83.5–83.5 | 1 |
| GPT-5.5 [none] | 33 tok/s (n=1) | 32.8–32.8 | 1 |
| GPT-5.5 [low] | 38 tok/s (n=1) | 38.3–38.3 | 1 |
| GPT-5.5 [medium] | 28 tok/s (n=1) | 28.4–28.4 | 1 |
| GPT-5.5 [high] | 34 tok/s (n=1) | 34.2–34.2 | 1 |
| GPT-5.4 [none] | 61 tok/s (n=1) | 61.0–61.0 | 1 |
| GPT-5.4 [low] | 48 tok/s (n=1) | 47.8–47.8 | 1 |
| GPT-5.4 [medium] | 64 tok/s (n=1) | 64.2–64.2 | 1 |
| GPT-5.4 [high] | 71 tok/s (n=1) | 71.0–71.0 | 1 |
| GPT-5.4 mini [none] | 109 tok/s (n=1) | 108.7–108.7 | 1 |
| GPT-5.4 mini [low] | 138 tok/s (n=1) | 137.8–137.8 | 1 |
| GPT-5.4 mini [medium] | 142 tok/s (n=1) | 141.9–141.9 | 1 |
| GPT-5.4 mini [high] | 146 tok/s (n=1) | 145.8–145.8 | 1 |
| GPT-5.4 nano [none] | 162 tok/s (n=1) | 161.7–161.7 | 1 |
| GPT-5.4 nano [low] | 140 tok/s (n=1) | 140.0–140.0 | 1 |
| GPT-5.4 nano [medium] | 158 tok/s (n=1) | 157.7–157.7 | 1 |
| GPT-5.4 nano [high] | 165 tok/s (n=1) | 165.1–165.1 | 1 |
| o4-mini [low] | 147 tok/s (n=1) | 147.4–147.4 | 1 |
| o4-mini [medium] | 223 tok/s (n=1) | 223.3–223.3 | 1 |
| o4-mini [high] | 202 tok/s (n=1) | 201.5–201.5 | 1 |
| GPT Realtime [n/a] | 127 tok/s (n=1) | 127.4–127.4 | 1 |
| GPT-5.3 Codex [low] | 51 tok/s (n=1) | 51.4–51.4 | 1 |
| GPT-5.3 Codex [medium] | 58 tok/s (n=1) | 58.1–58.1 | 1 |
| GPT-5.3 Codex [high] | 58 tok/s (n=1) | 57.5–57.5 | 1 |
| GPT-5.3 Codex [xhigh] | 0 tok/s (n=1) | 0.0–0.0 | 1 |
| GPT-5.1 Codex mini [low] | 184 tok/s (n=1) | 183.7–183.7 | 1 |
| GPT-5.1 Codex mini [medium] | 219 tok/s (n=1) | 219.4–219.4 | 1 |
| GPT-5.1 Codex mini [high] | 193 tok/s (n=1) | 192.9–192.9 | 1 |
| Gemini 3.1 Pro [low] | 167 tok/s (n=1) | 167.1–167.1 | 1 |
| Gemini 3.1 Pro [medium] | 155 tok/s (n=1) | 155.4–155.4 | 1 |
| Gemini 3.1 Pro [high] | 146 tok/s (n=1) | 145.7–145.7 | 1 |
| Gemini 3.5 Flash [low] | 267 tok/s (n=1) | 267.0–267.0 | 1 |
| Gemini 3.5 Flash [medium] | 255 tok/s (n=1) | 254.7–254.7 | 1 |
| Gemini 3.5 Flash [high] | 221 tok/s (n=1) | 221.3–221.3 | 1 |
| Gemini 3.1 Flash-Lite [low] | 250 tok/s (n=1) | 250.0–250.0 | 1 |
| Gemini 3.1 Flash-Lite [medium] | 453 tok/s (n=1) | 453.1–453.1 | 1 |
| Gemini 3.1 Flash-Lite [high] | 460 tok/s (n=1) | 460.5–460.5 | 1 |
| Grok 4.3 [none] | 99 tok/s (n=1) | 99.1–99.1 | 1 |
| Grok 4.3 [low] | 76 tok/s (n=1) | 76.2–76.2 | 1 |
| Grok 4.3 [medium] | 177 tok/s (n=1) | 177.1–177.1 | 1 |
| Grok 4.3 [high] | 196 tok/s (n=1) | 196.0–196.0 | 1 |
| Grok 4.20 Reasoning [n/a] | 104 tok/s (n=1) | 104.1–104.1 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 96 tok/s (n=1) | 96.5–96.5 | 1 |
| Grok Build 0.1 [n/a] | 227 tok/s (n=1) | 226.9–226.9 | 1 |

Highest measured of the 59 measured configuration(s): **Gemini 3.1 Flash-Lite [high]** at 460 tok/s (n=1). Opposite end of this measurement: GPT-5.3 Codex [xhigh] at 0 tok/s (n=1).

### Time to first token

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 3613 ms (n=1) | 3613–3613 | 1 |
| Claude Fable 5 [medium] | 3434 ms (n=1) | 3434–3434 | 1 |
| Claude Fable 5 [high] | 4103 ms (n=1) | 4103–4103 | 1 |
| Claude Fable 5 [xhigh] | 3466 ms (n=1) | 3466–3466 | 1 |
| Claude Fable 5 [max] | 5842 ms (n=1) | 5842–5842 | 1 |
| Claude Opus 4.8 [low] | 1237 ms (n=1) | 1237–1237 | 1 |
| Claude Opus 4.8 [medium] | 1176 ms (n=1) | 1176–1176 | 1 |
| Claude Opus 4.8 [high] | 1078 ms (n=1) | 1078–1078 | 1 |
| Claude Opus 4.8 [xhigh] | 2143 ms (n=1) | 2143–2143 | 1 |
| Claude Opus 4.8 [max] | 1643 ms (n=1) | 1643–1643 | 1 |
| Claude Sonnet 5 [low] | 792 ms (n=1) | 792–792 | 1 |
| Claude Sonnet 5 [medium] | 938 ms (n=1) | 938–938 | 1 |
| Claude Sonnet 5 [high] | 872 ms (n=1) | 872–872 | 1 |
| Claude Sonnet 5 [xhigh] | 961 ms (n=1) | 961–961 | 1 |
| Claude Sonnet 5 [max] | 16739 ms (n=1) | 16739–16739 | 1 |
| Claude Haiku 4.5 [n/a] | 842 ms (n=1) | 842–842 | 1 |
| GPT-5.5 [none] | 1405 ms (n=1) | 1405–1405 | 1 |
| GPT-5.5 [low] | 912 ms (n=1) | 912–912 | 1 |
| GPT-5.5 [medium] | 1057 ms (n=1) | 1057–1057 | 1 |
| GPT-5.5 [high] | 1098 ms (n=1) | 1098–1098 | 1 |
| GPT-5.4 [none] | 677 ms (n=1) | 677–677 | 1 |
| GPT-5.4 [low] | 1099 ms (n=1) | 1099–1099 | 1 |
| GPT-5.4 [medium] | 1194 ms (n=1) | 1194–1194 | 1 |
| GPT-5.4 [high] | 837 ms (n=1) | 837–837 | 1 |
| GPT-5.4 mini [none] | 853 ms (n=1) | 853–853 | 1 |
| GPT-5.4 mini [low] | 410 ms (n=1) | 410–410 | 1 |
| GPT-5.4 mini [medium] | 946 ms (n=1) | 946–946 | 1 |
| GPT-5.4 mini [high] | 596 ms (n=1) | 596–596 | 1 |
| GPT-5.4 nano [none] | 1130 ms (n=1) | 1130–1130 | 1 |
| GPT-5.4 nano [low] | 368 ms (n=1) | 368–368 | 1 |
| GPT-5.4 nano [medium] | 399 ms (n=1) | 399–399 | 1 |
| GPT-5.4 nano [high] | 467 ms (n=1) | 467–467 | 1 |
| o4-mini [low] | 930 ms (n=1) | 930–930 | 1 |
| o4-mini [medium] | 2876 ms (n=1) | 2876–2876 | 1 |
| o4-mini [high] | 7409 ms (n=1) | 7409–7409 | 1 |
| GPT Realtime [n/a] | 1137 ms (n=1) | 1137–1137 | 1 |
| GPT-5.3 Codex [low] | 873 ms (n=1) | 873–873 | 1 |
| GPT-5.3 Codex [medium] | 760 ms (n=1) | 760–760 | 1 |
| GPT-5.3 Codex [high] | 1783 ms (n=1) | 1783–1783 | 1 |
| GPT-5.3 Codex [xhigh] | 2430 ms (n=1) | 2430–2430 | 1 |
| GPT-5.1 Codex mini [low] | 725 ms (n=1) | 725–725 | 1 |
| GPT-5.1 Codex mini [medium] | 641 ms (n=1) | 641–641 | 1 |
| GPT-5.1 Codex mini [high] | 522 ms (n=1) | 522–522 | 1 |
| Gemini 3.1 Pro [low] | 6530 ms (n=1) | 6530–6530 | 1 |
| Gemini 3.1 Pro [medium] | 4206 ms (n=1) | 4206–4206 | 1 |
| Gemini 3.1 Pro [high] | 7122 ms (n=1) | 7122–7122 | 1 |
| Gemini 3.5 Flash [low] | 2762 ms (n=1) | 2762–2762 | 1 |
| Gemini 3.5 Flash [medium] | 2680 ms (n=1) | 2680–2680 | 1 |
| Gemini 3.5 Flash [high] | 3082 ms (n=1) | 3082–3082 | 1 |
| Gemini 3.1 Flash-Lite [low] | 928 ms (n=1) | 928–928 | 1 |
| Gemini 3.1 Flash-Lite [medium] | 1250 ms (n=1) | 1250–1250 | 1 |
| Gemini 3.1 Flash-Lite [high] | 1259 ms (n=1) | 1259–1259 | 1 |
| Grok 4.3 [none] | 584 ms (n=1) | 584–584 | 1 |
| Grok 4.3 [low] | 3083 ms (n=1) | 3083–3083 | 1 |
| Grok 4.3 [medium] | 7150 ms (n=1) | 7150–7150 | 1 |
| Grok 4.3 [high] | 3735 ms (n=1) | 3735–3735 | 1 |
| Grok 4.20 Reasoning [n/a] | 2532 ms (n=1) | 2532–2532 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 362 ms (n=1) | 362–362 | 1 |
| Grok Build 0.1 [n/a] | 9531 ms (n=1) | 9531–9531 | 1 |

Lowest measured of the 59 measured configuration(s): **Grok 4.20 Non-Reasoning [n/a]** at 362 ms (n=1). Opposite end of this measurement: Claude Sonnet 5 [max] at 16739 ms (n=1).

### Total response time

| Configuration | Mean ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 4678 ms (n=1) | 4678–4678 | 1 |
| Claude Fable 5 [medium] | 4418 ms (n=1) | 4418–4418 | 1 |
| Claude Fable 5 [high] | 4545 ms (n=1) | 4545–4545 | 1 |
| Claude Fable 5 [xhigh] | 4253 ms (n=1) | 4253–4253 | 1 |
| Claude Fable 5 [max] | 6826 ms (n=1) | 6826–6826 | 1 |
| Claude Opus 4.8 [low] | 1783 ms (n=1) | 1783–1783 | 1 |
| Claude Opus 4.8 [medium] | 1935 ms (n=1) | 1935–1935 | 1 |
| Claude Opus 4.8 [high] | 2014 ms (n=1) | 2014–2014 | 1 |
| Claude Opus 4.8 [xhigh] | 2896 ms (n=1) | 2896–2896 | 1 |
| Claude Opus 4.8 [max] | 2343 ms (n=1) | 2343–2343 | 1 |
| Claude Sonnet 5 [low] | 1665 ms (n=1) | 1665–1665 | 1 |
| Claude Sonnet 5 [medium] | 1757 ms (n=1) | 1757–1757 | 1 |
| Claude Sonnet 5 [high] | 1678 ms (n=1) | 1678–1678 | 1 |
| Claude Sonnet 5 [xhigh] | 1589 ms (n=1) | 1589–1589 | 1 |
| Claude Sonnet 5 [max] | 16758 ms (n=1) | 16758–16758 | 1 |
| Claude Haiku 4.5 [n/a] | 1148 ms (n=1) | 1148–1148 | 1 |
| GPT-5.5 [none] | 1868 ms (n=1) | 1868–1868 | 1 |
| GPT-5.5 [low] | 1380 ms (n=1) | 1380–1380 | 1 |
| GPT-5.5 [medium] | 1580 ms (n=1) | 1580–1580 | 1 |
| GPT-5.5 [high] | 1326 ms (n=1) | 1326–1326 | 1 |
| GPT-5.4 [none] | 1349 ms (n=1) | 1349–1349 | 1 |
| GPT-5.4 [low] | 1387 ms (n=1) | 1387–1387 | 1 |
| GPT-5.4 [medium] | 1617 ms (n=1) | 1617–1617 | 1 |
| GPT-5.4 [high] | 1081 ms (n=1) | 1081–1081 | 1 |
| GPT-5.4 mini [none] | 1279 ms (n=1) | 1279–1279 | 1 |
| GPT-5.4 mini [low] | 678 ms (n=1) | 678–678 | 1 |
| GPT-5.4 mini [medium] | 1209 ms (n=1) | 1209–1209 | 1 |
| GPT-5.4 mini [high] | 827 ms (n=1) | 827–827 | 1 |
| GPT-5.4 nano [none] | 1858 ms (n=1) | 1858–1858 | 1 |
| GPT-5.4 nano [low] | 623 ms (n=1) | 623–623 | 1 |
| GPT-5.4 nano [medium] | 643 ms (n=1) | 643–643 | 1 |
| GPT-5.4 nano [high] | 596 ms (n=1) | 596–596 | 1 |
| o4-mini [low] | 1136 ms (n=1) | 1136–1136 | 1 |
| o4-mini [medium] | 3254 ms (n=1) | 3254–3254 | 1 |
| o4-mini [high] | 7633 ms (n=1) | 7633–7633 | 1 |
| GPT Realtime [n/a] | 1336 ms (n=1) | 1336–1336 | 1 |
| GPT-5.3 Codex [low] | 1383 ms (n=1) | 1383–1383 | 1 |
| GPT-5.3 Codex [medium] | 1529 ms (n=1) | 1529–1529 | 1 |
| GPT-5.3 Codex [high] | 4284 ms (n=1) | 4284–4284 | 1 |
| GPT-5.3 Codex [xhigh] | 3072 ms (n=1) | 3072–3072 | 1 |
| GPT-5.1 Codex mini [low] | 944 ms (n=1) | 944–944 | 1 |
| GPT-5.1 Codex mini [medium] | 932 ms (n=1) | 932–932 | 1 |
| GPT-5.1 Codex mini [high] | 818 ms (n=1) | 818–818 | 1 |
| Gemini 3.1 Pro [low] | 6530 ms (n=1) | 6530–6530 | 1 |
| Gemini 3.1 Pro [medium] | 4394 ms (n=1) | 4394–4394 | 1 |
| Gemini 3.1 Pro [high] | 7123 ms (n=1) | 7123–7123 | 1 |
| Gemini 3.5 Flash [low] | 2762 ms (n=1) | 2762–2762 | 1 |
| Gemini 3.5 Flash [medium] | 2680 ms (n=1) | 2680–2680 | 1 |
| Gemini 3.5 Flash [high] | 3084 ms (n=1) | 3084–3084 | 1 |
| Gemini 3.1 Flash-Lite [low] | 931 ms (n=1) | 931–931 | 1 |
| Gemini 3.1 Flash-Lite [medium] | 1250 ms (n=1) | 1250–1250 | 1 |
| Gemini 3.1 Flash-Lite [high] | 1259 ms (n=1) | 1259–1259 | 1 |
| Grok 4.3 [none] | 779 ms (n=1) | 779–779 | 1 |
| Grok 4.3 [low] | 3258 ms (n=1) | 3258–3258 | 1 |
| Grok 4.3 [medium] | 7273 ms (n=1) | 7273–7273 | 1 |
| Grok 4.3 [high] | 3962 ms (n=1) | 3962–3962 | 1 |
| Grok 4.20 Reasoning [n/a] | 2637 ms (n=1) | 2637–2637 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 522 ms (n=1) | 522–522 | 1 |
| Grok Build 0.1 [n/a] | 9681 ms (n=1) | 9681–9681 | 1 |

Lowest measured of the 59 measured configuration(s): **Grok 4.20 Non-Reasoning [n/a]** at 522 ms (n=1). Opposite end of this measurement: Claude Sonnet 5 [max] at 16758 ms (n=1).

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
`llm-model-comparison.real.data.json` — the same measurements, never re-run.

## Scope & limitations

- **1 trial** per configuration×probe. This sample supports a run-level
  comparison, not a statistical claim about stable provider behavior.
- **Point-in-time.** Measured behavior reflects the models and APIs at the
  generated timestamp below.
- This topic tests narrow behaviors only (sustained generation throughput, time-to-first-token, and total response latency); it does not
  measure general capability or reasoning quality.
- **Effort semantics vary by provider**, so effort levels are more comparable
  within a provider than across providers.
- **Generated:** 2026-07-06T13:08:50.282Z

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
