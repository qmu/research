---
created_at: 2026-07-19T11:00:10+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 3h
commit_hash:
category: Added
mission: periodic-research-target-compare-deep-research-alike-apis
depends_on: [deep-research-subject-vendors.md]
---

# Implement the metrics + real judge (post-approval)

## Overview

Replace the deferred real judge with a live LLM judge: rubric answer-quality via
structured output, and citation validity via real URL fetch + a batched LLM
support-check. Citation count, source diversity, latency, and cost per query are
recorded in full in the `.data.json` artifact.

## Key Files

- `packages/tech/src/deep-research/run.ts` — real judge (rubric + citation check).
- `packages/tech/src/deep-research/domain/score.ts` — pure scorers (already built).

## Implementation Steps

1. Structured rubric grade constrained to each question's rubric ids.
2. Deterministic citation sample; fetch with timeout; unresolved = invalid.
3. Batched structured support-check over resolved snippets.
4. Keep every score/timing/cost/citation-domain in the artifact.

## Considerations

The judge does network + LLM IO, so it lives at runner level (not domain),
mirroring the image-generation real judge. The pure scorers stay unit-tested.
