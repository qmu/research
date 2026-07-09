---
title: LLMs Research (Japanese)
description: LLMs Research と同じ構成で、日本語の生成・翻訳済み記事を並べる。
---

# LLMs Research (Japanese)

このページは [LLMs Research](../research-reports/) と同じトピック順で、
日本語の生成・翻訳済み記事を並べる。英語レポート、`data.json`、history は
再現可能なソースとして英語側に残し、日本語側は同じトピックを日本語で読む入口にする。

## トピック

### [対象基盤モデル（カタログ）](../research-reports/foundation-models.insights.ja)

対象モデルのプロバイダー・tier・価格・effort・API サーフェスの参照カタログ。
英語ソースは [Foundation model catalog](../research-reports/foundation-models)。

### [LLM応答速度](../research-reports/llm-speed-comparison.insights.ja)

持続スループット、time-to-first-token、総レイテンシの比較。
英語ソースは [LLM response speed](../research-reports/llm-speed-comparison)。

### [LLM出力精度](../research-reports/llm-accuracy-comparison.insights.ja)

JSON スキーマ制約、長さ指示追従、情報精度の比較。
英語ソースは [LLM output accuracy](../research-reports/llm-accuracy-comparison)。

### [LLMモデル比較](../research-reports/llm-model-comparison.insights.ja)

モデル×effort の統合比較。速度・精度トピックの投影元になる測定。
英語ソースは [LLM model comparison](../research-reports/llm-model-comparison)。

### [LLM API可用性](../research-reports/llm-availability.insights.ja)

公開ステータスページ由来のインシデント履歴と 30/90 日の傾向。
英語ソースは [LLM API availability](../research-reports/llm-availability)。

### [OCR能力の比較](../research-reports/ocr-comparison.insights.ja)

視覚対応モデルの文字起こしと構造化抽出の比較。
英語ソースは [OCR capability comparison](../research-reports/ocr-comparison)。

### [RAGベクトルストアベンチマーク](../research-reports/rag-benchmark.insights.ja)

RAG で使うベクトルストアの検索品質、取り込み時間、クエリレイテンシ、コスト、運用制約の比較。
英語ソースは [RAG vector store benchmark](../research-reports/rag-benchmark)。

### [LLM完全一致ベンチマーク](../research-reports/llm-benchmark.ja)

小さな完全一致精度ベンチマーク。研究から公開までのパイプラインを再現できる最小例。
英語ソースは [LLM exact-match benchmark](../research-reports/llm-benchmark)。

## provenance について

日本語ページは、英語側のトピックと同じ順序で配置する。`*.insights.ja.md` は
英語 insights を日本語へ翻訳した生成物であり、frontmatter に source artifact、
source commit、translation model、generated timestamp を保持する。
