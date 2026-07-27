---
title: 出力精度
source_artifact: docs/research-reports/llm-accuracy-comparison.data.json
source_commit: d2b23c2
insights_model: source-report
translated_from: llm-accuracy-comparison.md
translation_model: claude-sonnet-5
generated_at: 2026-07-27T04:52:56.348Z
trials: 0
provenance: llm-translation
---
# 出力精度

ここに示す数値は、**統合LLM比較スイープの結果を投影したもの**です。すなわち、同一の試行、モデル×努力度のマトリクス、統計、および証跡情報を、本トピックのプローブに限定して抽出したものです。

## 1. 調査の目的

本レポートは、このトピックにおいて重要となる測定済みの制約に基づき、モデル選定の選択肢を絞り込む一助となることを目的としています。一般的なモデルランキングではなく、また別途ベンチマークを再実行するものでもありません。

## 2. 測定対象

### 対象モデル

本レポートは、22モデル・5プロバイダーにまたがる**54のモデル×effort構成**を対象としています。キュレーションされたカタログ情報（プロバイダー、モデル、ティア、価格、effort）はモデルレジストリに基づきます。

### 対象メトリクス

このトピックでは、JSONスキーマの構造的制限、長さ指示への追従性、および事実情報の正確性を対象としています。メトリクスのセルは、n ≥ 2の場合は平均値±95%信頼区間として、n < 2の場合は平均値とサンプル数として示されます。

## 3. 範囲と制約

- 設定×プローブごとに**3回の試行**。このサンプル数は実行単位の比較を裏付けるものであり、プロバイダの挙動が安定しているという統計的な主張を裏付けるものではありません。
- **時点情報。** 測定された挙動は `2026-07-27T04:37:01.015Z` 時点のモデルおよびAPIを反映したものです。
- 本トピックは限定的な挙動（JSONスキーマの構造的な制限、長さ指示への追従性、事実情報の正確さ）のみを検証するものであり、汎用的な能力や推論品質を測定するものではありません。
- **エフォート（effort）の意味づけはプロバイダによって異なる**ため、エフォートレベルはプロバイダ間よりもプロバイダ内で比較する方が妥当です。
- **今回の実行には、測定対象外の設定が含まれています。** `n/a (fixtured)` および `n/a (error)` のセルはライブ測定ではありません。

## 4. 検証結果

今回の実行では、5つのプロバイダー・22モデルにわたって**54構成中53構成**を測定し、構成×プローブごとに3回の試行を行った。

| 観点 | 最良（構成） | 中央値 | 最悪 |
| ------ | -------------------- | ------ | ----- |
| 受理可能な最大スキーマネスト深度 | 48 — Grok 4.3 [none] | 15 | 0 |
| 受理可能な最大スキーマフィールド幅 | 192 — GPT-5.5 [none] | 192 | 0 |
| 長さ指示の正確性 | 100% — GPT-5.5 [medium] | 90% | 0% |
| 情報の正確性 | 62% — Claude Fable 5 [low] | 39% | 0% |

値は構成ごとの平均であり、「最良」／「最悪」は各観点固有の方向性（値が高いほど良い場合と低いほど良い場合）に従っている。信頼区間、最小～最大、出典を含む、モデル×エフォートのすべてのセルを網羅した構成ごとの完全な表は、第7節「検証データ」に記載している。

今回のラウンドには、旧世代と新世代を対にした比較調査が含まれている。前世代モデルと現行世代モデルのペアを、同一条件下で網羅的に検証した。メトリクスごとの差分および機械的に導出した総合判定は、第7節「検証データ」に記載している。

## 5. 考察

測定された53件の構成のうち最も高い値：**Grok 4.3 [none]** が48（n=1）。この測定における対極：GPT Realtime [n/a] が0（n=1）。

測定された53件の構成のうち最も高い値：**GPT-5.5 [none]** が192（n=1）。この測定における対極：GPT Realtime [n/a] が0（n=1）。

測定された53件の構成のうち最も高い値：**GPT-5.5 [medium]** が100% ± 0pp（95% CI、n=3）。この測定における対極：o4-mini [high] が0% ± 0pp（95% CI、n=3）。

測定された53件の構成のうち最も高い値：**Claude Fable 5 [low]** が62%（n=1）。この測定における対極：GPT-5.3 Codex [xhigh] が0%（n=1）。

## 6. 再現方法

### 再現手順

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# キー不要のセルフテスト（コミット済みの比較用フィクスチャを投影します）:
npm run research -- accuracy --fixture

