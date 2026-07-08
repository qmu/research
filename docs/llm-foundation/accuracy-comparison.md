---
title: 精度の比較
description: LLM基礎検証における長さ精度、JSONスキーマ構造化精度、情報精度の区分。
---

# 精度の比較

この区分は、長さ精度、JSONスキーマ構造化精度、情報精度を扱う。長さ精度とJSONスキーマ構造化精度の既存測定値は [基礎的LLMモデル比較（日本語版）](./foundation-model-comparison) に含める。情報精度は同じ `llm-model-comparison` エンジンに追加済みだが、実測は owner-gated のためこのページでは測定値を掲げない。

現在の正本記事では、100語ちょうどの長さ指示への追従性と、構造化出力で準拠できるJSONスキーマの最大深度・最大幅を、59件のモデル×effort構成で比較する。測定値は `2026-07-06T13:08:50.282Z` 時点の実測値として扱う。

情報精度は、TruthfulQA の小規模 manifest subset（Apache-2.0、`packages/tech/src/llm-model-comparison/domain/data/truthfulqa-information-accuracy.manifest.json`）に固定した短文 factual QA 検証である。各 question id に対して参照解答と許容 alias を持ち、回答は小文字化、冠詞除去、句読点除去、空白正規化の後に alias exact-match と最大 token F1 で決定的に採点する。headline 指標は LLM judge を使わない。

情報精度の実測値はすべて **未測定（owner-gated real run pending。`npm run compare -- --estimate` で費用・呼び出し数を確認し、所有者が実測を開始するまで factual-QA accuracy は公開しない）**。

[情報精度の比較](./information-accuracy) に、データセット、採点規則、fixture 経路、実測時の provenance を分けて記録する。

再現可能ソースは `docs/research-reports/llm-model-comparison.real.md` と `docs/research-reports/llm-model-comparison.real.data.json` に残す。
