---
created_at: 2026-07-08T18:21:57+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260708182154-reorganize-llm-foundation-research-ia.md, 20260708182152-rag-benchmark-incremental-history.md]
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

1. 可用性プローブを定義する: プロバイダーごとに短いヘルスリクエストを一定回数／窓で撃ち、成功/失敗・応答時間・
   失敗種別（タイムアウト・5xx・レート制限）を記録する。「ダウン」の定義（連続失敗の閾値等）を明記する。
2. `domain/availability.ts`（新規）で、成功率・ダウン頻度・ダウンタイム長を純関数で集計・単体テストする。
3. 観測を **履歴へ積む**（各実行が 1 時点）。トレンドチャート（別チケット）で推移を描けるようにする。
4. keyless fixture（決定的）＋実プローブ（owner-triggered、事前 estimate）を用意する。
5. 「可用性の比較」区分の記事を追加し、履歴に基づく頻度・継続時間を提示する。

## Quality Gate

**Acceptance criteria**:

- 各実行がプロバイダーごとの可用性観測（成功率・ダウン頻度・ダウンタイム長）を履歴へ積む。
- 「ダウン」の定義が明記され、失敗種別が記録される（検証可能）。
- keyless fixture が byte-stable、実プローブは owner-triggered。
- 「可用性の比較」区分の記事が履歴に基づく指標を提示する（単一時点でも破綻しない）。

**Verification method**:

- `npm test`（集計の既知入力テスト含む）／`npm run lint`／`make build` が緑、fixture byte-stable。
- 実プローブを 2 回積み、履歴に 2 時点が並び、可用性集計が妥当に出ることを確認する。

**Gate**:

- テスト・lint・build 緑、fixture byte-stable、可用性が定義付きで履歴に積まれ記事に提示される。

## Considerations

- **本質的に時系列**: 単発では可用性は測れない。履歴モデル（20260708182152）とトレンドチャート（20260708182153）に
  依存し、実行回数を重ねて意味を持つ。スケジューラは今は持たず手動で積む。
- **「ダウン」の定義**: タイムアウト長・エラー種別・連続失敗閾値を明記し、レート制限とサービス障害を区別する。
- **コスト**: ヘルスプローブは短リクエストで安いが、実測は owner-triggered。事前 estimate を出す。
- **区分**: 新区分（IA 再編チケットが受け皿を用意）。
