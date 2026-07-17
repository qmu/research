---
title: 画像生成
source_artifact: history/image-generation/2026-07-17T00-53-39-901Z/image-generation-comparison.data.json
source_commit: 78a9397
insights_model: source-report
translated_from: history/image-generation/2026-07-17T00-53-39-901Z/image-generation-comparison.md
translation_model: claude-sonnet-5
generated_at: 2026-07-17T00:53:39.901Z
trials: 1
provenance: llm-translation
---
# 画像生成

このレポートは、**機械的に検証可能**な挙動のみに基づいて画像生成モデルを比較する — 固定されたビジョン判定モデルが画像ごとに決定論的な yes/no のルーブリックに回答する方式であり、美的な意見はスコアに一切反映されない。

## 1. 調査の目的

本調査の目的は、APIから利用可能な画像生成モデルにどのようなものが存在し、画像1枚あたりのコスト、応答速度、そして検証可能なプロンプト制約への忠実性や正確なテキストレンダリング能力——すなわち統合方法の選定を左右する特性——がどの程度なのかを記録することである。

## 2. 測定対象

### 対象モデル

対象は、キュレーションされたレジストリ（`packages/tech/src/image-generation/models.ts`）に収録されている 3 種類の画像生成モデルであり、対応する各プロバイダーにつき 1 モデルずつ、それぞれに出典と最終確認日が明記されている。

- **Anthropic** は対象外である：画像生成 API を提供していないため（2026-07-13 に確認済み）。

### 対象メトリクス

測定対象のメトリクスは、生成レイテンシ（ms、低いほど良い）、プロンプト遵守度（満たされたルーブリック制約数 / 総数、高いほど良い）、テキストレンダリング精度（ビジョン文字起こしで検出された期待トークン数 / 期待トークン数、高いほど良い）である。画像あたりのコストはキュレーションされたカタログデータ（参考値）であり、実測値ではない。

## 3. 範囲と制約

- **判定は行うが、評価基準（rubric）には制約がある。** 固定されたビジョン判定者（`claude-sonnet-5`）が決定論的なyes/no形式の質問に答え、描画されたテキストを書き起こす。美しさやスタイルを採点することは一切ない。判定者を差し替えることは、日常的な更新ではなく計測器の変更に当たる。
- プロンプトマニフェストのバージョン `1`：8個のプロンプト（rubricが6個、exact-textが2個）。履歴は同一マニフェストバージョンの地点同士のみを接続する。
- **画像バイナリはコミットされない。** アーティファクトにはバイト長、タイミング、判定者の回答、スコアが記録される――このページを再生成するのに十分な情報だが、画像そのものは決して含まれない。
- フィクスチャ経路はキー不要かつ決定論的であり、実際のモデルの数値は、オーナーが承認済みのコスト上限内で実経路を実行して初めて現れる（まず `--estimate` を実行すること）。
- 特定時点の情報：計測された挙動は `2026-07-17T00:53:39.901Z` 時点のモデルおよびAPIを反映している。カタログ価格は各行の最終検証日時点のものである。

## 4. 検証結果

今回の実行では、3件のモデル行のうち**3件を測定済み**（未測定行は `fixtured` によるハーネスチェック、または `error` 行であり、数値を捏造することは決してありません）。

| メトリクス | 最良（モデル） | 中央値 | 最悪 |
| ------ | ------------ | ------ | ----- |
| 生成レイテンシ | 4976 ms — Grok Imagine | 6526 ms | 11689 ms |
| プロンプト遵守率 | 100.0% — GPT Image 1.5 | 100.0% | 100.0% |
| テキスト描画精度 | 100.0% — GPT Image 1.5 | 100.0% | 100.0% |

「最良」「最悪」は各メトリクス固有の方向性に従います（レイテンシは低いほど良く、遵守率およびテキスト精度は高いほど良い）。画像1枚あたりのカタログ価格はモデル表内の参考データです。モデルごと・プロンプトごとの全記録は、セクション7「検証データ」に記載しています。

