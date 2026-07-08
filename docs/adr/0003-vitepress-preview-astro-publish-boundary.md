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
pipeline supersedes that: each topic now produces a **generated** English
insights report and its Japanese translation from the decisive measurement
artifact, so the published reader-facing line is per-topic generated products,
not hand-written articles.

## Decision

- Each research topic's reader-facing pages are **generated** from its data
  artifact: `docs/research-reports/<topic>.insights.md` (English insights) and
  `docs/research-reports/<topic>.insights.ja.md` (its Japanese translation).
  These are produced by the `research <topic> --real` pipeline
  (`insights` + `translation` stages), are non-deterministic and owner-gated,
  and carry provenance frontmatter (`source_artifact`, `source_commit`,
  `insights_model`, `translation_model`, `generated_at`, `trials`).
- The keyless-fixture data reports, `*.data.json` artifacts, and `*.history.json`
  under `docs/research-reports/` are the **reproducible source** — the CI
  self-test and the record each generated report is derived from. They are not
  the published reader-facing line.
- The one exception is `docs/llm-foundation/agent-sdk-comparison.md`, a
  hand-written design-comparison article with no benchmark; it is published
  as-is and keeps its `設計比較` / `未測定` / `要確認` provenance labels.
- `scripts/export-corporate-research.mjs` remains an artifact-to-draft generator
  writing regenerable data skeletons to `docs/llm-foundation/_generated/*.md`
  (gitignored). It predates the pipeline's insights/translation stages and is now
  a data-skeleton helper, not the reader-facing generator.
- Publishing is a separate one-directional plain-Markdown copy:
  `scripts/publish-research.sh copy --all` copies the generated per-topic reports
  (English + Japanese) plus the agent-sdk article to
  `../qmu-co-jp/docs/llm-foundation-research/<name>.md`. It never copies the
  fixture data reports or the detailed hand-written articles.
- The corporate site remains the rendering target. It does not own the report
  prose or the artifact-to-report generation step.

## Alternatives considered

- **Author directly in qmu-co-jp / share its Astro setup**: couples the research
  workflow to the corporate site's build and IA. Rejected — a thin copy boundary
  keeps the two repositories independent (vendor-neutrality).
- **Let the exporter overwrite canonical articles**: rejected because generated
  tables and provenance are useful draft material, but they do not own the
  polished explanatory prose.
- **Commit generated drafts**: rejected because the drafts are regenerable from
  artifacts and source commit. Committing them would create a second source for
  the same measured numbers.

## Consequences

- The generate stage does not require a `qmu-co-jp` checkout and must not write
  outside this repository.
- The copy stage is the only publishing step that touches `../qmu-co-jp`.
- Corporate edits to copied article Markdown are not source-of-truth changes;
  article updates start in this repository and are copied outward.
- `copied_to_corporate_at` in generated draft frontmatter remains `null` because
  generated drafts are not copied to the corporate site. The copy stage copies
  canonical articles instead.
