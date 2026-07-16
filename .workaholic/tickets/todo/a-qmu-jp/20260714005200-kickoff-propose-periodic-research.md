---
created_at: 2026-07-14T00:51:55+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category: Added
mission: periodic-research-target-trend-catchable-ai-models-grok-perplexity
depends_on:
---

# Kickoff: propose the Trend-Catchable AI Models periodic-research instrument (cadence, subjects, metrics, cost)

## Overview

Kicks off the **Trend-Catchable AI Models** periodic-research mission. Per `CLAUDE.md` (proposal-first) and `docs/research-development-guideline.md`, before building, produce a proposal for developer approval covering **cadence, subjects, metrics, cost/trial-count range, and accumulated history**. Then fill the mission's Goal/Scope/Acceptance and, once approved, scaffold the topic under `packages/tech/src/<topic>/` following the layered `domain/ entrypoints/ vendors/` structure — reusing the LLM comparison instrument's patterns (`vendors/` anti-corruption layer, a `models.ts`-style registry, keyless fixture fallback).

## Key Files

- `docs/research-development-guideline.md` — the proposal-first template to follow.
- `packages/tech/src/llm-model-comparison/` — reference instrument (registry, matrix, run, domain graders).
- `packages/tech/TEMPLATE.md` — how a new topic subfolder is shaped.
- `packages/tech/src/vendors/llm/types.ts` — the CompletionClient-style port to mirror where applicable.
- The mission file: `.workaholic/missions/active/periodic-research-target-trend-catchable-ai-models-grok-perplexity/mission.md`.

## Implementation Steps

1. Read `docs/research-development-guideline.md`.
2. Survey candidate subjects for this topic (see below) and confirm current offerings.
3. Draft the proposal: cadence, subject list, metrics, cost/trial-count range, accumulated-history shape.
4. Get developer approval (proposal-first gate — do not spend before approval).
5. Fill the mission Goal / Scope / Acceptance, each acceptance item naming the ticket that will satisfy it.
6. Scaffold the code skeleton behind an anti-corruption `vendors/` layer with a registry + keyless fixture path.

**Subjects to consider**
- Grok (live X / web)
- Perplexity Sonar
- Gemini with Google Search grounding
- GPT with web/browsing
- Claude with web search

**Candidate metrics:** knowledge recency on recent-event probes, citation freshness/accuracy, hallucination rate on new events, latency, cost

## Considerations

Reuse the existing instrument patterns; do not fork a parallel design. Keep external SDKs behind `vendors/`. Ensure keyless CI stays green via a fixture path. Honour the proposal-first gate before any real (paid) runs.

## Night-run status (2026-07-14, /drive night)

**Steps 1–3 and 5 done; blocked at step 4 (developer approval) — a hard external
gate the night run cannot cross.** No spend, no scaffolding (both forbidden
before approval by `docs/research-development-guideline.md`).

- Investigated the topic set — this is a **new** topic (`trend-recency`), not an
  extension; Perplexity is unwired and no web-search/grounding surface exists yet.
- Drafted the full 5-element proposal:
  [`../../../missions/active/periodic-research-target-trend-catchable-ai-models-grok-perplexity/proposal.md`](../../../missions/active/periodic-research-target-trend-catchable-ai-models-grok-perplexity/proposal.md).
- Filled the mission Goal / Scope / Acceptance / Changelog; acceptance items name
  the tickets below.
- Queued post-approval follow-ups (all `blocked_on: approval`):
  `20260714010000-scaffold-trend-recency-instrument.md`,
  `20260714010001-trend-recency-first-validation-trial.md`,
  `20260714010002-trend-recency-publish-topic.md`.

**Morning action:** review `proposal.md` (esp. the four open questions — ground-truth
authorship, $30 ceiling, trial-1 breadth, Perplexity key), then approve or adjust.
On approval, `/drive` the scaffold ticket. This ticket is archived only once
approval is recorded (step 4 met).
