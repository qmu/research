---
created_at: 2026-07-09T22:37:40+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, Config, Infrastructure]
effort: 1
commit_hash: 7802cfb
category: Changed
depends_on:
---

# Separate published research topics from internal measurement sources

## Overview

The public research site now exposes per-topic English source pages and matching
Japanese pages. The combined `llm-model-comparison` runner still exists because
the speed and accuracy pages derive their source data from that sweep, but the
combined page must not reappear as a public article, sidebar item, history
section, or qmu-co-jp handoff item.

Make the boundary explicit in code: published research topics are the only inputs
for sidebar/index/history/QMU publishing, while internal measurement sources
remain runnable and retain their JSON artifacts for downstream projections.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — keep source
  code, scripts, and generated docs in their established repository locations.
- `workaholic:implementation` / `policies/coding-standards.md` — express the
  boundary with typed immutable metadata rather than string checks in callers.
- `workaholic:implementation` / `policies/domain-layer-separation.md` — keep the
  publishing decision in the research domain metadata and leave entrypoints as
  thin renderers.
- `workaholic:implementation` / `policies/objective-documentation.md` — document
  the real invariant: combined compare is an internal source, not a public page.
- `workaholic:operation` / `policies/ci-cd.md` — verify with local test/build
  commands and output checks before archiving.

## Key Files

- `packages/tech/src/research/domain/site.ts` — public site topic metadata and
  index/history/QMU renderers.
- `packages/tech/src/research/domain/site.test.ts` — regression coverage for
  published vs internal source boundaries.
- `packages/tech/src/research/domain/topic.ts` — runnable research topic
  registry, including internal measurement sources.
- `packages/tech/src/entrypoints/render-research-site.ts` — index/history writer.
- `packages/tech/src/entrypoints/run-llm-model-comparison.ts` — combined sweep
  runner and side-file output paths.
- `docs/.vitepress/config.ts` — docs build exclusions for non-public side files.
- `scripts/export-corporate-research.mjs` — legacy combined export path, gated by
  explicit environment opt-in.

## Related History

- `d196d60 Remove redundant combined LLM pages` deleted the public combined
  pages and moved combined Markdown output to `.fixture.md` / `.real.md`.
- `3f5575e Fix accuracy research page` regenerated accuracy from the real
  projection while preserving the source JSON artifact.
- `046ac99 Fix research docs output` aligned the sidebars, provider display
  names, and speed projection.

## Implementation Steps

1. Add explicit domain metadata for `publishedResearchTopics` and
   `internalResearchSources`, keeping `llm-model-comparison` runnable but
   classified as an internal source for the speed and accuracy public topics.
2. Point sidebar/index/history/QMU publishing helpers at the published-topic
   list, not the internal source registry.
3. Keep the combined runner writing only `.fixture.md` / `.real.md` side files
   and JSON artifacts, and keep those side Markdown files excluded from
   VitePress.
4. Add regression tests proving the combined topic stays in the runnable/internal
   source registry but is absent from public navigation, indexes, history, and
   QMU payload output.
5. Regenerate research indexes if the public metadata output changes.
6. Verify with the package tests, docs build, and output searches that no public
   route or generated index reintroduces `LLM model comparison`,
   `LLMモデル比較`, `foundation-model-comparison`, or a public
   `/research-reports/llm-model-comparison` link.

## Quality Gate

- `npm test` passes in `packages/tech`.
- `make build` passes from the repository root.
- `git diff --check` passes.
- `find docs/.vitepress/dist -path '*llm-model-comparison*' -o -path '*foundation-model-comparison*'`
  prints no public built files after `make build`.
- Public docs/index output does not contain the redundant public titles or links:
  `LLM model comparison`, `LLMモデル比較`,
  `/research-reports/llm-model-comparison`, or `foundation-model-comparison`.
- The source JSON artifacts for the combined compare runner remain available for
  the speed and accuracy projections.

## Considerations

- Do not delete `docs/research-reports/llm-model-comparison*.data.json`; those
  artifacts are the source data for split topic projections.
- Do not remove the `npm run compare` / `npm run compare:fixture` runner; each
  English research article still needs an independently runnable command, and
  the split pages depend on this source run.
- The old combined Japanese corporate export remains behind
  `EXPORT_LEGACY_LLM_COMPARISON=1`. It is not part of the default site or QMU
  handoff flow.

## Final Report

### Why

The combined LLM sweep is still necessary as a measurement source for the speed
and accuracy articles, but it should not be treated as a public site topic. The
previous deletion removed public files; this refactor makes the boundary visible
in domain metadata so generation code does not recreate the combined page by
accident.

### Changes

- Added `publishedResearchTopics` and `internalResearchSources` in
  `packages/tech/src/research/domain/site.ts`.
- Pointed site index/history/QMU helpers, archive runner, and full-report
  translation lookup at the published-topic boundary.
- Kept `researchSiteTopics` as a backward-compatible alias for the published
  list only.
- Added regression coverage proving `llm-model-comparison` remains runnable but
  internal, and does not appear in public indexes, history rendering, or QMU
  ticket payloads.
- Documented that combined side Markdown is excluded from VitePress and that the
  legacy combined corporate exporter remains opt-in only.
- Formatted one pre-existing Prettier miss in `split-report.ts` so package lint
  is green.

### Verification

- `npm test` in `packages/tech`: 39 test files, 241 tests passed.
- `npm run lint` in `packages/tech`: passed.
- `make build`: packages and VitePress docs build passed.
- `git diff --check`: passed.
- `find docs/.vitepress/dist -path '*llm-model-comparison*' -o -path '*foundation-model-comparison*'`: no output.
- `rg -n "LLM model comparison|LLMモデル比較|/research-reports/llm-model-comparison|foundation-model-comparison" docs/research-reports/index.md docs/research-reports/history.md docs/llm-foundation/index.md docs/llm-foundation/history.md docs/.vitepress/dist`: no matches.
- `docs/research-reports/llm-model-comparison.data.json` and
  `docs/research-reports/llm-model-comparison.real.data.json` remain present.

### Concerns

- The existing todo tickets for ship/publish decisions remain separate owner
  actions. This refactor does not merge PR #15 or copy files into the external
  qmu-co-jp repository.
