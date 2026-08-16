---
created_at: 2026-08-15T05:20:30+00:00
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
