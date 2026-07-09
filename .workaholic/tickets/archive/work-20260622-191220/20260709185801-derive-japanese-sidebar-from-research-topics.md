---
created_at: 2026-07-09T18:58:01+09:00
author: a@qmu.jp
type: bugfix
layer: [UX, Config]
effort: 0.5h
commit_hash: 1559a48
category: Changed
depends_on:
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# LLM research sidebar labels and Japanese topic parity

## Overview

The current VitePress sidebar exposes the English source section as
`Research data (source)` and the Japanese reading section as
`LLM基礎検証（日本語）`. Rename them to `LLMs Research` and
`LLMs Research (Japanese)`, and remove the drift that lets the English and
Japanese topic lists be maintained as two unrelated structures.

The observed cause is that `docs/.vitepress/config.ts` hand-codes the source
sidebar and the Japanese sidebar separately. The English side lists every source
topic under `docs/research-reports/`, while the Japanese side is a separate
hand-written list under `docs/llm-foundation/`. Because no shared topic
definition drives both groups, adding or reworking an English source topic does
not force the Japanese navigation to update in the same shape.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` - the site
  configuration remains in the existing VitePress config location under `docs/`.
- `workaholic:implementation` / `policies/coding-standards.md` - the TypeScript
  config should express shared topic data declaratively, without broad
  assertions or duplicated mutable structures.
- `workaholic:implementation` / `policies/objective-documentation.md` - the
  source/Japanese relationship must be described as current behavior, not as an
  intention.
- `workaholic:design` / `policies/self-explanatory-ui.md` - sidebar labels must
  make the two reading surfaces understandable without relying on Japanese-only
  wording.
- `workaholic:operation` / `policies/ci-cd.md` - `make build` is the local gate
  for broken VitePress links and generated site health.

## Key Files

- `docs/.vitepress/config.ts` - VitePress nav/sidebar labels and topic entries.
- `docs/llm-foundation/index.md` - Japanese reading-line index page and page
  title.
- `docs/research-reports/index.md` - English source index page and page title.
- `docs/index.md` - home page links to both sections.
- `packages/tech/src/research/domain/topic.ts` - shared research topic registry;
  useful context for why manually duplicated site lists drift.

## Related History

Recent tickets moved the site from older IA and placeholder pages toward
per-topic research outputs, but left VitePress navigation as hand-maintained
lists.

- [20260708182154-reorganize-llm-foundation-research-ia.md](.workaholic/tickets/archive/work-20260622-191220/20260708182154-reorganize-llm-foundation-research-ia.md) - defined the Japanese LLM research IA and the source/Japanese separation.
- [20260709022006-per-topic-site-and-publishing-rework.md](.workaholic/tickets/archive/work-20260622-191220/20260709022006-per-topic-site-and-publishing-rework.md) - moved the site toward per-topic reports, but the sidebar remained manually duplicated.
- [20260709190517-report-history-translation-and-qmu-publish-pipeline.md](.workaholic/tickets/todo/a-qmu-jp/20260709190517-report-history-translation-and-qmu-publish-pipeline.md) - records the broader next design: dated English/Japanese report history, full-report translation, generated indexes, and qmu-co-jp handoff.

## Implementation Steps

1. Rename the VitePress nav/sidebar top-level English source label from
   `Research data (source)` to `LLMs Research`.
2. Rename the Japanese sidebar/nav section label from `LLM基礎検証（日本語）` to
   `LLMs Research (Japanese)`.
3. In `docs/.vitepress/config.ts`, define the research topic entries once as a
   data structure containing the English source entry and, where available, the
   corresponding Japanese reading entry.
4. Build the English source sidebar from that shared topic structure.
5. Build the Japanese sidebar from the same topic structure, requiring every
   English source entry to have a Japanese counterpart. This keeps ordering and
   topic coverage identical and makes missing Japanese pages a config/build
   error rather than a silent omission.
6. Add the missing Japanese page for the exact-match benchmark so the Japanese
   section can mirror the English source table of contents exactly.
7. Update index-page titles and cross-links so visible section names match the
   new labels.
8. Run `make build` and fix any VitePress link or TypeScript config errors.

## Quality Gate

**Acceptance criteria** - the checkable conditions that must hold:

- The VitePress nav/sidebar show `LLMs Research` and `LLMs Research (Japanese)`.
- The Japanese sidebar is generated from the same topic data as the English
  source sidebar, not from an independent topic list.
- Every English source topic has a Japanese counterpart under
  `LLMs Research (Japanese)` in the same order.
- The index-page titles and cross-links no longer use `Research data (source)` or
  `LLM基礎検証（日本語）` as the visible section names.

**Verification method** - the commands/probes that prove them:

- `rg "Research data \\(source\\)|LLM基礎検証（日本語）" docs/.vitepress docs/index.md docs/llm-foundation/index.md docs/research-reports/index.md` returns no stale visible labels.
- `make build` completes successfully.

**Gate** - what must pass before approval:

- The stale-label `rg` check is empty and `make build` is green.

## Considerations

- The older `docs/llm-foundation/foundation-model-comparison.md` remains as a
  structured combined Japanese report, but the `LLMs Research (Japanese)` table
  of contents mirrors the English source topics through the per-topic Japanese
  generated/translated pages.
- Full report translation, dated report history, generated index metadata, and
  qmu-co-jp ticket handoff are intentionally handled by the follow-up ticket
  `20260709190517-report-history-translation-and-qmu-publish-pipeline.md`.

## Final Report

Development completed as planned.

### Discovered Insights

- **Insight**: The old sidebar drift came from `docs/.vitepress/config.ts`
  maintaining English source entries and Japanese reading entries as independent
  hand-written lists.
  **Context**: The immediate fix centralizes the topic order in one config data
  structure; the broader direct-translation/history pipeline is tracked in
  `20260709190517-report-history-translation-and-qmu-publish-pipeline.md`.
