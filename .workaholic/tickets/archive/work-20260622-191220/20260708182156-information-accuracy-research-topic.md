---
created_at: 2026-07-08T18:21:56+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260708182154-reorganize-llm-foundation-research-ia.md, 20260708143652-llm-comparison-multi-trial-confidence.md]
mission:
---

# 情報精度（事実正確性）の比較を追加する

## Overview

`LLM基礎検証` の「精度の比較」区分に、長さ精度・JSONスキーマ構造化精度に続く三つ目として
**情報精度（事実正確性）** を追加する。ラベル付きの事実 QA セットに対して各モデル×effort が返す回答の
正確性を測り、他の probe と同じく provenance／時点つきの観測として報告する。

既存の llm-model-comparison エンジンへ **新しい probe** として載せる（レジストリ＋純粋 scorer＋固定
データセット＋keyless fixture の型は既存 probe と揃える）。採点は exact-match/F1 などの決定的指標を基本とし、
必要なら固定の LLM judge を補助に使う（judge はモデル本体とは別に価格・条件を明記する）。

## Policies

- `workaholic:implementation` / `policies/objective-documentation.md` — 事実正確性は検証可能な採点（参照解答・
  採点式・時点）で示し、宣伝的評価や主観採点を避ける。
- `workaholic:implementation` / `policies/directory-structure.md` — 採点・データ整形は `domain/`、プロバイダー
  アクセスは `vendors/`、runner は薄く。
- `workaholic:implementation` / `policies/coding-standards.md` — 型駆動。scorer は純関数・単体テスト。
- `workaholic:operation` / `policies/ci-cd.md` — keyless fixture を byte-stable に保ち、実測は owner-triggered。
- `workaholic:planning` / `policies/market-research.md` — 事実正確性を、RAG/生成系の採否を左右する前提指標として扱う。

## Key Files

- `packages/tech/src/llm-model-comparison/run.ts` / `domain/` - 既存 probe（throughput/latency/schema/length）の
  隣に情報精度 probe を追加する。
- `packages/tech/src/llm-model-comparison/domain/length-accuracy.ts` / `json-schema.ts` - 既存 probe の型・fixture・
  scorer の参照実装。
- `packages/tech/src/llm-model-comparison/domain/types.ts` - `ProbeStats`／履歴点へ情報精度指標を追加。
- データセット - 引用可能な事実 QA サブセット（コーパス本文の再配布に注意。id＋参照解答の manifest 方式を検討）。

## Related History

RAG 側で BEIR SciFact サブセットを、コーパス本文を再配布せず manifest＋fetch で扱う型を確立している。情報精度の
データセットも同じ扱いにできる。

- [20260706202819-rag-benchmark-foundation-sqlite-vec.md](.workaholic/tickets/archive/work-20260622-191220/20260706202819-rag-benchmark-foundation-sqlite-vec.md) - probe/scorer/fixture/registry の型（参照）

## Implementation Steps

1. 引用可能な事実 QA データセット（参照解答つき）を選び、ライセンスに応じて manifest＋fetch か小規模 fixture で扱う。
2. 情報精度 probe を追加する: 各モデルへ QA を提示し、回答を参照解答と照合する。採点は exact-match/F1 等の決定的指標。
   曖昧な自由回答には固定 judge を補助に使い、その条件・価格を明記する。
3. keyless fixture 経路（決定的・byte-stable）と、実測経路（事前 estimate）を用意する。指標を履歴点・レポートへ通す。
4. 「精度の比較」区分の記事に情報精度を追加し、長さ精度・スキーマ精度と並べて提示する。
5. 単体テスト（scorer の既知入力）と全体の型・lint・build を通す。

## Quality Gate

**Acceptance criteria**:

- **データセットが実装前提の gate**: ライセンス・question id・参照解答・許容エイリアス・正規化規則を持つ
  pinned manifest を先に確定し、決定的 scorer の既知入力テストがある（これらが揃うまで公開記事を追加しない）。
- 情報精度指標が probe として測定され、各モデル×effort に対し provenance／時点／試行数 `n` つきで報告される
  （信頼区間チケットの方針に沿い `{ mean, stdDev/interval, n }` を持つ）。
- 採点は検証可能（参照解答・採点式が明記）。judge を使う場合は **headline 精度と分離した非決定的な裁定指標**として、
  judge の反復試行つきで報告する（headline には混ぜない）。
- keyless fixture が byte-stable、実測は owner-triggered で事前 estimate を表示。
- 「精度の比較」区分の記事に情報精度が追加される。

**Verification method**:

- `npm test`（scorer の既知入力テスト含む）／`npm run lint`／`make build` が緑、fixture byte-stable。
- pinned manifest に対し決定的 scorer が既知入力で期待値を返し、実測レポートの数値・provenance・時点が
  対応する artifact と一致することを確認する（「妥当な範囲」のような主観判定はゲートにしない）。

**Gate**:

- テスト・lint・build 緑、fixture byte-stable、情報精度が検証可能な採点で probe として報告される。

## Considerations

- **データセットのライセンス**: 事実 QA コーパスの再配布に注意（RAG と同様、id＋参照解答の manifest＋fetch を検討）。
- **judge の扱い**: 自由回答の採点に judge を使う場合、モデル本体と別価格・別条件で、判定のばらつきを注記する。
- **試行数**: 情報精度も単発は弱い。信頼区間チケット（20260708143652）の方針に合わせ、試行と区間で扱う。
- **区分**: 本トピックは新設ではなく「精度の比較」区分への追加（IA 再編チケットが受け皿を用意）。
