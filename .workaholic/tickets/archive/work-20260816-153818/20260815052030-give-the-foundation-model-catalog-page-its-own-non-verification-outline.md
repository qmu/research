---
created_at: 2026-08-15T05:20:30+00:00
status: done
author: noreply@anthropic.com
assignees: [a@qmu.jp]
depends_on:
feedback: [20260815052013-the-foundation-model-catalog-page-should-not-share-the-verification-report-outline.md]
merge_policy:
verification_handoff: 
claim: work-20260816-153818
---

# Give the foundation model catalog page its own non-verification outline

## Overview

<!-- PROPOSED. What this ticket would implement and why, from the feedback and
     repository state the proposal grew from. Merging the pull request this was
     published on is what turns it from a proposal into queued work. -->

PROPOSED. The `foundation-models` topic is a reference catalog, not a measurement:
`packages/tech/src/research/domain/topic.ts:215` already marks it `kind: "catalog"`,
and its own renderer opens with "This is a **reference catalog**, not a benchmark."
Its published page nevertheless carries the seven-section verification outline
(`1. Research Purpose` … `7. Verification Data` / `1. 調査の目的` … `7. 検証データ`),
because `renderFoundationModelsReport` composes through
`renderEnglishResearchArticle`, the single standard-article renderer every
verification topic shares. Its two archived frames under
`docs/research-reports/history/foundation-models/` show the earlier shape — a compact
`Catalog` / `Sources` (`カタログ` / `出典`) structure — which is what the reporter is
comparing against.

This ticket would give the catalog topic its own outline: no `Research Purpose`
chapter, a section structure deliberately different from the verification-style
topics, and a page that opens as a rough summary of which providers' models and
products are covered and how they are evaluated. The reporter explicitly leaves the
version-creation operation (`research:archive`, the dated frames) unchanged; only the
chapter structure is in scope.

## Policies

<!-- The standard engineering policies this implementation would answer to.
     MANDATORY and never empty - validate-ticket.sh rejects an empty section.
     List at least the universal implementation policies plus whatever the
     layer selects. -->

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout
- `workaholic:implementation` / `policies/coding-standards.md` — style and structure conventions
- `CLAUDE.md` / **Layered `src/`** — outline data and renderers stay pure logic under `domain/`
- `CLAUDE.md` / **Objective docs** — the rewritten sections stay factual and verifiable

## Key Files

<!-- The files this ticket would touch, each with why it is relevant. -->

- `packages/tech/src/research/domain/article-outline.ts` — holds `ARTICLE_OUTLINE`
  (the EN/JP heading lists), `renderEnglishResearchArticle`, and
  `articleOutlineProblems`. Today all three are single-shaped; a second, catalog
  outline and a way to select it live here.
- `packages/tech/src/llm-model-comparison/domain/catalog.ts:141` —
  `renderFoundationModelsReport`, the only caller that should move off the
  verification outline. The other twelve `renderEnglishResearchArticle` callers
  (speed, accuracy, availability, OCR, RAG, computer-use, deep-research, speech,
  SVG, image-generation, token-metering, trend-recency, agent-vm) must not change.
- `packages/tech/src/research/domain/article-outline.test.ts:70` — "keeps every
  published English and Japanese article on the standard outline" sweeps
  `publishedResearchTopics` and asserts the exact H2/H3 lists, so it fails the moment
  the catalog page diverges unless outline selection is per-topic.
- `packages/tech/src/research/domain/translate.ts:258` — builds the JP translation
  prompt's heading-pair map straight from `ARTICLE_OUTLINE.english/japanese`; the
  Japanese page's headings come from here, so the catalog variant needs its own pairs.
- `packages/tech/src/research/domain/topic.ts:203-216` — the `foundation-models` entry,
  already carrying `kind: "catalog"`, the existing per-topic marker an outline
  selection can key on.
- `docs/research-reports/foundation-models.md`,
  `docs/research-reports/foundation-models.insights.ja.md` — the regenerated output.
- `docs/research-reports/history/foundation-models/2026-07-09T11-02-05-370Z/`,
  `.../2026-07-09T11-54-54-587Z/` — read-only reference for the earlier
  `Catalog` / `Sources` shape; the reporter's "past two versions".

