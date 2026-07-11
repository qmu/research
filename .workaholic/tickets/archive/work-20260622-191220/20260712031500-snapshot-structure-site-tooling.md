---
created_at: 2026-07-12T03:15:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, UX, Config]
effort: 4h
commit_hash: 9ac1cde
category: Added
depends_on: [20260712030400-research-development-guideline.md]
mission: living-research-development-guideline
---

# Implement snapshot/history structure in site tooling (metadata fields + snapshot renderer + budget validator)

## Overview

Mission `living-research-development-guideline`, acceptance item **2**.

Implements in code what the Research Development Guideline
(`docs/research-development-guideline.md`, ticket
`20260712030400-research-development-guideline.md`) specifies in prose. Two
gaps in today's tooling:

1. `ResearchSiteTopic` (`packages/tech/src/research/domain/site.ts`) has no
   per-topic fields for recurrence cadence, comparison subjects,
   metrics/indicators, target trial count, or cost budget — those decisions
   live implicitly in each entrypoint's orchestration constants and prose
   caveats.
2. No renderer produces a compact **snapshot** page. Today's sidebar page is a
   single-run insights analysis (often n=1) and
   `renderSourceHistoryIndex` is a flat dated link list; nothing summarizes
   3–5 months of dated frames into a tendency narrative.

Deliverables:

1. **Per-topic research-design metadata** on `ResearchSiteTopic` (or an
   adjacent type in the same shared metadata module): cadence, comparison
   subjects, metrics/indicators, target trial count expressed as a range with
   premises, and cost budget. Field names/shape follow whatever the guideline
   fixed; the guideline names these fields as their intended home.
2. **Snapshot renderer** in `packages/tech/src/research/domain/` (pure logic;
   thin entrypoint wiring only): reads the dated frames under
   `docs/research-reports/history/<topic>/<timestamp>/` within the tendency
   window (3–5 months), and renders the compact snapshot page — tendency
   narrative, trend visualization reusing the existing `HistoryPoint`
   inline-SVG chart renderer, and stable heading-anchored links to each dated
   trial report. Snapshot pages become the sidebar pages via the existing
   `sourceResearchItems()`/`japaneseResearchItems()` metadata path — no
   hand-written lists.
3. **Compactness budget validator**: a named constant for the ≤1,500-token
   snapshot ceiling (companion to `INSIGHTS_OUTPUT_TOKENS`) and a unit test
   asserting every generated snapshot fits it, using the same check method
   the guideline documents.
4. **Downstream coherence**: `renderSourceIndex`, `renderJapaneseIndex`,
   `renderSourceHistoryIndex`, and `renderQmuTicketPayload` keep working from
   the same shared metadata; the JP translation path
   (`research:translate-report`) covers the snapshot page as configured.

## Policies

- **implementation/coding-standards + directory-structure** — pure logic in
  `domain/`, thin runners in `entrypoints/`, vendor access behind `vendors/`;
  one npm project, no workspaces (ADR 0001/0002).
- **design/history-structures** — the renderer reads accumulated frames and
  never mutates or overwrites them.
- **planning/accessibility-first** — machine-checkable token ceiling; stable
  heading-level anchors from snapshot to dated reports.
- **implementation/objective-documentation** — generated snapshot text stays
  factual; numbers carry provenance (trials, generated_at) like
  `InsightsProvenance` does today.

## Key Files

- `packages/tech/src/research/domain/site.ts` — add research-design metadata
  fields; keep `publishedResearchTopics` the single source of order/labels;
  `historyPathFor()`, `ResearchHistoryFrame`, `historyStamp()` are the frame
  API the renderer consumes.
- `packages/tech/src/research/domain/` — new snapshot renderer module +
  budget constant + validator test (colocate per existing test convention).
- `packages/tech/src/research/domain/insights.ts` — `INSIGHTS_OUTPUT_TOKENS`
  precedent for the budget constant; provenance shape to mirror.
- Existing trend-chart module over `HistoryPoint` (from ticket
  `20260708182153-research-history-trend-chart.md`) — reuse, don't reinvent.
- `packages/tech/src/entrypoints/archive-research-report.ts` — the writer of
  the frames the renderer reads; snapshot regeneration hooks in after
  archive.
- `docs/.vitepress/config.ts` — confirms sidebar is generated from `site.ts`;
  should need no structural change if the snapshot page keeps each topic's
  existing page path.
- `docs/research-development-guideline.md` + `docs/adr/0005-*` (from the
  dependency ticket) — the specification this ticket implements; do not
  contradict it.

## Related History

- `archive/work-20260622-191220/20260710002018-standardize-public-research-article-outline.md`
  — dated trial reports keep the enforced 7-section outline
  (`article-outline.ts`); the snapshot is a separate surface with its own
  shape.
- `archive/work-20260622-191220/20260709190517-report-history-translation-and-qmu-publish-pipeline.md`
  — the dated-frame + auto-index machinery being extended.
- `archive/work-20260622-191220/20260708182153-research-history-trend-chart.md`
  — the inline-SVG chart renderer to reuse.
- `archive/work-20260622-191220/20260709223740-separate-published-research-topics-from-internal-sources.md`
  — published-vs-internal boundary the snapshot surface must respect.

## Implementation Steps

1. Read the merged guideline + ADR 0005 first; extract the fixed decisions
   (field names, tendency window, budget check method) — this ticket
   implements, not re-decides.
2. Extend the shared metadata types in `site.ts` with the research-design
   fields; populate them for existing published topics with current de-facto
   values (from each entrypoint's constants and report provenance).
3. Build the snapshot renderer in `domain/` (frames in tendency window →
   narrative skeleton + trend chart + dated links), with unit tests over
   fixture frames.
4. Add the budget constant and the validator test asserting every published
   topic's generated snapshot ≤ 1,500 tokens via the guideline's check
   method.
5. Wire regeneration into the existing runner path (`research:site` /
   archive flow) through `make`-reachable npm scripts — no parallel
   invocation paths.
6. Regenerate indexes (`npm run research:site -- write-indexes`) and verify
   downstream renderers (history index, qmu payload) are coherent.
7. Verify: `make lint`, `env -C packages/tech npm test`, docs build with no
   dead links; keyless fixtures byte-stable. Never `cd`; use `env -C` /
   `git -C`.

## Quality Gate

- [ ] Unit tests cover the new metadata fields and the snapshot renderer
      (fixture frames → expected snapshot output).
- [ ] A validator test machine-checks **every** generated snapshot against
      the ≤1,500-token ceiling using the guideline's documented check method;
      the ceiling is a named constant, not an inline literal.
- [ ] Keyless fixtures remain byte-stable across two consecutive runs.
- [ ] Sidebar/indexes/qmu payload all derive from the same shared metadata —
      `git grep` shows no new hand-written topic list.
- [ ] `make lint`, `env -C packages/tech npm test`, and the VitePress docs
      build pass with no dead links.

## Considerations

- **Depends on** `20260712030400-research-development-guideline.md` — if the
  merged guideline fixed different field names, window, or check method than
  this ticket sketches, the guideline wins.
- Topic **migration** (regenerating llm-speed's real pages under the new
  structure) is ticket `20260712031600` — this ticket proves the machinery on
  fixtures only.
- Token counting: use the same reproducible method the guideline documents
  (avoid a heavyweight tokenizer dependency if a stated heuristic suffices —
  keep the dependency-decisions doc in mind).
- Generated pages under `docs/research-reports/` are never hand-edited; the
  snapshot page must be fully renderer-produced.
