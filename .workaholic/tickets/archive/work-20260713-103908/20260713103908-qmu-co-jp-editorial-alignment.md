---
created_at: 2026-07-13T10:39:08+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain, Config]
effort: 4h
commit_hash:
category: Changed
depends_on:
mission:
---

# Align published research articles with qmu-co-jp editorial demands

## Overview

The owner reviewed what v0.1.0 reflected onto qmu-co-jp and filed six demands
(2026-07-13). All content fixes are made in THIS repo (the canonical source);
qmu-co-jp receives them through the normal publish-ticket flow on the next
`/ship`.

**Demand 1 — sidebar group label.** qmu-co-jp sidebar groups follow the
"<テーマ>について" convention; the research group must read
**「LLM基礎検証について」**, not 「LLM基礎検証」. The group label itself lives
in qmu-co-jp navigation, so encode the directive into this repo's publish
payload: `renderQmuTicketPayload()` (packages/tech/src/research/domain/site.ts)
must state the group label explicitly so the qmu-co-jp `/drive` applies it.

**Demand 2 — article title must equal sidebar title (root-cause fixed here).**
The qmu-co-jp section page surfaced the title "LLMs Research (Japanese)". Root
cause analysis: this is **this repository's fault**, not the qmu-co-jp drive's —
`JA_RESEARCH_TITLE = "LLMs Research (Japanese)"` in `site.ts` is the JP index's
frontmatter/H1 title, and the publish ticket I generated specified file order
but not human-facing titles, so qmu-co-jp faithfully copied what it was given.
Fix in `site.ts`:
- Give the Japanese surface a proper Japanese title (`LLM基礎検証`) and make
  the qmu payload carry the sidebar/article titles explicitly.
- Enforce the policy across ALL published topics: every published page's
  frontmatter `title` must equal its sidebar label (`japanese.text` for JP
  pages, `source.text` for EN pages). Add a unit test that reads each
  published page from disk and asserts title == sidebar label, so drift is
  machine-caught.

**Demand 3 — topic renames** (in `site.ts` `japanese.text`, propagated to page
frontmatter/H1, indexes, and the qmu payload; keep `qmuSlug` unchanged so URLs
survive):
- 対象基盤モデル（カタログ） → **対象モデル**
- LLM応答速度 → **応答速度**
- LLM出力精度 → **出力精度**
- LLM API可用性 → **API可用性**
- OCR能力の比較 → **OCR能力**
- RAGベクトルストアベンチマーク → **ベクトルDBの比較**

**Demand 4 — no mermaid in published pages** (qmu-co-jp does not render it).
Today the only published pages containing ```mermaid are the llm-benchmark
pair (EN/JA) — removed anyway by demand 5. The combined-comparison mermaid is
internal-only (`*.real.md`/`*.fixture.md`). Add a guard test: no page in the
published set (every `publishedResearchTopics` source/japanese page) contains
a mermaid fence. Charts in published pages use the existing inline-SVG
renderer (`renderTimeSeriesChart`).

**Demand 5 — unpublish llm-benchmark.** 「LLMの完全一致ベンチマーク」 is the
original pipeline seed/self-test (packages/tech TEMPLATE proof); the owner
judges it conceptually interesting but far from sufficient for publication.
Move it from `publishedResearchTopics` to `internalResearchSources` (stays
runnable and CI-self-testing; leaves sidebar, indexes, and the qmu copy set).
The next publish ticket must instruct qmu-co-jp to DELETE
`docs/llm-foundation-research/llm-benchmark.md` (and the EN copy) — verify
`renderQmuTicketPayload` covers deletions of formerly-published slugs, and add
the capability if it does not.

**Demand 6 — speed/accuracy article restructure** (`split-report.ts`):
- §4 検証結果 currently holds the per-model result tables; move those tables to
  **§7 検証データ**.
- §4 gets a **concise, intuitive overview** instead: a short results narrative
  plus aggregated values (e.g. fastest/median/slowest TTFT, throughput range,
  schema-ceiling distribution) and optionally an inline-SVG chart — decision-
  relevant at a glance, no exhaustive tables.
- §5 考察 follows as today. The enforced 7-section outline
  (`article-outline.ts`) is unchanged — only content placement moves.
- Regenerate both topics' EN reports from the committed real artifact
  (`npm run research -- speed|accuracy --real` re-projects without new
  provider measurement calls) and refresh JP via
  `npm run research:translate-report -- speed|accuracy` (small LLM cost).

## Key Files

- `packages/tech/src/research/domain/site.ts` — JA_RESEARCH_TITLE, per-topic
  `japanese.text`/`source.text`, `renderQmuTicketPayload` (group label,
  explicit titles, deletions), llm-benchmark topic entry.
- `packages/tech/src/llm-model-comparison/domain/split-report.ts` — §4/§7
  restructure for speed/accuracy.
- `packages/tech/src/research/domain/article-outline.test.ts` (or a new
  colocated test) — title==sidebar-label validator + no-mermaid guard over
  published pages.
- Generated surfaces to regenerate after the metadata change:
  `research:site -- write-indexes`, `write-snapshots`, per-topic reports and
  JP translations, `scripts/publish-research.sh copy --all` at ship time.

## Quality Gate

- [ ] Unit test: every published page's frontmatter title equals its sidebar
      label (EN and JP), read from disk.
- [ ] Unit test: no published page contains a ```mermaid fence.
- [ ] llm-benchmark absent from sidebar, EN/JP indexes, publish plan, and qmu
      payload; still runnable via its npm script and still covered by CI
      fixtures.
- [ ] qmu payload names the sidebar group label 「LLM基礎検証について」, carries
      per-article titles, and instructs deletion of the retired llm-benchmark
      copies.
- [ ] Speed and accuracy reports: §4 holds a concise aggregated overview (no
      per-model tables), §7 holds the per-model tables; outline test still
      green; JP translations regenerated.
- [ ] Full gate INCLUDING the tech package lint: `make lint`,
      `env -C packages/tech npm run lint`, `env -C packages/tech npm test`,
      `make build`, and `gh pr checks` all green before merge (lesson from
      PR #15/#17).

## Considerations

- Renames keep `qmuSlug`/file slugs stable — only human-facing labels change;
  if the owner also wants slug changes, that is a separate decision (breaks
  URLs).
- The JP index H1 and the qmu-co-jp group label must end up consistent
  (「LLM基礎検証」 page title under a 「LLM基礎検証について」 group, per the
  site convention — confirm exact wording with the owner at /drive approval).
- Applying the fixes ends with a normal `/ship`, which regenerates the publish
  ticket for qmu-co-jp; no direct edits to qmu-co-jp from this repo.