**推移 / Trend across surveys**

This is the first comparable survey in the series, so there is no multi-survey trend to chart yet. A trend chart appears here once a second same-instrument survey is archived; earlier surveys are linked under Verification Data.

## 5. 考察

`measured`の来歴を持つ行は、レイテンシ、遵守度、テキストレンダリングで比較できる。価格はカタログ上の文脈情報である。遵守度スコアが低くテキストスコアが高い（またはその逆の）場合、そのモデルが何を誤っているのか―制約への追従なのかグリフのレンダリングなのか―を特定できる。

## 6. 再現方法

### 再現手順

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# キー不要のセルフテスト（決定論的なフィクスチャクライアント）:
npm run research -- image-generation --fixture

# コストのプレビュー後、オーナー限定の実実行:
npm run research -- image-generation --estimate
npm run research -- image-generation --real
```

### 再現コスト（目安）

フィクスチャ経路はキー不要でコストもかからない。実トライアルでは、生成画像ごとに各プロバイダーへの課金が発生し（モデルごとのカタログ価格を参照）、さらに画像1枚につき1回のビジョン審判読み取りが加わる。合意された上限は1トライアルあたり$20であり、`--estimate` を先に実行する必要がある。

### クリーンアップ

外部リソースは作成されない。生成された画像は判定のためにメモリ上に保持され、その後破棄される。実行時にはローカルのMarkdown/JSON成果物のみが書き出されるため、コミット前にレビューすること。

## 7. 検証データ

**モデルごとの結果**

| モデル | プロバイダ | 出所 | 画像あたりの価格 | レイテンシ（平均±sd） | 遵守度（平均±sd） | テキスト精度（平均±sd） | 備考 |
| ----- | -------- | ---------- | ----------- | ----------------- | ------------------- | ----------------------- | ---- |
| GPT Image 1.5 | openai | 実測 | $0.034（1024x1024, medium） | 11689 ± 885（n=8） | 100.0% ± 0.0%（n=6） | 100.0% ± 0.0%（n=2） |  |
| Gemini 2.5 Flash Image | google | 実測 | $0.039（1024x1024, standard） | 6526 ± 1717（n=8） | 100.0% ± 0.0%（n=6） | 100.0% ± 0.0%（n=2） |  |
| Grok Imagine | xai | 実測 | $0.020（standard） | 4976 ± 535（n=8） | 100.0% ± 0.0%（n=6） | 100.0% ± 0.0%（n=2） |  |

**プロンプト一覧（version 1）**

| プロンプトID | 種別 | 評価基準の項目数 | 期待されるテキスト |
| --------- | ---- | ----------- | ------------- |
| three-red-circles | adherence | 3 | — |
| square-left-of-triangle | adherence | 4 | — |
| five-green-stars-row | adherence | 3 | — |
| black-cat-facing-left | adherence | 3 | — |
| two-orange-one-purple-diamond | adherence | 3 | — |
| red-circle-above-blue-line | adherence | 3 | — |
| text-hello-benchmark | text | 0 | HELLO BENCHMARK |
| text-qmu-research-2026 | text | 0 | QMU RESEARCH 2026 |

**採点者の出所。** すべての画像は`claude-sonnet-5`によって読み取られており、各呼び出しの評価基準への回答と書き起こしはアーティファクト内に逐語的に保存されている。

完全な実行記録は[`image-generation-comparison.data.json`](./image-generation-comparison.data.json)としてコミットされており、呼び出しごとのプロンプト、レイテンシ、画像のバイト長、採点者の回答、スコアが含まれている。

生成日時: 2026-07-17T00:53:39.901Z

**過去の調査 / Past surveys in this series**

Earlier dated surveys of this topic, newest first — each a complete article for its run.

- [2026-07-17T00:53:39.901Z](./history/image-generation/2026-07-17T00-53-39-901Z/image-generation-comparison.ja)
