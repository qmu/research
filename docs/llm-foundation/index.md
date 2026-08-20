---
title: LLM基礎検証
description: LLMs Research と同じ構成で、日本語の生成・翻訳済み記事を並べる。
---

# LLM基礎検証

このページは [LLMs Research](/en/) と同じトピック順で、
日本語の生成・翻訳済み記事を並べる。英語レポート、`data.json`、history は
再現可能なソースとして英語側に残し、日本語側は同じトピックを日本語で読む入口にする。
ヘッダーの言語切り替えで、同じ記事の英語版・日本語版を行き来できる。

過去の生成フレームは [History](/ja/history) に残す。

## トピック

### [対象モデル](/ja/foundation-models)

対象モデルのプロバイダー、tier、価格、effort、API サーフェスの参照カタログ。
英語ソースは [Foundation model catalog](/en/foundation-models)。

### [応答速度](/ja/llm-speed-comparison)

持続スループット、time-to-first-token、総レイテンシの比較。
英語ソースは [LLM response speed](/en/llm-speed-comparison)。

### [出力精度](/ja/llm-accuracy-comparison)

JSON スキーマ制約、長さ指示追従、情報精度の比較。
英語ソースは [LLM output accuracy](/en/llm-accuracy-comparison)。

### [API可用性](/ja/llm-availability)

公開ステータスページ由来のインシデント履歴と 30/90 日の傾向。
英語ソースは [LLM API availability](/en/llm-availability)。

### [トークン計測](/ja/token-metering-comparison)

トークナイザライブラリに依存しない入力トークンの自前カウント（語彙公開系は自前BPE、非公開系は較正付き推定）を、日英・コードの固定サンプルで API 実測値と照合する。
英語ソースは [Token counting and metering](/en/token-metering-comparison)。

### [ベクトルDBの比較](/ja/rag-benchmark)

検索品質、取り込み時間、クエリレイテンシ、コスト、運用制約の比較。
英語ソースは [RAG vector store benchmark](/en/rag-benchmark)。

### [OCR能力](/ja/ocr-comparison)

視覚対応モデルの文字起こしと構造化抽出の比較。
英語ソースは [OCR capability comparison](/en/ocr-comparison)。

### [画像生成](/ja/image-generation-comparison)

生成レイテンシ、画像単価、機械検証可能なプロンプト追従、正確なテキスト描画の比較。
英語ソースは [Image generation](/en/image-generation-comparison)。

### [SVG生成](/ja/svg-generation-comparison)

フロンティアLLMによるSVG生成の描画妥当性、プロンプト忠実度（ラスタライズ＋固定ビジョン判定）、パス複雑度、SMIL/CSSアニメーションの有無、生成レイテンシ、トークンコストの比較。
英語ソースは [SVG generation](/en/svg-generation-comparison)。

### [音声 (TTS/STT/STS)](/ja/speech-comparison)

音声合成の明瞭度とレイテンシ、音声認識の単語精度とレイテンシ、単価、リアルタイム音声対話の対応状況の比較。
英語ソースは [Speech (TTS / STT / STS)](/en/speech-comparison)。

### [Agent SDKの比較](/ja/agent-sdk-comparison)

公開ドキュメントに基づく agent framework / runtime の設計比較。設計比較 / 未測定 / 要確認 の provenance を各セルに明記する。
英語ソースは [Agent SDK comparison](/en/agent-sdk-comparison)。

### [コンピュータ操作](/ja/computer-use-comparison)

API ネイティブなコンピュータ操作エージェントの、固定 Playwright ハーネス上での固定ブラウザタスク群に対するタスク成功率・手数・レイテンシ・実時間・タスク単価の比較。
英語ソースは [Computer use](/en/computer-use-comparison)。

### [エージェントVM/サンドボックス](/ja/agent-vm-comparison)

エージェントが untrusted コードを実行するサンドボックス／microVM 基盤の分離モデル、公表価格、機能エンベロープ、実測コールドスタートと固定タスクコストの比較。
英語ソースは [Agent VM / sandbox comparison](/en/agent-vm-comparison)。

### [ディープリサーチAPI](/ja/deep-research-comparison)

自律型ディープリサーチAPIの回答品質（ルーブリック）、引用妥当性、ソース多様性、レイテンシ、クエリ単価を、透明な Anthropic 自前実装ベースラインと比較。
英語ソースは [Deep research APIs](/en/deep-research-comparison)。

### [トレンド追随](/ja/trend-recency-comparison)

検索拡張システムがどれだけ最新の出来事を正しく追えているかを、非グラウンディングの対照と対で測る比較。直近の出来事プローブに対する再現正答率、引用の妥当性・鮮度、応答レイテンシ、検索課金コストを扱う。
英語ソースは [Trend recency](/en/trend-recency-comparison)。

## provenance について

日本語ページは、英語側のトピックと同じ順序で配置する。現在の `*.insights.ja.md`
ページは英語 insights を日本語へ翻訳した生成物であり、frontmatter に source
artifact、source commit、translation model、generated timestamp を保持する。
全文レポートの直接翻訳と日付別履歴は、report-history pipeline が同じ topic metadata
から生成する。
