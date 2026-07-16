---
type: Mission
title: Periodic Research Target: SVG Generation and Animation
slug: periodic-research-target-svg-generation-and-animation
status: active
created_at: 2026-07-14T00:40:40+09:00
author: a@qmu.jp
assignee: a@qmu.jp
tickets: []
stories: []
concerns: []
---

# Periodic Research Target: SVG Generation and Animation

## Goal

qmu.co.jp's foundational research measures text behaviour (speed, accuracy,
availability), document reading (OCR), retrieval (RAG), and raster **image
generation** — but says nothing about **vector graphics**. Clients increasingly
ask frontier models to emit SVG directly (icons, logos, charts, UI illustration)
and to animate it (SMIL / CSS), because SVG is resolution-independent, tiny,
diffable, and editable after generation in a way a PNG never is. This mission
adds a recurring, reproducible **SVG generation & animation** benchmark to the
published LLM基礎検証 set: which frontier models produce valid, detailed,
correctly-animated SVG, at what token cost — held to the same evidence-based
standards (keyless fixture self-test, honest per-cell provenance, dated trial
history, Japanese article) as every other published topic.

## Scope

Done means: an `svg-generation` research topic exists following the
proposal-first protocol and TEMPLATE.md — pure domain scoring, provider access
behind the existing `vendors/llm` anti-corruption layer, a thin runner with
fixture/estimate/real modes, a published EN page + JP translation wired through
`site.ts` shared metadata (title == sidebar label), unit tests including the
disk-reading published-page guards, and at least one owner-approved real trial
committed as a dated frame.

Out of scope: aesthetic/quality opinion scoring (only mechanically verifiable
metrics plus a rubric-based vision judge); raster image generation (the separate
image-generation topic); SVG *editing* / optimization tooling comparisons; video
generation; and running any paid generation in CI (the fixture path stays keyless
and deterministic).

## Research design (proposed — awaiting owner approval)

Per `docs/research-development-guideline.md`, the five proposal elements:

1. **Cadence** — monthly, with an off-cadence trial on a major frontier-model
   release. SVG/animation ability is an emergent side-effect of general model
   capability, which moves on a weeks-to-months rhythm; monthly bounds how stale
   the current article can be.
2. **Comparison subjects** — one text flagship per provider, drawn from the
   foundation-model catalog: **Claude Opus 4.8**, **GPT-5.5**, **Gemini 3.1
   Pro**, **Grok 4.3** (registry: `packages/tech/src/svg-generation/models.ts`).
   No provider is a non-subject — all four emit SVG through their text API.
3. **Metrics** — per subject, over a fixed prompt manifest (3 static + 2
   animated in v1):
   - **Render validity** — share of outputs that are well-formed XML rooted at
     `<svg>` (0–1, higher better). *v1 uses a dependency-free structural parse;
     a real rasterizer is the follow-up's stronger check.*
   - **Path complexity** — drawable-element + path-command count (higher = more
     detail; descriptive, not a verdict).
   - **Animation presence** — for animated prompts, share carrying a SMIL/CSS
     animation (0–1, higher better).
   - **Prompt fidelity** — rubric adherence judged by a fixed vision model over
     the rasterized SVG (0–1, higher better). *Added 2026-07-17 (instrument
     `svg-v2`): resvg rasterizer behind `vendors/raster`, fixed
     `claude-sonnet-5` judge, keyless fixture path preserved.*
   - **Token cost** — output tokens × catalog price (USD, lower better).
4. **Cost and trial count** — run `npm run research -- svg-generation
   --estimate` before each real run. Premises: one trial exercises all 5 prompts
   per subject; 1–3 in-trial repetitions. One repetition detects only large
   moves; three bound the run-to-run variance the artifact reports as standard
   deviation. The estimate at 3 repetitions is a **few US cents** per subject
   (generation-only; SVG is a few hundred output tokens) — an order of magnitude
   cheaper than the image or comparison sweeps. **Agreed ceiling: $5/trial**; an
   estimate above it stops for re-approval. The fidelity vision-judge, once
   added, adds one judge read per generated SVG at the judge model's catalog
   price.
