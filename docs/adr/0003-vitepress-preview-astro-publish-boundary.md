# 0003 — Research source of truth and corporate publish boundary

## Context

Research result pages need a local preview before they appear on the corporate
site qmu.co.jp. The request asked for a VitePress-style preview site. The
corporate site is a separate repository (`../qmu-co-jp`) built with Astro, which
renders Markdown from its repo-root `docs/<section>/<slug>.md` with minimal
frontmatter (`description`, optional `title`).

The first publishing boundary treated this repository as a VitePress preview
source and copied finished generated pages into `../qmu-co-jp/docs/research/`.
The LLM foundation IA now makes this repository the source of truth for the
canonical Japanese articles under `docs/llm-foundation/`, so the direction and
ownership of the publishing boundary are reversed.

## Decision

- The research repository owns the canonical Japanese LLM foundation articles in
  `docs/llm-foundation/*.md`. These files are hand-polished article sources, not
  exporter output.
- `scripts/export-corporate-research.mjs` is an artifact-to-draft generator. It
  reads measurement artifacts under `docs/research-reports/` and writes
  regenerable data skeletons with tables, numbers, intervals, and provenance to
  `docs/llm-foundation/_generated/*.md`.
- Generated drafts are not committed. `docs/llm-foundation/_generated/` is
  ignored because its contents are reproducible from the artifacts and current
  commit.
- Publishing is a separate one-directional plain-Markdown copy:
  `scripts/publish-research.sh copy --all` copies canonical
  `docs/llm-foundation/*.md` files, not `_generated` drafts, to
  `../qmu-co-jp/docs/llm-foundation-research/<slug>.md`.
- The corporate site remains the rendering target. It does not own the article
  prose or the artifact-to-draft generation step.

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
