---
title: 精度の比較
description: LLM基礎検証における長さ精度、JSONスキーマ構造化精度、情報精度の区分。
---

# 精度の比較

この区分は、長さ精度、JSONスキーマ構造化精度、情報精度を扱う。長さ精度とJSONスキーマ構造化精度の既存測定値は [基礎的LLMモデル比較（日本語版）](./foundation-model-comparison) に含める。

現在の正本記事では、100語ちょうどの長さ指示への追従性と、構造化出力で準拠できるJSONスキーマの最大深度・最大幅を、59件のモデル×effort構成で比較する。測定値は `2026-07-06T13:08:50.282Z` 時点の実測値として扱う。

[情報精度の比較](./information-accuracy) は未測定 / フォローアップチケットで実装。対応チケット: 20260708182156。

再現可能ソースは `docs/research-reports/llm-model-comparison.real.md` と `docs/research-reports/llm-model-comparison.real.data.json` に残す。
