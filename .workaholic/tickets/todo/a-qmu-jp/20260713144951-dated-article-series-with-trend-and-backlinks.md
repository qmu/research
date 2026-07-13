---
created_at: 2026-07-13T14:49:51+09:00
author: a@qmu.jp
type: refactoring
layer: [UX, Domain, Config, Infrastructure]
effort: 4h
commit_hash:
category: Changed
depends_on:
mission: living-research-development-guideline
---

# Publish each topic as a dated survey-article series (trend + back-links in each article)

## Overview

Owner correction (2026-07-13): drop the "snapshot" framing. The intended
structure is a **dated series of survey articles** per topic. Each survey run N
produces a new article "第N回" that self-contains:

1. **過去記事へのリンク** — links to every earlier article (1 … N-1). The 4th
   article links to the 3rd, 2nd, 1st.
2. **推移** — the trend through run N (the 4th article shows the trend across
   runs 1–4).

When run 5 happens, a **new** article is created; it holds links to the past 4
articles and the trend as of run 5. The **latest article is the topic's current
page**; earlier articles are preserved as their own articles, not overwritten.

This replaces both (a) the speed-only in-place "snapshot" page and (b) the
separate central `history.md` list — the back-links and trend move *into each
article*. The English↔Japanese invariant is restored because the current page in
each language is the same latest article (EN generated → translated → JP → copied
to qmu-co-jp).

## What already exists (reuse, don't rebuild)

- Dated per-run articles already live at
  `docs/research-reports/history/<topic>/<ts>/` (EN report + `.ja.md` + `data.json`).
  These are the "回" articles; today they are plain 7-section reports.
- `history.md` already lists past frames per topic with links — the raw material
  for the in-article "過去記事へのリンク" section.
- `snapshot.ts` already renders a trend chart from dated frames — the raw
  material for the in-article "推移" section.

The work is to compose these INTO each latest article and promote it to the
topic's current page, not to build new machinery from scratch.

## Target structure (per topic, both languages)

- **Current page** (`topic.source.docsPath` / `topic.japanese.docsPath`) = the
  latest run's article, containing: the run's results, a 推移 (trend-through-this-run)
  section with the inline-SVG chart, and a 過去記事へのリンク section listing
  runs 1 … N-1.
- **Past articles** = the earlier dated articles under `history/<topic>/<ts>/`,
  each itself a complete article (results + trend-as-of-its-run + back-links to
  the runs before it). A past article is never rewritten when a new run lands.
- English is generated first; Japanese is its translation; the Japanese current
  page is copied to qmu-co-jp.

## Decisions (owner-confirmed 2026-07-13)

- **D1 — qmu-co-jp publish scope: publish ALL runs.** Every dated article of
  every topic is copied to qmu-co-jp, so in-article 過去記事 links resolve on the
  corporate site. The publish plan/payload grows from one file per topic to one
  file per run per topic; qmu-co-jp navigation groups them per topic with the
  latest as the topic entry.
- **D2 — current page: stable slug always holds the latest.** The stable
  per-topic slug (e.g. `llm-speed-comparison`) always renders the latest run's
  article; each run is also retained at its dated slug. Bookmarks and the
  qmu-co-jp fixed filename per topic stay valid; the dated slugs are the
  past-article link targets.
- **D3 — do not rewrite existing past frames.** The already-committed dated
  frames (speed ×3, accuracy ×4, foundation-models ×2, others ×1) stay as-is;
  the new trend+back-link structure applies to runs from here forward.
- **Current pages regenerated now.** Even under D3, each topic's *current page*
  (EN then translated JP) is regenerated now into the new structure, using the
  existing frames as the trend + past-link material. This fixes the reported
  speed EN/JP inconsistency immediately (JP current page becomes a translation
  of the EN current page, not of `.report.md`).

## Implementation design notes (settle in code, documented here)

- **Article composition vs the 7-section outline.** The current article keeps
  the enforced 7-section outline. The 推移 (trend chart) renders as an h3
  subsection inside §4 検証結果; the 過去記事へのリンク list renders as an h3
  subsection inside §7 検証データ (provenance/related). No new h2 — the outline
  test stays valid; extend it only to allow these named h3 blocks.
- **Past-links source.** Reuse the per-topic frame listing that `history.md`
  already builds; render the same links inside the article, newest-first,
  excluding the current run.
- **Trend source.** Reuse `snapshot.ts`'s trend renderer (inline SVG) over the
  dated frames in the tendency window; charts still connect same-instrument /
  same-manifest-version points only.

## Key Files

- `packages/tech/src/research/domain/site.ts` — topic metadata; the
  current-page vs dated-article relationship; publish plan / qmu payload
  (depends on D1).
- `packages/tech/src/research/domain/snapshot.ts` — reuse its trend renderer as
  the in-article 推移 section; generalize beyond speed.
- `packages/tech/src/entrypoints/render-research-site.ts` — the writer that
  composes each latest article (results + 推移 + past-links) and regenerates the
  current page; extend to every topic and to Japanese.
- `packages/tech/src/research/report-translation-runner.ts` — translate the
  latest EN article → JP current page (restores the invariant broken for speed).
- `packages/tech/src/research/domain/article-outline.test.ts` /
  `published-pages.test.ts` — the article shape test must accept the
  results + 推移 + 過去記事リンク structure; title==label / no-mermaid / §4
  budget guards stay green.
- `docs/adr/0005-*`, `docs/research-development-guideline.md` — restate the
  structure in these terms (dated article series; trend + back-links in each
  article; latest = current page); stop using "snapshot".

## Quality Gate

- [ ] Every topic's current page (EN and JP) contains the run's results, a 推移
      section (trend through the latest run), and a 過去記事へのリンク section
      listing all earlier runs.
- [ ] Past-run articles remain intact as their own articles under
      `history/<topic>/<ts>/` and are reachable from the current article's links.
- [ ] EN current page → translate → JP current page; frontmatter `translated_from`
      points at the current EN article (no cross-file fork like the speed bug).
- [ ] qmu-co-jp payload reflects D1; `make lint`, `npm test`, `make build`
      green; keyless fixtures byte-stable.

## Considerations

- Low-frame topics render a short 過去記事 list and a thin 推移 (availability/
  ocr/rag = 1 run, image-generation = 0). This is expected; the series grows as
  runs accumulate.
- This completes the `living-research-development-guideline` mission and closes
  the `15-only-llm-speed-is-migrated-to` concern by generalizing the structure
  to all topics and both languages.
