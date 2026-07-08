---
title: LLM基礎検証
description: LLM基礎検証の日本語正本記事を、対象基盤モデル、速度、精度、可用性、OCR、ベクトルDBの6区分で管理する。
---

# LLM基礎検証

LLM基礎検証は、qmu が公開する基盤モデルと RAG バックエンドの比較記事群である。このサイトでは日本語の清書記事を正本として管理し、法人サイトへ同じ情報構造と記事内容を反映する。

英語レポート、JSON artifact、history は [Research reports (source)](../research-reports/) に残す。そちらは再現可能性のためのソースであり、読者向けの主線はこの LLM基礎検証である。

## 読む順序

### [対象基盤モデル](./target-foundation-models)

検証対象にしたプロバイダー、モデル、価格、tier、effort 構成を確認する区分である。現在の正本記事は [基礎的LLMモデル比較（日本語版）](./foundation-model-comparison)。

### [速度の比較](./speed-comparison)

長いストリーミング生成の持続スループット、time-to-first-token、短い応答の合計レイテンシを見る区分である。現在の正本記事は [基礎的LLMモデル比較（日本語版）](./foundation-model-comparison)。

### [精度の比較](./accuracy-comparison)

長さ指示への追従性、JSONスキーマ構造化精度、情報精度を扱う区分である。長さ精度と JSONスキーマ構造化精度は [基礎的LLMモデル比較（日本語版）](./foundation-model-comparison) に掲載済みで、[情報精度の比較](./information-accuracy) は未測定の受け皿として置いている。

### [可用性の比較](./availability-comparison)

成功率、失敗種別、連続失敗の観測を時系列に積む区分である。現時点では手動ヘルスプローブ観測として公開し、定常サンプリングが確立するまでダウン頻度・ダウンタイム長の断定的な比較は行わない。

### [OCR能力の比較](./ocr-comparison)

文書画像を視覚対応モデルへ入力し、文字起こしの CER/WER と構造化抽出のフィールド精度を見る区分である。現時点では合成 fixture によるハーネス検証のみ公開し、実モデル数値は未測定として扱う。

### [ベクトルDBの比較](./vector-db-comparison)

RAG システムで使うベクトルストアを、検索品質、取り込み時間、クエリレイテンシ、コスト、運用制約で比較する区分である。現在の正本記事は [RAG ベクトルDBの比較](./vector-db-comparison)。

## 未測定のプレースホルダー

- [情報精度の比較](./information-accuracy): 未測定。対応チケット: 20260708182156。
- [可用性の比較](./availability-comparison): 手動ヘルスプローブ観測。対応チケット: 20260708182157。
- [OCR能力の比較](./ocr-comparison): 実モデル数値は未測定。対応チケット: 20260708182158。
