---
created_at: 2026-07-08T18:21:53+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort:
commit_hash:
category:
depends_on: [20260708182152-rag-benchmark-incremental-history.md]
mission:
---

# 計測履歴を時系列チャートで可視化する

## Overview

増分履歴（LLM 比較は既存、RAG は別チケットで追加）は `measuredAt` 付きの履歴点を積み上げるが、
レポートは **最新断面のテーブルしか描画していない**。指標ごとの時系列を **チャートで可視化**し、
「時間とともに各モデル／バックエンドの計測がどう推移したか」を読めるようにする。

チャートは **依存の無いインライン SVG** として `domain/` の純関数で生成し、レポート Markdown と
最終記事へ埋め込む。VitePress プレビュー・法人サイト・PDF いずれでも JS 無しで表示できるようにする。
履歴の形（`HistoryPoint`: measuredAt＋数値指標＋provenance）を LLM/RAG で揃えるため、チャート実装は
**両トピックを一つのジェネリックなレンダラで扱う**（RAG 履歴チケットに依存）。

## Policies

- `workaholic:design` / `policies/wcag-conformance.md` — SVG チャートは `role`/`title`/`desc` と
  代替テキスト（既存の数値テーブル）を備え、色だけに依存しない。到達可能で読みやすい可視化にする。
- `workaholic:design` / `policies/modeless-design.md` — チャートは静的で、操作を要さずに情報へ到達できる。
- `workaholic:implementation` / `policies/directory-structure.md` — SVG 生成は純関数として `domain/` に置き、
  レポート描画から呼ぶ。外部チャートライブラリを足さない。
- `workaholic:implementation` / `policies/coding-standards.md` — 決定的な出力（座標丸めを固定）で、
  fixture レポートの byte-stable を壊さない。

## Key Files

- `packages/tech/src/llm-model-comparison/domain/history.ts` / `types.ts` - 既存の `HistoryPoint`/
  `HistoryFile`。チャートの入力形。
- `packages/tech/src/rag-benchmark/domain/history.ts` - RAG 履歴（依存チケットで追加）。同じ形を使う。
- `packages/tech/src/**/domain/chart.ts`（またはトピック共有の場所）- **新規**。時系列 → インライン SVG
  折れ線チャートの純関数（アクセシビリティ属性つき）。
- `packages/tech/src/llm-model-comparison/domain/report.ts` / `scripts/export-corporate-research.mjs` -
  指標ごとのチャートをレポート／最終記事へ埋め込む。
- `docs/research-reports/*.history.json` - チャートの入力データ。

## Related History

レポートは history を「trend-able」な形で持ちつつ、描画は最新断面テーブルのみだった。本チケットは
その履歴を初めてチャートとして描画面へ通す。

- [20260706105042-recurring-incremental-llm-comparison-with-history.md](.workaholic/tickets/archive/work-20260622-191220/20260706105042-recurring-incremental-llm-comparison-with-history.md) - 履歴の導入（描画は未実装だった回）

## Implementation Steps

1. `domain/` に純粋な SVG 時系列レンダラを追加する: (measuredAt, value) の系列群を受け取り、折れ線＋点の
   インライン SVG 文字列を返す。`role="img"`・`<title>`・`<desc>`・軸ラベルを含める。
2. 主要指標ごとに、系列を「モデル／バックエンド別の折れ線」または small multiples として描く（LLM:
   スループット/TTFT/レイテンシ 等、RAG: recall/latency/ingest 等）。両トピックで同じレンダラを使う。
3. レポート（`report.ts`）と最終記事（exporter）へチャートを埋め込む。
4. **単一時点の系列**（現状 measuredAt が 1 つ）は、点 1 個＋「データ点 1」の注記として決定的に描く。
5. 単体テスト: 既知の系列 → 期待する SVG（座標・点・aria 属性）を検証する。fixture レポートが byte-stable の
   ままであることを確認する。

## Quality Gate

**Acceptance criteria**:

- 主要指標ごとに、`measuredAt` 系列を描いたインライン SVG チャートがレポート／最終記事に埋め込まれる。
- チャートは同一のジェネリックなレンダラで LLM・RAG 両トピックを扱う。
- SVG は `role="img"`・`<title>`・`<desc>` を持ち、既存の数値テーブルが代替テキストとして残る（WCAG）。
- 履歴が 1 時点しか無い場合も決定的に（点 1＋注記）描画し、fixture レポートは byte-stable のまま。

**Verification method**:

- `npm test`（tsc + vitest。SVG レンダラの既知入力テストを含む）、`npm run lint`、`make build` が緑。
- `make docs` の VitePress プレビューでチャートが表示され、内部リンク・ビルドにエラーが無い。
- 2 時点以上の履歴（RAG 履歴チケット後に実行を 2 回）でチャートが右肩に 2 点目を描くことを確認する。

**Gate**:

- テスト・lint・ビルドが緑、fixture byte-stable、チャートが履歴から決定的に描画され WCAG 属性を備える。

## Considerations

- **表示面**: インライン SVG（依存無し）を選ぶ。VitePress プレビュー・法人サイト・PDF いずれでも JS 無しで
  出るため、対話的な JS チャート（サイト限定）より移植性が高い（`wcag-conformance` の代替テキストは既存表）。
- **決定性**: 座標丸めを固定し、生成時刻などの非決定要素を混ぜない。実データのチャートは real 経路のみに出す
  （fixture 経路にはチャートを出さないか、空状態を決定的に描く）。
- **依存**: RAG 履歴チケット（20260708182152）が入って初めて RAG がチャートに現れる。LLM は既存履歴で先に描ける。
