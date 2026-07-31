---
created_at: 2026-07-19T11:00:20+09:00
author: a@qmu.jp
type: enhancement
layer: [Entrypoints]
effort: 2h
commit_hash:
category: Added
mission: periodic-research-target-compare-deep-research-alike-apis
depends_on: [deep-research-metrics-and-graders.md]
---

# Run the owner-approved first real deep-research trial (guideline step 3)

## Overview

Disposable validation trial. Owner-approved spend (~$32, Floor tier). Run
`--estimate` first, confirm within budget, then ONE `--real` trial, and archive
it as a dated survey frame.

## Implementation Steps

1. `npm run research -- deep-research --estimate`; confirm ≤ ceiling.
2. `npm run research -- deep-research --real` with keys present.
3. `npm run research:archive -- deep-research --generated-at <iso>`.
4. Review: do the metrics discriminate subjects? Did cost match the estimate?

## Considerations

Deep-research queries are the costliest/slowest in the set; per-subject error
isolation bounds the downside. No persistent provider resources are created.
