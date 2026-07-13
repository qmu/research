---
type: Mission
title: Living research development guideline
slug: living-research-development-guideline
status: active
created_at: 2026-07-12T02:07:02+09:00
author: a@qmu.jp
tickets: []
stories: []
concerns: []
---

# Living research development guideline

## Goal

The AI/IT industry moves fast: new models, products, and approaches appear
monthly, and by the time a developer notices an alternative they want a quick,
trustworthy answer to "how much better is it than what we use now?". This
repository is where that answer lives — as **frequent, living, reproducible
research** rather than one-off write-ups.

The working model this mission establishes:

- A developer offers only a terse idea — something they want to prove, or a
  topic they are curious about. They do not write the research design.
- AI agents derive the best approach and **propose first**, covering:
  1. how frequently the research should recur,
  2. what subjects are compared,
  3. by what indicators/metrics they are compared,
  4. how much cost is affordable and how many trials make the result
     statistically reliable,
  5. what historical data the recurring runs will accumulate and display.
- The developer confirms or adjusts the proposal; the agent then builds the
  runnable topic under `packages/`.

Efficiency is a first-class constraint: research articles are consumed by
Claude Code as context, so they must stay compact.

> **Structure update (2026-07-13, [ADR 0006](../../../docs/adr/0006-dated-survey-article-series.md)):**
> the "snapshot" split below was superseded. Each topic now publishes a **dated
> series of survey articles**: the stable slug always holds the latest survey's
> 7-section article, composed with a 推移 (trend) block and a 過去の調査 (past
> surveys) links block; earlier surveys stay at their dated slugs. The original
> two-surface framing is kept below as the mission's history.

The original article structure was:

- **Snapshot article** — the page a developer reaches from the sidebar. It is
  the latest view, compact, describing the tendencies observed over the last
  3–5 months. No exhaustive trial numbers.
- **Historical trial reports** — dated reports (e.g. July, August, September),
  all in the same format, linked from the snapshot. Detailed numbers live
  here, under `docs/research-reports/history/<topic>/<timestamp>/`.

## Scope

Done means:

- A written **Research Development Guideline** exists in this repository that
  AI agents load when a developer proposes a topic, defining the
  proposal-first protocol (cadence, subjects, metrics, cost/trial-count
  reliability, accumulated historical outputs) and the snapshot/history
  article structure.
- The site tooling (`packages/tech/src/research/domain/site.ts`, archive and
  index generators) supports the snapshot-plus-history structure: sidebar
  pages are snapshots; dated trial reports are reachable from them in a
  uniform format.
- At least one existing topic is restructured to the snapshot/history shape
  as the reference implementation, and recurring re-runs (run → archive →
  refresh snapshot) work end-to-end for it.
- A compactness expectation for snapshot articles is documented (and ideally
  checked), so articles remain cheap to load into an LLM context window.

Out of scope:

- Changes inside `../qmu-co-jp` itself — the corporate copy keeps flowing
  through the existing publish-ticket boundary (ADR 0003).
- One-off research with no recurrence plan; those don't belong to this model.
- Automating the scheduling infrastructure (cron/CI timers) beyond recording
  each topic's intended cadence — actual scheduling can be a later mission.

## Acceptance

<!-- One checklist item per criterion, each naming the ticket/story expected to satisfy it
     by filename, e.g. "criterion text (#20260101120000-some-ticket.md)". Progress toward
     achievement is checked over total, computed from this list, never a hand-set number. -->

- [x] Research Development Guideline document committed, defining the
      proposal-first protocol AI agents follow (cadence, subjects, metrics,
      cost/trials, historical data)
      (#20260712030400-research-development-guideline.md)
- [x] Snapshot-article structure defined in shared metadata/site tooling:
      sidebar page = compact latest snapshot with 3–5-month tendencies,
      linking to dated historical trial reports in a uniform format
      (#20260712031500-snapshot-structure-site-tooling.md)
- [x] One existing research topic migrated to the snapshot + historical-trials
      structure as the reference implementation
      (#20260712031600-migrate-llm-speed-snapshot-reference.md)
- [x] Recurring-run flow verified end-to-end for the reference topic:
      `--real` run → archive dated trial → snapshot regenerated with updated
      tendencies (#20260712031600-migrate-llm-speed-snapshot-reference.md)
- [x] Snapshot compactness expectation documented (size budget for LLM
      context use) and reflected in the guideline
      (#20260712030400-research-development-guideline.md)

## Changelog

- 2026-07-13 — owner clarified the intended structure: a dated survey-article series per topic; each article embeds the trend through its run and links to all past articles; latest = current page. Decisions locked (publish all runs to qmu; stable slug = latest; don't rewrite old frames; regenerate current pages now). Ticketed — 20260713144951-dated-article-series-with-trend-and-backlinks.md
- 2026-07-13 — core built (commits 6995212, f3cc3ac): all 7 topics unified on the composed dated-article model (§4 推移 + §7 過去の調査), speed EN/JP inconsistency fixed, real-run pipeline composes-then-translates the current page. Remaining on the ticket: D1 publish-all-runs to qmu, drop the vestigial insights stage, and rewrite ADR 0005 / guideline / this mission body out of "snapshot" terms.

<!-- Append-only, dated timeline relating this mission's tickets and reports over time.
     One line per event ("- YYYY-MM-DD — event — filename"); never rewrite past lines. -->

- 2026-07-12 — Mission created from the developer's Research Development
  Guideline brief; Goal/Scope/Acceptance drafted — mission.md
- 2026-07-12 — Ticket written for acceptance items 1 & 5 (guideline doc +
  compactness budget) — 20260712030400-research-development-guideline.md
- 2026-07-12 — Tickets written for items 2 (site tooling) and 3+4 (llm-speed
  reference migration + end-to-end loop) —
  20260712031500-snapshot-structure-site-tooling.md,
  20260712031600-migrate-llm-speed-snapshot-reference.md
- 2026-07-12 — ticket archived — 20260712030400-research-development-guideline.md
- 2026-07-12 — ticket archived — 20260712031500-snapshot-structure-site-tooling.md
- 2026-07-12 — ticket archived — 20260712043000-comparison-instrument-v2.md
- 2026-07-12 — ticket archived — 20260712031600-migrate-llm-speed-snapshot-reference.md
- 2026-07-12 — All five acceptance criteria met: guideline + ADR 0005 (d7329e2),
  snapshot tooling + budget validator (e522aa0), instrument v2 (c79751f),
  llm-speed migration + real end-to-end loop, ~$3 actual (ec38a52) — mission.md
- 2026-07-13 — story reported — work-20260622-191220.md
- 2026-07-13 — concern deferred (stuck) — 15-json-artifact-link-resolution-deferred.md
- 2026-07-13 — concern deferred (stuck) — 15-model-ids-require-periodic-live-verification.md
- 2026-07-13 — concern deferred (stuck) — 15-fixture-determinism-depends-on-careful-seeding.md
- 2026-07-13 — concern deferred (stuck) — 15-jp-pages-are-overwritten-by-the.md
- 2026-07-13 — concern deferred (stuck) — 15-only-llm-speed-is-migrated-to.md
- 2026-07-13 — concern deferred (stuck) — 15-real-run-cloud-backend-credentials-and.md
