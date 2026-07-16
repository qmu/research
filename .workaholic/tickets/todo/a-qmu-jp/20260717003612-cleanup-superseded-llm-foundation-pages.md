---
created_at: 2026-07-17T00:36:12+09:00
author: a@qmu.jp
type: housekeeping
layer: [UX]
effort:
commit_hash:
category: Removed
depends_on:
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# 旧世代の docs/llm-foundation JP ページ（orphan）を整理する

## Overview

per-topic site rework（56d4067 / d196d60）で meta IA スタブと結合ページは
削除されたが、旧世代のフル JP レポート 3 ページがサイドバー・index から
参照されないまま残っており、VitePress の srcExclude 対象でもないため
orphan URL として build・配信され続けている:

- `docs/llm-foundation/vector-db-comparison.md`（現行は
  `research-reports/rag-benchmark.insights.ja` が正）
- `docs/llm-foundation/availability-comparison.md`（現行は
  `research-reports/llm-availability.insights.ja` が正）
- `docs/llm-foundation/ocr-comparison.md`（現行は
  `research-reports/ocr-comparison.insights.ja` が正）

`docs/llm-foundation/agent-sdk-comparison.md` は topic.ts の articlePath が
参照する現役ファイルなので対象外（掲載は 20260717003610 チケットで扱う）。

## Policies

- **workaholic:implementation** — 公開面は site.ts metadata から導出された
  ページのみとし、superseded な orphan を配信し続けない。
- **workaholic:operation** — 既公開 URL の扱い（削除か redirect か）は
  到達経路を確認してから決める。

## Implementation Steps

1. 3 ページを削除するか、現行の `*.insights.ja` ページへの案内/redirect に
   置き換えるかを決める（検索流入・既存リンクの有無を考慮）。
2. qmu-co-jp 側に同名の古いコピーが残っていないか copy-plan と
   `../qmu-co-jp/docs/llm-foundation-research/` を確認し、残っていれば
   /ship の publish-ticket フローで整理する。
3. `make docs` の build でリンク切れが出ないことを確認する。

## Quality Gate

- 旧 3 ページが orphan URL として配信されない（削除または明示 redirect）。
- サイト build 緑、リンク切れなし。
