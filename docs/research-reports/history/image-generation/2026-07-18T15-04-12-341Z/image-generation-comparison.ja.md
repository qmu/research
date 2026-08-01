---
title: 画像生成
source_artifact: docs/research-reports/image-generation-comparison.data.json
source_commit: 2601137
insights_model: source-report
translated_from: image-generation-comparison.md
translation_model: claude-sonnet-5
generated_at: 2026-07-18T15:22:16.134Z
trials: 0
provenance: llm-translation
---
# 画像生成

このレポートでは、**機械的に検証可能な**挙動のみに基づいて画像生成モデルを比較する。固定されたビジョン審査モデルが、画像ごとに決定論的なyes/noルーブリックに回答する方式であり、美的な主観評価はスコアに一切反映されない。

## 1. 調査の目的

本調査の目的は、APIから利用可能な画像生成モデルにはどのようなものが存在し、画像1枚あたりのコストはいくらか、どの程度の速さで結果が返るか、そして検証可能なプロンプト制約への忠実度と正確なテキストのレンダリング精度がどの程度かを記録することである。これらは統合方式の選定を左右する特性である。

## 2. 測定対象

### 対象モデル

対象は、キュレーションされたレジストリ（`packages/tech/src/image-generation/models.ts`）に登録された3件の画像生成モデルであり、対象プロバイダーごとに1件ずつ、それぞれ出典と最終検証日が付記されている。

- **Anthropic** は対象外である：画像生成APIを提供していない（2026-07-13時点で確認済み）。

### 対象メトリクス

測定対象のメトリクスは、生成レイテンシ（ms、小さいほど良い）、プロンプト遵守度（満たされたルーブリック制約数／総数、大きいほど良い）、およびテキストレンダリング精度（ビジョン文字起こしで検出された期待トークン数／期待トークン数、大きいほど良い）である。画像あたりのコストはキュレーションされたカタログデータ（参考情報）であり、実測値ではない。

## 3. 範囲と制約

- **審査はするが、評価基準に制約がある。** 固定されたビジョン審査員（`claude-sonnet-5`）が決定論的なyes/noの質問に答え、描画されたテキストを書き起こす。美しさやスタイルを採点することは一切ない。審査員を差し替えることは通常の更新ではなく、計測器の変更にあたる。
- プロンプトマニフェストのバージョン`2`：6カテゴリにわたる13個のプロンプト（11個のルーブリック、2個の正確テキスト）——`mechanical`な形状/テキストのプローブに加え、実務的なカテゴリ（プレゼンテーションスライド、写真、キャラクター、インフォグラフィック、会議資料）が含まれる。履歴は同一マニフェストバージョンのデータ点同士のみを接続する。
- **画像がコミットされるのは実務的カテゴリのみで、サイズには上限がある。** 各実務カテゴリの画像は本記事の隣に`images/`配下として永続化され、そのバイト長とSHA-256がアーティファクトに記録される。一方、mechanicalなプローブはバイト長、所要時間、審査員の回答、スコアを記録するが、画像そのものは記録しない。毎月のフレームがリポジトリに追加する容量を抑えるため、画像は各プロバイダーがサポートする最小サイズをリクエストし、1画像あたり512 KiBの予算を目標とする。
- フィクスチャ経路はキー不要かつ決定論的である。実際のモデルの数値は、オーナーが承認済みのコスト上限内で実経路を実行した場合にのみ現れる（まず`--estimate`を実行すること）。
- 時点情報：計測された挙動は`2026-07-18T15:04:12.341Z`時点のモデルおよびAPIを反映している。カタログ価格は各行の最終確認日時点のものである。

## 4. 検証結果

今回の実行では、3件のモデル行のうち**2件を測定**しています（未測定の行は `fixtured` によるハーネスチェック、または `error` 行であり、数値を捏造することは決してありません）。

| メトリクス | 最良（モデル） | 中央値 | 最悪 |
| ------ | ------------ | ------ | ----- |
| 生成レイテンシ | 5346 ms — Grok Imagine | 11715 ms | 18085 ms |
| プロンプト遵守度 | 100.0% — Grok Imagine | 97.7% | 95.5% |
| テキストレンダリング精度 | 100.0% — GPT Image 1.5 | 100.0% | 100.0% |

「最良」「最悪」は各メトリクス固有の方向性に従います（レイテンシは低いほど良く、遵守度とテキスト精度は高いほど良い）。画像1枚あたりのカタログ価格は、モデル表内の参考データです。モデルごと・プロンプトごとの完全な記録は、セクション7「検証データ」に記載しています。

## 5. 考察

`measured` の来歴を持つ行は、レイテンシ、遵守度、テキストレンダリングの観点で比較できる。価格はカタログ上の文脈情報である。遵守度スコアが低くテキストスコアが高い場合（またはその逆）は、そのモデルが何を誤っているのか──制約への追従なのか、グリフのレンダリングなのか──を切り分ける手がかりとなる。

## 6. 再現方法

### 再現手順

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# キー不要のセルフテスト（決定論的なフィクスチャクライアント）:
npm run research -- image-generation --fixture

