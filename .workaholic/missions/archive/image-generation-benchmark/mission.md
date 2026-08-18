---
type: Mission
title: Image generation benchmark
slug: image-generation-benchmark
status: abandoned
created_at: 2026-07-13T11:58:23+09:00
author: a@qmu.jp
assignee: a@qmu.jp
tickets: []
stories: []
concerns: []
actual_hours: 0.33
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

## Experience

A reader of the published EN/JP image-generation pages sees, per API-accessible image model, measured cost, latency, and rubric adherence drawn from committed dated frames — and, once manifest v2 lands, the actual generated images per practical category (presentation slide, photo, character illustration, infographic, dense meeting document) displayed inline on both research.qmu.dev and the qmu.co.jp copy. Every real run appends a dated frame whose data artifact plus images/ directory re-renders the pages later without re-spending.

## Acceptance

- [x] Research design (cadence, subjects, metrics, cost/trial range, history) proposed and owner-approved before scaffolding (#20260713120500-image-generation-benchmark-topic.md)
- [x] Topic runnable via `npm run research -- image-generation` with fixture/estimate/real modes; keyless fixture byte-stable and CI-suitable (#20260713120500-image-generation-benchmark-topic.md)
- [x] Published EN + JP pages in `publishedResearchTopics` passing the title==sidebar-label, no-mermaid, section-4 budget, and 7-section outline guards (#20260713120500-image-generation-benchmark-topic.md)
- [x] First real trial run within the approved cost ceiling, committed as a dated history frame with the design-validation review (step 3 of the guideline) (#20260717000605-image-generation-first-real-trial.md)
- [ ] qmu-co-jp receives the new article through the publish ticket flow on the next `/ship`
- [x] Category-based prompt manifest v2 (presentation slide, photo, character illustration, infographic, dense meeting document — plus the v1 prompts kept as `mechanical`) with each real run persisting the generated images into the dated frame (path + sha256 + bytes recorded in the data artifact) (#20260718194643-image-generation-category-history-with-images.md; real v2 trial #20260718205443-image-generation-v2-real-trial.md)
- [x] EN and JP pages render the persisted images inline, and the qmu-co-jp publish flow (copy-plan / qmu-ticket / publish script) carries the image assets so the corporate article shows the pictures (#20260718194643-image-generation-category-history-with-images.md; images render inline via real v2 trial #20260718205443-image-generation-v2-real-trial.md — qmu-co-jp asset carry runs on the next /ship)

## Changelog

- 2026-07-13 — mission created; design proposal drafted for owner approval — 20260713120500-image-generation-benchmark-topic.md
- 2026-07-13 — design approved (fixture-only for this drive); topic built end to end: registry (ids/prices web-verified), rubric manifest v1, scoring, §4-policy report, ImageGenerationClient port + openai/google/xai/fixture adapters, unified-CLI wiring, published EN/JP pages, all guards green; estimate ~$0.95/trial (ceiling $20) — 20260713120500-image-generation-benchmark-topic.md
- 2026-07-13 — remaining: owner-triggered first real trial (guideline step 3) and the qmu-co-jp reflection on the next /ship
- 2026-07-17 — first real trial executed (owner-approved, ~$0.90 estimate / ≈$1.10 actual incl. insights+JP translations, ceiling $20): 3/3 rows measured; dated frame 2026-07-17T00-53-39-901Z committed with design-validation review; registry price drift fixed (gpt-image-1.5 $0.04→$0.034) and xAI Images dialect fixed in the ACL (no `size` arg, b64_json, MIME sniffing); latency discriminated (Grok 4976ms < Gemini 6526ms < GPT Image 11689ms) while adherence/text-accuracy saturated at 100% → manifest v2 flagged; monthly cadence confirmed — 20260717000605-image-generation-first-real-trial.md
- 2026-07-18 — owner expanded scope: accumulate prompt→image pairs historically across practical categories (presentation slide, photo, character illustration, infographic, dense meeting document) and publish with images on both research.qmu.dev and qmu.co.jp; today's runs discard image bytes after judging, so persistence + asset-carrying publish flow are new work — ticket 20260718194643-image-generation-category-history-with-images.md filed; two acceptance criteria added (manifest v2 folds in the 2026-07-17 saturation flag)
- 2026-07-17 — archive/composition gap closed (was user-visible: published article said 0/3 measured while the real trial sat in its frame): current pages of a topic with a measured dated frame now render FROM that frame (EN/JP/data), keyless fixture render preserved as gitignored *.fixture.* side files; research:archive prefers .real outputs; published image-generation pages regenerated to 3/3 measured
- 2026-07-18 — manifest v2 + image persistence + asset-carrying publish built KEYLESS and green (commit cd2094a): `ImagePrompt.category`, version 1→2 with v1 kept as `mechanical` and one rubric-constrained prompt per practical category (presentation-slide/photo/character/infographic/meeting-document); real runs persist practical-category images into the dated frame's images/ with imagePath+sha256+bytes recorded (mechanical probes discarded, per-image byte budget documented); §7 inline gallery with an on-disk existence guard; archive moves *.real.images→frame images/, composition mirrors frame images beside current pages, imageAssetPublishPlan + qmu-ticket + publish-research.sh carry image dirs to qmu-co-jp both languages. Per-package bare exit codes green (build/lint/test 84 files 593 tests), fixture byte-stable, make drift stable. PENDING: the paid v2 real trial is owner-gated — `--estimate` ~$1.47 generation (3×13×1) well under the $20 ceiling — minted as 20260718205443-image-generation-v2-real-trial.md; the two v2 Acceptance items stay unticked until a real run persists images and the pages render them. Build ticket 20260718194643 archived under work-20260718-203003.
- 2026-07-18 — manifest v2 first real trial executed (owner-authorized "go all the actual runs"; estimate ~$1.47 generation / ~$3.5 all-in, actual ≈$1.1–1.3, ceiling $20): trial 2026-07-18T15:04:12.341Z, judge claude-sonnet-5, **2/3 measured, 1 error** — GPT Image 1.5 (adherence 95.5%, text 100%, 18085ms) and Grok Imagine (100%/100%, 5346ms) measured with 5 practical images each persisted; Gemini 2.5 Flash Image an honest `error` row (`returned no image` — regressed since v1, real run not repeated per cost gate, Google-ACL empty-response hardening left as follow-up). v2 adherence now discriminates (GPT 95.5% vs Grok 100%) where v1 saturated. Dated frame history/image-generation/2026-07-18T15-04-12-341Z committed (bare v2 EN/JP + data + 10 images with imagePath/sha256/bytes + design-validation review); EN/JP current pages recomposed from the frame render the images inline; all 40 image refs resolve; per-package bare exit codes green (tech test 84 files/591 pass, build 0, lint 0). Two GPT PNGs exceed the 512 KiB budget (persisted as evidence, ~4.6MB frame). Both v2 Acceptance items ticked; qmu-co-jp asset carry runs on the next /ship. Commit 88154cf; ticket 20260718205443 archived under work-20260718-203003.
- 2026-07-23 — run recorded (+0.33h) — run-20260723-224446
- 2026-08-13 — mission abandoned — mission.md
