---
created_at: 2026-07-14T01:00:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 4h
commit_hash: 24b5440
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

## Night-run progress (2026-07-14, approved in-session)

**Keyless skeleton built (SVG-parity) — CI green.** Not yet fully done; kept in
todo for the remaining wiring below.

Built:
- `packages/tech/src/trend-recency/domain/` — `types.ts`, `manifest.ts` (seed
  probe schema), `extract.ts`, `score.ts` (+ 14 tests). Mechanical metrics:
  recencyAccuracy (keyword proxy), abstentionRate, citationValidity,
  citationFreshnessDays, latencyMs.
- `packages/tech/src/trend-recency/models.ts` — 10-config registry (6 grounded +
  4 ungrounded controls).
- `packages/tech/src/vendors/llm/types.ts` — `GroundedAnswer` / `GroundedCitation`
  / `GroundedAnswerClient` port.
- `packages/tech/src/vendors/llm/fixture.ts` — `createFixtureGroundedAnswerClient`
  (grounded cites a dated source; control abstains).
- `packages/tech/src/vendors/llm/perplexity.ts` — Sonar ACL + citation parser
  (+ 4 tests); recorded in `docs/dependency-decisions.md`.
- `run.ts` — runner + `estimate` (+ 5 tests). Full suite 328 green; tsc/prettier/
  eslint clean.

Remaining before this ticket archives:
1. **Grounded search-tool wiring for the 4 chat providers** (xAI Live Search,
   Google Search grounding, OpenAI/Anthropic web-search tools). `run.ts` currently
   throws a clear "not wired yet" for these on the real path; fixture + Perplexity
   real + ungrounded-control real all work. Needs per-provider tool params
   verified against live APIs.
2. **Entrypoint + npm scripts** (`src/entrypoints/run-trend-recency.ts`,
   `trend-recency` / `:fixture` / `:estimate`) — not yet wired into the research
   runner (same split as the SVG scaffold's follow-up).
3. **Ground-truth history DB** under `docs/research-reports/trend-recency-history/`
   — real per-trial probe generation (belongs with the first-trial ticket).

## Completion (2026-07-17, trend desk)

All three remaining items are resolved (keyless — no paid call was made):

1. **Grounded wiring** — four new grounded-answer adapters behind the existing
   ACLs: `createXaiGroundedClient` (Live Search `search_parameters` +
   `citations`), `createGoogleGroundedClient` (`googleSearch` tool +
   `groundingChunks`), `createOpenAiWebSearchGroundedClient` (Responses
   `web_search` tool + `url_citation` annotations), and
   `createAnthropicGroundedClient` (`web_search` server tool; cited-source
   preference with `page_age` date enrichment). Each citation parser is pure,
   exported, and unit-tested (8 new tests); `run.ts` now routes every grounded
   card instead of throwing. Tool parameters follow each provider's current
   documentation — the **live verification** of these params is inherently the
   first `--real` trial (ticket 20260714010001), which spends money and stays
   owner-gated.
2. **Entrypoint + npm scripts + unified CLI** —
   `src/entrypoints/run-trend-recency.ts` (SVG-parity: report + data artifact,
   `--estimate` preview, estimate-before-real), `trend-recency{,:fixture,:real,:estimate}`
   npm scripts, `TopicSpec` in `research/domain/topic.ts`, and the runner binding
   in `run-research.ts` (dispatcher sync test passes). A new
   `domain/report.ts` renders the standard 7-section English article; an
   unmeasured stat renders "not measured", never a faked number.
3. **Ground-truth DB shape** —
   `docs/research-reports/trend-recency-history/README.md` commits the auditable
   per-trial probe-set schema (probe + answer + citations, instrument-versioned);
   the first dated set is written by the first real trial, as planned.

Verification (raw exit codes): `make install` 0, `make build` 0 (packages +
VitePress docs), `make test` 0 (487 passed / 1 skipped, incl. 11 new), `make
lint` 0; `npm run research -- trend-recency --fixture` 0 (byte-stable across two
runs — identical sha256 for the committed report and data artifact);
`npm run research -- trend-recency --estimate` 0 (~$0.47 total, ceiling $30).
