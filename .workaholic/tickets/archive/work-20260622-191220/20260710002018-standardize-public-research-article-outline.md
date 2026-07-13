---
created_at: 2026-07-10T00:20:18+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain, Config]
effort: 4h
commit_hash: f75e7ae
category: Changed
depends_on:
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# Standardize public research article outline

## Overview

All public English and Japanese research articles must use one shared article
structure so readers can compare topics without relearning each page. Use the
corporate foundation-model page as the content style reference, but normalize the
public research site to this exact section shape:

English:

- `## 1. Research Purpose`
- `## 2. Measurement Targets`
- `### Target Models`
- `### Target Metrics`
- `## 3. Scope and Constraints`
- `## 4. Verification Results`
- `## 5. Analysis`
- `## 6. Reproduction`
- `### Reproduction Steps`
- `### Reproduction Cost (Estimate)`
- `### Cleanup`
- `## 7. Verification Data`

Japanese:

- `## 1. 調査の目的`
- `## 2. 測定対象`
- `### 対象モデル`
- `### 対象メトリクス`
- `## 3. 範囲と制約`
- `## 4. 検証結果`
- `## 5. 考察`
- `## 6. 再現方法`
- `### 再現手順`
- `### 再現コスト（目安）`
- `### クリーンアップ`
- `## 7. 検証データ`

Apply this to every article currently exposed through `publishedResearchTopics`
in both English and Japanese, and make future generated output keep the same
outline.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — renderer and
  test code stay under the existing package/documentation layout.
- `workaholic:implementation` / `policies/coding-standards.md` — the shared
  article outline should be expressed as typed data and pure helpers, not as
  scattered string checks.
- `workaholic:implementation` / `policies/domain-layer-separation.md` — article
  rendering decisions belong in the domain renderers; entrypoints remain thin.
- `workaholic:implementation` / `policies/objective-documentation.md` — the
  articles must use factual, verifiable sections and keep reproduction/data
  provenance explicit.
- `workaholic:implementation` / `policies/test.md` — add regression tests that
  read the published docs and fail if the outline drifts.
- `workaholic:design` / `policies/self-explanatory-ui.md` — consistent section
  labels make the docs readable without explanation.
- `workaholic:operation` / `policies/ci-cd.md` — verify locally with the same
  package tests/build/docs preview path the branch uses for delivery.

## Key Files

- `packages/tech/src/research/domain/site.ts` — authoritative list of public
  English and Japanese article paths.
- `packages/tech/src/research/domain/translate.ts` — translation prompt must keep
  the standard Japanese outline for generated translations.
- `packages/tech/src/llm-model-comparison/domain/catalog.ts` — foundation-model
  catalog English renderer.
- `packages/tech/src/llm-model-comparison/domain/split-report.ts` — speed and
  accuracy English renderer.
- `packages/tech/src/llm-model-comparison/domain/availability-report.ts` —
  availability English renderer.
- `packages/tech/src/ocr-comparison/domain/report.ts` — OCR English renderer.
- `packages/tech/src/rag-benchmark/domain/report.ts` — RAG English renderer.
- `packages/tech/src/llm-benchmark/domain/report.ts` — exact-match benchmark
  English renderer.
- `docs/research-reports/*.md` and `docs/research-reports/*.insights.ja.md` —
  current published English/Japanese article outputs to regenerate/update.
- `docs/.vitepress/config.ts` — local docs preview that the owner wants to view.

## Related History

Recent work split the combined LLM page into public per-topic articles and made
the English/Japanese sidebars share one metadata source:

- `4e01988` — separated published site topics from internal measurement sources.
- `d196d60` — removed redundant combined LLM public pages.
- `3f5575e` — fixed the accuracy page from the real projection.
- `c7072d1` — added shared research history indexes.

## Implementation Steps

1. Add a shared article-outline domain helper that declares the English and
   Japanese required headings and can extract/validate top-level section order
   from Markdown.
