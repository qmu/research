---
created_at: 2026-07-08T18:21:57+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260708182154-reorganize-llm-foundation-research-ia.md, 20260708182152-rag-benchmark-incremental-history.md, 20260708182153-research-history-trend-chart.md]
mission:
---

# 可用性（ダウン頻度・ダウンタイム長）の比較を追加する

## Overview

`LLM基礎検証` に新区分 **可用性の比較** を追加する。各プロバイダーの API を反復的にプローブし、
**成功率・失敗（ダウン）の頻度・ダウンタイムの長さ**を観測する。単発計測では意味を持たない指標なので、
**時系列の履歴に積み上げて**評価する（履歴モデルに依存）。当面はスケジューラを持たず手動実行で積み上げ、
将来の自動オーケストレーションで頻度を上げる前提にする。

各実行で、プロバイダーごとに軽量なヘルスプローブ（短いリクエスト）を一定回数／一定窓で撃ち、成功率と
応答時間、失敗の連続長（ダウンタイム）を記録する。履歴上で「いつ・どれだけ落ちたか」を可用性指標として集計する。

## Policies

- `workaholic:operation` / `policies/ci-cd.md` — 実プローブは owner-triggered で CI に乗せない。keyless fixture は
  byte-stable を保つ。
- `workaholic:operation` / `policies/observability.md` — 可用性は観測に基づき、失敗の頻度・継続時間を検証可能に記録する。
- `workaholic:implementation` / `policies/objective-documentation.md` — 「落ちた」の定義（タイムアウト・エラー種別・
  連続失敗の閾値）を明記し、推測でダウンタイムを作らない。
- `workaholic:implementation` / `policies/directory-structure.md` — プローブは `vendors/`、集計は `domain/`、runner は薄く。

## Key Files

- `packages/tech/src/rag-benchmark/domain/history.ts` / LLM history - 時系列に積む型（本トピックの中核）。
- `packages/tech/src/vendors/llm/*` - 各プロバイダーの薄い ACL。ヘルスプローブ（短リクエスト）に流用または追加。
- `packages/tech/src/**/domain/availability.ts` - **新規**。成功率・ダウン頻度・ダウンタイム長の純粋集計。
- `docs/research-reports/*.history.json` - 可用性の観測を時系列で積む先。

## Related History

履歴モデルは measuredAt 付きの点を積む。可用性はまさに時系列で意味を持つ指標で、履歴とトレンドチャートの
最初の主用途になり得る。

- [20260706105042-recurring-incremental-llm-comparison-with-history.md](.workaholic/tickets/archive/work-20260622-191220/20260706105042-recurring-incremental-llm-comparison-with-history.md) - 履歴・増分（依存する仕組み）

## Implementation Steps

1. **サンプリング仕様を先に定義する**: サンプリング間隔・タイムアウト・観測窓・リクエスト元（リージョン／
   ネットワーク）・レート制限の分類・サンプル間の未知区間の扱い（censoring）を明記する。「ダウン」の定義
   （連続失敗の閾値・エラー種別）も定める。
2. 可用性プローブを定義する: プロバイダーごとに短いヘルスリクエストを撃ち、成功/失敗・応答時間・失敗種別
   （タイムアウト・5xx・レート制限）を記録する。
3. `domain/availability.ts`（新規）で、成功率と（観測窓が定義された場合の）ダウン頻度・ダウンタイム長を純関数で
   集計・単体テストする。集計は観測窓・サンプル数を明示的に持つ。
4. 観測を **履歴へ積む**（各実行が 1 時点、`{ n, 観測窓 }` つき）。トレンドチャート（依存チケット）で、
   サンプル数・取得間隔・手動/スケジュールをキャプションに明記して描く。
5. keyless fixture（決定的）＋実プローブ（owner-triggered、事前 estimate）を用意する。
6. **当面は「手動ヘルスプローブ観測」として記事化する**。定常サンプリング（将来のオーケストレーション）が
   確立するまで、「可用性の比較」「ダウンタイム長／頻度」の断定的な比較記事は公開しない。

## Quality Gate

**Acceptance criteria**:

- サンプリング仕様（間隔・タイムアウト・観測窓・元・レート制限分類・censoring）と「ダウン」の定義が明記されている。
- 各実行がプロバイダーごとの観測（成功率・応答時間・失敗種別）を、`n` と観測窓つきで履歴へ積む。
- keyless fixture が byte-stable、実プローブは owner-triggered。
- **断定的なダウンタイム長／頻度の比較は、定常サンプリングが確立するまで公開しない**。当面の記事は
  「手動ヘルスプローブ観測」として、サンプル数・取得が手動である旨を明記して提示する。チャートも同様にキャプションで明記する。

**Verification method**:

- `npm test`（集計の既知入力テスト含む）／`npm run lint`／`make build` が緑、fixture byte-stable。
- 集計関数が既知入力（観測窓・サンプル列）に対し期待値（成功率・失敗種別内訳）を返す。少数サンプルから
  ダウンタイム長を断定しないことを、記事・チャートのキャプション文言で確認する。

**Gate**:

- テスト・lint・build 緑、fixture byte-stable、サンプリング仕様が定義され、観測が `n`／観測窓つきで履歴に積まれ、
  記事・チャートが手動観測であることを明記している（ダウンタイム比較の断定をしていない）。

## Considerations

- **本質的に時系列**: 単発では可用性は測れない。履歴モデル（20260708182152）とトレンドチャート（20260708182153）に
  依存し、実行回数を重ねて意味を持つ。スケジューラは今は持たず手動で積む。
- **「ダウン」の定義**: タイムアウト長・エラー種別・連続失敗閾値を明記し、レート制限とサービス障害を区別する。
- **コスト**: ヘルスプローブは短リクエストで安いが、実測は owner-triggered。事前 estimate を出す。
- **区分**: 新区分（IA 再編チケットが受け皿を用意）。
