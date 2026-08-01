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
- Prompt manifest version `2`: 13 prompts (11 rubric, 2 exact-text) across 6 categories — the `mechanical` shape/text probes plus the practical categories (presentation-slide, photo, character, infographic, meeting-document). History connects same-manifest-version points only.
- **Images are committed for practical categories only, size-capped.** Each practical-category image is persisted next to this article under `images/` with its byte length and SHA-256 recorded in the artifact; the mechanical probes record byte length, timing, judge answers, and scores but no image. To bound how much each monthly frame adds to the repository, images request each provider's smallest supported size and target a per-image budget of 512 KiB.
- The fixture path is keyless and deterministic; real model numbers appear only after an owner runs the real path within the approved cost ceiling (run `--estimate` first).
- Point-in-time: measured behavior reflects the models and APIs at `2026-07-18T15:04:12.341Z`; catalog prices are as of each row's last-verified date.

## 4. Verification Results

This run has **2 measured** of 3 model rows (non-measured rows are `fixtured` harness checks or `error` rows, never faked numbers).

| Metric | Best (model) | Median | Worst |
| ------ | ------------ | ------ | ----- |
| Generation latency | 5346 ms — Grok Imagine | 11715 ms | 18085 ms |
| Prompt adherence | 100.0% — Grok Imagine | 97.7% | 95.5% |
| Text render accuracy | 100.0% — GPT Image 1.5 | 100.0% | 100.0% |

"Best"/"Worst" follow each metric's own direction (lower latency is better, higher adherence and text accuracy are better). Per-image catalog prices are reference data in the model table. The full per-model and per-prompt records are in section 7, Verification Data.

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

No external resources are created. Practical-category images are judged and then written into the local dated frame under `images/` (size-capped, committed as the qualitative exhibit); mechanical probe images are judged and discarded. The run writes the local Markdown/JSON artifacts and those images — review them before committing.

## 7. Verification Data

**Per-model results**

| Model | Provider | Provenance | Price/image | Latency (mean±sd) | Adherence (mean±sd) | Text accuracy (mean±sd) | Note |
| ----- | -------- | ---------- | ----------- | ----------------- | ------------------- | ----------------------- | ---- |
| GPT Image 1.5 | openai | measured | $0.034 (1024x1024 medium) | 18085 ± 6170 (n=13) | 95.5% ± 10.1% (n=11) | 100.0% ± 0.0% (n=2) |  |
| Gemini 2.5 Flash Image | google | error | $0.039 (1024x1024 standard) | not measured | not measured | not measured | Error: image generation returned no image (gemini-2.5-flash-image) |
| Grok Imagine | xai | measured | $0.020 (standard) | 5346 ± 876 (n=13) | 100.0% ± 0.0% (n=11) | 100.0% ± 0.0% (n=2) |  |

**Prompt manifest (version 2)**

| Prompt id | Category | Kind | Rubric size | Expected text |
| --------- | -------- | ---- | ----------- | ------------- |
| three-red-circles | mechanical | adherence | 3 | — |
| square-left-of-triangle | mechanical | adherence | 4 | — |
| five-green-stars-row | mechanical | adherence | 3 | — |
| black-cat-facing-left | mechanical | adherence | 3 | — |
| two-orange-one-purple-diamond | mechanical | adherence | 3 | — |
| red-circle-above-blue-line | mechanical | adherence | 3 | — |
| text-hello-benchmark | mechanical | text | 0 | HELLO BENCHMARK |
| text-qmu-research-2026 | mechanical | text | 0 | QMU RESEARCH 2026 |
| slide-quarterly-review | presentation-slide | adherence | 4 | — |
| photo-red-apple | photo | adherence | 4 | — |
| character-cartoon-robot | character | adherence | 4 | — |
| infographic-growth-bars | infographic | adherence | 4 | — |
| meeting-document-minutes | meeting-document | adherence | 4 | — |

**Generated images (practical categories)**

The images below are the actual files generated during this run, committed beside this article under `images/`. Only practical-category prompts persist an image; the mechanical shape/text probes are scored but not shown.

**presentation-slide**

_slide-quarterly-review_

![GPT Image 1.5 — slide-quarterly-review](images/gpt-image-1.5--slide-quarterly-review--r0.png)

![Grok Imagine — slide-quarterly-review](images/grok-imagine-image--slide-quarterly-review--r0.jpg)

**photo**

_photo-red-apple_

![GPT Image 1.5 — photo-red-apple](images/gpt-image-1.5--photo-red-apple--r0.png)

![Grok Imagine — photo-red-apple](images/grok-imagine-image--photo-red-apple--r0.jpg)

**character**

_character-cartoon-robot_

![GPT Image 1.5 — character-cartoon-robot](images/gpt-image-1.5--character-cartoon-robot--r0.png)

![Grok Imagine — character-cartoon-robot](images/grok-imagine-image--character-cartoon-robot--r0.jpg)

**infographic**

_infographic-growth-bars_

![GPT Image 1.5 — infographic-growth-bars](images/gpt-image-1.5--infographic-growth-bars--r0.png)

![Grok Imagine — infographic-growth-bars](images/grok-imagine-image--infographic-growth-bars--r0.jpg)

**meeting-document**

_meeting-document-minutes_

![GPT Image 1.5 — meeting-document-minutes](images/gpt-image-1.5--meeting-document-minutes--r0.png)

![Grok Imagine — meeting-document-minutes](images/grok-imagine-image--meeting-document-minutes--r0.jpg)


**Judge provenance.** Every image was read by `claude-sonnet-5`; each call's rubric answers and transcriptions are preserved verbatim in the artifact.

The complete run record is committed as [`image-generation-comparison.data.json`](./image-generation-comparison.data.json): per-call prompts, latencies, image byte lengths, judge answers, and scores.

Generated: 2026-07-18T15:04:12.341Z