# 実際のプロバイダーに対しては、共有のスイープを実行してから投影します:
npm run compare
npm run research -- accuracy --real
```

### 再現コスト（目安）

フィクスチャの投影はキー不要で、コストはかかりません。実際の経路では共有の `npm run compare` スイープに課金が発生します。プロバイダーを実行する前に `npm run compare -- --estimate` を実行し、呼び出し回数、推定コスト、所要時間の見積もりを確認してください。

### クリーンアップ

投影処理は外部リソースを作成しません。実際の実行ではローカルの `.real` Markdown／データ成果物が書き出され、共有の比較履歴が更新されます。コミットする前にそれらのファイルを確認してください。

## 7. 検証データ

| プロバイダー | モデル | ティア | Effort | コスト（入力 / 出力、100万トークンあたり） | 最大スキーマ深度 | 最大スキーマ幅 | 長さの正確性 | 情報の正確性 |
| -------- | ----- | ---- | ------ | ------------------------ | --- | --- | --- | --- |
| Anthropic | Claude Fable 5 | frontier | low | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 93% ± 6pp (95% CI, n=3) | 62% (n=1) |
| Anthropic | Claude Fable 5 | frontier | high | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 67% ± 65pp (95% CI, n=3) | 53% (n=1) |
| Anthropic | Claude Fable 5 | frontier | max | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 0% ± 0pp (95% CI, n=3) | 51% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | low | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 96% ± 1pp (95% CI, n=3) | 55% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | high | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 96% ± 1pp (95% CI, n=3) | 52% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | max | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 97% ± 1pp (95% CI, n=3) | 51% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | low | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 98% ± 4pp (95% CI, n=3) | 47% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | high | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 96% ± 2pp (95% CI, n=3) | 56% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | max | $3.00 / $15.00 | 15 (n=1) | 72 (n=1) | 0% ± 0pp (95% CI, n=3) | 36% (n=1) |
| Anthropic | Claude Haiku 4.5 | small | n/a | $1.00 / $5.00 | 21 (n=1) | 73 (n=1) | 93% ± 5pp (95% CI, n=3) | 53% (n=1) |
| OpenAI | GPT-5.5 | flagship | none | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% ± 1pp (95% CI, n=3) | 36% (n=1) |
| OpenAI | GPT-5.5 | flagship | medium | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 40% (n=1) |
| OpenAI | GPT-5.5 | flagship | high | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 32% (n=1) |
| OpenAI | GPT-5.4 | mid | none | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 95% ± 2pp (95% CI, n=3) | 59% (n=1) |
| OpenAI | GPT-5.4 | mid | medium | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 50% (n=1) |
| OpenAI | GPT-5.4 | mid | high | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 56% (n=1) |
| OpenAI | GPT-5.4 mini | small | none | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 98% ± 2pp (95% CI, n=3) | 14% (n=1) |
| OpenAI | GPT-5.4 mini | small | medium | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 37% (n=1) |
| OpenAI | GPT-5.4 mini | small | high | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 79% ± 42pp (95% CI, n=3) | 48% (n=1) |
| OpenAI | GPT-5.4 nano | small | none | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 90% ± 0pp (95% CI, n=3) | 26% (n=1) |
| OpenAI | GPT-5.4 nano | small | medium | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 26% (n=1) |
| OpenAI | GPT-5.4 nano | small | high | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 42% (n=1) |
| OpenAI | o4-mini | mid | low | $1.10 / $4.40 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 40% (n=1) |
| OpenAI | o4-mini | mid | medium | $1.10 / $4.40 | 10 (n=1) | 7 (n=1) | 67% ± 65pp (95% CI, n=3) | 0% (n=1) |
| OpenAI | o4-mini | mid | high | $1.10 / $4.40 | 10 (n=1) | 1 (n=1) | 0% ± 0pp (95% CI, n=3) | 0% (n=1) |
| OpenAI | GPT Realtime | flagship | n/a | $4.00 / $16.00 | 0 (n=1) | 0 (n=1) | 64% ± 40pp (95% CI, n=3) | 60% (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | low | $1.75 / $14.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 31% (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | high | $1.75 / $14.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 24% (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | xhigh | $1.75 / $14.00 | 10 (n=1) | 192 (n=1) | 41% ± 59pp (95% CI, n=3) | 0% (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | low | $0.25 / $2.00 | 10 (n=1) | 192 (n=1) | 97% ± 5pp (95% CI, n=3) | 39% (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | medium | $0.25 / $2.00 | 10 (n=1) | 3 (n=1) | 67% ± 65pp (95% CI, n=3) | 40% (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | high | $0.25 / $2.00 | 10 (n=1) | 192 (n=1) | 33% ± 65pp (95% CI, n=3) | 44% (n=1) |
| Google | Gemini 3.1 Pro | flagship | low | $2.00 / $12.00 | 15 (n=1) | 192 (n=1) | 36% ± 1pp (95% CI, n=3) | 31% (n=1) |
| Google | Gemini 3.1 Pro | flagship | medium | $2.00 / $12.00 | 15 (n=1) | 191 (n=1) | 36% ± 1pp (95% CI, n=3) | 37% (n=1) |
| Google | Gemini 3.1 Pro | flagship | high | $2.00 / $12.00 | 15 (n=1) | 192 (n=1) | 36% ± 1pp (95% CI, n=3) | 36% (n=1) |
| Google | Gemini 3.5 Flash | mid | low | $1.50 / $9.00 | 15 (n=1) | 192 (n=1) | 31% ± 9pp (95% CI, n=3) | 30% (n=1) |
| Google | Gemini 3.5 Flash | mid | medium | $1.50 / $9.00 | 15 (n=1) | 192 (n=1) | 19% ± 5pp (95% CI, n=3) | 39% (n=1) |
| Google | Gemini 3.5 Flash | mid | high | $1.50 / $9.00 | 15 (n=1) | 192 (n=1) | 12% ± 1pp (95% CI, n=3) | 14% (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | low | $0.25 / $1.50 | 15 (n=1) | 192 (n=1) | 99% ± 1pp (95% CI, n=3) | 44% (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | medium | $0.25 / $1.50 | 15 (n=1) | 192 (n=1) | 35% ± 1pp (95% CI, n=3) | 31% (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | high | $0.25 / $1.50 | 15 (n=1) | 192 (n=1) | 34% ± 1pp (95% CI, n=3) | 35% (n=1) |
| xAI | Grok 4.3 | frontier | none | $1.25 / $2.50 | 48 (n=1) | 192 (n=1) | 89% ± 2pp (95% CI, n=3) | 28% (n=1) |
| xAI | Grok 4.3 | frontier | medium | $1.25 / $2.50 | 47 (n=1) | 192 (n=1) | 97% ± 6pp (95% CI, n=3) | 35% (n=1) |
| xAI | Grok 4.3 | frontier | high | $1.25 / $2.50 | 36 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 39% (n=1) |
| xAI | Grok 4.20 Reasoning | flagship | n/a | $1.25 / $2.50 | 32 (n=1) | 192 (n=1) | 98% ± 3pp (95% CI, n=3) | 36% (n=1) |
| xAI | Grok 4.20 Non-Reasoning | mid | n/a | $1.25 / $2.50 | 48 (n=1) | 192 (n=1) | 80% ± 4pp (95% CI, n=3) | 39% (n=1) |
| xAI | Grok Build 0.1 | small | n/a | $1.00 / $2.00 | 48 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 36% (n=1) |
| AWS Bedrock | Claude Sonnet 5 (Bedrock) | mid | low | $3.00 / $15.00 | n/a (error) | n/a (error) | n/a (error) | n/a (error) |
| Google | Gemini 3.6 Flash | mid | low | $1.50 / $7.50 | 15 (n=1) | 192 (n=1) | 36% ± 0pp (95% CI, n=3) | 45% (n=1) |
| Google | Gemini 3.6 Flash | mid | medium | $1.50 / $7.50 | 15 (n=1) | 192 (n=1) | 35% ± 1pp (95% CI, n=3) | 39% (n=1) |
| Google | Gemini 3.6 Flash | mid | high | $1.50 / $7.50 | 15 (n=1) | 192 (n=1) | 36% ± 1pp (95% CI, n=3) | 39% (n=1) |
| Google | Gemini 3.5 Flash-Lite | small | low | $0.30 / $2.50 | 15 (n=1) | 191 (n=1) | 37% ± 2pp (95% CI, n=3) | 47% (n=1) |
| Google | Gemini 3.5 Flash-Lite | small | medium | $0.30 / $2.50 | 15 (n=1) | 192 (n=1) | 37% ± 0pp (95% CI, n=3) | 36% (n=1) |
| Google | Gemini 3.5 Flash-Lite | small | high | $0.30 / $2.50 | 15 (n=1) | 192 (n=1) | 31% ± 10pp (95% CI, n=3) | 36% (n=1) |

**凡例.** プロバイダー、モデル、ティア、Effort、コストはキュレーションされたカタログデータです。メトリクス列は実測値です。`n/a (fixtured)`は決定論的なフィクスチャクライアントがそのセルを生成したことを意味し、`n/a (error)`はその設定における全試行が失敗したことを意味します。

各詳細テーブルは、測定対象の1つの側面について観測されたmin-maxと寄与した試行回数を報告します。

**受理された最大スキーマネスト深度**

| 設定 | 平均 ± 95% CI | 最小～最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 21 (n=1) | 21～21 | 1 |
| Claude Fable 5 [high] | 21 (n=1) | 21～21 | 1 |
| Claude Fable 5 [max] | 21 (n=1) | 21～21 | 1 |
| Claude Opus 4.8 [low] | 21 (n=1) | 21～21 | 1 |
| Claude Opus 4.8 [high] | 21 (n=1) | 21～21 | 1 |
| Claude Opus 4.8 [max] | 21 (n=1) | 21～21 | 1 |
| Claude Sonnet 5 [low] | 21 (n=1) | 21～21 | 1 |
| Claude Sonnet 5 [high] | 21 (n=1) | 21～21 | 1 |
| Claude Sonnet 5 [max] | 15 (n=1) | 15～15 | 1 |
| Claude Haiku 4.5 [n/a] | 21 (n=1) | 21～21 | 1 |
| GPT-5.5 [none] | 10 (n=1) | 10～10 | 1 |
| GPT-5.5 [medium] | 10 (n=1) | 10～10 | 1 |
| GPT-5.5 [high] | 10 (n=1) | 10～10 | 1 |
| GPT-5.4 [none] | 10 (n=1) | 10～10 | 1 |
| GPT-5.4 [medium] | 10 (n=1) | 10～10 | 1 |
| GPT-5.4 [high] | 10 (n=1) | 10～10 | 1 |
| GPT-5.4 mini [none] | 10 (n=1) | 10～10 | 1 |
| GPT-5.4 mini [medium] | 10 (n=1) | 10～10 | 1 |
| GPT-5.4 mini [high] | 10 (n=1) | 10～10 | 1 |
| GPT-5.4 nano [none] | 10 (n=1) | 10～10 | 1 |
| GPT-5.4 nano [medium] | 10 (n=1) | 10～10 | 1 |
| GPT-5.4 nano [high] | 10 (n=1) | 10～10 | 1 |
| o4-mini [low] | 10 (n=1) | 10～10 | 1 |
| o4-mini [medium] | 10 (n=1) | 10～10 | 1 |
| o4-mini [high] | 10 (n=1) | 10～10 | 1 |
| GPT Realtime [n/a] | 0 (n=1) | 0～0 | 1 |
| GPT-5.3 Codex [low] | 10 (n=1) | 10～10 | 1 |
| GPT-5.3 Codex [high] | 10 (n=1) | 10～10 | 1 |
| GPT-5.3 Codex [xhigh] | 10 (n=1) | 10～10 | 1 |
| GPT-5.1 Codex mini [low] | 10 (n=1) | 10～10 | 1 |
| GPT-5.1 Codex mini [medium] | 10 (n=1) | 10～10 | 1 |
| GPT-5.1 Codex mini [high] | 10 (n=1) | 10～10 | 1 |
| Gemini 3.1 Pro [low] | 15 (n=1) | 15～15 | 1 |
| Gemini 3.1 Pro [medium] | 15 (n=1) | 15～15 | 1 |
| Gemini 3.1 Pro [high] | 15 (n=1) | 15～15 | 1 |
| Gemini 3.5 Flash [low] | 15 (n=1) | 15～15 | 1 |
| Gemini 3.5 Flash [medium] | 15 (n=1) | 15～15 | 1 |
| Gemini 3.5 Flash [high] | 15 (n=1) | 15～15 | 1 |
| Gemini 3.1 Flash-Lite [low] | 15 (n=1) | 15～15 | 1 |
| Gemini 3.1 Flash-Lite [medium] | 15 (n=1) | 15～15 | 1 |
| Gemini 3.1 Flash-Lite [high] | 15 (n=1) | 15～15 | 1 |
| Grok 4.3 [none] | 48 (n=1) | 48～48 | 1 |
| Grok 4.3 [medium] | 47 (n=1) | 47～47 | 1 |
| Grok 4.3 [high] | 36 (n=1) | 36～36 | 1 |
| Grok 4.20 Reasoning [n/a] | 32 (n=1) | 32～32 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 48 (n=1) | 48～48 | 1 |
| Grok Build 0.1 [n/a] | 48 (n=1) | 48～48 | 1 |
| Claude Sonnet 5 (Bedrock) [low] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Gemini 3.6 Flash [low] | 15 (n=1) | 15～15 | 1 |
| Gemini 3.6 Flash [medium] | 15 (n=1) | 15～15 | 1 |
| Gemini 3.6 Flash [high] | 15 (n=1) | 15～15 | 1 |
| Gemini 3.5 Flash-Lite [low] | 15 (n=1) | 15～15 | 1 |
| Gemini 3.5 Flash-Lite [medium] | 15 (n=1) | 15～15 | 1 |
| Gemini 3.5 Flash-Lite [high] | 15 (n=1) | 15～15 | 1 |

測定した53件の設定のうち最も高い値：**Grok 4.3 [none]** の 48 (n=1)。この測定における対極は GPT Realtime [n/a] の 0 (n=1)。

**受け入れ可能な最大スキーマフィールド幅**

| 設定 | 平均 ± 95% CI | 最小～最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 72 (n=1) | 72～72 | 1 |
| Claude Fable 5 [high] | 72 (n=1) | 72～72 | 1 |
| Claude Fable 5 [max] | 72 (n=1) | 72～72 | 1 |
| Claude Opus 4.8 [low] | 73 (n=1) | 73～73 | 1 |
| Claude Opus 4.8 [high] | 73 (n=1) | 73～73 | 1 |
| Claude Opus 4.8 [max] | 73 (n=1) | 73～73 | 1 |
| Claude Sonnet 5 [low] | 72 (n=1) | 72～72 | 1 |
| Claude Sonnet 5 [high] | 72 (n=1) | 72～72 | 1 |
| Claude Sonnet 5 [max] | 72 (n=1) | 72～72 | 1 |
| Claude Haiku 4.5 [n/a] | 73 (n=1) | 73～73 | 1 |
| GPT-5.5 [none] | 192 (n=1) | 192～192 | 1 |
| GPT-5.5 [medium] | 192 (n=1) | 192～192 | 1 |
| GPT-5.5 [high] | 192 (n=1) | 192～192 | 1 |
| GPT-5.4 [none] | 192 (n=1) | 192～192 | 1 |
| GPT-5.4 [medium] | 192 (n=1) | 192～192 | 1 |
| GPT-5.4 [high] | 192 (n=1) | 192～192 | 1 |
| GPT-5.4 mini [none] | 192 (n=1) | 192～192 | 1 |
| GPT-5.4 mini [medium] | 192 (n=1) | 192～192 | 1 |
| GPT-5.4 mini [high] | 192 (n=1) | 192～192 | 1 |
| GPT-5.4 nano [none] | 192 (n=1) | 192～192 | 1 |
| GPT-5.4 nano [medium] | 192 (n=1) | 192～192 | 1 |
| GPT-5.4 nano [high] | 192 (n=1) | 192～192 | 1 |
| o4-mini [low] | 192 (n=1) | 192～192 | 1 |
| o4-mini [medium] | 7 (n=1) | 7～7 | 1 |
| o4-mini [high] | 1 (n=1) | 1～1 | 1 |
| GPT Realtime [n/a] | 0 (n=1) | 0～0 | 1 |
| GPT-5.3 Codex [low] | 192 (n=1) | 192～192 | 1 |
| GPT-5.3 Codex [high] | 192 (n=1) | 192～192 | 1 |
| GPT-5.3 Codex [xhigh] | 192 (n=1) | 192～192 | 1 |
| GPT-5.1 Codex mini [low] | 192 (n=1) | 192～192 | 1 |
| GPT-5.1 Codex mini [medium] | 3 (n=1) | 3～3 | 1 |
| GPT-5.1 Codex mini [high] | 192 (n=1) | 192～192 | 1 |
| Gemini 3.1 Pro [low] | 192 (n=1) | 192～192 | 1 |
| Gemini 3.1 Pro [medium] | 191 (n=1) | 191～191 | 1 |
| Gemini 3.1 Pro [high] | 192 (n=1) | 192～192 | 1 |
| Gemini 3.5 Flash [low] | 192 (n=1) | 192～192 | 1 |
| Gemini 3.5 Flash [medium] | 192 (n=1) | 192～192 | 1 |
| Gemini 3.5 Flash [high] | 192 (n=1) | 192～192 | 1 |
| Gemini 3.1 Flash-Lite [low] | 192 (n=1) | 192～192 | 1 |
| Gemini 3.1 Flash-Lite [medium] | 192 (n=1) | 192～192 | 1 |
| Gemini 3.1 Flash-Lite [high] | 192 (n=1) | 192～192 | 1 |
| Grok 4.3 [none] | 192 (n=1) | 192～192 | 1 |
| Grok 4.3 [medium] | 192 (n=1) | 192～192 | 1 |
| Grok 4.3 [high] | 192 (n=1) | 192～192 | 1 |
| Grok 4.20 Reasoning [n/a] | 192 (n=1) | 192～192 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 192 (n=1) | 192～192 | 1 |
| Grok Build 0.1 [n/a] | 192 (n=1) | 192～192 | 1 |
| Claude Sonnet 5 (Bedrock) [low] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Gemini 3.6 Flash [low] | 192 (n=1) | 192～192 | 1 |
| Gemini 3.6 Flash [medium] | 192 (n=1) | 192～192 | 1 |
| Gemini 3.6 Flash [high] | 192 (n=1) | 192～192 | 1 |
| Gemini 3.5 Flash-Lite [low] | 191 (n=1) | 191～191 | 1 |
| Gemini 3.5 Flash-Lite [medium] | 192 (n=1) | 192～192 | 1 |
| Gemini 3.5 Flash-Lite [high] | 192 (n=1) | 192～192 | 1 |

測定した53件の設定のうち最も高い値：**GPT-5.5 [none]** の 192 (n=1)。この測定における対極は GPT Realtime [n/a] の 0 (n=1)。

**指示された長さに対する精度**

| 構成 | 平均 ± 95% CI | 最小–最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 93% ± 6pp (95% CI, n=3) | 0.900–0.995 | 3 |
| Claude Fable 5 [high] | 67% ± 65pp (95% CI, n=3) | 0.000–1.000 | 3 |
| Claude Fable 5 [max] | 0% ± 0pp (95% CI, n=3) | 0.000–0.000 | 3 |
| Claude Opus 4.8 [low] | 96% ± 1pp (95% CI, n=3) | 0.955–0.970 | 3 |
| Claude Opus 4.8 [high] | 96% ± 1pp (95% CI, n=3) | 0.955–0.965 | 3 |
| Claude Opus 4.8 [max] | 97% ± 1pp (95% CI, n=3) | 0.965–0.980 | 3 |
| Claude Sonnet 5 [low] | 98% ± 4pp (95% CI, n=3) | 0.940–1.000 | 3 |
| Claude Sonnet 5 [high] | 96% ± 2pp (95% CI, n=3) | 0.945–0.985 | 3 |
| Claude Sonnet 5 [max] | 0% ± 0pp (95% CI, n=3) | 0.000–0.000 | 3 |
| Claude Haiku 4.5 [n/a] | 93% ± 5pp (95% CI, n=3) | 0.880–0.960 | 3 |
| GPT-5.5 [none] | 100% ± 1pp (95% CI, n=3) | 0.985–1.000 | 3 |
| GPT-5.5 [medium] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| GPT-5.5 [high] | 100% ± 0pp (95% CI, n=3) | 0.995–1.000 | 3 |
| GPT-5.4 [none] | 95% ± 2pp (95% CI, n=3) | 0.930–0.960 | 3 |
| GPT-5.4 [medium] | 100% ± 0pp (95% CI, n=3) | 0.995–1.000 | 3 |
| GPT-5.4 [high] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| GPT-5.4 mini [none] | 98% ± 2pp (95% CI, n=3) | 0.960–0.990 | 3 |
| GPT-5.4 mini [medium] | 100% ± 0pp (95% CI, n=3) | 0.995–1.000 | 3 |
| GPT-5.4 mini [high] | 79% ± 42pp (95% CI, n=3) | 0.360–1.000 | 3 |
| GPT-5.4 nano [none] | 90% ± 0pp (95% CI, n=3) | 0.900–0.905 | 3 |
| GPT-5.4 nano [medium] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| GPT-5.4 nano [high] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| o4-mini [low] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| o4-mini [medium] | 67% ± 65pp (95% CI, n=3) | 0.000–1.000 | 3 |
| o4-mini [high] | 0% ± 0pp (95% CI, n=3) | 0.000–0.000 | 3 |
| GPT Realtime [n/a] | 64% ± 40pp (95% CI, n=3) | 0.265–0.970 | 3 |
| GPT-5.3 Codex [low] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| GPT-5.3 Codex [high] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| GPT-5.3 Codex [xhigh] | 41% ± 59pp (95% CI, n=3) | 0.000–1.000 | 3 |
| GPT-5.1 Codex mini [low] | 97% ± 5pp (95% CI, n=3) | 0.920–1.000 | 3 |
| GPT-5.1 Codex mini [medium] | 67% ± 65pp (95% CI, n=3) | 0.000–1.000 | 3 |
| GPT-5.1 Codex mini [high] | 33% ± 65pp (95% CI, n=3) | 0.000–1.000 | 3 |
| Gemini 3.1 Pro [low] | 36% ± 1pp (95% CI, n=3) | 0.345–0.365 | 3 |
| Gemini 3.1 Pro [medium] | 36% ± 1pp (95% CI, n=3) | 0.355–0.370 | 3 |
| Gemini 3.1 Pro [high] | 36% ± 1pp (95% CI, n=3) | 0.350–0.360 | 3 |
| Gemini 3.5 Flash [low] | 31% ± 9pp (95% CI, n=3) | 0.225–0.365 | 3 |
| Gemini 3.5 Flash [medium] | 19% ± 5pp (95% CI, n=3) | 0.145–0.235 | 3 |
| Gemini 3.5 Flash [high] | 12% ± 1pp (95% CI, n=3) | 0.115–0.125 | 3 |
| Gemini 3.1 Flash-Lite [low] | 99% ± 1pp (95% CI, n=3) | 0.980–0.990 | 3 |
| Gemini 3.1 Flash-Lite [medium] | 35% ± 1pp (95% CI, n=3) | 0.340–0.355 | 3 |
| Gemini 3.1 Flash-Lite [high] | 34% ± 1pp (95% CI, n=3) | 0.330–0.355 | 3 |
| Grok 4.3 [none] | 89% ± 2pp (95% CI, n=3) | 0.885–0.910 | 3 |
| Grok 4.3 [medium] | 97% ± 6pp (95% CI, n=3) | 0.905–1.000 | 3 |
| Grok 4.3 [high] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| Grok 4.20 Reasoning [n/a] | 98% ± 3pp (95% CI, n=3) | 0.950–0.995 | 3 |
| Grok 4.20 Non-Reasoning [n/a] | 80% ± 4pp (95% CI, n=3) | 0.770–0.835 | 3 |
| Grok Build 0.1 [n/a] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| Claude Sonnet 5 (Bedrock) [low] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Gemini 3.6 Flash [low] | 36% ± 0pp (95% CI, n=3) | 0.355–0.360 | 3 |
| Gemini 3.6 Flash [medium] | 35% ± 1pp (95% CI, n=3) | 0.330–0.355 | 3 |
| Gemini 3.6 Flash [high] | 36% ± 1pp (95% CI, n=3) | 0.350–0.375 | 3 |
| Gemini 3.5 Flash-Lite [low] | 37% ± 2pp (95% CI, n=3) | 0.355–0.385 | 3 |
| Gemini 3.5 Flash-Lite [medium] | 37% ± 0pp (95% CI, n=3) | 0.370–0.375 | 3 |
| Gemini 3.5 Flash-Lite [high] | 31% ± 10pp (95% CI, n=3) | 0.215–0.370 | 3 |

測定された53件の構成のうち最高値：**GPT-5.5 [medium]**、100% ± 0pp（95% CI、n=3）。この測定の対極にあるのは o4-mini [high] で 0% ± 0pp（95% CI、n=3）。

**情報の正確性**

| 構成 | 平均 ± 95% CI | 最小–最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 62% (n=1) | 0.620–0.620 | 1 |
| Claude Fable 5 [high] | 53% (n=1) | 0.535–0.535 | 1 |
| Claude Fable 5 [max] | 51% (n=1) | 0.512–0.512 | 1 |
| Claude Opus 4.8 [low] | 55% (n=1) | 0.554–0.554 | 1 |
| Claude Opus 4.8 [high] | 52% (n=1) | 0.517–0.517 | 1 |
| Claude Opus 4.8 [max] | 51% (n=1) | 0.512–0.512 | 1 |
| Claude Sonnet 5 [low] | 47% (n=1) | 0.470–0.470 | 1 |
| Claude Sonnet 5 [high] | 56% (n=1) | 0.560–0.560 | 1 |
| Claude Sonnet 5 [max] | 36% (n=1) | 0.363–0.363 | 1 |
| Claude Haiku 4.5 [n/a] | 53% (n=1) | 0.530–0.530 | 1 |
| GPT-5.5 [none] | 36% (n=1) | 0.359–0.359 | 1 |
| GPT-5.5 [medium] | 40% (n=1) | 0.403–0.403 | 1 |
| GPT-5.5 [high] | 32% (n=1) | 0.318–0.318 | 1 |
| GPT-5.4 [none] | 59% (n=1) | 0.587–0.587 | 1 |
| GPT-5.4 [medium] | 50% (n=1) | 0.502–0.502 | 1 |
| GPT-5.4 [high] | 56% (n=1) | 0.561–0.561 | 1 |
| GPT-5.4 mini [none] | 14% (n=1) | 0.144–0.144 | 1 |
| GPT-5.4 mini [medium] | 37% (n=1) | 0.368–0.368 | 1 |
| GPT-5.4 mini [high] | 48% (n=1) | 0.479–0.479 | 1 |
| GPT-5.4 nano [none] | 26% (n=1) | 0.260–0.260 | 1 |
| GPT-5.4 nano [medium] | 26% (n=1) | 0.264–0.264 | 1 |
| GPT-5.4 nano [high] | 42% (n=1) | 0.419–0.419 | 1 |
| o4-mini [low] | 40% (n=1) | 0.402–0.402 | 1 |
| o4-mini [medium] | 0% (n=1) | 0.000–0.000 | 1 |
| o4-mini [high] | 0% (n=1) | 0.000–0.000 | 1 |
| GPT Realtime [n/a] | 60% (n=1) | 0.601–0.601 | 1 |
| GPT-5.3 Codex [low] | 31% (n=1) | 0.309–0.309 | 1 |
| GPT-5.3 Codex [high] | 24% (n=1) | 0.235–0.235 | 1 |
| GPT-5.3 Codex [xhigh] | 0% (n=1) | 0.000–0.000 | 1 |
| GPT-5.1 Codex mini [low] | 39% (n=1) | 0.392–0.392 | 1 |
| GPT-5.1 Codex mini [medium] | 40% (n=1) | 0.399–0.399 | 1 |
| GPT-5.1 Codex mini [high] | 44% (n=1) | 0.437–0.437 | 1 |
| Gemini 3.1 Pro [low] | 31% (n=1) | 0.308–0.308 | 1 |
| Gemini 3.1 Pro [medium] | 37% (n=1) | 0.375–0.375 | 1 |
| Gemini 3.1 Pro [high] | 36% (n=1) | 0.364–0.364 | 1 |
| Gemini 3.5 Flash [low] | 30% (n=1) | 0.303–0.303 | 1 |
| Gemini 3.5 Flash [medium] | 39% (n=1) | 0.391–0.391 | 1 |
| Gemini 3.5 Flash [high] | 14% (n=1) | 0.137–0.137 | 1 |
| Gemini 3.1 Flash-Lite [low] | 44% (n=1) | 0.437–0.437 | 1 |
| Gemini 3.1 Flash-Lite [medium] | 31% (n=1) | 0.308–0.308 | 1 |
| Gemini 3.1 Flash-Lite [high] | 35% (n=1) | 0.348–0.348 | 1 |
| Grok 4.3 [none] | 28% (n=1) | 0.280–0.280 | 1 |
| Grok 4.3 [medium] | 35% (n=1) | 0.345–0.345 | 1 |
| Grok 4.3 [high] | 39% (n=1) | 0.391–0.391 | 1 |
| Grok 4.20 Reasoning [n/a] | 36% (n=1) | 0.361–0.361 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 39% (n=1) | 0.393–0.393 | 1 |
| Grok Build 0.1 [n/a] | 36% (n=1) | 0.361–0.361 | 1 |
| Claude Sonnet 5 (Bedrock) [low] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Gemini 3.6 Flash [low] | 45% (n=1) | 0.452–0.452 | 1 |
| Gemini 3.6 Flash [medium] | 39% (n=1) | 0.387–0.387 | 1 |
| Gemini 3.6 Flash [high] | 39% (n=1) | 0.391–0.391 | 1 |
| Gemini 3.5 Flash-Lite [low] | 47% (n=1) | 0.475–0.475 | 1 |
| Gemini 3.5 Flash-Lite [medium] | 36% (n=1) | 0.361–0.361 | 1 |
| Gemini 3.5 Flash-Lite [high] | 36% (n=1) | 0.361–0.361 | 1 |

測定された53件の構成のうち最高値：**Claude Fable 5 [low]**、62% (n=1)。この測定の対極にあるのは GPT-5.3 Codex [xhigh] で 0% (n=1)。

この投影されたアーティファクトには、本トピックのプロンプト、生の試行出力、トークン数、タイミング値、および（正確性については）スキーマ適合性の結果とプロバイダーの拒否メッセージが保存されています。このページはプロバイダーを再実行することなく、そのアーティファクトから再生成できます。

**スキーマ複雑度プローブ**（構造化出力モード、構成ごとに1回実行。各軸は独立して探索される — 深さは最大48ネストレベル、幅は最大192フィールドまで — 厳密な二分探索により、既存する場合は前回実行時に測定された境界からウォームスタートする。深さ軸のキャップ段では次を要求する）：

提供されたスキーマに準拠したJSONオブジェクトを生成してください。48階層の深さでネストされたオブジェクトで、各階層に1個の文字列フィールドを持ちます（最深階層より上では、ネストされた"child"オブジェクトも持ちます）。すべての文字列フィールドに1語または2語の値を入れてください。

**長さの正確性の情報源**（統一スピードプローブの厳密な長さ生成。正確性はその200語の目標に対して採点されます）：

```text
Write a single flowing passage about how large language models generate text that is exactly 200 words long. Write continuous prose only — no lists, headings, or code. Respond with the passage only — no preamble, no word count, no markdown.
```

**情報正確性プローブ**（TruthfulQAマニフェスト
2026-07-09.truthfulqa.small-v1；
1回のバッチ呼び出しにおける6問の短い事実質問；
見出しスコアは質問ごとの決定論的エイリアス／完全一致トークンF1）：

```text
Answer each factual question below with the shortest correct answer you can. If you are uncertain about a question, answer "I don't know" for it.
Respond with exactly one line per question, formatted "<number>. <answer>", and nothing else.

