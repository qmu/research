---
title: SVG generation
description: A reproducible comparison of frontier LLMs generating SVG — render validity, prompt fidelity (rasterized and judged by a fixed vision model), path complexity, animation presence (SMIL/CSS), generation latency, and token cost.
---

# SVG generation

This report compares how faithfully frontier text models emit **valid, animatable vector graphics**. Source-level scores are computed **mechanically from the SVG source** — well-formedness, drawable-element and path-command counts, and animation markup. **Prompt fidelity** rasterizes each drawing and has a fixed vision judge answer a versioned yes/no rubric; every constraint is mechanically checkable, so no aesthetic opinion enters the numbers.

## 1. Research Purpose

The purpose is to record which frontier models produce SVG that actually parses, whether the drawing matches what was asked (prompt fidelity), how much detail they draw, whether they can express motion (SMIL or CSS animation), how fast they return, and at what token cost — the properties that decide whether a model can drive vector-graphics generation in a product.

## 2. Measurement Targets

### Target Models

The subjects are the 4 text flagships in the curated registry (`packages/tech/src/svg-generation/models.ts`), one per provider, each with a cited source and last-verified date. SVG is emitted through each provider's ordinary completion API, so there is no separate image endpoint and no provider is a non-subject.

### Target Metrics

Measured metrics are render validity (well-formed XML rooted at `<svg>` / total, higher is better), prompt fidelity (satisfied rubric constraints / total, judged by the fixed `claude-sonnet-5` vision judge over the `resvg-js@2`-rasterized drawing, higher is better), path complexity (drawable elements + path commands, descriptive), animation presence (animated prompts carrying a SMIL/CSS animation / total, higher is better), and generation latency (ms, lower is better). Token cost is derived from measured output tokens × catalog price (reference).

## 3. Scope and Constraints

- **Mechanical, not aesthetic.** Source-level scores read only what the SVG source reveals; prompt fidelity rasterizes the drawing and has the fixed vision judge answer versioned yes/no rubric constraints — a checklist, never a taste score.
- **The fidelity instrument is fixed and versioned.** Judge model (`claude-sonnet-5`), rasterizer engine (`resvg-js@2`), and rubric all belong to manifest version `svg-v2`; swapping any of them is a version bump, never a silent change. The judge reads a still frame, so fidelity grades what is drawn — motion stays the source-level animation-presence metric.
- **An unrenderable SVG scores fidelity 0** (no judge read); render validity remains the dependency-free structural parse so the keyless path never needs the native rasterizer.
- Prompt manifest version `svg-v2`: 5 prompts (3 static, 2 animated), each with a fidelity rubric. History connects same-manifest-version points only.
- The fixture path is keyless and deterministic (fixture generator, fixture rasterizer, fixture judge); real model numbers appear only after an owner runs the real path within the approved cost ceiling (run `--estimate` first).
- Point-in-time: measured behavior reflects the models and APIs at `2026-07-18T11:29:34.171Z`; catalog prices are as of each row's last-verified date.

## 4. Verification Results

This run has **4 measured** of 4 model rows (non-measured rows are `fixtured` harness checks or `error` rows, never faked numbers).

| Metric | Best (model) | Median | Worst |
| ------ | ------------ | ------ | ----- |
| Render validity | 100.0% — Claude Opus 4.8 | 100.0% | 60.0% |
| Prompt fidelity | 100.0% — Claude Opus 4.8 | 80.0% | 46.7% |
| Animation presence | 100.0% — Claude Opus 4.8 | 100.0% | 100.0% |
| Generation latency | 3461 ms — Claude Opus 4.8 | 8107 ms | 26003 ms |

"Best"/"Worst" follow each metric's own direction (higher validity, fidelity, and animation presence are better, lower latency is better). Prompt fidelity is the fixed vision judge's rubric score over the rasterized drawing; animation presence is measured over the animated prompts only. Token cost and path complexity are reference columns in the model table. The full per-model and per-prompt records are in section 7, Verification Data.

## 5. Analysis

Rows with `measured` provenance can be compared on validity, fidelity, animation, latency, and cost; path complexity is descriptive context. The pair of validity and fidelity localizes failures: valid but low-fidelity means the model parses but draws the wrong thing, while high fidelity with low animation presence means it draws well but cannot express motion.

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

The fixture path is keyless and costless. A real trial bills each provider for the generation tokens (a few hundred output tokens per SVG) plus one fixed-vision-judge read per generated SVG (rasterization itself is local and free); the agreed ceiling is $5 per trial and `--estimate` must run first.

### Cleanup

No external resources are created. SVG is generated in memory and scored; the run writes only the local Markdown/JSON artifacts — review them before committing.

## 7. Verification Data

**Per-model results**

| Model | Provider | Provenance | Output $/MTok | Latency (mean±sd) | Render valid (mean±sd) | Fidelity (mean±sd) | Animation (mean±sd) | Path complexity (mean±sd) | Note |
| ----- | -------- | ---------- | ------------- | ----------------- | ---------------------- | ------------------ | ------------------- | ------------------------- | ---- |
| Claude Opus 4.8 | anthropic | measured | $25.00 | 3461 ± 793 (n=5) | 100.0% ± 0.0% (n=5) | 100.0% ± 0.0% (n=5) | 100.0% ± 0.0% (n=2) | 6.2 ± 2.9 (n=5) |  |
| GPT-5.5 | openai | measured | $30.00 | 6640 ± 2652 (n=5) | 100.0% ± 0.0% (n=5) | 100.0% ± 0.0% (n=5) | 100.0% ± 0.0% (n=2) | 9.0 ± 9.8 (n=5) |  |
| Gemini 3.1 Pro | google | measured | $12.00 | 26003 ± 10728 (n=5) | 60.0% ± 54.8% (n=5) | 60.0% ± 54.8% (n=5) | 100.0% ± 0.0% (n=2) | 3.6 ± 2.4 (n=5) |  |
| Grok 4.3 | xai | measured | $2.50 | 9573 ± 5439 (n=5) | 100.0% ± 0.0% (n=5) | 46.7% ± 50.6% (n=5) | 100.0% ± 0.0% (n=2) | 4.0 ± 2.0 (n=5) |  |

**Prompt manifest (version svg-v2)**

| Prompt id | Kind | Rubric constraints |
| --------- | ---- | ------------------ |
| static-weather-icon | static | 3 |
| static-bar-chart | static | 3 |
| static-logo-monogram | static | 3 |
| animated-loading-spinner | animated | 2 |
| animated-pulsing-heart | animated | 2 |

Fidelity instrument: judge model `claude-sonnet-5`, rasterizer `resvg-js@2`.

The complete run record is committed as [`svg-generation-comparison.data.json`](./svg-generation-comparison.data.json): per-call prompts, latencies, SVG byte lengths, output-token counts, the generated SVG source, the judge's per-constraint verdicts, and every score.

Generated: 2026-07-18T11:29:34.171Z
