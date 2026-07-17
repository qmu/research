---
title: Image generation
description: A reproducible comparison of API-accessible image-generation models — generation latency, per-image catalog cost, prompt adherence over a mechanical rubric, and exact-text rendering accuracy.
---

# Image generation

This report compares image-generation models by **mechanically verifiable** behavior only — a fixed vision-judge model answers a deterministic yes/no rubric per image; no aesthetic opinion enters the scores.

## 1. Research Purpose

The purpose is to record which API-accessible image-generation models exist, what one image costs, how fast it returns, and how faithfully the model follows checkable prompt constraints and renders exact text — the properties that decide integration choices.

## 2. Measurement Targets

### Target Models

The subjects are the 3 image-generation models in the curated registry (`packages/tech/src/image-generation/models.ts`), one per covered provider, each with a cited source and last-verified date.

- **Anthropic** is not a subject: it exposes no image-generation API (verified 2026-07-13).

### Target Metrics

Measured metrics are generation latency (ms, lower is better), prompt adherence (satisfied rubric constraints / total, higher is better), and text render accuracy (expected tokens found in a vision transcription / expected tokens, higher is better). Per-image cost is curated catalog data (reference), not a measurement.

## 3. Scope and Constraints

- **Judged, but rubric-constrained.** A fixed vision judge (`claude-sonnet-5`) answers deterministic yes/no questions and transcribes rendered text; it never scores beauty or style. Swapping the judge is an instrument change, not a routine update.
- Prompt manifest version `1`: 8 prompts (6 rubric, 2 exact-text). History connects same-manifest-version points only.
- **Image binaries are not committed.** The artifact records byte length, timing, judge answers, and scores — enough to regenerate this page — never the images themselves.
- The fixture path is keyless and deterministic; real model numbers appear only after an owner runs the real path within the approved cost ceiling (run `--estimate` first).
- Point-in-time: measured behavior reflects the models and APIs at `2026-07-17T00:53:39.901Z`; catalog prices are as of each row's last-verified date.

## 4. Verification Results

This run has **3 measured** of 3 model rows (non-measured rows are `fixtured` harness checks or `error` rows, never faked numbers).

| Metric | Best (model) | Median | Worst |
| ------ | ------------ | ------ | ----- |
| Generation latency | 4976 ms — Grok Imagine | 6526 ms | 11689 ms |
| Prompt adherence | 100.0% — GPT Image 1.5 | 100.0% | 100.0% |
| Text render accuracy | 100.0% — GPT Image 1.5 | 100.0% | 100.0% |

"Best"/"Worst" follow each metric's own direction (lower latency is better, higher adherence and text accuracy are better). Per-image catalog prices are reference data in the model table. The full per-model and per-prompt records are in section 7, Verification Data.

**推移 / Trend across surveys**

This is the first comparable survey in the series, so there is no multi-survey trend to chart yet. A trend chart appears here once a second same-instrument survey is archived; earlier surveys are linked under Verification Data.

## 5. Analysis

Rows with `measured` provenance can be compared on latency, adherence, and text rendering; price is catalog context. A low adherence score with a high text score (or the reverse) localizes what a model gets wrong — constraint following versus glyph rendering.

## 6. Reproduction

### Reproduction Steps

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (deterministic fixture clients):
npm run research -- image-generation --fixture

# Cost preview, then the owner-gated real run:
npm run research -- image-generation --estimate
npm run research -- image-generation --real
```

### Reproduction Cost (Estimate)

The fixture path is keyless and costless. A real trial bills each provider per generated image (see the per-model catalog prices) plus one vision-judge read per image; the agreed ceiling is $20 per trial and `--estimate` must run first.

### Cleanup

No external resources are created. Generated images are held in memory for judging and discarded; the run writes only the local Markdown/JSON artifacts — review them before committing.

## 7. Verification Data

**Per-model results**

| Model | Provider | Provenance | Price/image | Latency (mean±sd) | Adherence (mean±sd) | Text accuracy (mean±sd) | Note |
| ----- | -------- | ---------- | ----------- | ----------------- | ------------------- | ----------------------- | ---- |
| GPT Image 1.5 | openai | measured | $0.034 (1024x1024 medium) | 11689 ± 885 (n=8) | 100.0% ± 0.0% (n=6) | 100.0% ± 0.0% (n=2) |  |
| Gemini 2.5 Flash Image | google | measured | $0.039 (1024x1024 standard) | 6526 ± 1717 (n=8) | 100.0% ± 0.0% (n=6) | 100.0% ± 0.0% (n=2) |  |
| Grok Imagine | xai | measured | $0.020 (standard) | 4976 ± 535 (n=8) | 100.0% ± 0.0% (n=6) | 100.0% ± 0.0% (n=2) |  |

**Prompt manifest (version 1)**

| Prompt id | Kind | Rubric size | Expected text |
| --------- | ---- | ----------- | ------------- |
| three-red-circles | adherence | 3 | — |
| square-left-of-triangle | adherence | 4 | — |
| five-green-stars-row | adherence | 3 | — |
| black-cat-facing-left | adherence | 3 | — |
| two-orange-one-purple-diamond | adherence | 3 | — |
| red-circle-above-blue-line | adherence | 3 | — |
| text-hello-benchmark | text | 0 | HELLO BENCHMARK |
| text-qmu-research-2026 | text | 0 | QMU RESEARCH 2026 |

**Judge provenance.** Every image was read by `claude-sonnet-5`; each call's rubric answers and transcriptions are preserved verbatim in the artifact.

The complete run record is committed as [`image-generation-comparison.data.json`](./image-generation-comparison.data.json): per-call prompts, latencies, image byte lengths, judge answers, and scores.

Generated: 2026-07-17T00:53:39.901Z

**過去の調査 / Past surveys in this series**

Earlier dated surveys of this topic, newest first — each a complete article for its run.

- [2026-07-17T00:53:39.901Z](./history/image-generation/2026-07-17T00-53-39-901Z/image-generation-comparison)
