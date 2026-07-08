---
title: 情報精度の比較
description: LLM基礎検証における情報精度（事実正確性）の検証設計。
---

# 情報精度の比較

情報精度は、短い factual QA に対する回答が参照解答にどれだけ一致するかを測る精度検証である。長さ精度、JSONスキーマ構造化精度と同じ `llm-model-comparison` エンジンの probe として扱い、各モデル×effort×trial の値を `{ mean, stdDev, n }` に集約する。

## データセット

採用データセットは TruthfulQA。ライセンスは Apache-2.0 として `docs/dependency-decisions.md` に記録した。大きな corpus は再配布せず、今回の検証では小規模な manifest subset だけを commit する。

- manifest: `packages/tech/src/llm-model-comparison/domain/data/truthfulqa-information-accuracy.manifest.json`
- manifest version: `2026-07-09.truthfulqa.small-v1`
- 内容: question id、source row、question、reference answers、accepted aliases、normalization rules
- normalization: 小文字化、冠詞除去、句読点除去、空白正規化

## 採点

headline 指標は決定的な exact-match / token F1 である。各回答を正規化し、参照解答と accepted aliases の正規化結果に完全一致すれば exact-match、同じ候補群に対する最大 token F1 を item score とする。trial の information accuracy は manifest 内 item score の平均 F1 である。

LLM judge は headline 指標に混ぜない。この実装では情報精度用の別 judge は追加していない。既存の per-configuration review judge は、測定済み trial output と集計指標を読む開発者向け要約であり、factual-QA の採点者ではない。

## 実行経路

keyless fixture は `npm run compare:fixture` で実行する。fixture client は manifest の参照解答または accepted alias を deterministic に返すため、artifact と report は同じ入力に対して byte-stable になる。fixture の数値は `fixtured` provenance として扱い、実測値としては表示しない。

real measurement は owner-gated である。`npm run compare -- --estimate` は実行前に API call 数、概算費用、概算時間を表示し、provider call を行わない。実測は所有者が費用を確認してから開始する。

## 現在の状態

情報精度の実測値はすべて **未測定（owner-gated real run pending。`npm run compare -- --estimate` で費用・呼び出し数を確認し、所有者が実測を開始するまで factual-QA accuracy は公開しない）**。

このページに現時点で掲載するのは、データセット provenance、採点規則、fixture 経路、実測開始条件だけである。モデル別の情報精度、順位、差分、傾向は未測定であり、値を補完しない。
