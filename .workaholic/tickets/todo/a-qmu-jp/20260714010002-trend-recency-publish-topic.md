---
created_at: 2026-07-14T01:00:02+09:00
author: a@qmu.jp
type: enhancement
layer: [Config, UX]
effort: 2h
commit_hash:
category: Added
mission: periodic-research-target-trend-catchable-ai-models-grok-perplexity
depends_on: [20260714010001-trend-recency-first-validation-trial.md]
blocked_on: first validation trial passing design review
---

# Trend-recency: register the topic in site.ts, publish current article + Japanese translation

> **BLOCKED** until the first validation trial passes review (metrics
> discriminate, cost within estimate).

## Overview

Make the topic a published surface once the design is proven: add it to the
shared metadata so every index, sidebar, and qmu copy plan picks it up without a
hand-written list.

## Key Files

- `packages/tech/src/research/domain/site.ts` — add a `ResearchSiteTopic` entry
  (id `trend-recency`, its `design` mirroring the approved proposal's cadence /
  subjects / metrics / cost / accumulates).
- `docs/research-development-guideline.md` — article structure (7 sections +
  推移/過去の調査 blocks).

## Implementation Steps

1. Add the `trend-recency` topic to `publishedResearchTopics` with its
   `ResearchDesign` (values from the approved proposal).
2. Generate the current English article from the trial, then
   `npm run research:translate-report -- trend-recency` for the Japanese page.
3. `npm run research:site -- write-indexes` and
   `npm run research:site -- compose-current-articles`.
4. Verify `make docs` renders the topic in both `LLMs Research` and `LLM基礎検証`
   in the same order.
5. Publishing to qmu-co-jp follows the repo `/ship` flow (copy plan + ticket);
   out of scope here beyond leaving the metadata correct.

## Considerations

No hand-written topic list anywhere — everything derives from `site.ts`. Keep the
`design` block exactly consistent with `proposal.md` so the cost gate and history
read the same agreed values.
