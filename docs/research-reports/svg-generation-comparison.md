---
title: SVG generation
description: A reproducible comparison of frontier LLMs generating SVG — render validity, path complexity, animation presence (SMIL/CSS), generation latency, and token cost — scored mechanically from the SVG source.
---

# SVG generation

This report compares how faithfully frontier text models emit **valid, animatable vector graphics**. Every score is computed **mechanically from the SVG source** — well-formedness, drawable-element and path-command counts, and animation markup — so no aesthetic opinion enters the numbers.

## 1. Research Purpose

The purpose is to record which frontier models produce SVG that actually parses, how much detail they draw, whether they can express motion (SMIL or CSS animation), how fast they return, and at what token cost — the properties that decide whether a model can drive vector-graphics generation in a product.

## 2. Measurement Targets

### Target Models

The subjects are the 4 text flagships in the curated registry (`packages/tech/src/svg-generation/models.ts`), one per provider, each with a cited source and last-verified date. SVG is emitted through each provider's ordinary completion API, so there is no separate image endpoint and no provider is a non-subject.

### Target Metrics

Measured metrics are render validity (well-formed XML rooted at `<svg>` / total, higher is better), path complexity (drawable elements + path commands, descriptive), animation presence (animated prompts carrying a SMIL/CSS animation / total, higher is better), and generation latency (ms, lower is better). Token cost is derived from measured output tokens × catalog price (reference).

## 3. Scope and Constraints

- **Mechanical, not aesthetic.** v1 scores only what the SVG source reveals; it does not judge whether the drawing looks like the prompt. A rasterize-and-vision-judge prompt-fidelity metric is a separate, instrument-versioned follow-up.
- **Render validity is a structural parse** (well-formedness + `<svg>` root), dependency-free so it runs keyless in CI; a full rasterizer is the stronger check added with the fidelity metric.
- Prompt manifest version `svg-v1`: 5 prompts (3 static, 2 animated). History connects same-manifest-version points only.
- The fixture path is keyless and deterministic; real model numbers appear only after an owner runs the real path within the approved cost ceiling (run `--estimate` first).
- Point-in-time: measured behavior reflects the models and APIs at `2026-01-01T00:00:00.000Z`; catalog prices are as of each row's last-verified date.

## 4. Verification Results

This run has **0 measured** of 4 model rows (non-measured rows are `fixtured` harness checks or `error` rows, never faked numbers).

There are no measured values to summarize; the committed fixture page proves the harness end to end. The per-model table is in section 7, Verification Data.

## 5. Analysis

This run has no measured rows; every configuration was fixtured or errored, so no cross-model claim is made. The committed fixture page exists to prove the pipeline, not to compare models.

## 6. Reproduction

### Reproduction Steps

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (deterministic fixture client):
npm run research -- svg-generation --fixture

# Cost preview, then the owner-gated real run:
npm run research -- svg-generation --estimate
npm run research -- svg-generation --real
```

### Reproduction Cost (Estimate)

The fixture path is keyless and costless. A real trial bills each provider for the generation tokens only (a few hundred output tokens per SVG); the agreed ceiling is $5 per trial and `--estimate` must run first. The prompt-fidelity follow-up adds one vision-judge read per generated SVG.

### Cleanup

No external resources are created. SVG is generated in memory and scored; the run writes only the local Markdown/JSON artifacts — review them before committing.

## 7. Verification Data

**Per-model results**

| Model           | Provider  | Provenance | Output $/MTok | Latency (mean±sd) | Render valid (mean±sd) | Animation (mean±sd) | Path complexity (mean±sd) | Note |
| --------------- | --------- | ---------- | ------------- | ----------------- | ---------------------- | ------------------- | ------------------------- | ---- |
| Claude Opus 4.8 | anthropic | fixtured   | $25.00        | 24 ± 10 (n=5)     | 100.0% ± 0.0% (n=5)    | 100.0% ± 0.0% (n=2) | 4.6 ± 3.3 (n=5)           |      |
| GPT-5.5         | openai    | fixtured   | $30.00        | 24 ± 10 (n=5)     | 100.0% ± 0.0% (n=5)    | 100.0% ± 0.0% (n=2) | 4.6 ± 3.3 (n=5)           |      |
| Gemini 3.1 Pro  | google    | fixtured   | $12.00        | 24 ± 10 (n=5)     | 100.0% ± 0.0% (n=5)    | 100.0% ± 0.0% (n=2) | 4.6 ± 3.3 (n=5)           |      |
| Grok 4.3        | xai       | fixtured   | $2.50         | 24 ± 10 (n=5)     | 100.0% ± 0.0% (n=5)    | 100.0% ± 0.0% (n=2) | 4.6 ± 3.3 (n=5)           |      |

**Prompt manifest (version svg-v1)**

| Prompt id                | Kind     |
| ------------------------ | -------- |
| static-weather-icon      | static   |
| static-bar-chart         | static   |
| static-logo-monogram     | static   |
| animated-loading-spinner | animated |
| animated-pulsing-heart   | animated |

The complete run record is committed as [`svg-generation-comparison.data.json`](./svg-generation-comparison.data.json): per-call prompts, latencies, SVG byte lengths, output-token counts, the generated SVG source, and every mechanical score.

Generated: 2026-01-01T00:00:00.000Z
