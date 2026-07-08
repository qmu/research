---
title: LLM基礎検証
description: LLM基礎検証の日本語正本記事を、対象基盤モデル、速度、精度、可用性、OCR、ベクトルDBの6区分で管理する。
---

# LLM基礎検証

このディレクトリは、LLM基礎検証の日本語正本記事を置く場所である。`docs/research-reports/` は英語レポート、JSON artifact、history を保持する再現可能ソースとして残し、ここでは公開用の日本語記事と区分別の読み口を管理する。

## 6区分

| 区分 | slug | 状態 | 正本記事 |
| --- | --- | --- | --- |
| [対象基盤モデル](./target-foundation-models) | `target-foundation-models` | 既存 | [基礎的LLMモデル比較（日本語版）](./foundation-model-comparison) |
| [速度の比較](./speed-comparison) | `speed-comparison` | 既存 | [基礎的LLMモデル比較（日本語版）](./foundation-model-comparison) |
| [精度の比較](./accuracy-comparison) | `accuracy-comparison` | 長さ精度・JSONスキーマ構造化精度は既存、[情報精度](./information-accuracy)は未測定 | [基礎的LLMモデル比較（日本語版）](./foundation-model-comparison) |
| [可用性の比較](./availability-comparison) | `availability-comparison` | 未測定 / フォローアップチケットで実装 | 20260708182157 |
| [OCR能力の比較](./ocr-comparison) | `ocr-comparison` | 未測定 / フォローアップチケットで実装 | 20260708182158 |
| [ベクトルDBの比較](./vector-db-comparison) | `vector-db-comparison` | 既存 | [RAG ベクトルDBの比較](./vector-db-comparison) |

## 移管元

- 基盤モデルの比較: `docs/research-reports/llm-model-comparison.real.ja.md` を日本語正本として移管し、既存公開記事 `../qmu-co-jp/docs/llm-foundation-research/foundation-model-comparison.md` と測定値を突き合わせる。
- ベクトルDBの比較: `../qmu-co-jp/docs/llm-foundation-research/vector-store-comparison.md` を移管する。

## 未測定の受け皿

- [情報精度の比較](./information-accuracy): 未測定 / フォローアップチケットで実装。対応チケット: 20260708182156。
- [可用性の比較](./availability-comparison): 未測定 / フォローアップチケットで実装。対応チケット: 20260708182157。
- [OCR能力の比較](./ocr-comparison): 未測定 / フォローアップチケットで実装。対応チケット: 20260708182158。
