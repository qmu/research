# 0003 — Research source of truth and corporate publish boundary

## Context

Research result pages need a local preview before they appear on the corporate
site qmu.co.jp. The request asked for a VitePress-style preview site. The
corporate site is a separate repository (`../qmu-co-jp`) built with Astro, which
renders Markdown from its repo-root `docs/<section>/<slug>.md` with minimal
frontmatter (`description`, optional `title`).

The first publishing boundary treated this repository as a VitePress preview
source and copied finished generated pages into `../qmu-co-jp/docs/research/`.
A second iteration made this repository the source of truth for hand-written
canonical Japanese articles under `docs/llm-foundation/`. The per-topic research
pipeline supersedes that: each topic now has an independently runnable English
report, a Japanese counterpart in the same order, and shared site metadata that
drives the VitePress sidebar, indexes, qmu copy order, and qmu handoff payload.

## Decision

- The topic order, source report paths, Japanese report paths, npm run commands,
  qmu destination slugs, and index summaries live in
  `packages/tech/src/research/domain/site.ts`. VitePress config, generated
  indexes, `publish-research.sh`, and the qmu ticket payload all read that same
  metadata.
- The English pages under `docs/research-reports/` remain the reproducible source
  reports. Each topic also has a Japanese page in the same order. The current
  `*.insights.ja.md` pages are Japanese generated/translated reading pages; the
  full-report translation command (`npm run research:translate-report -- <topic>`)
  is the path for replacing them with direct translations of the full English
  report.
- Report frames are additive. `npm run research:archive -- <topic>
  --generated-at <iso>` copies the current English report, current data artifact
  when present, and current Japanese page into
  `docs/research-reports/history/<topic>/<timestamp>/`, keeping old Markdown and
  JSON frames committed instead of overwritten.
- Publishing is a separate one-directional plain-Markdown copy:
  `scripts/publish-research.sh copy --all` gets its ordered source/destination
  plan from `npm run research:site -- copy-plan` and writes to
  `../qmu-co-jp/docs/llm-foundation-research/<name>.md`.
- The corporate site remains the rendering target. It does not own the report
  content or the artifact-to-report generation step.

## Alternatives considered

- **Author directly in qmu-co-jp / share its Astro setup**: couples the research
  workflow to the corporate site's build and IA. Rejected — a thin copy boundary
  keeps the two repositories independent (vendor-neutrality).
- **Let separate hand-written lists drive each surface**: rejected because the
  English sidebar, Japanese sidebar, qmu copy order, and qmu index instructions
  drift when they are maintained independently.
- **Keep only the latest report**: rejected because report changes need to remain
  auditable. Current pages keep stable URLs, while dated history frames preserve
  past Markdown and JSON.

## Consequences

- The generate stage does not require a `qmu-co-jp` checkout and must not write
  outside this repository.
- The copy stage is the only publishing step that touches `../qmu-co-jp`.
- Corporate edits to copied article Markdown are not source-of-truth changes;
  article updates start in this repository and are copied outward.
- Adding/removing a topic requires a metadata change plus regenerated indexes,
  not parallel edits to VitePress, publish scripts, and qmu instructions.
