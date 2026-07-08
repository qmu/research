---
title: LLM基礎検証（日本語）
description: 各トピックの日本語レポート（英語 insights の自動翻訳）を主線として並べる。数値・provenance は英語版と一致し、再現可能な英語ソース（レポート／data.json／history）は Research reports に置く。
---

# LLM基礎検証（日本語）

各トピックの読者向け主線は、この日本語レポートである。各レポートは、決定的な計測アーティファクトから生成した英語 insights を、数値と provenance を保持したまま日本語へ自動翻訳したものである（翻訳で数値は変えない）。再現可能な英語ソース（英語レポート・`data.json`・history）は [Research reports (source)](../research-reports/) に別立てで残す。

各トピックには **英語版（English）** の生成レポートも対応する（[English reports](../research-reports/) 参照）。

## トピック

### [対象基盤モデル（カタログ）](../research-reports/foundation-models.insights.ja)

対象にした基盤モデルのプロバイダー・tier・価格・effort・API サーフェスの参照カタログ。`models.ts` を source of truth とする **カタログ（未測定）** であり、スループット等の実測値は含めない。表本体は [Foundation model catalog](../research-reports/foundation-models)。

### [速度の比較](../research-reports/llm-speed-comparison.insights.ja)

持続スループット、time-to-first-token、合計レイテンシ。共有の compare sweep からの射影であり、実測値は英語ソース [LLM response speed](../research-reports/llm-speed-comparison) と一致する。

### [精度の比較](../research-reports/llm-accuracy-comparison.insights.ja)

長さ指示への追従性、JSONスキーマ構造化の限界、情報精度。英語ソース [LLM output accuracy](../research-reports/llm-accuracy-comparison) と一致する。情報精度は元 sweep が当該プローブより前の場合は「未測定」として明示する。

### [可用性の比較](../research-reports/llm-availability.insights.ja)

手動ヘルスプローブによる観測。観測窓・サンプル数を明示し、**断定的な可用性ランキングや SLA は出さない**（観測として提示する）。英語ソース [LLM API availability](../research-reports/llm-availability)。

### [OCR能力の比較](../research-reports/ocr-comparison.insights.ja)

文書画像を視覚対応モデルへ入力した文字起こしの CER/WER と構造化抽出のフィールド精度。英語ソース [OCR capability comparison](../research-reports/ocr-comparison)。

### [ベクトルDB／RAGの比較](../research-reports/rag-benchmark.insights.ja)

RAG で使うベクトルストアの検索品質・取り込み時間・クエリレイテンシ・コスト・運用制約。英語ソース [RAG vector store benchmark](../research-reports/rag-benchmark)。

### [Agent SDKの比較](./agent-sdk-comparison)

Agent SDK / agent runtime の設計比較。公開ドキュメントに基づく **設計比較** であり実測ベンチマークではない（`設計比較` / `未測定` / `要確認` の provenance ラベルを保持する）。この 1 件は手書きの参照記事である。

## provenance について

各レポートの frontmatter は、由来（`source_artifact`・`source_commit`・`insights_model`・`translation_model`・`generated_at`・`trials`）を持つ。insights と翻訳は LLM 生成のため非決定的であり、real 経路（owner-triggered）でのみ生成される。keyless の fixture data レポートは自己テストであり、この主線とは別扱いである。