# コストのプレビュー、その後オーナー限定の実実行:
npm run research -- image-generation --estimate
npm run research -- image-generation --real
```

### 再現コスト（目安）

フィクスチャ経由の実行はキー不要でコストもかからない。実トライアルでは、生成された画像ごとに各プロバイダーへの課金が発生し（モデルごとの料金一覧を参照）、さらに画像ごとに1回のvision-judgeによる読み取りが加わる。合意された上限額はトライアルあたり$20であり、`--estimate` を必ず先に実行しなければならない。

### クリーンアップ

外部リソースは作成されない。実用カテゴリの画像は判定された後、`images/` 配下のローカルの日付付きフレームに書き込まれる（サイズ上限あり、定性的な展示物としてコミットされる）。機械的プローブ画像は判定後に破棄される。実行によりローカルのMarkdown/JSON成果物とそれらの画像が書き出されるため、コミット前にレビューすること。

## 7. 検証データ

**モデルごとの結果**

| モデル | プロバイダ | 情報源 | 画像あたりの価格 | レイテンシ（平均±標準偏差） | 遵守度（平均±標準偏差） | テキスト精度（平均±標準偏差） | 備考 |
| ----- | -------- | ---------- | ----------- | ----------------- | ------------------- | ----------------------- | ---- |
| GPT Image 1.5 | openai | 実測 | $0.034（1024x1024, medium） | 18085 ± 6170（n=13） | 95.5% ± 10.1%（n=11） | 100.0% ± 0.0%（n=2） |  |
| Gemini 2.5 Flash Image | google | エラー | $0.039（1024x1024, standard） | 未測定 | 未測定 | 未測定 | エラー：画像生成が画像を返さなかった（gemini-2.5-flash-image） |
| Grok Imagine | xai | 実測 | $0.020（standard） | 5346 ± 876（n=13） | 100.0% ± 0.0%（n=11） | 100.0% ± 0.0%（n=2） |  |

**プロンプト一覧（バージョン 2）**

| プロンプトID | カテゴリ | 種別 | ルーブリック項目数 | 期待されるテキスト |
| --------- | -------- | ---- | ----------- | ------------- |
| three-red-circles | mechanical | adherence | 3 | — |
| square-left-of-triangle | mechanical | adherence | 4 | — |
| five-green-stars-row | mechanical | adherence | 3 | — |
| black-cat-facing-left | mechanical | adherence | 3 | — |
| two-orange-one-purple-diamond | mechanical | adherence | 3 | — |
| red-circle-above-blue-line | mechanical | adherence | 3 | — |
| text-hello-benchmark | mechanical | text | 0 | HELLO BENCHMARK |
| text-qmu-research-2026 | mechanical | text | 0 | QMU RESEARCH 2026 |
| slide-quarterly-review | presentation-slide | adherence | 4 | — |
| photo-red-apple | photo | adherence | 4 | — |
| character-cartoon-robot | character | adherence | 4 | — |
| infographic-growth-bars | infographic | adherence | 4 | — |
| meeting-document-minutes | meeting-document | adherence | 4 | — |

**生成された画像（実務カテゴリ）**

以下の画像は、今回の実行で実際に生成されたファイルであり、本記事と並べて `images/` 配下にコミットされている。画像として保存されるのは実務カテゴリのプロンプトのみで、mechanical な図形・テキストのプローブはスコアリングはされるが表示はされない。

**presentation-slide**

_slide-quarterly-review_

![GPT Image 1.5 — slide-quarterly-review](images/gpt-image-1.5--slide-quarterly-review--r0.png)

![Grok Imagine — slide-quarterly-review](images/grok-imagine-image--slide-quarterly-review--r0.jpg)

**photo**

_photo-red-apple_

![GPT Image 1.5 — photo-red-apple](images/gpt-image-1.5--photo-red-apple--r0.png)

![Grok Imagine — photo-red-apple](images/grok-imagine-image--photo-red-apple--r0.jpg)

**character**

_character-cartoon-robot_

![GPT Image 1.5 — character-cartoon-robot](images/gpt-image-1.5--character-cartoon-robot--r0.png)

![Grok Imagine — character-cartoon-robot](images/grok-imagine-image--character-cartoon-robot--r0.jpg)

**infographic**

_infographic-growth-bars_

![GPT Image 1.5 — infographic-growth-bars](images/gpt-image-1.5--infographic-growth-bars--r0.png)

![Grok Imagine — infographic-growth-bars](images/grok-imagine-image--infographic-growth-bars--r0.jpg)

**meeting-document**

_meeting-document-minutes_

![GPT Image 1.5 — meeting-document-minutes](images/gpt-image-1.5--meeting-document-minutes--r0.png)

![Grok Imagine — meeting-document-minutes](images/grok-imagine-image--meeting-document-minutes--r0.jpg)


**判定の情報源。** すべての画像は `claude-sonnet-5` によって読み取られた。各呼び出しのルーブリック回答と書き起こしは、成果物内に一字一句そのまま保存されている。

実行結果の完全な記録は [`image-generation-comparison.data.json`](./image-generation-comparison.data.json) としてコミットされている：呼び出しごとのプロンプト、レイテンシ、画像のバイト長、判定回答、スコアを含む。

生成日時: 2026-07-18T15:04:12.341Z
