---
title: 出力精度
source_artifact: docs/research-reports/llm-accuracy-comparison.data.json
source_commit: 8616bce
insights_model: source-report
translated_from: llm-accuracy-comparison.md
translation_model: claude-sonnet-5
generated_at: 2026-08-05T02:21:03.421Z
trials: 0
provenance: llm-translation
---
# 出力精度

ここに示す数値は、**LLM比較調査全体を横断的に実施したスイープ結果からの抽出**です。すなわち、同一の試行、モデル×エフォートのマトリクス、統計処理、そして出所情報を用いつつ、本トピックのプローブに絞り込んだものとなっています。

## 1. 調査の目的

本レポートは、このトピックにおいて重要となる測定済みの制約条件に基づき、モデル選定の絞り込みを支援するものです。これは一般的なモデルランキングではなく、別途ベンチマークを再実行するものでもありません。

## 2. 測定対象

### 対象モデル

本レポートは、24モデル・5プロバイダーにまたがる**74件のモデル×努力度構成**を対象としている。厳選されたカタログ情報（プロバイダー、モデル、ティア、価格、努力度）はモデルレジストリに基づく。

### 対象メトリクス

このトピックでは、JSONスキーマの構造的制約、長さ指示への追従性、および事実情報の正確性を扱う。メトリクスの各セルは、n ≥ 2の場合は平均値 ± 95%信頼区間として報告され、n < 2の場合は平均値とサンプル数を表示する。

## 3. 範囲と制約

- 設定×プローブごとに**3回の試行**。このサンプル数はランレベルの比較を支えるものであり、プロバイダーの安定した挙動に関する統計的な主張を裏付けるものではありません。
- **測定日は混在しており、この表は単一時点のものではありません。** 74の設定は5つの日付にわたって測定されました：`2026-08-04`が13件、`2026-07-27`が12件、`2026-07-20`が6件、`2026-07-12`が31件、`2026-07-06`が12件です。今回のラウンドで再実行されたのは`2026-08-04`に測定された13件のみであり、残りは以前のフレームから引き継がれたものです。そのため、異なる日付の行間でのモデル比較は同一条件での比較ではありません。セクション7で述べる旧世代→新世代の比較には影響しません — これは両世代が同一フレーム内で測定されたペアからのみ導出されています。
- このトピックは限定的な挙動（JSONスキーマの構造的制限、長さ指示の遵守、事実情報の正確性）のみを検証するものであり、一般的な能力や推論品質を測定するものではありません。
- **効果（effort）の意味づけはプロバイダーごとに異なるため**、効果レベルは同一プロバイダー内での比較の方が、プロバイダー間の比較よりも意味を持ちます。
- **この実行には測定対象外の設定が含まれています。** `n/a (fixtured)`および`n/a (error)`のセルは実測値ではありません。

## 4. 検証結果

今回の実行では、5プロバイダー・24モデルにわたる**74構成中68構成**を、構成×プローブごとに3試行で測定した。

| 観点 | 最良（構成） | 中央値 | 最悪 |
| ------ | -------------------- | ------ | ----- |
| 許容されたスキーマの最大ネスト深度 | 48 — Grok 4.3 [none] | 15 | 0 |
| 許容されたスキーマの最大フィールド幅 | 192 — GPT-5.5 [none] | 192 | 0 |
| 長さ指示の正確性 | 100% — Claude Fable 5 [medium] | 97% | 0% |
| 情報の正確性 | 60% — GPT Realtime [n/a] | 36% | 0% |

値は構成ごとの平均であり、「最良」「最悪」は各観点固有の方向性（値が高いほど良い場合と低いほど良い場合）に従う。信頼区間、最小～最大値、出典を含むモデル×努力度の全セルにわたる構成別詳細テーブルは、第7節「検証データ」に記載する。

今回のラウンドには、統制された旧世代→新世代の比較が含まれる。対になった旧世代モデルと現行世代モデルを同一条件下で網羅的に測定した。メトリクスごとの差分と、機械的に導出された最終判定は、第7節「検証データ」に記載する。

## 5. 考察

測定対象となった68件の構成のうち最も高い数値：**Grok 4.3 [none]** が48（n=1）。この測定における対極：GPT Realtime [n/a] が0（n=1）。

測定対象となった68件の構成のうち最も高い数値：**GPT-5.5 [none]** が192（n=1）。この測定における対極：GPT Realtime [n/a] が0（n=1）。

測定対象となった68件の構成のうち最も高い数値：**Claude Fable 5 [medium]** が100%（n=1）。この測定における対極：o4-mini [high] が0% ± 0pp（95% CI、n=3）。

測定対象となった68件の構成のうち最も高い数値：**GPT Realtime [n/a]** が60%（n=1）。この測定における対極：Grok 4.3 [low] が0%（n=0）。

## 6. 再現方法

### 再現手順

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# キー不要のセルフテスト（コミットされた比較用フィクスチャを投影します）:
npm run research -- accuracy --fixture

