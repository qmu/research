---
title: LLM基礎検証
description: LLMs Research と同じ構成で、日本語の生成・翻訳済み記事を並べる。
---

# LLM基礎検証

このページは [LLMs Research](../research-reports/) と同じトピック順で、
日本語の生成・翻訳済み記事を並べる。英語レポート、`data.json`、history は
再現可能なソースとして英語側に残し、日本語側は同じトピックを日本語で読む入口にする。

過去の生成フレームは [History](./history) に残す。

## トピック

### [対象モデル](/research-reports/foundation-models.insights.ja)

対象モデルのプロバイダー、tier、価格、effort、API サーフェスの参照カタログ。
英語ソースは [Foundation model catalog](/research-reports/foundation-models)。

### [Agent SDKの比較](/llm-foundation/agent-sdk-comparison)

公開ドキュメントに基づく agent framework / runtime の設計比較。設計比較 / 未測定 / 要確認 の provenance を各セルに明記する。
英語ソースは [Agent SDK comparison](/research-reports/agent-sdk-comparison)。

### [応答速度](/research-reports/llm-speed-comparison.insights.ja)

持続スループット、time-to-first-token、総レイテンシの比較。
英語ソースは [LLM response speed](/research-reports/llm-speed-comparison)。

### [出力精度](/research-reports/llm-accuracy-comparison.insights.ja)

JSON スキーマ制約、長さ指示追従、情報精度の比較。
英語ソースは [LLM output accuracy](/research-reports/llm-accuracy-comparison)。

### [API可用性](/research-reports/llm-availability.insights.ja)

公開ステータスページ由来のインシデント履歴と 30/90 日の傾向。
英語ソースは [LLM API availability](/research-reports/llm-availability)。

### [OCR能力](/research-reports/ocr-comparison.insights.ja)

視覚対応モデルの文字起こしと構造化抽出の比較。
英語ソースは [OCR capability comparison](/research-reports/ocr-comparison)。

### [ベクトルDBの比較](/research-reports/rag-benchmark.insights.ja)

検索品質、取り込み時間、クエリレイテンシ、コスト、運用制約の比較。
英語ソースは [RAG vector store benchmark](/research-reports/rag-benchmark)。

### [画像生成](/research-reports/image-generation-comparison.insights.ja)

生成レイテンシ、画像単価、機械検証可能なプロンプト追従、正確なテキスト描画の比較。
英語ソースは [Image generation](/research-reports/image-generation-comparison)。

### [音声 (TTS/STT/STS)](/research-reports/speech-comparison.insights.ja)

音声合成の明瞭度とレイテンシ、音声認識の単語精度とレイテンシ、単価、リアルタイム音声対話の対応状況の比較。
英語ソースは [Speech (TTS / STT / STS)](/research-reports/speech-comparison)。

### [コンピュータ操作](/research-reports/computer-use-comparison.insights.ja)

API ネイティブなコンピュータ操作エージェントの、固定 Playwright ハーネス上での固定ブラウザタスク群に対するタスク成功率・手数・レイテンシ・実時間・タスク単価の比較。
英語ソースは [Computer use](/research-reports/computer-use-comparison)。

### [SVG生成](/research-reports/svg-generation-comparison.insights.ja)

フロンティアLLMによるSVG生成の描画妥当性、プロンプト忠実度（ラスタライズ＋固定ビジョン判定）、パス複雑度、SMIL/CSSアニメーションの有無、生成レイテンシ、トークンコストの比較。
英語ソースは [SVG generation](/research-reports/svg-generation-comparison)。

### [エージェントVM/サンドボックス](/research-reports/agent-vm-comparison.insights.ja)

エージェントが untrusted コードを実行するサンドボックス／microVM 基盤の分離モデル、公表価格、機能エンベロープ、実測コールドスタートと固定タスクコストの比較。
英語ソースは [Agent VM / sandbox comparison](/research-reports/agent-vm-comparison)。

### [トークン計測](/research-reports/token-metering-comparison.insights.ja)

トークナイザライブラリに依存しない入力トークンの自前カウント（語彙公開系は自前BPE、非公開系は較正付き推定）を、日英・コードの固定サンプルで API 実測値と照合する。
英語ソースは [Token counting and metering](/research-reports/token-metering-comparison)。

## provenance について

日本語ページは、英語側のトピックと同じ順序で配置する。現在の `*.insights.ja.md`
ページは英語 insights を日本語へ翻訳した生成物であり、frontmatter に source
artifact、source commit、translation model、generated timestamp を保持する。
全文レポートの直接翻訳と日付別履歴は、report-history pipeline が同じ topic metadata
から生成する。
