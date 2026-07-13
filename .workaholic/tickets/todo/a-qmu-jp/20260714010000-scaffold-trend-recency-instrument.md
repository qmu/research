---
created_at: 2026-07-14T01:00:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 4h
commit_hash:
category: Added
mission: periodic-research-target-trend-catchable-ai-models-grok-perplexity
depends_on: [20260714005200-kickoff-propose-periodic-research.md]
blocked_on: developer approval of proposal.md (proposal-first gate)
---

# Scaffold the trend-recency instrument (registry, Perplexity vendor ACL, keyless fixture, ground-truth DB shape)

> **BLOCKED on approval.** Do not start until the developer approves
> `.workaholic/missions/active/periodic-research-target-trend-catchable-ai-models-grok-perplexity/proposal.md`.
> Per the proposal-first protocol, no scaffolding happens before approval.

## Overview

Build the `trend-recency` topic skeleton behind the layered `domain/ entrypoints/
vendors/` structure, reusing the llm-model-comparison patterns. No paid run in
this ticket — CI-green keyless fixture path only.

## Key Files

- `packages/tech/TEMPLATE.md` — scaffold recipe (steps 1–4).
- `packages/tech/src/llm-model-comparison/` — reference domain/registry/report.
- `packages/tech/src/vendors/llm/xai.ts`, `.../openai.ts` — OpenAI-compat adapters to mirror for Grok Live Search and Perplexity Sonar.
- `packages/tech/src/vendors/llm/types.ts` — the CompletionClient-style port.
- `packages/tech/src/llm-model-comparison/domain/availability.ts` + `docs/research-reports/availability-history/` — the accumulate-and-summarize DB pattern to mirror for the ground-truth store.

## Implementation Steps

1. `packages/tech/src/trend-recency/domain/` — pure logic: recency/hallucination
   scoring (LLM-judge shaped), citation validity + freshness computation,
   aggregation into per-subject metric rows, `HistoryPoint` shaping.
2. `packages/tech/src/vendors/llm/perplexity.ts` — new anti-corruption layer for
   Sonar (OpenAI-compatible base URL, `PERPLEXITY_API_KEY`); record in
   `docs/dependency-decisions.md`. Add grounded-config surfaces for the existing
   xAI/OpenAI/Google/Anthropic adapters (search tool enabled).
3. `packages/tech/src/trend-recency/models.ts` — registry of the ~10 configs
   (5 grounded + ungrounded controls) with keyless fixture rendering.
4. Ground-truth DB shape under `docs/research-reports/trend-recency-history/`
   (probe + answer + citations), committed and auditable.
5. `src/entrypoints/run-trend-recency.ts` + `--estimate` path.
6. One unit test per public domain function (boundary conditions); keep CI green
   keyless.

## Considerations

Key-gated everywhere with a deterministic fixture fallback. Confirm
`PERPLEXITY_API_KEY` provisioning before wiring the vendor. Do not register the
topic in `site.ts` yet — that is the publish ticket.