# 実際のプロバイダーに対して、共有スイープを実行してから投影します:
npm run compare
npm run research -- accuracy --real
```

### 再現コスト（目安）

フィクスチャの投影はキー不要でコストもかかりません。実測経路では共有の `npm run compare` スイープに課金が発生します。プロバイダーを実行する前に `npm run compare -- --estimate` を実行して、呼び出し回数・推定コスト・所要時間の見積もりを確認してください。

### クリーンアップ

投影処理は外部リソースを作成しません。実測実行ではローカルに `.real` の Markdown／データのアーティファクトが書き出され、共有の比較履歴が更新されます。コミット前にこれらのファイルを確認してください。

## 7. 検証データ

| プロバイダー | モデル | ティア | Effort | コスト（入力／出力 per MTok） | 最大スキーマ深度 | 最大スキーマ幅 | 長さ精度 | 情報精度 |
| -------- | ----- | ---- | ------ | ------------------------ | --- | --- | --- | --- |
| Anthropic | Claude Fable 5 | frontier | low | $10.00 / $50.00 | 20 (n=1) | 72 (n=1) | 97% ± 6pp (95% CI, n=3) | 54% (n=1) |
| Anthropic | Claude Fable 5 | frontier | medium | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 100% (n=1) | 0% (n=0) |
| Anthropic | Claude Fable 5 | frontier | high | $10.00 / $50.00 | 20 (n=1) | 72 (n=1) | 100% ± 0pp (95% CI, n=3) | 53% (n=1) |
| Anthropic | Claude Fable 5 | frontier | xhigh | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 100% (n=1) | 0% (n=0) |
| Anthropic | Claude Fable 5 | frontier | max | $10.00 / $50.00 | 21 (n=1) | 72 (n=1) | 0% ± 0pp (95% CI, n=3) | 48% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | low | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 97% ± 1pp (95% CI, n=3) | 44% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | medium | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 100% (n=1) | 0% (n=0) |
| Anthropic | Claude Opus 4.8 | flagship | high | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 97% ± 1pp (95% CI, n=3) | 53% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | xhigh | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 99% (n=1) | 0% (n=0) |
| Anthropic | Claude Opus 4.8 | flagship | max | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 97% ± 0pp (95% CI, n=3) | 49% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | low | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 98% ± 2pp (95% CI, n=3) | 45% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | medium | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 95% (n=1) | 0% (n=0) |
| Anthropic | Claude Sonnet 5 | mid | high | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 96% ± 1pp (95% CI, n=3) | 58% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | xhigh | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 0% (n=1) | 0% (n=0) |
| Anthropic | Claude Sonnet 5 | mid | max | $3.00 / $15.00 | 15 (n=1) | 72 (n=1) | 0% ± 0pp (95% CI, n=3) | 0% (n=1) |
| Anthropic | Claude Haiku 4.5 | small | n/a | $1.00 / $5.00 | 21 (n=1) | 73 (n=1) | 90% ± 3pp (95% CI, n=3) | 57% (n=1) |
| OpenAI | GPT-5.5 | flagship | none | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% ± 1pp (95% CI, n=3) | 36% (n=1) |
| OpenAI | GPT-5.5 | flagship | low | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) | 0% (n=0) |
| OpenAI | GPT-5.5 | flagship | medium | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 40% (n=1) |
| OpenAI | GPT-5.5 | flagship | high | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 32% (n=1) |
| OpenAI | GPT-5.4 | mid | none | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 95% ± 2pp (95% CI, n=3) | 59% (n=1) |
| OpenAI | GPT-5.4 | mid | low | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) | 0% (n=0) |
| OpenAI | GPT-5.4 | mid | medium | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 50% (n=1) |
| OpenAI | GPT-5.4 | mid | high | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 56% (n=1) |
| OpenAI | GPT-5.4 mini | small | none | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 98% ± 2pp (95% CI, n=3) | 14% (n=1) |
| OpenAI | GPT-5.4 mini | small | low | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) | 0% (n=0) |
| OpenAI | GPT-5.4 mini | small | medium | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 37% (n=1) |
| OpenAI | GPT-5.4 mini | small | high | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 79% ± 42pp (95% CI, n=3) | 48% (n=1) |
| OpenAI | GPT-5.4 nano | small | none | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 90% ± 0pp (95% CI, n=3) | 26% (n=1) |
| OpenAI | GPT-5.4 nano | small | low | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 100% (n=1) | 0% (n=0) |
| OpenAI | GPT-5.4 nano | small | medium | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 26% (n=1) |
| OpenAI | GPT-5.4 nano | small | high | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 42% (n=1) |
| OpenAI | o4-mini | mid | low | $1.10 / $4.40 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 40% (n=1) |
| OpenAI | o4-mini | mid | medium | $1.10 / $4.40 | 10 (n=1) | 7 (n=1) | 67% ± 65pp (95% CI, n=3) | 0% (n=1) |
| OpenAI | o4-mini | mid | high | $1.10 / $4.40 | 10 (n=1) | 1 (n=1) | 0% ± 0pp (95% CI, n=3) | 0% (n=1) |
| OpenAI | GPT Realtime | flagship | n/a | $4.00 / $16.00 | 0 (n=1) | 0 (n=1) | 64% ± 40pp (95% CI, n=3) | 60% (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | low | $1.75 / $14.00 | 10 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 31% (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | medium | $1.75 / $14.00 | 10 (n=1) | 127 (n=1) | 100% (n=1) | 0% (n=0) |
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
| xAI | Grok 4.3 | frontier | low | $1.25 / $2.50 | 48 (n=1) | 192 (n=1) | 100% (n=1) | 0% (n=0) |
| xAI | Grok 4.3 | frontier | medium | $1.25 / $2.50 | 47 (n=1) | 192 (n=1) | 97% ± 6pp (95% CI, n=3) | 35% (n=1) |
| xAI | Grok 4.3 | frontier | high | $1.25 / $2.50 | 36 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 39% (n=1) |
| xAI | Grok 4.20 Reasoning | flagship | n/a | $1.25 / $2.50 | 32 (n=1) | 192 (n=1) | 98% ± 3pp (95% CI, n=3) | 36% (n=1) |
| xAI | Grok 4.20 Non-Reasoning | mid | n/a | $1.25 / $2.50 | 48 (n=1) | 192 (n=1) | 80% ± 4pp (95% CI, n=3) | 39% (n=1) |
| xAI | Grok Build 0.1 | small | n/a | $1.00 / $2.00 | 48 (n=1) | 192 (n=1) | 100% ± 0pp (95% CI, n=3) | 36% (n=1) |
| AWS Bedrock | Claude Opus 4.8 (Bedrock) | flagship | low | $5.00 / $25.00 | n/a（エラー） | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| AWS Bedrock | Claude Opus 4.8 (Bedrock) | flagship | high | $5.00 / $25.00 | n/a（エラー） | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| AWS Bedrock | Claude Opus 4.8 (Bedrock) | flagship | max | $5.00 / $25.00 | n/a（エラー） | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| AWS Bedrock | Claude Sonnet 5 (Bedrock) | mid | low | $3.00 / $15.00 | n/a（エラー） | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| AWS Bedrock | Claude Sonnet 5 (Bedrock) | mid | high | $3.00 / $15.00 | n/a（エラー） | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| AWS Bedrock | Claude Sonnet 5 (Bedrock) | mid | max | $3.00 / $15.00 | n/a（エラー） | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Google | Gemini 3.6 Flash | mid | low | $1.50 / $7.50 | 15 (n=1) | 192 (n=1) | 36% ± 0pp (95% CI, n=3) | 45% (n=1) |
| Google | Gemini 3.6 Flash | mid | medium | $1.50 / $7.50 | 15 (n=1) | 192 (n=1) | 35% ± 1pp (95% CI, n=3) | 39% (n=1) |
| Google | Gemini 3.6 Flash | mid | high | $1.50 / $7.50 | 15 (n=1) | 192 (n=1) | 36% ± 1pp (95% CI, n=3) | 39% (n=1) |
| Google | Gemini 3.5 Flash-Lite | small | low | $0.30 / $2.50 | 15 (n=1) | 191 (n=1) | 37% ± 2pp (95% CI, n=3) | 47% (n=1) |
| Google | Gemini 3.5 Flash-Lite | small | medium | $0.30 / $2.50 | 15 (n=1) | 192 (n=1) | 37% ± 0pp (95% CI, n=3) | 36% (n=1) |
| Google | Gemini 3.5 Flash-Lite | small | high | $0.30 / $2.50 | 15 (n=1) | 192 (n=1) | 31% ± 10pp (95% CI, n=3) | 36% (n=1) |
| Anthropic | Claude Opus 5 | flagship | low | $5.00 / $25.00 | 21 (n=1) | 72 (n=1) | 100% ± 0pp (95% CI, n=3) | 51% (n=1) |
| Anthropic | Claude Opus 5 | flagship | high | $5.00 / $25.00 | 21 (n=1) | 72 (n=1) | 58% ± 58pp (95% CI, n=3) | 48% (n=1) |
| Anthropic | Claude Opus 5 | flagship | max | $5.00 / $25.00 | 21 (n=1) | 72 (n=1) | 16% ± 31pp (95% CI, n=3) | 48% (n=1) |

**凡例。** Provider、Model、Tier、Effort、Costはキュレーションされたカタログデータです。メトリクス列は実測値です。`n/a (fixtured)` は決定論的なフィクスチャクライアントがそのセルを生成したことを意味し、`n/a (error)` はその構成の全試行が失敗したことを意味します。

各詳細テーブルは、1つの測定対象について観測されたmin-maxと寄与した試行回数を報告しています。

**受け入れられたスキーマの最大ネスト深度**

| 構成 | 平均値 ± 95% CI | Min–Max | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 20 (n=1) | 20–20 | 1 |
| Claude Fable 5 [medium] | 21 (n=1) | 21–21 | 1 |
| Claude Fable 5 [high] | 20 (n=1) | 20–20 | 1 |
| Claude Fable 5 [xhigh] | 21 (n=1) | 21–21 | 1 |
| Claude Fable 5 [max] | 21 (n=1) | 21–21 | 1 |
| Claude Opus 4.8 [low] | 21 (n=1) | 21–21 | 1 |
| Claude Opus 4.8 [medium] | 21 (n=1) | 21–21 | 1 |
| Claude Opus 4.8 [high] | 21 (n=1) | 21–21 | 1 |
| Claude Opus 4.8 [xhigh] | 21 (n=1) | 21–21 | 1 |
| Claude Opus 4.8 [max] | 21 (n=1) | 21–21 | 1 |
| Claude Sonnet 5 [low] | 21 (n=1) | 21–21 | 1 |
| Claude Sonnet 5 [medium] | 21 (n=1) | 21–21 | 1 |
| Claude Sonnet 5 [high] | 21 (n=1) | 21–21 | 1 |
| Claude Sonnet 5 [xhigh] | 21 (n=1) | 21–21 | 1 |
| Claude Sonnet 5 [max] | 15 (n=1) | 15–15 | 1 |
| Claude Haiku 4.5 [n/a] | 21 (n=1) | 21–21 | 1 |
| GPT-5.5 [none] | 10 (n=1) | 10–10 | 1 |
| GPT-5.5 [low] | 10 (n=1) | 10–10 | 1 |
| GPT-5.5 [medium] | 10 (n=1) | 10–10 | 1 |
| GPT-5.5 [high] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 [none] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 [low] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 [medium] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 [high] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 mini [none] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 mini [low] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 mini [medium] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 mini [high] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 nano [none] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 nano [low] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 nano [medium] | 10 (n=1) | 10–10 | 1 |
| GPT-5.4 nano [high] | 10 (n=1) | 10–10 | 1 |
| o4-mini [low] | 10 (n=1) | 10–10 | 1 |
| o4-mini [medium] | 10 (n=1) | 10–10 | 1 |
| o4-mini [high] | 10 (n=1) | 10–10 | 1 |
| GPT Realtime [n/a] | 0 (n=1) | 0–0 | 1 |
| GPT-5.3 Codex [low] | 10 (n=1) | 10–10 | 1 |
| GPT-5.3 Codex [medium] | 10 (n=1) | 10–10 | 1 |
| GPT-5.3 Codex [high] | 10 (n=1) | 10–10 | 1 |
| GPT-5.3 Codex [xhigh] | 10 (n=1) | 10–10 | 1 |
| GPT-5.1 Codex mini [low] | 10 (n=1) | 10–10 | 1 |
| GPT-5.1 Codex mini [medium] | 10 (n=1) | 10–10 | 1 |
| GPT-5.1 Codex mini [high] | 10 (n=1) | 10–10 | 1 |
| Gemini 3.1 Pro [low] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.1 Pro [medium] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.1 Pro [high] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.5 Flash [low] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.5 Flash [medium] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.5 Flash [high] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.1 Flash-Lite [low] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.1 Flash-Lite [medium] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.1 Flash-Lite [high] | 15 (n=1) | 15–15 | 1 |
| Grok 4.3 [none] | 48 (n=1) | 48–48 | 1 |
| Grok 4.3 [low] | 48 (n=1) | 48–48 | 1 |
| Grok 4.3 [medium] | 47 (n=1) | 47–47 | 1 |
| Grok 4.3 [high] | 36 (n=1) | 36–36 | 1 |
| Grok 4.20 Reasoning [n/a] | 32 (n=1) | 32–32 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 48 (n=1) | 48–48 | 1 |
| Grok Build 0.1 [n/a] | 48 (n=1) | 48–48 | 1 |
| Claude Opus 4.8 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Gemini 3.6 Flash [low] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.6 Flash [medium] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.6 Flash [high] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.5 Flash-Lite [low] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.5 Flash-Lite [medium] | 15 (n=1) | 15–15 | 1 |
| Gemini 3.5 Flash-Lite [high] | 15 (n=1) | 15–15 | 1 |
| Claude Opus 5 [low] | 21 (n=1) | 21–21 | 1 |
| Claude Opus 5 [high] | 21 (n=1) | 21–21 | 1 |
| Claude Opus 5 [max] | 21 (n=1) | 21–21 | 1 |

測定された68件の構成の中で最も高い値：**Grok 4.3 [none]** の 48 (n=1)。この測定の対極：GPT Realtime [n/a] の 0 (n=1)。

**受け入れられたスキーマの最大フィールド幅**

| 設定 | 平均 ± 95% CI | 最小–最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 72 (n=1) | 72–72 | 1 |
| Claude Fable 5 [medium] | 72 (n=1) | 72–72 | 1 |
| Claude Fable 5 [high] | 72 (n=1) | 72–72 | 1 |
| Claude Fable 5 [xhigh] | 72 (n=1) | 72–72 | 1 |
| Claude Fable 5 [max] | 72 (n=1) | 72–72 | 1 |
| Claude Opus 4.8 [low] | 73 (n=1) | 73–73 | 1 |
| Claude Opus 4.8 [medium] | 73 (n=1) | 73–73 | 1 |
| Claude Opus 4.8 [high] | 73 (n=1) | 73–73 | 1 |
| Claude Opus 4.8 [xhigh] | 73 (n=1) | 73–73 | 1 |
| Claude Opus 4.8 [max] | 73 (n=1) | 73–73 | 1 |
| Claude Sonnet 5 [low] | 72 (n=1) | 72–72 | 1 |
| Claude Sonnet 5 [medium] | 72 (n=1) | 72–72 | 1 |
| Claude Sonnet 5 [high] | 72 (n=1) | 72–72 | 1 |
| Claude Sonnet 5 [xhigh] | 72 (n=1) | 72–72 | 1 |
| Claude Sonnet 5 [max] | 72 (n=1) | 72–72 | 1 |
| Claude Haiku 4.5 [n/a] | 73 (n=1) | 73–73 | 1 |
| GPT-5.5 [none] | 192 (n=1) | 192–192 | 1 |
| GPT-5.5 [low] | 192 (n=1) | 192–192 | 1 |
| GPT-5.5 [medium] | 192 (n=1) | 192–192 | 1 |
| GPT-5.5 [high] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 [none] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 [low] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 [medium] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 [high] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 mini [none] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 mini [low] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 mini [medium] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 mini [high] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 nano [none] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 nano [low] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 nano [medium] | 192 (n=1) | 192–192 | 1 |
| GPT-5.4 nano [high] | 192 (n=1) | 192–192 | 1 |
| o4-mini [low] | 192 (n=1) | 192–192 | 1 |
| o4-mini [medium] | 7 (n=1) | 7–7 | 1 |
| o4-mini [high] | 1 (n=1) | 1–1 | 1 |
| GPT Realtime [n/a] | 0 (n=1) | 0–0 | 1 |
| GPT-5.3 Codex [low] | 192 (n=1) | 192–192 | 1 |
| GPT-5.3 Codex [medium] | 127 (n=1) | 127–127 | 1 |
| GPT-5.3 Codex [high] | 192 (n=1) | 192–192 | 1 |
| GPT-5.3 Codex [xhigh] | 192 (n=1) | 192–192 | 1 |
| GPT-5.1 Codex mini [low] | 192 (n=1) | 192–192 | 1 |
| GPT-5.1 Codex mini [medium] | 3 (n=1) | 3–3 | 1 |
| GPT-5.1 Codex mini [high] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.1 Pro [low] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.1 Pro [medium] | 191 (n=1) | 191–191 | 1 |
| Gemini 3.1 Pro [high] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.5 Flash [low] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.5 Flash [medium] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.5 Flash [high] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.1 Flash-Lite [low] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.1 Flash-Lite [medium] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.1 Flash-Lite [high] | 192 (n=1) | 192–192 | 1 |
| Grok 4.3 [none] | 192 (n=1) | 192–192 | 1 |
| Grok 4.3 [low] | 192 (n=1) | 192–192 | 1 |
| Grok 4.3 [medium] | 192 (n=1) | 192–192 | 1 |
| Grok 4.3 [high] | 192 (n=1) | 192–192 | 1 |
| Grok 4.20 Reasoning [n/a] | 192 (n=1) | 192–192 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 192 (n=1) | 192–192 | 1 |
| Grok Build 0.1 [n/a] | 192 (n=1) | 192–192 | 1 |
| Claude Opus 4.8 (Bedrock) [low] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Opus 4.8 (Bedrock) [high] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Opus 4.8 (Bedrock) [max] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Sonnet 5 (Bedrock) [low] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Sonnet 5 (Bedrock) [high] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Sonnet 5 (Bedrock) [max] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Gemini 3.6 Flash [low] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.6 Flash [medium] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.6 Flash [high] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.5 Flash-Lite [low] | 191 (n=1) | 191–191 | 1 |
| Gemini 3.5 Flash-Lite [medium] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.5 Flash-Lite [high] | 192 (n=1) | 192–192 | 1 |
| Claude Opus 5 [low] | 72 (n=1) | 72–72 | 1 |
| Claude Opus 5 [high] | 72 (n=1) | 72–72 | 1 |
| Claude Opus 5 [max] | 72 (n=1) | 72–72 | 1 |

測定された68件の設定のうち最高値：**GPT-5.5 [none]** の192 (n=1)。この測定における対極：GPT Realtime [n/a] の0 (n=1)。

**長さ指示の正確性**

| 設定 | 平均 ± 95% CI | 最小–最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 97% ± 6pp (95% CI, n=3) | 0.905–1.000 | 3 |
| Claude Fable 5 [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Fable 5 [high] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| Claude Fable 5 [xhigh] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Fable 5 [max] | 0% ± 0pp (95% CI, n=3) | 0.000–0.000 | 3 |
| Claude Opus 4.8 [low] | 97% ± 1pp (95% CI, n=3) | 0.965–0.975 | 3 |
| Claude Opus 4.8 [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Opus 4.8 [high] | 97% ± 1pp (95% CI, n=3) | 0.965–0.985 | 3 |
| Claude Opus 4.8 [xhigh] | 99% (n=1) | 0.990–0.990 | 1 |
| Claude Opus 4.8 [max] | 97% ± 0pp (95% CI, n=3) | 0.965–0.970 | 3 |
| Claude Sonnet 5 [low] | 98% ± 2pp (95% CI, n=3) | 0.960–1.000 | 3 |
| Claude Sonnet 5 [medium] | 95% (n=1) | 0.950–0.950 | 1 |
| Claude Sonnet 5 [high] | 96% ± 1pp (95% CI, n=3) | 0.945–0.965 | 3 |
| Claude Sonnet 5 [xhigh] | 0% (n=1) | 0.000–0.000 | 1 |
| Claude Sonnet 5 [max] | 0% ± 0pp (95% CI, n=3) | 0.000–0.000 | 3 |
| Claude Haiku 4.5 [n/a] | 90% ± 3pp (95% CI, n=3) | 0.865–0.920 | 3 |
| GPT-5.5 [none] | 100% ± 1pp (95% CI, n=3) | 0.985–1.000 | 3 |
| GPT-5.5 [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.5 [medium] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| GPT-5.5 [high] | 100% ± 0pp (95% CI, n=3) | 0.995–1.000 | 3 |
| GPT-5.4 [none] | 95% ± 2pp (95% CI, n=3) | 0.930–0.960 | 3 |
| GPT-5.4 [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 [medium] | 100% ± 0pp (95% CI, n=3) | 0.995–1.000 | 3 |
| GPT-5.4 [high] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| GPT-5.4 mini [none] | 98% ± 2pp (95% CI, n=3) | 0.960–0.990 | 3 |
| GPT-5.4 mini [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 mini [medium] | 100% ± 0pp (95% CI, n=3) | 0.995–1.000 | 3 |
| GPT-5.4 mini [high] | 79% ± 42pp (95% CI, n=3) | 0.360–1.000 | 3 |
| GPT-5.4 nano [none] | 90% ± 0pp (95% CI, n=3) | 0.900–0.905 | 3 |
| GPT-5.4 nano [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 nano [medium] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| GPT-5.4 nano [high] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| o4-mini [low] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| o4-mini [medium] | 67% ± 65pp (95% CI, n=3) | 0.000–1.000 | 3 |
| o4-mini [high] | 0% ± 0pp (95% CI, n=3) | 0.000–0.000 | 3 |
| GPT Realtime [n/a] | 64% ± 40pp (95% CI, n=3) | 0.265–0.970 | 3 |
| GPT-5.3 Codex [low] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| GPT-5.3 Codex [medium] | 100% (n=1) | 1.000–1.000 | 1 |
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
| Grok 4.3 [low] | 100% (n=1) | 1.000–1.000 | 1 |
| Grok 4.3 [medium] | 97% ± 6pp (95% CI, n=3) | 0.905–1.000 | 3 |
| Grok 4.3 [high] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| Grok 4.20 Reasoning [n/a] | 98% ± 3pp (95% CI, n=3) | 0.950–0.995 | 3 |
| Grok 4.20 Non-Reasoning [n/a] | 80% ± 4pp (95% CI, n=3) | 0.770–0.835 | 3 |
| Grok Build 0.1 [n/a] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| Claude Opus 4.8 (Bedrock) [low] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Opus 4.8 (Bedrock) [high] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Opus 4.8 (Bedrock) [max] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Sonnet 5 (Bedrock) [low] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Sonnet 5 (Bedrock) [high] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Sonnet 5 (Bedrock) [max] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Gemini 3.6 Flash [low] | 36% ± 0pp (95% CI, n=3) | 0.355–0.360 | 3 |
| Gemini 3.6 Flash [medium] | 35% ± 1pp (95% CI, n=3) | 0.330–0.355 | 3 |
| Gemini 3.6 Flash [high] | 36% ± 1pp (95% CI, n=3) | 0.350–0.375 | 3 |
| Gemini 3.5 Flash-Lite [low] | 37% ± 2pp (95% CI, n=3) | 0.355–0.385 | 3 |
| Gemini 3.5 Flash-Lite [medium] | 37% ± 0pp (95% CI, n=3) | 0.370–0.375 | 3 |
| Gemini 3.5 Flash-Lite [high] | 31% ± 10pp (95% CI, n=3) | 0.215–0.370 | 3 |
| Claude Opus 5 [low] | 100% ± 0pp (95% CI, n=3) | 1.000–1.000 | 3 |
| Claude Opus 5 [high] | 58% ± 58pp (95% CI, n=3) | 0.000–1.000 | 3 |
| Claude Opus 5 [max] | 16% ± 31pp (95% CI, n=3) | 0.000–0.470 | 3 |

測定した68件の設定のうち、最も高い値を示したのは**Claude Fable 5 [medium]**で、100%（n=1）でした。この測定の対極にあるのはo4-mini [high]で、0% ± 0pp（95% CI, n=3）でした。

**情報の正確性**

| 構成 | 平均 ± 95% CI | 最小～最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 54% (n=1) | 0.545–0.545 | 1 |
| Claude Fable 5 [medium] | 0% (n=0) | 0.000–0.000 | 0 |
| Claude Fable 5 [high] | 53% (n=1) | 0.527–0.527 | 1 |
| Claude Fable 5 [xhigh] | 0% (n=0) | 0.000–0.000 | 0 |
| Claude Fable 5 [max] | 48% (n=1) | 0.482–0.482 | 1 |
| Claude Opus 4.8 [low] | 44% (n=1) | 0.442–0.442 | 1 |
| Claude Opus 4.8 [medium] | 0% (n=0) | 0.000–0.000 | 0 |
| Claude Opus 4.8 [high] | 53% (n=1) | 0.531–0.531 | 1 |
| Claude Opus 4.8 [xhigh] | 0% (n=0) | 0.000–0.000 | 0 |
| Claude Opus 4.8 [max] | 49% (n=1) | 0.493–0.493 | 1 |
| Claude Sonnet 5 [low] | 45% (n=1) | 0.449–0.449 | 1 |
| Claude Sonnet 5 [medium] | 0% (n=0) | 0.000–0.000 | 0 |
| Claude Sonnet 5 [high] | 58% (n=1) | 0.576–0.576 | 1 |
| Claude Sonnet 5 [xhigh] | 0% (n=0) | 0.000–0.000 | 0 |
| Claude Sonnet 5 [max] | 0% (n=1) | 0.000–0.000 | 1 |
| Claude Haiku 4.5 [n/a] | 57% (n=1) | 0.567–0.567 | 1 |
| GPT-5.5 [none] | 36% (n=1) | 0.359–0.359 | 1 |
| GPT-5.5 [low] | 0% (n=0) | 0.000–0.000 | 0 |
| GPT-5.5 [medium] | 40% (n=1) | 0.403–0.403 | 1 |
| GPT-5.5 [high] | 32% (n=1) | 0.318–0.318 | 1 |
| GPT-5.4 [none] | 59% (n=1) | 0.587–0.587 | 1 |
| GPT-5.4 [low] | 0% (n=0) | 0.000–0.000 | 0 |
| GPT-5.4 [medium] | 50% (n=1) | 0.502–0.502 | 1 |
| GPT-5.4 [high] | 56% (n=1) | 0.561–0.561 | 1 |
| GPT-5.4 mini [none] | 14% (n=1) | 0.144–0.144 | 1 |
| GPT-5.4 mini [low] | 0% (n=0) | 0.000–0.000 | 0 |
| GPT-5.4 mini [medium] | 37% (n=1) | 0.368–0.368 | 1 |
| GPT-5.4 mini [high] | 48% (n=1) | 0.479–0.479 | 1 |
| GPT-5.4 nano [none] | 26% (n=1) | 0.260–0.260 | 1 |
| GPT-5.4 nano [low] | 0% (n=0) | 0.000–0.000 | 0 |
| GPT-5.4 nano [medium] | 26% (n=1) | 0.264–0.264 | 1 |
| GPT-5.4 nano [high] | 42% (n=1) | 0.419–0.419 | 1 |
| o4-mini [low] | 40% (n=1) | 0.402–0.402 | 1 |
| o4-mini [medium] | 0% (n=1) | 0.000–0.000 | 1 |
| o4-mini [high] | 0% (n=1) | 0.000–0.000 | 1 |
| GPT Realtime [n/a] | 60% (n=1) | 0.601–0.601 | 1 |
| GPT-5.3 Codex [low] | 31% (n=1) | 0.309–0.309 | 1 |
| GPT-5.3 Codex [medium] | 0% (n=0) | 0.000–0.000 | 0 |
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
| Grok 4.3 [low] | 0% (n=0) | 0.000–0.000 | 0 |
| Grok 4.3 [medium] | 35% (n=1) | 0.345–0.345 | 1 |
| Grok 4.3 [high] | 39% (n=1) | 0.391–0.391 | 1 |
| Grok 4.20 Reasoning [n/a] | 36% (n=1) | 0.361–0.361 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 39% (n=1) | 0.393–0.393 | 1 |
| Grok Build 0.1 [n/a] | 36% (n=1) | 0.361–0.361 | 1 |
| Claude Opus 4.8 (Bedrock) [low] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Opus 4.8 (Bedrock) [high] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Opus 4.8 (Bedrock) [max] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Sonnet 5 (Bedrock) [low] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Sonnet 5 (Bedrock) [high] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Sonnet 5 (Bedrock) [max] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Gemini 3.6 Flash [low] | 45% (n=1) | 0.452–0.452 | 1 |
| Gemini 3.6 Flash [medium] | 39% (n=1) | 0.387–0.387 | 1 |
| Gemini 3.6 Flash [high] | 39% (n=1) | 0.391–0.391 | 1 |
| Gemini 3.5 Flash-Lite [low] | 47% (n=1) | 0.475–0.475 | 1 |
| Gemini 3.5 Flash-Lite [medium] | 36% (n=1) | 0.361–0.361 | 1 |
| Gemini 3.5 Flash-Lite [high] | 36% (n=1) | 0.361–0.361 | 1 |
| Claude Opus 5 [low] | 51% (n=1) | 0.507–0.507 | 1 |
| Claude Opus 5 [high] | 48% (n=1) | 0.482–0.482 | 1 |
| Claude Opus 5 [max] | 48% (n=1) | 0.477–0.477 | 1 |

測定された68件の構成のうち最高値は **GPT Realtime [n/a]** の60%（n=1）。この測定の対極は Grok 4.3 [low] の0%（n=0）。

このプロジェクション成果物には、本トピックのプロンプト、生の試行出力、トークン数、タイミング値、そして（精度については）スキーマ適合結果とプロバイダーの拒否メッセージが保存されている。このページはプロバイダーを再実行することなく、その成果物から再生成できる。

**スキーマ複雑度プローブ**（構造化出力モード、構成ごとに1回実行。各軸は独立して探索され — 深さは最大48ネスト階層、幅は最大192フィールド — 厳密な二分探索によって行われ、既存の場合は前回実行時に測定された境界からウォームスタートする。深さ軸の上限段階で要求される内容）：

```text
Produce a JSON object that conforms to the provided schema: an object nested 48 level(s) deep, each level containing 1 string field(s) (and, above the deepest level, a nested "child" object). Fill every string field with a one-or-two-word value.
```

**長さ精度のソース**（統一速度プローブの厳密な長さ生成。精度はその200-word目標に対して採点される）：

```text
Write a single flowing passage about how large language models generate text that is exactly 200 words long. Write continuous prose only — no lists, headings, or code. Respond with the passage only — no preamble, no word count, no markdown.
```

**情報精度プローブ**（TruthfulQAマニフェスト
2026-07-09.truthfulqa.small-v1；
1回のバッチ呼び出しで6件の短い事実確認質問；
見出しスコア＝質問ごとの決定的なエイリアス／完全一致トークンF1）：

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

**完全な生データ記録。** すべての構成、試行、および本トピックの呼び出しは、このページとともにJSON成果物としてコミットされている：
[`llm-accuracy-comparison.data.json`](./llm-accuracy-comparison.data.json)。
これは統合比較記録
`llm-model-comparison.real.data.json` からプロジェクションされたものであり — 同一の測定値であって、再実行されたものではない。

#### 世代間比較（旧 → 新）

今回の世代交代が発生した各プロバイダー層について、旧モデルと新モデルは同一条件下（同じ層、同じエフォート段階 — 異なるのはモデルidのみ）で計測されており、これらの差分は世代間の変化のみを分離して示している。速度または精度の差分は、両世代がこのフレームで`measured`（実測）である場合にのみ表示され、コストの数値はキュレーションされたレジストリ上の事実である。総合判定はメトリクスごとの差分に対する機械的なルールに基づく（各メトリクスは1%の相対閾値を超えて初めて「変化した」とみなされる）：少なくとも1つのメトリクスが改善し、かつ悪化がない場合は**改善**、その逆の場合は**悪化**、両方が発生した場合は**mixed（混在）**、すべてのメトリクスが閾値内に収まる場合は**unchanged（変化なし）**と判定する。計測されたメトリクスについては、2つの平均値の差がそれらの実行間ばらつきの合計（2つの標準偏差の合計。専用の列に表示）を上回らない場合、さらに**indistinguishable（判別不能）**というラベルが付き、総合判定から除外される。各平均値の背後にある試行数は専用の列に明記されており、その方向性がどのサンプルから導かれたものかを確認できる。すなわち、同一構成で同じスイープを数時間おきに再実行しただけでスループットが最大88%変動しており、単なるパーセンテージの変化それ自体は世代的な方向性を示す証拠にはならない。（この88%は、このメトリクスが2026-08-04に置き換えられる前の廃止済みのpost-first-token throughput定義の下で観測されたものであり、現行のend-to-end定義下では再計測されていない。ここでは現在の推定値としてではなく、実際に観測された最後の数値として引用している。）差分は梯子全体で集計されるのではなく**エフォートレベルごと**に維持される。これは、low・medium・highがそれぞれ異なる動作点であり、それらを平均化するとどの構成でも実際に計測されていない数値を報告することになるためである。コストの数値はレジストリ上の事実であり、ばらつきを持たない。より安価であることは改善であり、速いが高価な結果は「mixed」として扱われ、暗黙的に「改善」へと相殺されることはない。

##### Claude Opus 4.8 → Claude Opus 5

**エフォート `low`。**

| メトリクス | 旧 | 新 | 変化 | 実行間ばらつき | 試行数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 最大スキーマ深度 | 21 | 21 | +0 (+0%) | ±0 | 1 | unchanged |
| 最大スキーマ幅 | 73 | 72 | −1 (−1%) | ±0 | 1 | regressed |
| 長さ精度 | 97% | 100% | +3pp (+3%) | ±1% | 3 | improved |
| 情報精度 | 44% | 51% | +6pp (+15%) | ±0% | 1 | improved |
| 入力コスト | $5.00 | $5.00 | +0.00 $/MTok (+0%) | — | — | unchanged |
| 出力コスト | $25.00 | $25.00 | +0.00 $/MTok (+0%) | — | — | unchanged |

_総合判定: **mixed** — 9メトリクス中、改善3、悪化3、変化なし3。_

**エフォート `high`。**

| メトリクス | 旧 | 新 | 変化 | 実行間ばらつき | 試行数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 最大スキーマ深度 | 21 | 21 | +0 (+0%) | ±0 | 1 | unchanged |
| 最大スキーマ幅 | 73 | 72 | −1 (−1%) | ±0 | 1 | regressed |
| 長さ精度 | 97% | 58% | −40pp (−41%) | ±53% | 3 | indistinguishable |
| 情報精度 | 53% | 48% | −5pp (−9%) | ±0% | 1 | regressed |
| 入力コスト | $5.00 | $5.00 | +0.00 $/MTok (+0%) | — | — | unchanged |
| 出力コスト | $25.00 | $25.00 | +0.00 $/MTok (+0%) | — | — | unchanged |

_総合判定: **mixed** — 9メトリクス中、改善1、悪化4、変化なし3；実行間ばらつきにより判別不能なもの1件を除外。_

**エフォート `max`。**

| メトリクス | 旧 | 新 | 変化 | 実行間ばらつき | 試行数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 最大スキーマ深度 | 21 | 21 | +0 (+0%) | ±0 | 1 | unchanged |
| 最大スキーマ幅 | 73 | 72 | −1 (−1%) | ±0 | 1 | regressed |
| 長さ精度 | 97% | 16% | −81pp (−84%) | ±27% | 3 | regressed |
| 情報精度 | 49% | 48% | −2pp (−3%) | ±0% | 1 | regressed |
| 入力コスト | $5.00 | $5.00 | +0.00 $/MTok (+0%) | — | — | unchanged |
| 出力コスト | $25.00 | $25.00 | +0.00 $/MTok (+0%) | — | — | unchanged |

_総合判定: **mixed** — 9メトリクス中、改善1、悪化5、変化なし3。_

##### Gemini 3.5 Flash → Gemini 3.6 Flash

**エフォート `low`。**

| メトリクス | 旧 | 新 | 変化 | 実行間ばらつき | 試行数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 最大スキーマ深度 | 15 | 15 | +0 (+0%) | ±0 | 1 | unchanged |
| 最大スキーマ幅 | 192 | 192 | +0 (+0%) | ±0 | 1 | unchanged |
| 長さ精度 | 31% | 36% | +5pp (+15%) | ±8% | 3 | indistinguishable |
| 情報精度 | 30% | 45% | +15pp (+49%) | ±0% | 1 | improved |
| 入力コスト | $1.50 | $1.50 | +0.00 $/MTok (+0%) | — | — | unchanged |
| 出力コスト | $9.00 | $7.50 | −1.50 $/MTok (−17%) | — | — | improved |

_総合判定: **mixed** — 9メトリクス中、改善2、悪化3、変化なし3；実行間ばらつきにより判別不能なもの1件を除外。_

**エフォート `medium`。**

| メトリクス | 旧 | 新 | 変化 | 実行間ばらつき | 試行数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 最大スキーマ深度 | 15 | 15 | +0 (+0%) | ±0 | 1 | unchanged |
| 最大スキーマ幅 | 192 | 192 | +0 (+0%) | ±0 | 1 | unchanged |
| 長さ精度 | 19% | 35% | +16pp (+85%) | ±6% | 3 | improved |
| 情報精度 | 39% | 39% | −0pp (−1%) | ±0% | 1 | regressed |
| 入力コスト | $1.50 | $1.50 | +0.00 $/MTok (+0%) | — | — | unchanged |
| 出力コスト | $9.00 | $7.50 | −1.50 $/MTok (−17%) | — | — | improved |

_総合判定: **mixed** — 9メトリクス中、改善2、悪化4、変化なし3。_

**エフォート `high`。**

| メトリクス | 旧 | 新 | 変化 | 実行間ばらつき | 試行数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 最大スキーマ深度 | 15 | 15 | +0 (+0%) | ±0 | 1 | unchanged |
| 最大スキーマ幅 | 192 | 192 | +0 (+0%) | ±0 | 1 | unchanged |
| 長さ精度 | 12% | 36% | +24pp (+196%) | ±2% | 3 | improved |
| 情報精度 | 14% | 39% | +25pp (+186%) | ±0% | 1 | improved |
| 入力コスト | $1.50 | $1.50 | +0.00 $/MTok (+0%) | — | — | unchanged |
| 出力コスト | $9.00 | $7.50 | −1.50 $/MTok (−17%) | — | — | improved |

_総合判定: **mixed** — 9メトリクス中、改善3、悪化3、変化なし3。_

##### Gemini 3.1 Flash-Lite → Gemini 3.5 Flash-Lite

**エフォート `low`。**

| メトリクス | 旧 | 新 | 変化 | 実行間ばらつき | 試行数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 最大スキーマ深度 | 15 | 15 | +0 (+0%) | ±0 | 1 | unchanged |
| 最大スキーマ幅 | 192 | 191 | −1 (−1%) | ±0 | 1 | unchanged |
| 長さ精度 | 99% | 37% | −62pp (−63%) | ±2% | 3 | regressed |
| 情報精度 | 44% | 47% | +4pp (+9%) | ±0% | 1 | improved |
| 入力コスト | $0.25 | $0.30 | +0.05 $/MTok (+20%) | — | — | regressed |
| 出力コスト | $1.50 | $2.50 | +1.00 $/MTok (+67%) | — | — | regressed |

_総合判定: **mixed** — 9メトリクス中、改善1、悪化6、変化なし2。_

**エフォート `medium`。**

| メトリクス | 旧 | 新 | 変化 | 実行間ばらつき | 試行数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 最大スキーマ深度 | 15 | 15 | +0 (+0%) | ±0 | 1 | unchanged |
| 最大スキーマ幅 | 192 | 192 | +0 (+0%) | ±0 | 1 | unchanged |
| 長さ精度 | 35% | 37% | +2pp (+7%) | ±1% | 3 | improved |
| 情報精度 | 31% | 36% | +5pp (+17%) | ±0% | 1 | improved |
| 入力コスト | $0.25 | $0.30 | +0.05 $/MTok (+20%) | — | — | regressed |
| 出力コスト | $1.50 | $2.50 | +1.00 $/MTok (+67%) | — | — | regressed |

_総合判定: **mixed** — 9メトリクス中、改善5、悪化2、変化なし2。_

**エフォート `high`。**

| メトリクス | 旧 | 新 | 変化 | 実行間のばらつき | 試行回数 | 傾向 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 最大スキーマ深度 | 15 | 15 | +0 (+0%) | ±0 | 1 | 変化なし |
| 最大スキーマ幅 | 192 | 192 | +0 (+0%) | ±0 | 1 | 変化なし |
| 長さ精度 | 34% | 31% | −3pp (−8%) | ±10% | 3 | 判別不能 |
| 情報精度 | 35% | 36% | +1pp (+4%) | ±0% | 1 | 改善 |
| 入力コスト | $0.25 | $0.30 | +0.05 $/MTok (+20%) | — | — | 悪化 |
| 出力コスト | $1.50 | $2.50 | +1.00 $/MTok (+67%) | — | — | 悪化 |

_総合評価: **まちまち** — 9個のメトリクスのうち3個が改善、2個が悪化、2個が変化なし。実行間のばらつきにより判別不能な2個は除外。_

このプロジェクションは`llm-accuracy-comparison.data.json`と本Markdownページを出力する。元となるスイープは引き続き`llm-model-comparison.real.data.json`であり、速度と精度は同一の基盤となる実行結果に遡って検証可能な状態を保つ。
