---
title: "Publish deep-research: dated survey, EN article + JP translation, site.ts, indexes"
created_at: 2026-07-22T10:00:04+09:00
author: a@qmu.jp
status: todo
type: enhancement
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Added
mission: periodic-research-target-compare-deep-research-alike-apis
depends_on: [20260722100003-deep-research-first-validation-trial.md]
---

# Publish the deep-research topic

## Overview

With the first validation trial archived, publish the topic like the other
research topics:

1. Archive the first trial as a **dated survey** (if not already framed by the
   trial ticket) under `docs/research-reports/history/deep-research/<timestamp>/`.
2. Generate the **current English article** for the topic from the trial artifact.
3. Generate the **Japanese translation**:
   `npm run research:translate-report -- deep-research --estimate` prices it, then
   run without `--estimate` to write the configured Japanese page.
4. Register the topic in `publishedResearchTopics` in
   `packages/tech/src/research/domain/site.ts` (id `deep-research`, qmuSlug
   `deep-research-apis`, report slug `deep-research-comparison`, npm script, in the
   proposal-named shape), so the EN `LLMs Research` and JP `LLM基礎検証` navs both
   list it in the shared topic order.
5. Regenerate the EN + JP indexes: `npm run research:site -- write-indexes`.

Corporate `qmu-co-jp` is NOT edited here — that goes through `/ship` → publish
ticket per `CLAUDE.md`.

## Key Files

- `packages/tech/src/research/domain/site.ts` — `publishedResearchTopics`
  registration (single source of nav order + labels).
- `packages/tech/src/deep-research/` — current-article generation.
- `docs/research-reports/deep-research-comparison.md` (EN) and the configured JP
  page — the published Markdown.
- `docs/research-reports/history/deep-research/<timestamp>/` — the dated survey.

## Policies

- **objective docs** — レポートは事実ベース・検証可能な表現で書く。到達不能 subject
  はその旨を明記し、数値を作らない。
- **shared metadata が唯一の順序源** — nav 順・ラベルは `site.ts` から来る。EN/JP
  index は手書きの並列リストではなく `write-indexes` で再生成する。
- **JP は real run 後に translate-report が必要** — 日本語ページは real run 後に
  `research:translate-report` で生成する（[[comparison-sweep-v2-run-recipe]]）。
- **corporate 分離** — `qmu-co-jp` は本チケットで直接編集しない。`/ship` の publish
  ticket 経由（`CLAUDE.md` の boundary）。

## Implementation Steps

1. Confirm/create the dated survey frame from the first trial.
2. Generate the current English article from the trial artifact.
3. Price then generate the JP translation via `research:translate-report`.
4. Register the topic in `publishedResearchTopics` (`site.ts`).
5. Run `npm run research:site -- write-indexes`; confirm EN + JP indexes list the
   topic in the shared order.

## Quality Gate

- `cd packages/tech && npm test` の bare exit code が 0（`make` 非経由・非マスク）。
  lint 緑。
- 英語記事と日本語訳の両ページが生成され、`docs/research-reports/` に存在する。
- `publishedResearchTopics`（`site.ts`）に topic が登録され、EN/JP 両 index が
  共有順序で topic を掲載している（`write-indexes` で再生成、手書き並列リストなし）。
- dated survey frame が history 配下に存在する。
- `qmu-co-jp` は本チケットで変更されていない（publish は `/ship` 経由）。

## Considerations

`site.ts` is the single source of nav order; regenerate indexes rather than
hand-editing. JP page requires a real translate-report run after the real trial.
Corporate copy is out of scope here.
