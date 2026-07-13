---
type: Mission
title: Image generation benchmark
slug: image-generation-benchmark
status: active
created_at: 2026-07-13T11:58:23+09:00
author: a@qmu.jp
tickets: []
stories: []
concerns: []
---

# Image generation benchmark

## Goal

qmu.co.jp's foundational research currently measures text-side model behavior
(speed, accuracy, availability, OCR reading) but says nothing about **image
generation**, which clients increasingly ask about when choosing a provider.
The mission adds a recurring, reproducible image-generation benchmark topic to
the published LLM基礎検証 set: which API-accessible image models exist, what
they cost per image, how fast they return, and how faithfully they follow a
mechanically checkable prompt — measured by the same evidence-based standards
(keyless fixture self-test, honest per-cell provenance, dated trial history,
Japanese article) as every other published topic.

## Scope

Done means: an `image-generation` research topic exists following the
proposal-first protocol and TEMPLATE.md — pure domain scoring, image-provider
access behind `vendors/` anti-corruption layers, a thin runner with
fixture/estimate/real modes, a published EN page + JP translation wired through
`site.ts` shared metadata (title == sidebar label), unit tests including the
disk-reading published-page guards, and at least one owner-approved real trial
committed as a dated frame.

Out of scope: aesthetic/quality opinion scoring (only mechanically verifiable
metrics), image *editing* / inpainting / upscaling comparisons, video
generation, and running image generation in CI (the fixture path stays
keyless and deterministic).

## Acceptance

- [x] Research design (cadence, subjects, metrics, cost/trial range, history) proposed and owner-approved before scaffolding (#20260713120500-image-generation-benchmark-topic.md)
- [x] Topic runnable via `npm run research -- image-generation` with fixture/estimate/real modes; keyless fixture byte-stable and CI-suitable (#20260713120500-image-generation-benchmark-topic.md)
- [x] Published EN + JP pages in `publishedResearchTopics` passing the title==sidebar-label, no-mermaid, section-4 budget, and 7-section outline guards (#20260713120500-image-generation-benchmark-topic.md)
- [ ] First real trial run within the approved cost ceiling, committed as a dated history frame with the design-validation review (step 3 of the guideline)
- [ ] qmu-co-jp receives the new article through the publish ticket flow on the next `/ship`

## Changelog

- 2026-07-13 — mission created; design proposal drafted for owner approval — 20260713120500-image-generation-benchmark-topic.md
- 2026-07-13 — design approved (fixture-only for this drive); topic built end to end: registry (ids/prices web-verified), rubric manifest v1, scoring, §4-policy report, ImageGenerationClient port + openai/google/xai/fixture adapters, unified-CLI wiring, published EN/JP pages, all guards green; estimate ~$0.95/trial (ceiling $20) — 20260713120500-image-generation-benchmark-topic.md
- 2026-07-13 — remaining: owner-triggered first real trial (guideline step 3) and the qmu-co-jp reflection on the next /ship
