---
created_at: 2026-07-14T01:30:10+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category: Added
mission: periodic-research-target-svg-generation-and-animation
depends_on: [20260714013000-svg-generation-build-runner-cli-and-pages.md]
---

# Add the SVG prompt-fidelity metric (rasterize + fixed vision judge)

## Overview

v1 of the svg-generation topic scores only what the SVG *source* reveals (render
validity, path complexity, animation presence). The missing quality signal is
**prompt fidelity**: does the drawing actually match the request. This ticket
rasterizes each generated SVG and scores rubric adherence with the same fixed
vision-judge instrument the image-generation topic uses, keeping the keyless
fixture path deterministic.

## Key Files

- `packages/tech/src/image-generation/run.ts` — the rubric + vision-judge pattern to mirror (`RUBRIC_SCHEMA`, `createRealJudge`, `createFixtureJudge`).
- `packages/tech/src/svg-generation/domain/manifest.ts` — add per-prompt rubric constraints.
- `packages/tech/src/vendors/llm/anthropic.ts` — `createAnthropicVisionClient` (the fixed judge port).

## Implementation Steps

1. **Owner decision required:** choose the rasterizer and record it in `docs/dependency-decisions.md` (candidates: `@resvg/resvg-js` for a dependency-light native rasterize, or a headless-browser render). Keep it behind a `vendors/` anti-corruption layer; the keyless fixture path must not need it.
2. Extend the prompt manifest with mechanically-checkable rubric constraints per prompt.
3. Rasterize the SVG, feed it to the fixed vision judge, score adherence in pure domain code; version the instrument.
4. Fixture path: echo a perfect judgement (as the image/OCR fixtures do) so CI stays keyless and byte-stable.
5. Fold prompt-fidelity into the report and the accumulated-history series.

## Considerations

A malformed SVG cannot rasterize — score its fidelity 0, do not crash the run.
The judge model is fixed; swapping it is an instrument-version bump, not a silent
change.

## Outcome (2026-07-17 /drive on work-20260717-011503, keyless only)

Implemented end to end on the keyless fixture path; no API call was made and no
key is required anywhere in CI.

- **Rasterizer decision** — `@resvg/resvg-js` (resvg via N-API: headless,
  hermetic, no browser/network; prebuilt binaries incl. linux-arm64), recorded
  in `docs/dependency-decisions.md` per that file's template. Isolated behind
  the new `SvgRasterizer` port (`packages/tech/src/vendors/raster/types.ts`,
  `resvg.ts`); the keyless path uses the pure stub (`fixture.ts`) and the real
  engine is dynamically imported by real runs only. A hermetic vendors test
  (`resvg.test.ts`) proves headless PNG rasterization (and rejection of
  non-SVG) on every CI run.
- **Instrument v2** — prompt manifest bumped `svg-v1` → `svg-v2`: every prompt
  now carries mechanically-checkable yes/no rubric constraints (13 across the 5
  prompts); constraints address the drawn still frame only (motion stays the
  source-level animation-presence metric). Judge model fixed to
  `claude-sonnet-5` (`JUDGE_MODEL_ID` in `models.ts`, the same fixed instrument
  as image-generation); judge model + rasterizer engine are recorded in every
  run artifact as instrument provenance.
- **Scoring** — pure `scorePromptFidelity` (satisfied/total; unanswered counts
  unsatisfied) in `domain/score.ts`; `judgeSvgFidelity` in `run.ts` rasterizes
  and asks the judge, scoring an unparseable or unrenderable SVG 0 with no
  judge read (never crashes the run). Fixture judge echoes a perfect judgement
  (image-generation convention), so the fixture run is byte-stable (verified:
  identical sha256 across regenerations).
- **Folded into report + history** — new §4 aspect, model-table column, rubric
  counts in the manifest table, instrument line in §7; `promptFidelity` added
  to `site.ts` design metrics/accumulates and a `svg-generation` snapshot
  extractor added in `research/domain/snapshot.ts`; estimate now includes one
  judge read per SVG (total ≈ $0.46/trial, ceiling $5). EN fixture page +
  data.json regenerated; JP placeholder page and site indexes updated.
- **Gates** — in `packages/tech`: `npm install` 0, `npm run tsc` 0, `npm test`
  0 (64 files, 474 passed / 1 skipped), `npm run lint` 0.

Still owner-gated: the first real trial (20260714013020) runs the real
rasterizer + real `claude-sonnet-5` judge within the $5 ceiling.
