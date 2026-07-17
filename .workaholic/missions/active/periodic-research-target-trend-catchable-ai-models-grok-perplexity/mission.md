---
type: Mission
title: Periodic Research Target: Trend-Catchable AI Models (Grok, Perplexity)
slug: periodic-research-target-trend-catchable-ai-models-grok-perplexity
status: active
created_at: 2026-07-14T00:40:40+09:00
author: a@qmu.jp
assignee: a@qmu.jp
tickets:
  - 20260714005200-kickoff-propose-periodic-research.md
  - 20260714010000-scaffold-trend-recency-instrument.md
  - 20260714010001-trend-recency-first-validation-trial.md
  - 20260714010002-trend-recency-publish-topic.md
stories: []
concerns: []
---

# Periodic Research Target: Trend-Catchable AI Models (Grok, Perplexity)

## Goal

Clients repeatedly ask which AI systems actually *know what is happening right
now* — not what a model memorized at training time, but what it can retrieve and
correctly report about events from the last few days. This mission builds a
recurring, reproducible instrument that measures **web-grounded knowledge
recency**: how correctly each search-augmented system (Grok Live Search,
Perplexity Sonar, Gemini/GPT/Claude with their search tools) answers questions
about recent real-world events, how fresh and valid its citations are, and how
much freshness costs in latency and money. Paired ungrounded controls isolate the
contribution of live retrieval from parametric memory. The monthly series lets us
tell clients not just who is best today, but who is *keeping up* as the world
moves — a question none of the existing topics (speed, accuracy, availability,
OCR, RAG, image-generation) answers.

The design is specified in
[`proposal.md`](./proposal.md) (proposal-first artifact, awaiting approval).

## Scope

**In scope:** a new `trend-recency` research topic under
`packages/tech/src/trend-recency/` following `TEMPLATE.md`; a Perplexity Sonar
vendor anti-corruption layer; grounded + ungrounded control configs for the five
provider surfaces behind the existing `vendors/llm` adapters; the six metrics in
the proposal (recencyAccuracy, hallucinationRate, citationValidity,
citationFreshnessDays, latencyMs, costPerQueryUsd); a committed, auditable
ground-truth probe DB under `docs/research-reports/trend-recency-history/`; a
keyless fixture path so CI stays green; monthly cadence with `HistoryPoint`
trend series; and publication as a dated survey article with a Japanese
translation.

**Out of scope:** deep multi-agent "heavy" tiers; provider surfaces without a
public search/grounding API; benchmarking the underlying search indexes
themselves (we measure the model+search *product*, not the crawler). No paid run
or scaffolding occurs before the proposal is approved.

## Acceptance

- [x] Proposal-first design (cadence, subjects, metrics, cost/trial range,
  accumulated history) drafted and approved by the developer
  (#20260714005200-kickoff-propose-periodic-research.md)
- [x] `trend-recency` instrument scaffolded behind `domain/ entrypoints/ vendors/`
  with a Perplexity ACL, a config registry, a ground-truth DB shape, and a
  CI-green keyless fixture path
  (#20260714010000-scaffold-trend-recency-instrument.md)
- [ ] First validation trial (`--real`) runs within the approved cost ceiling and
  its metrics discriminate grounded configs from ungrounded controls and
  providers from each other
  (#20260714010001-trend-recency-first-validation-trial.md)
- [ ] Topic registered in `site.ts` and published as a dated survey article with a
  Japanese translation and regenerated indexes
  (#20260714010002-trend-recency-publish-topic.md)

## Changelog

- 2026-07-14 — mission scaffolded — mission.md
- 2026-07-14 — proposal drafted (5 elements) during night /drive; stopped at the
  proposal-first approval gate — no spend, no scaffolding — proposal.md
- 2026-07-14 — post-approval follow-up tickets queued (scaffold, first-trial,
  publish), all blocked on approval —
  20260714010000-scaffold-trend-recency-instrument.md,
  20260714010001-trend-recency-first-validation-trial.md,
  20260714010002-trend-recency-publish-topic.md
- 2026-07-14 — proposal approved by owner (in-session); scaffolding authorized —
  proposal.md
- 2026-07-14 — keyless instrument skeleton built (SVG-parity): domain
  (types/manifest/extract/score), config registry, Perplexity Sonar vendor ACL,
  grounded-answer port + fixture client, run/estimate; 23 new tests, full suite
  328 green, tsc + prettier + eslint clean —
  packages/tech/src/trend-recency/, packages/tech/src/vendors/llm/perplexity.ts
- 2026-07-17 — kickoff ticket archived: the approval gate (step 4) was met
  2026-07-14 (owner approval recorded above) and every other step had landed via
  PR #41 — 20260714005200-kickoff-propose-periodic-research.md
- 2026-07-17 — scaffold completed and archived (acceptance item 2 ticked):
  grounded search-tool wiring for all four chat providers (xAI Live Search,
  Google Search grounding, OpenAI Responses web_search, Anthropic web_search)
  with pure unit-tested citation parsers; entrypoint + npm scripts + unified-CLI
  topic/runner registration; standard 7-section report renderer; committed
  byte-stable keyless fixture page + data artifact; ground-truth history DB
  schema README. make install/build/test/lint all exit 0 (487 tests).
  No paid call was made — 20260714010000-scaffold-trend-recency-instrument.md,
  packages/tech/src/trend-recency/, docs/research-reports/trend-recency-history/
- 2026-07-17 — remaining tickets stay gated, not driveable by an agent alone:
  the first validation trial (20260714010001) makes paid provider calls (spend
  approval + provider keys — grounded tool params get their live verification
  here), and the publish ticket (20260714010002) depends on that trial passing
  design review. Next action is an owner-triggered
  `npm run research -- trend-recency --estimate` then `--real`.
