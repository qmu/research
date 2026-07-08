---
title: 速度の比較
description: LLM基礎検証におけるスループット、TTFT、合計レイテンシの区分。
---

# 速度の比較

この区分は、スループット、TTFT、合計レイテンシを扱う。既存の測定値は [基礎的LLMモデル比較（日本語版）](./foundation-model-comparison) に含める。

現在の正本記事では、長いストリーミング生成の持続 tokens/sec、短いプロンプトで最初のトークンが返るまでの時間、短い応答が完了するまでの時間を、59件のモデル×effort構成で比較する。測定値は `2026-07-06T13:08:50.282Z` 時点の実測値として扱う。

再現可能ソースは `docs/research-reports/llm-model-comparison.real.md` と `docs/research-reports/llm-model-comparison.real.data.json` に残す。
