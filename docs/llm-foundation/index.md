---
title: LLM基礎検証（日本語）
description: 各トピックの構造化レポート（実測データの表 ＋ LLM 考察）を主線として並べる。数値は実測アーティファクト由来で、再現可能な英語ソース（レポート／data.json／history）は Research data に置く。
---

# LLM基礎検証（日本語）

各トピックの読者向け主線は、この日本語の構造化レポートである。各レポートは、決定的な計測アーティファクトから生成した**指標別の観測表・全構成の測定結果**に、その数値を固定入力とした **LLM の考察**を添えたものである（数値は表と一致し、考察のみ非決定的）。再現可能な英語ソース（英語レポート・`data.json`・history）は [Research data (source)](../research-reports/) に別立てで残す。

## トピック

### [基盤モデルの比較](./foundation-model-comparison)

19モデル×effort の 59 構成を、スループット・TTFT・合計レイテンシ・JSONスキーマ深度/幅・長さ精度で比較する。指標ごとの上位表と全構成の一覧、および考察を含む。

### [ベクトルDB／RAGの比較](./vector-db-comparison)

RAG で使うベクトルストアを、検索品質（recall/nDCG/MRR）・取り込み時間・クエリレイテンシ・コスト・運用制約で比較する。自己管理ストアは固定 embedding での store-isolated 測定。

### [可用性の観測](./availability-comparison)

各プロバイダー API のヘルスプローブ観測（成功率・応答時間・失敗種別）。手動観測であり、**断定的な可用性ランキングや SLA は出さない**。

### [OCR能力の比較](./ocr-comparison)

文書画像を視覚対応モデルへ入力した文字起こしの CER/WER と、構造化抽出のフィールド精度。合成フィクスチャ上の相対比較。

### [対象基盤モデル（カタログ）](../research-reports/foundation-models.insights.ja)

対象モデルのプロバイダー・tier・価格・effort・API サーフェスの参照カタログ（`models.ts` を source of truth とする未測定のカタログ）。表本体は [Foundation model catalog](../research-reports/foundation-models)。

### [Agent SDKの比較](./agent-sdk-comparison)

Agent SDK / agent runtime の設計比較。公開ドキュメントに基づく **設計比較** であり実測ベンチマークではない（`設計比較` / `未測定` / `要確認` の provenance を保持）。

## provenance について

構造化レポートの表は実測アーティファクト（`docs/research-reports/*.data.json` の実測版）から決定的に生成する。考察は、その数値を固定入力に LLM が生成した非決定的な分析であり、real 経路（owner-triggered）でのみ更新する。keyless の fixture data レポートは自己テストであり、この主線とは別扱いである。
