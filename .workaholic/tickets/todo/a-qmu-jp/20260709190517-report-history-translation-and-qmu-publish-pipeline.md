---
created_at: 2026-07-09T19:05:17+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, UX, Config, Infrastructure]
effort:
commit_hash:
category:
depends_on:
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# Report history, direct Japanese translation, and qmu-co-jp publish pipeline

## Overview

Codify the next design for this repository's research publishing flow:

1. Each English report is independently runnable from an npm script or the
   unified `research <topic>` CLI.
2. Report outputs are saved incrementally. The JSON artifact from each run is
   committed, and the generated Markdown report is also stored by generation
   date so past report frames remain in the repository instead of being
   overwritten.
3. Japanese articles are direct translations of the English reports and are
   added to the lower Japanese sidebar in the same order as the English reports.
   Japanese report history is also retained.
4. Shipping this repository creates a follow-up ticket in `qmu-co-jp`; that
   repository's Claude Code agent runs `/drive` against the ticket and reflects
   the Japanese reports while preserving the sidebar/menu order.
5. Adding or removing report Markdown updates the indexes and table-of-contents
   metadata automatically, not just the copied files.

This supersedes the current partial split where English source reports,
Japanese `*.insights.ja.md` summaries, structured Japanese reports under
`docs/llm-foundation/`, VitePress sidebar entries, and qmu publish lists are
maintained by separate hand-edited lists.

## Policies

- `workaholic:planning` / `policies/modeling-centric-design.md` - the workflow
  should model report runs, artifacts, translations, indexes, and publish
  tickets as first-class state transitions rather than scattered file copies.
- `workaholic:implementation` / `policies/directory-structure.md` - historical
  English and Japanese report frames need predictable paths under `docs/`.
- `workaholic:implementation` / `policies/coding-standards.md` - TypeScript
  registry/config code should keep topic metadata typed and declarative.
- `workaholic:implementation` / `policies/command-scripts.md` - each topic run,
  report archiving, translation, and index update must be reachable through
  npm/Make scripts instead of chat-only procedure.
- `workaholic:implementation` / `policies/test.md` - add regression coverage for
  archive path generation, translation/index metadata, and publish ticket
  payloads where these are pure functions.
- `workaholic:implementation` / `policies/objective-documentation.md` - report
  history and provenance must state actual artifact paths, generated dates,
  source commits, and translation model metadata.
- `workaholic:design` / `policies/self-explanatory-ui.md` - English and
  Japanese sidebars must expose the same topic order in labels readers can
  understand without consulting implementation docs.
- `workaholic:operation` / `policies/ci-cd.md` - `make build` remains the local
  gate for site links and generated indexes; publish flow needs dry-run
  evidence before touching the sibling repository.

## Key Files

- `packages/tech/src/research/domain/topic.ts` - topic registry and pipeline
  stages; likely source for sidebar/index/publish metadata.
- `packages/tech/src/entrypoints/run-research.ts` - unified `research <topic>`
  runner.
- `packages/tech/package.json` - existing per-topic npm scripts; may need aliases
  for every registered topic and archive/translate/index commands.
- `packages/tech/src/research/translate-runner.ts` and
  `packages/tech/src/research/domain/translate.ts` - current insights-only
  translation stage; extend or add a full-report translation stage.
- `docs/research-reports/` - current English reports, JSON artifacts, history
  files, and Japanese insights translations.
- `docs/llm-foundation/` - current Japanese reading-line pages.
- `docs/.vitepress/config.ts` and `docs/{index.md,llm-foundation/index.md,research-reports/index.md}`
  - sidebar and index generation targets.
- `scripts/publish-research.sh` and `CLAUDE.md` `## Deploy` - current qmu publish
  boundary and ticket creation expectations.

## Related History

The current branch already introduced the unified topic registry and per-topic
insights/translation pipeline, but it still overwrites current report pages and
keeps several publication lists hand-maintained.

