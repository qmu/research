---
title: OCR能力の比較
description: LLM基礎検証におけるOCR能力の比較。文書画像を視覚対応モデルへ入力し、CER/WERと構造化抽出のフィールド精度で測る。
---

# OCR能力の比較

OCR能力の比較は、文書画像を入力できる基盤モデルを対象に、文字起こしと構造化抽出を分けて測る検証区分である。既存のテキスト probe とは別のモダリティとして扱い、画像入力は `VisionClient` ポートだけを通る。

現時点の実モデル数値は **未測定** である。コミット済みの結果は、決定的な合成文書画像と fixture vision client によるハーネス検証であり、実モデルのOCR性能として読んではならない。

## データセット

この区分の実装前ゲートとして、`qmu-synthetic-document-ocr-v1` manifest を先に固定した。manifest は `packages/tech/src/ocr-comparison/domain/data/synthetic-document-ocr.manifest.json` に置き、次を含む。

- 文書ID
- 参照文字起こし
- 構造化フィールド正解
- ライセンス
- 正規化ルール
- 画像レンダリング条件

採用したデータはリポジトリ作成の合成 receipt / invoice で、ライセンスは MIT である。第三者の文書画像、スキャン画像、大規模OCRコーパスはコミットしていない。画像は manifest の `render.lines` から実行時に PNG として決定的に生成する。

将来、実画像データセットを採用する場合は SciFact と同じ方式にする。つまり、画像や大きな本文はコミットせず、選定ID・参照文字起こし・構造化フィールド正解・正規化・ライセンスだけを manifest としてコミットし、画像バイトは gitignored cache へ fetch する。

## 前処理

現在の fixture 画像は、次の条件で生成する。

| 項目 | 内容 |
| --- | --- |
| 形式 | PNG |
| 解像度 | 960×640px |
| DPI | 150 |
| ページ分割 | 1 manifest item = 1 image/page |
| レンダリング | 白背景、黒の固定 5×7 bitmap text、回転なし、ぼかしなし、非可逆圧縮なし |
| 文字種 | Latin uppercase letters、Arabic numerals、ASCII punctuation、ISO date、currency code |
| レイアウト | receipt / invoice の単一ページ。見出し、ラベル、明細行、合計欄を含む |

日本語文字、手書き、傾き、スタンプ、写真、複数ページ分割はこの v1 fixture の範囲外である。

## 採点

文字起こしは参照文字列に対する edit distance で採点する。

| 指標 | 定義 |
| --- | --- |
| CER | 文字単位 edit distance ÷ 参照文字数 |
| WER | 空白区切り token の edit distance ÷ 参照 token 数 |
| Field accuracy | 必須フィールドの正規化後完全一致数 ÷ 必須フィールド数 |

正規化は Unicode NFKC、改行正規化、空白 collapse を行う。CER/WER では句読点を残す。構造化フィールドでは、`document_id` と `currency` は uppercase、`date` は ISO date、`total` は decimal string として比較する。

構造化抽出の必須フィールドは次の6つである。

| Field | 内容 |
| --- | --- |
| `document_type` | `RECEIPT` または `INVOICE` |
| `vendor` | 発行元 |
| `document_id` | receipt / invoice ID |
| `date` | `YYYY-MM-DD` |
| `currency` | ISO currency code |
| `total` | 小数2桁の合計金額 |

## モデル範囲

実行時に画像を送る対象は、明示的に `VisionClient` adapter があるモデルだけである。現在は Anthropic vision ACL が実装済みなので、Anthropic の vision-capable model card が実測候補である。

OpenAI、Google、xAI、OpenAI Realtime、Responses API の text/coding model card は、この区分では **対象外** として扱う。VisionClient adapter がない provider/API surface へ画像を誤送信しない。

## 現在の結果

実モデルの OCR 数値は **未測定**。

| 種別 | 状態 | Provenance |
| --- | --- | --- |
| 合成 fixture | 測定済み。CER/WER/field accuracy が決定的に計算される | `fixtured` |
| Anthropic vision 実測 | 未測定。owner が `ocr:estimate` 確認後に `ocr:real` を実行する | `measured` 予定 |
| VisionClient 未実装の provider/API | 対象外 | `out-of-scope` |

fixture の report と JSON artifact は [OCR comparison report](../research-reports/ocr-comparison) に置く。fixture の数値はハーネス検証であり、実モデルの優劣を示さない。

## 再現

```sh
cd packages/tech
npm install

# keyless fixture
npm run ocr:fixture

# 実測前の見積もり
npm run ocr:estimate

# owner-gated real path
npm run ocr:real
```

実測はこのページではまだ公開しない。実測結果を公開する場合は、artifact の `provenance: measured`、`measuredAt`、dataset manifest version、model id、実行時点を記事内に反映する。
