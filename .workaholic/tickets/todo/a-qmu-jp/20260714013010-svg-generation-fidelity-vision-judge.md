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
