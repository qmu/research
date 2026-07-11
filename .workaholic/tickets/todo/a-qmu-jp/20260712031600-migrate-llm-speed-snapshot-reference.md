---
created_at: 2026-07-12T03:16:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 4h
commit_hash:
category: Changed
depends_on: [20260712030400-research-development-guideline.md, 20260712031500-snapshot-structure-site-tooling.md]
mission: living-research-development-guideline
---

# Migrate llm-speed to snapshot+history as the reference implementation and verify the recurring-run loop end-to-end

## Overview

Mission `living-research-development-guideline`, acceptance items **3** and
**4**.

With the guideline written (ticket `20260712030400`) and the snapshot tooling
built on fixtures (ticket `20260712031500`), this ticket proves the living
research loop on a real topic. **llm-speed** is the reference topic (chosen
by the developer): it matches the guideline's worked example, has committed
history frames, and has clear numeric metrics for tendency charts.

Deliverables:

1. **Migration (item 3)**: llm-speed's sidebar page becomes a
   renderer-produced snapshot — compact (within the ≤1,500-token validator),
   describing tendencies over the dated frames in the tendency window, with
   the trend chart and links to each dated trial report under
   `docs/research-reports/history/<llm-speed topic>/<timestamp>/`. Its
   research-design metadata (cadence, subjects, metrics, trial-count range,
   cost budget) is populated in `site.ts` per the guideline's worked example.
   The Japanese page follows via the configured translation path.
2. **End-to-end recurring run (item 4)**, exercising the loop a future
   cadence tick will repeat:
   1. `--estimate` first; record the estimated cost and confirm it is within
      the topic's cost budget from the metadata.
   2. Run the topic for real (`npm run research -- <llm-speed topic> --real`
      or its topic npm script, from `packages/tech`).
   3. `npm run research:archive -- <topic> --generated-at <iso>` writes the
      new dated frame (English md, data artifact, Japanese md).
   4. Snapshot regenerates and its tendency narrative/chart reflect the new
      frame alongside prior ones.
   5. `npm run research:site -- write-indexes` refreshes EN/JA indexes.
   All committed, history accumulated — nothing overwritten.

## Policies

- **planning/proactive-poc + cost-estimation** — estimate before the paid
  run; the recorded estimate vs. actual is itself the first data point for
  the guideline's cost-range guidance.
- **design/history-structures** — the new frame is appended; prior frames and
  the availability-style accumulation precedent stay untouched.
- **implementation/objective-documentation** — the regenerated snapshot and
  trial report carry provenance (trials, generated_at, cost) in factual
  language.
- **operation** — the loop must run through the existing `make`/npm runner
  path only, so a future recurring invocation needs no new mechanism.

## Key Files

- `packages/tech/src/research/domain/site.ts` — llm-speed's research-design
  metadata values.
- The llm-speed topic under `packages/tech/src/` — runner, artifact, report
  rendering (see `docs/research-reports/llm-speed-comparison.insights.md` for
  the current single-run page being replaced by the snapshot).
- `packages/tech/src/entrypoints/archive-research-report.ts` — the archive
  step of the loop.
- `docs/research-reports/history/<llm-speed topic>/` — accumulating dated
  frames; the new frame lands here.
- `docs/research-development-guideline.md` — the worked example this
  migration must match.

## Related History

- Open ticket `20260706102837-ship-and-follow-up-llm-comparison-redesign.md`
  — the ~$46 3-trial sweep + `--estimate`-first precedent for paid runs.
- `archive/work-20260622-191220/20260709190517-report-history-translation-and-qmu-publish-pipeline.md`
  — the archive/translate/index loop being exercised end-to-end.
- Memory precedent: real-run stderr must be watched (the rag `--real` AutoRAG
  teardown incident) — capture and check stderr on the paid run even though
  llm-speed uses different vendors.

## Implementation Steps

1. Populate llm-speed's research-design metadata in `site.ts` from the
   guideline's worked example.
2. Regenerate llm-speed's snapshot from its existing committed frames;
   verify the budget validator passes and the sidebar/JA pages render in the
   VitePress preview.
3. Run the end-to-end loop (Overview §2): estimate → confirm within budget →
   real run (watch stderr) → archive dated frame → snapshot + indexes
   regenerate. Run all npm scripts from `packages/tech` via `env -C`; never
   `cd`.
4. Inspect the regenerated snapshot: the tendency section must reflect the
   new frame together with prior ones (≥2 dated frames represented).
5. Commit the new frame, regenerated snapshot/indexes, and metadata; verify
   `make lint`, `env -C packages/tech npm test`, docs build with no dead
   links.

## Quality Gate

- [ ] `--estimate` output recorded in the ticket's final report **before**
      the real run, and actual cost recorded after; actual within the
      topic's metadata cost budget.
- [ ] The real run completes with stderr captured and clean (no leaked or
      dangling vendor resources).
- [ ] A new dated frame exists under
      `docs/research-reports/history/<llm-speed topic>/<timestamp>/` and
      **all prior frames are byte-identical** (accumulate, never overwrite —
      checkable via `git status`/`git diff` on the history tree).
- [ ] The regenerated snapshot passes the ≤1,500-token validator and its
      tendency narrative/chart include the new frame alongside at least one
      prior frame, with working links to each dated trial report.
- [ ] EN/JA indexes regenerated via `research:site -- write-indexes`; no
      hand-edited generated files.
- [ ] `make lint`, `env -C packages/tech npm test`, and the VitePress docs
      build pass with no dead links.

## Considerations

- **Depends on** both `20260712030400` (guideline) and `20260712031500`
  (tooling); do not start before both are merged to the working branch.
- This is a **paid run** — the developer approved the real-run gate, but the
  `--estimate` step is still mandatory and an unexpectedly high estimate is a
  stop-and-ask condition, not a proceed.
- Publishing the migrated pages to `../qmu-co-jp` is out of scope; that flows
  through `/ship`'s publish-ticket boundary (ADR 0003) as usual.
- Migrating the **other** published topics is intentionally left for a
  follow-up after this reference implementation is reviewed — one topic
  first, then fan out.