5. **Accumulated history** — per-subject `HistoryPoint` series for render
   validity, animation presence, prompt fidelity, and mean token cost, one point
   per monthly survey. After three or more surveys the current article's 推移
   (trend) block shows each model's SVG-quality movement across the tendency
   window.

## Acceptance

- [x] Research design (cadence, subjects, metrics, cost/trial range, accumulated history) proposed for owner approval before any paid run (#20260714005159-kickoff-propose-periodic-research.md)
- [x] Keyless topic skeleton scaffolded — `SvgGenerationClient` port + fixture, domain (XML well-formedness, mechanical scorers, prompt manifest v1, types), model registry, run/estimate — with unit tests, `tsc`/`vitest`/`eslint` all green and zero spend (#20260714005159-kickoff-propose-periodic-research.md)
- [x] Topic runnable via the unified CLI (`npm run research -- svg-generation`) with fixture/estimate/real modes; §4-policy report renderer + published EN/JP pages wired through `site.ts` shared metadata, passing the 7-section outline, title==sidebar-label, and no-mermaid guards (#20260714013000-svg-generation-build-runner-cli-and-pages.md)
- [x] Prompt-fidelity metric added — rasterize each SVG and score rubric adherence with the fixed vision judge (instrument-versioned, keyless fixture path preserved) (#20260714013010-svg-generation-fidelity-vision-judge.md)
- [ ] Owner-approved first real trial within the $5/trial ceiling, committed as a dated history frame with the design-validation review (guideline step 3) (#20260714013020-svg-generation-first-real-trial.md)
- [ ] qmu-co-jp receives the new article through the publish ticket flow on the next `/ship`

## Changelog

- 2026-07-14 — mission created (scaffold) — 20260714005159-kickoff-propose-periodic-research.md
- 2026-07-14 — kickoff `/drive` (night): research design proposal drafted (above) for owner approval; keyless topic skeleton built end to end — `SvgGenerationClient` port + `createFixtureSvgGenerationClient`, `svg-generation` domain (dependency-free XML well-formedness, render-validity / path-complexity / animation-presence scorers, prompt manifest v1, SVG extractor), 4-subject registry (catalog-verified ids/prices), fixture/estimate runner reusing every provider's existing completion adapter, 26 unit tests; `tsc` + full `vitest` (334 passing) + `eslint` all green; estimate ~a few cents/trial (ceiling $5). No paid run performed — the first real trial and the fidelity vision-judge remain owner-gated follow-ups — 20260714005159-kickoff-propose-periodic-research.md
- 2026-07-14 — follow-up tickets filed: unified-CLI + report + published pages (20260714013000), fidelity vision-judge (20260714013010), owner-triggered first real trial (20260714013020)
- 2026-07-17 — 20260714013010 done (keyless only): prompt-fidelity metric added — instrument v2 (`svg-v2`) gives every prompt a yes/no rubric; generated SVG is rasterized behind the new `vendors/raster` `SvgRasterizer` port (`@resvg/resvg-js`, recorded in docs/dependency-decisions.md; hermetic headless CI test) and scored by the fixed `claude-sonnet-5` vision judge, keyless path fully preserved via fixture rasterizer + fixture judge (byte-stable, zero spend, no key). Unrenderable SVG scores 0 without a judge read. Fidelity folded into §4/§7 report, site metrics/accumulates, and a new svg-generation snapshot extractor; estimate includes judge reads (~$0.46/trial vs $5 ceiling). Gates: install/tsc/test/lint all 0 (474 tests passing). First real trial stays owner-gated (20260714013020) — 20260714013010-svg-generation-fidelity-vision-judge.md
- 2026-07-14 — 20260714013000 done: topic wired into the unified research CLI (`research -- svg-generation`, TopicSpec + runner binding) and `svggen*` npm scripts; §4-policy 7-section report renderer; published EN page + `data.json` generated from the keyless fixture run; JP page authored as a keyless placeholder (regenerated by `research:translate-report` at the first real trial); registered in `publishedResearchTopics` with agreed research design; EN/JP indexes regenerated. Full suite 336 passing incl. the disk-reading published-page guards (title==label, no-mermaid, §4 budget) and the run-research dispatcher sync; eslint+prettier clean. Still owner-gated: fidelity judge (013010) and first real trial (013020) — 20260714013000-svg-generation-build-runner-cli-and-pages.md