## Implementation Steps

<!-- The ordered steps. A proposal is judged on these, so they are the point. -->

1. Confirm the current rendering path end to end before changing it: run
   `cd packages/tech && npm run research -- foundation-models --fixture` (keyless and
   costless per the page's own reproduction section) and check that
   `docs/research-reports/foundation-models.md` is rewritten with the seven
   verification headings. This pins that the outline comes from
   `renderEnglishResearchArticle` and not from committed prose.
2. Decide the catalog outline's actual sections against the ask — "which providers'
   models and products are covered, and how they are evaluated" as a rough summary —
   and against the two archived frames' `Catalog` / `Sources` shape. Write them as an
   EN/JP pair, since every heading needs its Japanese counterpart for step 5.
3. Add the catalog outline to `article-outline.ts` beside the standard one: a second
   named outline plus its own render function and parts type, and make
   `articleOutlineProblems` take which outline to check rather than assuming one.
   Keep the existing standard exports byte-compatible so no other topic moves.
4. Point `renderFoundationModelsReport` at the catalog renderer, mapping the content
   it already produces (provider overview table, full catalog table, legend, sources)
   into the new sections and dropping the purpose/scope/reproduction prose the ask
   calls unnecessary. Do not touch the archive/versioning path.
5. Feed the catalog variant's heading pairs into `buildTranslationPrompt` so the
   Japanese page is generated with the catalog headings instead of
   `1. 調査の目的` … `7. 検証データ`.
6. Update `article-outline.test.ts` so the repo-wide conformance sweep selects the
   outline per topic (the `kind: "catalog"` marker, or whichever selector step 3
   introduces) and still fails loudly if a verification topic drifts.
7. Regenerate both pages and re-run the sweep: `npm run research -- foundation-models
   --fixture` for the English page, then the configured Japanese path
   (`npm run research:translate-report -- foundation-models`, priced first with
   `--estimate`). Leave `research:archive` and the existing dated frames alone.

## Quality Gate

<!-- MANDATORY and never empty - validate-ticket.sh rejects an empty section.
     Provisional until the mission is approved; the approval interrogation
     sharpens it. -->

**Acceptance criteria** — the checkable conditions that must hold:

- <proposed> `docs/research-reports/foundation-models.md` and
  `foundation-models.insights.ja.md` carry the catalog outline, and neither contains
  a `Research Purpose` / `調査の目的` heading.
- <proposed> Every other published English and Japanese article still carries the
  unchanged seven-section verification outline.
- <proposed> The version-creation operation is untouched: no change under
  `docs/research-reports/history/`, and `research:archive` behaves as before.

**Verification method** — the commands/tests/probes that prove them:

- <proposed> `cd packages/tech && npm test` — including the outline conformance sweep
  in `article-outline.test.ts`, updated to select per topic.
- <proposed> `make build && make lint` from the repository root, bare exit codes, no
  `| tail` and no `|| true`.
- <proposed> `rg '^## ' docs/research-reports/foundation-models.md
  docs/research-reports/foundation-models.insights.ja.md` shows the new sections, and
  the same probe over the other published pages shows the standard seven unchanged.
- <proposed> `make docs` and a VitePress read of the two pages.

**Gate** — what must pass before approval:

- <proposed> CI green on `main` (type-check, tests, lint, dependency audit), and
  `git status` showing no incidental change under `docs/research-reports/history/`.

## Open Decisions

<!-- Forks this proposal cannot resolve for the reporter. The driving session
     resolves each one explicitly and records the resolution in its Final Report. -->

- Does the catalog page get a **second named outline inside the shared
  `ARTICLE_OUTLINE`** (validated repo-wide, selected per topic), or does the catalog
  topic **opt out of outline validation** altogether and render freely? The ask says
  only that the structure must differ from the verification topics, not how it should
  be governed. The trade is real: opting out also drops the topic out of the EN→JP
  heading-pair map in `translate.ts:258`, which is what keeps the Japanese headings
  stable across regenerations, so the Japanese page would need its own answer.

## Considerations

<!-- Risks and open questions the proposal already sees. -->

- The uniform outline was deliberate: commit `cea205c` ("Standardize public research
  article outlines") introduced `article-outline.ts` precisely so "every topic reads
  as the same article in different languages." This ticket carves out one documented
  exception for a topic that is not a measurement; it should not become a general
  licence for per-topic outlines.
- The Japanese page is produced by an LLM translation pass, so its headings are only
  as stable as the prompt's heading-pair map. Changing the English outline without
  step 5 would leave the Japanese page on the old headings or on invented ones.
- `foundation-models` carries `fixtureRewritesCurrentPage: true`, so the fixture run
  rewrites the committed page in place — expect the regeneration to be the diff, and
  check byte-stability rather than hand-editing the Markdown.

## Final Report

Development completed as planned, with one deviation from step 7 recorded below.

### Open Decision resolved

**Does the catalog page get a second named outline inside the shared
`ARTICLE_OUTLINE` (validated repo-wide, selected per topic), or does the catalog
topic opt out of outline validation altogether and render freely?**

Resolved as **a second named, validated outline, selected per topic** —
`CATALOG_OUTLINE` beside `ARTICLE_OUTLINE`, both reachable through
`ARTICLE_OUTLINES`, with selection keyed on the `kind: "catalog"` marker the
topic registry already carries (`outlineKindForTopicKind`).

Reasoning, against the trade the ticket itself named: opting out drops the topic
out of the EN→JP heading-pair map in `buildTranslationPrompt`, which is the only
thing keeping the Japanese headings stable across regenerations — the Japanese
page would then be whatever a translation pass happened to invent that run, and
would fork from its English source. Opting out also removes the page from the
repo-wide conformance sweep, so the topic that just got a bespoke structure would
be the one topic nothing checks. Governing the exception costs one enum and keeps
both properties. This also matches what the ticket's own Considerations ask for:
"one documented exception," not "a general licence for per-topic outlines" — a
third outline now takes a deliberate edit to a named union, not a per-topic
escape hatch.

Selection is keyed on the existing `TopicSpec.kind` rather than a new list of
topic ids, so there is no second registry to drift against the first, and
anything that is not a catalog (including an unregistered topic) stays on the
standard outline by omission.

### Deviation from Implementation Step 7 — the Japanese page

Step 7 asks for the Japanese page to be regenerated with
`npm run research:translate-report -- foundation-models`. **That command could not
be run here, and running it would have destroyed the page.** It is key-gated:
`report-translation-runner.ts` reads `ANTHROPIC_API_KEY` and, when it is absent,
falls back to `createFixtureTranslationClient`, whose `generateAnswer` returns the
single line `_Fixtured 翻訳スタブ — 決定的プレースホルダ。_`. This environment has
no `ANTHROPIC_API_KEY` (checked: not in the process environment; `packages/tech`
carries only `.env.example`, and the worktree's `.env.worktree` holds port
variables only), so the documented command would have overwritten a real published
page with a one-line stub.

Leaving the page untouched was not available either: the outline is now selected
per topic, so a Japanese page still on `1. 調査の目的` … `7. 検証データ` fails the
repo-wide sweep, and the ticket's first acceptance criterion names both pages.

The page was therefore **hand-authored as the faithful Japanese counterpart of the
regenerated English page**: every figure copied from it, the surviving prose kept
in the previous translation's own wording, and only the new Overview/Coverage
prose and the new 世代 column newly rendered. Its frontmatter says exactly what it
is (`translation_model: none (hand-authored)`,
`provenance: hand-authored-translation`) rather than claiming a translation run
that did not happen. Ticket
`20260816155216-regenerate-the-japanese-catalog-page-through-the-live-translation-path`
was minted to put it back on the pipeline once a key is available; it carries a
`verification_handoff` naming the missing credential.

### What changed

- `article-outline.ts` — added `ArticleOutlineKind`, `CATALOG_OUTLINE`,
  `ARTICLE_OUTLINES`, `outlineKindForTopicKind`, `CatalogArticleParts`, and
  `renderEnglishCatalogArticle`. `articleOutlineProblems` takes the kind as a
  third argument defaulting to `"standard"`, so all twenty-odd existing call
  sites read unchanged and a caller that omits it is checked against the strict
  outline rather than silently unvalidated. `ARTICLE_OUTLINE`,
  `StandardArticleParts` and `renderEnglishResearchArticle` are untouched.
- `catalog.ts` — `renderFoundationModelsReport` renders through
  `renderEnglishCatalogArticle`. The content it already produced is remapped:
  provider overview → Coverage, full table + legend → Catalog, source list →
  Sources, and the analysis paragraph folded into the Overview. The purpose,
  measurement-targets and cleanup prose is dropped; the reproduction command
  survives as one line under Sources, so the page stays reproducible by a reader.
- `translate.ts` — the prompt's heading pairs come from the topic's own outline.
- `current-article.ts` — `buildTrendBlock` returns no block for a topic whose
  design declares only `reference` metrics (see the insight below).
- Tests — the conformance sweep selects per topic; new tests cover the catalog
  renderer, the distinctness of the two outlines, per-topic selection across
  every published topic, and the reference-only trend case.
- Both catalog pages regenerated onto the new outline. Nothing under
  `docs/research-reports/history/` changed, and `research:archive` was not run.

### Verification

- `cd packages/tech && npm test` — 746 passed, 2 skipped, exit 0.
- `make build` — exit 0 (both packages type-check; VitePress builds).
- `make lint` — exit 0 (Prettier + ESLint, both packages).
- `rg '^## '` — the two catalog pages carry Overview/Coverage/Catalog/Sources and
  概要/収録範囲/カタログ/出典; the other 15 English and 14 Japanese published pages
  carry the unchanged seven-section outline.
- Neither catalog page contains `Research Purpose` or `調査の目的`.
- The English page regenerates **byte-identically** on a second fixture run.
- The built VitePress output renders both pages with the catalog headings.
- `git status` shows no change under `docs/research-reports/history/`.

### Discovered Insights

- **Insight**: The 推移 (trend) block silently assumed the verification outline.
  `composeCurrentArticle` inserts it by searching for the literal marker
  `"\n## 5. "`, and on no match falls through to appending at the end of the page.
  Moving the catalog page off numbered sections therefore did not fail loudly —
  it relocated the block to after Sources, where its own sentence ("earlier
  surveys are linked under Verification Data") pointed at a section that page no
  longer has.
  **Context**: The fix was not to teach the composer about outlines but to notice
  that the block never belonged there: the catalog's design metrics are all
  `direction: "reference"`, and a reference fact is never charted, so the topic
  could never gain a trend. `buildTrendBlock` now returns `""` when a topic
  declares no trendable metric, and an empty block is already a no-op for
  `composeCurrentArticle`. This is data-driven rather than kind-driven, and the
  blast radius is exactly one page: `foundation-models` is the only published
  topic whose metrics are all `reference` except `agent-sdk`, which is
  `kind: "article"` and already excluded from composition. Anything else adding a
  reference-only topic gets the correct behavior for free.

- **Insight**: A keyless run of `research:translate-report` is destructive, not
  inert. `translationClient()` falls back to the fixture stub when
  `ANTHROPIC_API_KEY` is absent, and the runner writes the result straight over
  the published Japanese page — so the command the topic's own documentation
  gives would replace a real page with one placeholder line. The `--fixture`
  benchmark path is safe by contrast: `planPipeline` emits only the benchmark
  stage there, and the fixture-restore branch explicitly leaves the Japanese page
  untouched.
  **Context**: This asymmetry matters to anyone regenerating pages without a key,
  and it is why the Japanese page here was hand-authored rather than "regenerated"
  as the step said. Worth considering whether the runner should refuse rather than
  stub when no key is present; noted in the minted ticket as a separate change.

- **Insight**: `kind` on `TopicSpec` was already the project's per-topic
  behavioral marker, not a label. `current-article-runner.ts` reads
  `kind === "article"` in three places to keep hand-authored pages out of the
  compose/append passes.
  **Context**: That made it the natural selector for outline choice — the
  alternative, a list of catalog topic ids inside the outline module, would have
  been a second registry to keep in sync with the first.
