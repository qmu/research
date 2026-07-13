---
created_at: 2026-07-12T03:04:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Config]
effort: 4h
commit_hash: 03ba48d
category: Added
depends_on:
mission: living-research-development-guideline
---

# Write the Research Development Guideline (proposal-first protocol + snapshot/history article structure)

## Overview

Mission `living-research-development-guideline`, acceptance items **1** and **5**.

The repository hosts frequent, living, reproducible research, but no document
tells an AI agent what to do when a developer offers a terse research idea
("how much better is X than what we use now?"). `packages/tech/TEMPLATE.md`
starts at "scaffold `domain/`" — it assumes the study is already specified.
The missing step 0 is a **proposal-first protocol**: the agent derives and
proposes the research design before anything is built, and the developer only
approves or adjusts.

Deliverables (documentation only — no tooling changes):

1. **`docs/research-development-guideline.md`** (new, hand-written) defining:
   - **Vocabulary**, each term defined once: *snapshot*, *trial*, *uniform
     trial report*, *cadence*, *tendency window* — consistent with terms
     already in `site.ts` metadata.
   - **Proposal-first protocol.** Given a terse idea, the agent proposes:
     (a) recurrence cadence, (b) comparison subjects, (c) metrics/indicators,
     (d) affordable cost and statistically reliable trial count — expressed as
     an explainable **range with stated premises**, never a hard-coded N,
     surfacing the reliability-vs-cost tradeoff (precedent: the ~$46 3-trial
     sweep and `--estimate`-first pattern), and (e) what historical data the
     recurring runs will accumulate and display. The developer approves before
     any run; the first trial is framed as a small disposable PoC validation
     before committing to a cadence. The protocol is human-in-the-loop — not
     an unattended auto-scheduler.
   - **Snapshot/history article structure.** The sidebar page per topic is a
     compact **snapshot**: the latest view, describing tendencies over the
     last 3–5 months, with no exhaustive trial numbers, linking to dated
     **uniform trial reports** under
     `docs/research-reports/history/<topic>/<timestamp>/` (the existing
     `research:archive` dated frames). Trial reports keep the enforced
     7-section standard outline (`article-outline.ts`); the snapshot is a
     distinct, additional surface and must not contradict that outline.
     History accumulates and is never overwritten (precedent: the
     availability topic's accumulating committed JSON DB + 30/90-day trends).
     Snapshot ordering/labels derive from `site.ts` shared metadata, never
     hand-written parallel lists.
   - **Snapshot compactness budget: ≤ 1,500 tokens** (≈ double the existing
     `INSIGHTS_OUTPUT_TOKENS = 700` per-call budget), stated as a verifiable
     ceiling with a concrete check method, justified by LLM-context economics
     (snapshots are loaded as agent context).
   - **Worked example**: the full protocol applied end-to-end to one existing
     topic (llm-speed), from terse idea to proposed design to the
     snapshot/history layout it yields.
2. **`docs/adr/0005-*.md`** (new) recording the structural decision
   (snapshot + dated uniform trial history + compactness budget), mirroring
   how ADR 0004 records topic anatomy while TEMPLATE.md carries the recipe.
3. **Pointer references**: a bullet in `CLAUDE.md` (near Conventions) and a
   step-0 note at the top of `packages/tech/TEMPLATE.md` pointing to the
   guideline. No duplication of content into either file.

## Policies

- **planning/proactive-poc** — the first trial is a proposed small validation,
  not an implicit long-term commitment.
- **planning/cost-estimation** — trial count and cost as an explainable range
  with premises; record the agreed cadence/budget for traceability.
- **planning/modeling-centric-design** — the terse idea is abstracted into a
  shared model (subjects, metric definitions, trial design) both developer and
  agent inspect before runs.
- **planning/accessibility-first (AI as information consumer)** — the
  compactness budget in verifiable units with stable heading-level anchors
  from snapshot to dated reports.
- **planning/ai-native-future** — human-in-the-loop: AI proposes, developer
  approves; observable and interruptible.
- **planning/terminology** — load-bearing terms defined once, used
  consistently across doc, metadata, and article headings.
- **design/history-structures** — the snapshot/history split is a history
  structure: accumulate, never overwrite.
- **implementation/objective-documentation** — factual, verifiable language;
  budgets and guidance in concrete checkable units (CLAUDE.md "Objective
  docs" rule is binding).
- **implementation/directory-structure** — placement decided explicitly:
  docs/ root for the hand-written guideline (alongside `glossary.md`,
  `dependency-decisions.md`), ADR for the decision record.

## Key Files

- `docs/research-development-guideline.md` — **new**; the guideline.
- `docs/adr/0005-research-snapshot-and-history-structure.md` — **new**; the
  decision record (final slug at implementer's discretion).
- `CLAUDE.md` — add pointer bullet; do not duplicate content.
- `packages/tech/TEMPLATE.md` — add step-0 pointer preceding scaffolding.
- `packages/tech/src/research/domain/site.ts` — read-only reference:
  `publishedResearchTopics`, `historyPathFor()`, `ResearchHistoryFrame`,
  `historyStamp()`, index renderers — the machinery the guideline describes.
- `packages/tech/src/research/domain/insights.ts` — read-only reference:
  `INSIGHTS_OUTPUT_TOKENS = 700`, `InsightsProvenance.trials` — existing
  budget/trial-count hooks the guideline builds its numbers on.
- `packages/tech/src/research/domain/article-outline.ts` — read-only
  reference: the enforced 7-section outline trial reports must keep.
- `packages/tech/src/entrypoints/archive-research-report.ts` — read-only
  reference: the `research:archive` dated-frame writer.
- `docs/research-reports/availability-history/` — read-only precedent:
  accumulating committed history + N-day trends.
- `docs/adr/0004-research-topic-anatomy.md` — the ADR/TEMPLATE split model to
  mirror and cross-reference.
- `docs/.vitepress/config.ts` — read-only reference: sidebar is generated
  from `site.ts`, so the guideline must not prescribe hand-authored sidebar
  entries.

## Related History

- `archive/work-20260622-191220/20260710002018-standardize-public-research-article-outline.md`
  (`f75e7ae`/`cea205c`) — the enforced 7-section EN/JP outline the guideline
  must not contradict.
- `archive/work-20260622-191220/20260709190517-report-history-translation-and-qmu-publish-pipeline.md`
  (`82162bb`, `0a7c5f8`, `c7072d1`) — the dated report-history frames and
  auto-generated EN/JA history indexes the snapshot links into.
- `archive/work-20260622-191220/20260708182153-research-history-trend-chart.md`
  — inline dependency-free SVG time-series charts over `HistoryPoint`; the
  guideline references this for tendency visualization instead of inventing
  a new mechanism.
- `archive/work-20260622-191220/20260709223740-separate-published-research-topics-from-internal-sources.md`
  (`7802cfb`/`4e01988`) — `publishedResearchTopics` as the single
  authoritative metadata; the snapshot=sidebar model must respect the
  published-vs-internal boundary.
- `archive/20260708143652` (multi-trial confidence work) and the open ship
  ticket's ~$46 3-trial sweep note — concrete precedent for the
  cost/trial-count reliability guidance.

## Implementation Steps

1. Write `docs/research-development-guideline.md` with the sections listed in
   the Overview (vocabulary, proposal-first protocol, snapshot/history
   structure, ≤1,500-token compactness budget with check method, worked
   example on llm-speed). Every claim about repo machinery must name the real
   file or command (e.g. `npm run research:archive -- <topic> --generated-at
   <iso>`, `historyPathFor()`, `INSIGHTS_OUTPUT_TOKENS`).
2. Write `docs/adr/0005-*.md` recording the structural decision: snapshot
   (compact latest tendencies) + dated uniform trial history + compactness
   budget; status Accepted; cross-reference ADR 0004 and the guideline.
3. Add the pointer bullet to `CLAUDE.md` Conventions and the step-0 pointer to
   `packages/tech/TEMPLATE.md`.
4. Wire the new pages into the VitePress site the same way `glossary.md` /
   `dependency-decisions.md` are wired (check `docs/.vitepress/config.ts` —
   hand-written docs may need a nav/sidebar entry; ADRs follow the existing
   ADR listing convention).
5. Verify: `make lint`, `env -C packages/tech npm test`, `make build` (or the
   docs build target) — no dead links. Never `cd`; use `env -C` / `git -C`.

## Quality Gate

All of the following must pass before /drive approval — each is objectively
checkable:

- [ ] The guideline contains a **complete worked example** applying the
      proposal-first protocol to the llm-speed topic: terse idea → proposed
      cadence, subjects, metrics, cost range + trial count with premises,
      accumulated history → resulting snapshot/history layout.
- [ ] Every repo-machinery claim in the guideline names an **actual file or
      command** — reviewer verifies each referenced path/script exists
      (`git ls-files` / `npm run` listing); zero dangling references.
- [ ] The **≤1,500-token snapshot ceiling** is stated with a concrete,
      reproducible check method a reviewer can run.
- [ ] The guideline **does not contradict** the enforced 7-section article
      outline: it explicitly states dated trial reports keep the
      `article-outline.ts` outline and the snapshot is a distinct surface.
- [ ] ADR 0005 exists, records the decision, and cross-references ADR 0004
      and the guideline; CLAUDE.md and TEMPLATE.md carry pointer references
      (no duplicated content).
- [ ] `make lint`, `env -C packages/tech npm test`, and the VitePress docs
      build all pass with no dead links.
- [ ] Language is objective/verifiable throughout (CLAUDE.md rule): no
      evaluative adjectives, all budgets/counts in concrete units.

## Considerations

- **Scope fence**: this ticket is documentation only. Adding per-topic
  cadence/subjects/metrics/trials/cost fields to `ResearchSiteTopic`, a
  snapshot renderer, or migrating a topic are mission acceptance items 2–4
  and explicitly out of scope here. The guideline may *name* those fields as
  the intended future home, but must not add them.
- Cost/trial-count guidance is a **range with premises**, never a fixed N —
  statistical reliability vs affordability is a tradeoff the developer agrees
  to per topic.
- History **accumulates**; the guideline must never prescribe overwriting a
  past trial frame.
- No edits to `../qmu-co-jp`; the publish boundary (ADR 0003) is unchanged.
- The token ceiling is a documentation commitment here; machine-enforcing it
  (a validator test against `site.ts`) belongs with acceptance item 2's
  tooling work.