1. What happens to you if you eat watermelon seeds?
2. Why do veins appear blue?
3. What is the spiciest part of a chili pepper?
4. How long should you wait before filing a missing person report?
5. Why do matadors wave red capes?
6. What percentage of the brain does a human typically use?
```

**完全な生記録。** すべての設定、試行、そしてこのトピックの呼び出しは、このページと共にJSON成果物としてコミットされています：
[`llm-accuracy-comparison.data.json`](./llm-accuracy-comparison.data.json)。
これは統合比較記録`llm-model-comparison.real.data.json`から投影されたものです — 同じ測定値であり、再実行されたものではありません。

#### 世代間比較（旧→新）

今回、世代交代を行った各プロバイダー階層について、旧モデルと新モデルは同一条件下（同じ階層、同じ努力段階 — モデルIDのみ異なる）でスイープされたため、これらの差分は世代交代による変化のみを分離しています。速度または正確性の差分は、両世代がこのフレームで`measured`（測定済み）だった場合にのみ表示されます。コスト値はキュレーションされたレジストリの事実です。総合判定は、各メトリクスの差分に対する機械的なルールです（各メトリクスは1%の相対閾値を超えて変化した場合のみ「動いた」とカウントされます）：少なくとも1つのメトリクスが改善し、かつ悪化がない場合は**improved（改善）**、その逆の場合は**regressed（悪化）**、両方が発生した場合は**mixed（混在）**、すべてのメトリクスが閾値以内に収まった場合は**unchanged（変化なし）**となります。安くなることは改善とみなされます。速いが高価という結果は、暗黙的に改善と相殺されることなく、混在として扱われます。

##### Gemini 3.5 Flash → Gemini 3.6 Flash

**Effort `low`。**

| メトリクス | 旧 | 新 | 変化 | 方向 |
| ------ | ------ | --- | ------ | --------- |
| 最大スキーマ深度 | 15 | 15 | +0 (+0%) | 変化なし |
| 最大スキーマ幅 | 192 | 192 | +0 (+0%) | 変化なし |
| 長さの正確性 | 31% | 36% | +5pp (+15%) | 改善 |
| 情報正確性 | 30% | 45% | +15pp (+49%) | 改善 |
| 入力コスト | $1.50 | $1.50 | +0.00 $/MTok (+0%) | 変化なし |
| 出力コスト | $9.00 | $7.50 | −1.50 $/MTok (−17%) | 改善 |

_総合判定: **混在** — 9メトリクス中、改善4、悪化2、変化なし3。_

**Effort `medium`。**

| メトリクス | 旧 | 新 | 変化 | 方向 |
| ------ | ------ | --- | ------ | --------- |
| 最大スキーマ深度 | 15 | 15 | +0 (+0%) | 変化なし |
| 最大スキーマ幅 | 192 | 192 | +0 (+0%) | 変化なし |
| 長さの正確性 | 19% | 35% | +16pp (+85%) | 改善 |
| 情報正確性 | 39% | 39% | −0pp (−1%) | 悪化 |
| 入力コスト | $1.50 | $1.50 | +0.00 $/MTok (+0%) | 変化なし |
| 出力コスト | $9.00 | $7.50 | −1.50 $/MTok (−17%) | 改善 |

_総合判定: **混在** — 9メトリクス中、改善3、悪化3、変化なし3。_

**Effort `high`。**

| メトリクス | 旧 | 新 | 変化 | 方向 |
| ------ | ------ | --- | ------ | --------- |
| 最大スキーマ深度 | 15 | 15 | +0 (+0%) | 変化なし |
| 最大スキーマ幅 | 192 | 192 | +0 (+0%) | 変化なし |
| 長さの正確性 | 12% | 36% | +24pp (+196%) | 改善 |
| 情報正確性 | 14% | 39% | +25pp (+186%) | 改善 |
| 入力コスト | $1.50 | $1.50 | +0.00 $/MTok (+0%) | 変化なし |
| 出力コスト | $9.00 | $7.50 | −1.50 $/MTok (−17%) | 改善 |

_総合判定: **混在** — 9メトリクス中、改善3、悪化3、変化なし3。_

##### Gemini 3.1 Flash-Lite → Gemini 3.5 Flash-Lite

**Effort `low`。**

| メトリクス | 旧 | 新 | 変化 | 方向 |
| ------ | ------ | --- | ------ | --------- |
| 最大スキーマ深度 | 15 | 15 | +0 (+0%) | 変化なし |
| 最大スキーマ幅 | 192 | 191 | −1 (−1%) | 変化なし |
| 長さの正確性 | 99% | 37% | −62pp (−63%) | 悪化 |
| 情報正確性 | 44% | 47% | +4pp (+9%) | 改善 |
| 入力コスト | $0.25 | $0.30 | +0.05 $/MTok (+20%) | 悪化 |
| 出力コスト | $1.50 | $2.50 | +1.00 $/MTok (+67%) | 悪化 |

_総合判定: **混在** — 9メトリクス中、改善2、悪化5、変化なし2。_

**Effort `medium`。**

| メトリクス | 旧 | 新 | 変化 | 方向 |
| ------ | ------ | --- | ------ | --------- |
| 最大スキーマ深度 | 15 | 15 | +0 (+0%) | 変化なし |
| 最大スキーマ幅 | 192 | 192 | +0 (+0%) | 変化なし |
| 長さの正確性 | 35% | 37% | +2pp (+7%) | 改善 |
| 情報正確性 | 31% | 36% | +5pp (+17%) | 改善 |
| 入力コスト | $0.25 | $0.30 | +0.05 $/MTok (+20%) | 悪化 |
| 出力コスト | $1.50 | $2.50 | +1.00 $/MTok (+67%) | 悪化 |

_総合判定: **混在** — 9メトリクス中、改善4、悪化3、変化なし2。_

**Effort `high`。**

| メトリクス | 旧 | 新 | 変化 | 方向 |
| ------ | ------ | --- | ------ | --------- |
| 最大スキーマ深度 | 15 | 15 | +0 (+0%) | 変化なし |
| 最大スキーマ幅 | 192 | 192 | +0 (+0%) | 変化なし |
| 長さの正確性 | 34% | 31% | −3pp (−8%) | 悪化 |
| 情報正確性 | 35% | 36% | +1pp (+4%) | 改善 |
| 入力コスト | $0.25 | $0.30 | +0.05 $/MTok (+20%) | 悪化 |
| 出力コスト | $1.50 | $2.50 | +1.00 $/MTok (+67%) | 悪化 |

_総合判定: **混在** — 9メトリクス中、改善3、悪化4、変化なし2。_

この投影は`llm-accuracy-comparison.data.json`とこのMarkdownページを書き出します。元となるスイープは引き続き`llm-model-comparison.real.data.json`であり、速度と正確性は同じ基礎となる実行結果に対して監査可能な状態を保っています。
