---
created_at: 2026-07-13T12:05:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure, UX, Config]
effort: 4h
commit_hash:
category: Added
depends_on:
mission: image-generation-benchmark
---

# Add the image-generation benchmark research topic

## Overview

New published research topic comparing **API-accessible image-generation
models** by mechanically verifiable metrics. Follows the proposal-first
protocol (docs/research-development-guideline.md); the design below requires
owner approval before scaffolding. Mission:
`.workaholic/missions/active/image-generation-benchmark/mission.md`.

## Research design proposal (guideline step 2 — owner approval required)

1. **Cadence:** monthly, matching the other measured topics; providers ship
   image-model updates on a weeks-to-months rhythm. Off-cadence trigger: an
   image-generation model release or retirement at a covered provider.
2. **Comparison subjects:** the API-accessible image-generation models of the
   providers already in this stack (keys in `packages/tech/.env`):
   OpenAI (gpt-image-1), Google (Imagen 4 family and/or Gemini flash image),
   xAI (grok-2-image). Anthropic exposes no image-generation API — recorded
   as an honest not-applicable row, not silently omitted (vendor neutrality).
   Exact model ids verified against provider docs at implementation time and
   recorded in a curated image-model registry with a last-verified date.
3. **Metrics:**
   - `generationLatencyMs` (ms, lower is better) — request to image bytes.
   - `costPerImageUsd` (USD, reference) — curated per-image price at the
     measured size/quality tier.
   - `promptAdherence` (ratio, higher is better) — a versioned manifest of
     prompts with mechanically checkable constraints (object counts, colors,
     spatial relations); a vision-capable judge model reads each generated
     image and answers a deterministic yes/no rubric; score = satisfied
     constraints / total. Judged, but rubric-constrained — no aesthetic
     opinion.
   - `textRenderAccuracy` (ratio, higher is better) — prompts request exact
     short strings rendered in the image; a vision model transcribes; scored
     by deterministic token match (reuses the OCR grading approach).
4. **Cost and trial count:** per trial, 3 models × ~8 prompts × 1–3
   repetitions = 24–72 images. Premises: ~1024px standard tier at
   $0.02–$0.17 per image by provider, plus one vision-judge read per image
   → estimated **$1–$12 generation + $0.5–$2 judging per trial**; proposed
   ceiling **$20**. One repetition detects large movements; three bound
   variance (recorded as stdDev). The topic's `--estimate` path must run
   before every real trial, and an estimate above the ceiling stops for
   re-approval.
5. **Accumulated history:** per-model `HistoryPoint` series for latency,
   adherence, and text accuracy, one point per dated frame under
   `docs/research-reports/history/image-generation/`. After ≥3 frames the
   trend chart shows per-model movement; the article starts in full-report
   mode (like accuracy) with snapshot migration as a later ticket.

## Key Files

- `packages/tech/TEMPLATE.md` — the build recipe this follows.
- `packages/tech/src/ocr-comparison/` — closest precedent: vision port use,
  deterministic synthetic images, ratio metrics, fixture-vs-real split.
- `packages/tech/src/vendors/llm/{openai,google,xai,fixture}.ts` — existing
  ACLs to extend with an image-generation port; `vision.test.ts` shows the
  vision-read port used for judging.
- `packages/tech/src/research/domain/{topic,site}.ts` — registry + published
  topic entry (title == sidebar label policy; JP label 「画像生成」, EN
  "Image generation").
- `packages/tech/src/entrypoints/run-research.ts` — runner binding.

## Implementation Steps

1. **Registry:** `src/image-generation/models.ts` — curated rows (provider,
   display name, API model id, per-image price, size tier, last-verified).
2. **Domain:** `src/image-generation/domain/` — versioned prompt manifest,
   judge-rubric types, adherence/text scoring (pure, unit-tested),
   aggregation with mean/stdDev/n, report renderer on the enforced 7-section
   outline with frontmatter title == sidebar label.
3. **Vendors:** `ImageGenerationClient` port in `src/vendors/llm/types.ts`;
   adapters for OpenAI/Google/xAI reusing the existing SDKs (record any new
   API surface in `docs/dependency-decisions.md`); deterministic fixture
   client generating synthetic PNGs (ocr `synthetic-image.ts` precedent) so
   the keyless path exercises the full pipeline byte-stably.
4. **Runner:** `src/entrypoints/run-image-generation.ts` with
   `--fixture`/`--estimate`/`--real`; register in `topic.ts` (stages
   benchmark+insights+translation) and `run-research.ts`; add npm scripts
   (`imagegen`, `imagegen:fixture`, `imagegen:estimate`).
5. **Publishing:** `site.ts` entry (id `image-generation`, artifactBase
   `image-generation-comparison`, qmuSlug `image-generation`, design block
   from the approved proposal); regenerate indexes; JP page via the
   translation stage (fixture stub keyless, real via
   `research:translate-report`).
6. **Real trial (owner-gated):** run `--estimate`, then the first real trial
   within the $20 ceiling; review metric discrimination vs estimate
   (guideline step 3); archive the dated frame; regenerate JP.

## Quality Gate

- [ ] Owner approved the five-element design before scaffolding.
- [ ] `npm run research -- image-generation --fixture` is keyless,
      deterministic, and byte-stable across two consecutive runs.
- [ ] Published EN/JP pages pass the title==sidebar-label, no-mermaid, and
      7-section outline guards (existing disk-reading tests extended by the
      new topic automatically).
- [ ] Every non-measured cell renders honest provenance (`n/a (fixtured)`,
      `n/a (error)`, or not-applicable for Anthropic).
- [ ] `make lint`, `env -C packages/tech npm test`, `make build` green;
      new domain functions unit-tested at boundaries.
- [ ] Real trial (if approved this drive): estimate within ceiling before
      the run; dated frame archived; actual cost recorded in the report.

## Considerations

- Anthropic has no image-generation API: showing it as an explicit
  not-applicable subject keeps provider coverage symmetric with the other
  topics without fabricating a comparison.
- Judge choice is a measured-instrument decision: one fixed vision model
  (recorded in the artifact) judges all subjects to keep scores comparable;
  swapping judges later is an instrument-version bump.
- Image bytes are NOT committed (repo size); the artifact stores prompt,
  constraint results, judge transcript, hashes, and timing — enough to
  render any report detail level without the binaries (full-record policy).