- [20260709022000-unified-per-topic-research-cli.md](.workaholic/tickets/archive/work-20260622-191220/20260709022000-unified-per-topic-research-cli.md) - introduced `research <topic>`.
- [20260709022001-llm-insights-report-generator.md](.workaholic/tickets/archive/work-20260622-191220/20260709022001-llm-insights-report-generator.md) - generated English insights from artifacts.
- [20260709022002-japanese-auto-translation-stage.md](.workaholic/tickets/archive/work-20260622-191220/20260709022002-japanese-auto-translation-stage.md) - translated insights to Japanese, not full reports.
- [20260709022006-per-topic-site-and-publishing-rework.md](.workaholic/tickets/archive/work-20260622-191220/20260709022006-per-topic-site-and-publishing-rework.md) - reworked the site around per-topic outputs but left parts owner-gated and hand-maintained.
- [20260709185801-derive-japanese-sidebar-from-research-topics.md](.workaholic/tickets/todo/a-qmu-jp/20260709185801-derive-japanese-sidebar-from-research-topics.md) - narrow sidebar label/order repair that this broader design should build on.

## Implementation Steps

1. Define the run output model: current report path, current data JSON path,
   dated English Markdown archive path, dated JSON archive path, dated Japanese
   Markdown archive path, source commit, generated timestamp, topic id, and
   publish order.
2. Extend the topic registry or add a site metadata module so each topic has one
   source of truth for English report path, Japanese translation path, sidebar
   label, qmu destination slug, and npm script alias.
3. Add archive logic that, after a topic run, writes both the current report and
   a dated historical Markdown frame, and preserves the exact JSON artifact used
   for that report. Keep existing committed current pages for stable URLs.
4. Add or extend translation logic so the Japanese page is a direct translation
   of the full English report, not only the insights prose. Preserve code fences,
   tables, numeric values, proper nouns, provenance, and generated timestamps.
5. Generate VitePress nav/sidebar and both index pages from the same topic
   metadata. Adding/removing a topic changes the metadata once and regenerates
   English, Japanese, and qmu publish order consistently.
6. Update `scripts/publish-research.sh` so its `--all` set comes from generated
   metadata or a checked generated list rather than a hand-coded string.
7. Update the `/ship` handoff flow so shipping this repo writes a qmu-co-jp
   ticket with the ordered list of Japanese report files, destination slugs, and
   index updates to apply. Keep the qmu repo responsible for its own `/drive`,
   build, commit, and deploy.
8. Add tests for pure path/metadata generation and index rendering. Include a
   fixture topic add/remove case that proves Markdown copy plus index update stay
   in sync.
9. Update `CLAUDE.md`, `docs/adr/0003-*`, and relevant README text so operators
   can reproduce the run, archive, translate, publish-ticket, and qmu reflection
   flow from repository commands.

## Quality Gate

**Acceptance criteria** - the checkable conditions that must hold:

- Every registered report topic has an independently runnable npm script or a
  documented `npm run research -- <topic>` command.
- A topic run can write current English Markdown/current JSON and dated
  historical English Markdown/JSON frames without overwriting old frames.
- The Japanese output is a direct translation of the English report and has the
  same topic order in the Japanese sidebar/index as the English source.
- Japanese historical frames are retained by generated date.
- Adding/removing a topic through the shared metadata updates VitePress nav,
  English index, Japanese index, publish order, and qmu ticket payload.
- The qmu-co-jp handoff ticket includes enough ordered metadata for that repo's
  `/drive` to copy/delete Markdown and update indexes without manual menu
  reconstruction.

**Verification method** - the commands/tests/probes that prove them:

- Unit tests cover run-output path derivation, topic metadata completeness, index
  rendering, publish-order rendering, and qmu ticket payload generation.
- A fixture run demonstrates dated English/Japanese Markdown and JSON archives
  are created and old frames remain present.
- `rg`/test assertions prove VitePress sidebar/index and publish order are
  generated from the shared metadata rather than separate hand-coded lists.
- `make build` completes successfully.
- `scripts/publish-research.sh copy --all --dry-run` prints the generated
  ordered Japanese publication set and no stale hand-coded pages.

**Gate** - what must pass before approval:

- Tests for metadata/archive/index/publish-ticket behavior pass, fixture archive
  output preserves past frames, `make build` is green, and publish dry-run shows
  the generated qmu reflection order.

## Considerations

- Full-report translation may be expensive for large table-heavy Markdown. Keep
  estimate mode available and separate provider-billed real translation from the
  keyless fixture path.
- Translation must preserve numbers and Markdown table structure. The existing
  numeric-preservation checks for insights are a starting point but are not
  enough for full reports with large tables and code fences.
- Dated history paths should avoid making current URLs unstable. Current pages
  remain the canonical latest URL; history pages are additive.
- qmu-co-jp remains the rendering/deploy owner. This repository should produce a
  ticket and ordered artifact list, not directly commit/deploy the sibling repo
  outside the established workflow.
