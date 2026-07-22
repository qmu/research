---
created_at: 2026-07-14T01:00:02+09:00
author: a@qmu.jp
type: enhancement
layer: [Config, UX]
effort: 4h
commit_hash: 52118d1
category: Added
mission: periodic-research-target-trend-catchable-ai-models-grok-perplexity
depends_on: [20260714010001-trend-recency-first-validation-trial.md]
---

# Trend-recency: register the topic in site.ts, publish current article + Japanese translation

> **UNBLOCKED 2026-07-18** — the first validation trial passed design review
> (mission acceptance item 3, 2026-07-17: grounded 1.00 vs. control 0.00
> recencyAccuracy on all three measured pairs, cost within estimate).

## Overview

Make the topic a published surface once the design is proven: add it to the
shared metadata so every index, sidebar, and qmu copy plan picks it up without a
hand-written list.

## Policies

- **workaholic:development** — proposal-first and objective docs: the published
  `design` block mirrors the approved `proposal.md` exactly (cadence, subjects,
  metrics, cost, accumulates), and the article renders from the committed
  measured record, never faked numbers.
- **workaholic:implementation** — no hand-written parallel lists: every index,
  sidebar, and qmu copy plan derives from the single `site.ts` metadata; the
  current pages compose keyless and byte-stably from the committed dated frame.

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

## Quality Gate

- `trend-recency` appears in `publishedResearchTopics` with a complete `design`
  block, and in both regenerated indexes (`docs/research-reports/index.md`,
  `docs/llm-foundation/index.md`) in the shared topic order.
- The English and Japanese current pages render from the committed measured
  record (7 measured of 10 subject rows), not the keyless fixture, and satisfy
  the page guards: frontmatter title == sidebar label, no mermaid, §4 within the
  3000-char budget, standard 7-section outline in both languages.
- Keyless byte-stability holds: `check-fixture-drift.sh` regenerates the current
  pages from the committed dated frame with zero diff.
- Per-package verification green with bare exit codes: `npm run build`,
  `npx vitest --run`, `npm run lint`.

## Final Report — 2026-07-18 (drive on desk `work-20260718-203005`)

**Outcome: implemented.** trend-recency is published as a dated EN/JP survey
article rendered from the committed measured record; no new benchmark
measurement call was made (the only API usage was the report translation).

### What landed (commit `52118d1`)

- **Registration.** `site.ts` `publishedResearchTopics` gains the `trend-recency`
  entry (source "Trend recency", japanese "トレンド追随", `design` mirroring the
  approved `proposal.md`). `snapshot.ts` gains the stats-runs point extractor
  (recencyAccuracy / citationValidity / latencyMs, measured rows only) so the
  measured dated frame qualifies. `topic.ts` stages become
  `benchmark + insights + translation`, like the other published benchmark topics.
- **Pages from the committed measured record.** The current EN page + data.json
  were rendered from
  `docs/research-reports/trend-recency-history/2026-07-17-trend-recency-v2-20260717.result.json`
  (7 measured of 10; xAI 410 and unprovisioned-Sonar rows stay honest `error`
  rows). The full report was translated to Japanese with
  `research:translate-report` (real `claude-sonnet-5`). Both were archived into the
  standard dated frame `history/trend-recency/2026-07-17T01-34-36-857Z/`, and the
  keyless fixture path re-composed the current pages from that frame (推移 +
  過去の調査 blocks) byte-stably. Indexes regenerated via
  `research:site -- write-indexes`.
- **Guards + verification.** title == label, no mermaid, §4 = 878 chars (budget
  3000), 7-section EN/JP outline — all pass. build 0 · vitest 0 (567 passed / 1
  skipped, incl. a new trend-recency snapshot-extractor test and the
  published-pages / article-outline / current-page-provenance guards) · lint 0 ·
  `check-fixture-drift.sh` 0 (byte-stable).

### Deferred (out of this ticket's scope)

- **Publishing to qmu-co-jp** follows the repo `/ship` flow (copy plan + ticket);
  this ticket leaves the shared metadata correct so `/ship` picks it up.
- The instrument still measures 7/10 subjects: the xAI Agent Tools live probe and
  `PERPLEXITY_API_KEY` remain owner-gated (carried by the mission and the
  archived v3-repairs ticket), unaffected by this publish.