2. Update all current public English article renderers so they emit the standard
   English outline and place existing measurement tables/content under the new
   sections.
3. Update the translation prompt so generated Japanese full-report translations
   preserve the English structure but use the exact Japanese heading labels.
4. Regenerate or rewrite all current public Japanese article files so they use
   the exact Japanese outline and still point back to the same source artifacts.
5. Add tests that scan every `publishedResearchTopics` English and Japanese
   path, checking exact H2 order and required H3 subsections for sections 2 and
   6.
6. Regenerate research indexes if titles/paths changed.
7. Build and start the local VitePress docs server so the owner can inspect the
   result in-browser.

## Quality Gate

**Acceptance criteria**

- Every `publishedResearchTopics` English `source.docsPath` has exactly the
  standard English H2 sequence in order.
- Every `publishedResearchTopics` Japanese `japanese.docsPath` has exactly the
  standard Japanese H2 sequence in order.
- Every public article has the required section-2 and section-6 H3 labels:
  English `Target Models`, `Target Metrics`, `Reproduction Steps`,
  `Reproduction Cost (Estimate)`, `Cleanup`; Japanese `対象モデル`,
  `対象メトリクス`, `再現手順`, `再現コスト（目安）`, `クリーンアップ`.
- Existing provenance remains present: source artifact/data links and generated
  timestamps stay visible under `Verification Data` or frontmatter.
- The literal note `Not Committed Yet` is not rendered as part of any article
  heading.
- VitePress renders the updated docs without broken links or build errors.

**Verification method**

- Domain tests scan all public article files through `publishedResearchTopics`.
- Renderer tests assert representative generated reports contain the standard
  section labels.
- Run `npm test` and `npm run lint` in `packages/tech`.
- Run `make build` from the repository root.
- Run `rg -n "Not Committed Yet|## 8\\.|## 9\\.|## 10\\.|## 11\\.|## 12\\."`
  across the public article files to confirm no old numbered top-level sections
  remain.
- Start the VitePress docs dev server and verify representative English and
  Japanese URLs return the new headings.

**Gate**

- All automated checks above pass.
- The docs server is left running with a URL for review.

## Considerations

- Keep source JSON artifacts intact; this ticket changes article organization,
  not measurement data.
- Do not call real providers while formatting articles. Use committed artifacts
  and deterministic renderers only.
- It is acceptable for `Verification Results` to contain tables and prose from
  the previous per-metric sections, but those must be nested under the single
  section-4 H2 instead of creating additional numbered H2 sections.

## Final Report

Implemented the shared public article outline across every `publishedResearchTopics`
English and Japanese article. The article renderers now emit the standard
English structure, and the current Japanese public Markdown files have been
reorganized to the matching Japanese structure while preserving source
artifact/frontmatter provenance and existing result tables.

Added `packages/tech/src/research/domain/article-outline.ts` and tests that
extract Markdown headings outside code fences, require the exact H2 sequence,
require the exact H3 sequence, and scan every published English/Japanese article
path. The translation prompt now maps the standard English headings to the exact
Japanese headings so future generated translations have the same structure.

Also cleaned up language/display drift found during verification: English OCR
now renders `not measured` instead of `未測定`, foundation-model English text no
longer contains Japanese `要確認`, and Japanese OCR provider names now use
official display names (`Anthropic`, `OpenAI`, `Google`, `xAI`).

Verification completed:

- `npm run format` in `packages/tech`
- `npm test` in `packages/tech` — 40 files / 244 tests passed
- `npm run lint` in `packages/tech`
- `npm run research:site -- write-indexes`
- `make build` — package builds and VitePress docs build passed
- `rg -n "Not Committed Yet|^## 8\\.|^## 9\\.|^## 10\\.|^## 11\\.|^## 12\\." ...` — no matches
- Local docs preview running at `http://localhost:4322/`
