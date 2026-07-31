---
created_at: 2026-07-19T11:00:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Vendors]
effort: 4h
commit_hash:
category: Added
mission: periodic-research-target-compare-deep-research-alike-apis
depends_on: [20260714013000-scaffold-deep-research-instrument.md]
---

# Wire the five deep-research subjects behind vendors/ (post-approval)

## Overview

The keyless skeleton throws for every real subject. Implement each provider's
real agentic endpoint behind the `DeepResearchClient` port, per the approved
`proposal.md`: OpenAI `o3-deep-research` (Responses + web_search), Perplexity
`sonar-deep-research`, Gemini Deep Research (Interactions API, background+poll),
Grok (Agent Tools web_search), and the Anthropic build-your-own baseline
(Messages + web_search loop). Cost is derived per call from billed usage.

## Key Files

- `packages/tech/src/vendors/deep-research/providers.ts` — real clients.
- `packages/tech/src/vendors/deep-research/pricing.ts` — pure per-query cost.
- `packages/tech/src/deep-research/models.ts` — subject registry + model ids.

## Implementation Steps

1. Reuse the tested citation extractors from `vendors/llm/*` per provider.
2. Normalize each call to `{report, citations, elapsedMs, costUsd, searchCount?}`.
3. Compute `costUsd` from usage via `pricing.ts`; fall back to the card midpoint.
4. Record dependencies in `docs/dependency-decisions.md` (no new SDKs taken).

## Considerations

Per-subject error isolation in the runner turns any provider-shape surprise into
an honest `error` row, never a fabricated number. PERPLEXITY_API_KEY absence
leaves that subject an error row (no spend).
