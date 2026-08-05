---
title: 応答速度
source_artifact: docs/research-reports/llm-speed-comparison.data.json
source_commit: 7fa1ee1
insights_model: source-report
translated_from: llm-speed-comparison.md
translation_model: claude-sonnet-5
generated_at: 2026-08-05T01:46:01.143Z
trials: 0
provenance: llm-translation
---
# 応答速度

ここでの数値は、**統合LLM比較スイープの投影結果**です。すなわち、本トピックのプローブに限定した、同一のトライアル、モデル×エフォートのマトリクス、統計、および来歴情報です。

## 1. 調査の目的

本レポートは、このトピックにおいて重要となる測定済みの制約に基づき、モデル選定の絞り込みを支援するものです。これは一般的なモデルランキングではなく、また別途ベンチマークを再実行するものでもありません。

## 2. 測定対象

### 対象モデル

本レポートは、24モデル・5プロバイダーにまたがる**74のモデル×エフォート構成**を対象としています。カタログ情報（プロバイダー、モデル、ティア、価格、エフォート）はモデルレジストリから取得したものです。

### 対象メトリクス

本トピックでは、持続的な生成スループット、Time to First Token、および総応答レイテンシを対象とします。各メトリクスの値は、n ≥ 2 の場合は平均値 ± 95%信頼区間として、n < 2 の場合は平均値とサンプル数として報告します。

## 3. 範囲と制約

- 構成×プローブごとに**3回の試行**を実施。このサンプル数は実行単位での比較を裏付けるものであり、プロバイダーの挙動が安定しているという統計的な主張を裏付けるものではありません。
- **測定日は混在しており、この表は単一時点のものではありません。** 74件の構成は5つの日付にまたがって測定されました：`2026-08-04`が13件、`2026-07-27`が12件、`2026-07-20`が6件、`2026-07-12`が31件、`2026-07-06`が12件です。今回のラウンドで再測定されたのは`2026-08-04`に測定された13件のみで、それ以外は以前のフレームから引き継がれたものです。そのため、日付の異なる行同士のモデル間比較は同一条件での比較ではありません。セクション7における旧世代→新世代の比較にはこの影響はありません — これは両世代が同一フレームで測定されたペアのみから導出されています。
- 本トピックは限定的な挙動（持続的な生成スループット、最初のトークンまでの時間、および総応答レイテンシ）のみを検証するものであり、一般的な能力や推論品質を測定するものではありません。
- **エフォート（effort）のセマンティクスはプロバイダーによって異なる**ため、エフォートレベルはプロバイダー間よりもプロバイダー内での比較の方が妥当です。
- **この実行には非測定の構成が含まれています。** `n/a (fixtured)`および`n/a (error)`のセルはライブ測定ではありません。

## 4. 検証結果

今回の実行では、5 プロバイダー・24 モデルにわたる **74 構成中 68 構成**を、構成×プローブごとに 3 回の試行で測定しました。

| 観点 | 最良（構成） | 中央値 | 最悪 |
| ------ | -------------------- | ------ | ----- |
| リクエスト全体の出力スループット | 194.4 tok/s — o4-mini [medium] | 55.9 tok/s | 4.1 tok/s |
| 最初のトークンまでの時間 | 0 ms — Claude Fable 5 [max] | 5238 ms | 37966 ms |
| 総応答時間 | 623 ms — GPT-5.4 nano [low] | 7531 ms | 38918 ms |

値は構成ごとの平均です。「最良」「最悪」はそれぞれの観点における方向性（高いほど良い、または低いほど良い）に従っています。構成×努力度の全セルについて信頼区間・最小～最大値・出典情報を含む完全な構成別テーブルは、セクション 7「検証データ」に掲載しています。

今回のラウンドには、制御された旧世代→新世代の比較も含まれています。前世代モデルと現行世代モデルのペアを、同一条件下で網羅的に測定しました。メトリクスごとの差分と機械的に導出された総合判定は、セクション 7「検証データ」に記載しています。

## 5. 考察

68件の測定構成のうち最高値：**o4-mini [medium]** が 194 ± 6 tok/s（95% CI、n=3）。この測定の対極にあるのは Grok 4.3 [low] の 4 tok/s（n=1）。

68件の測定構成のうち最低値：**Claude Fable 5 [max]** が 0 ± 0 ms（95% CI、n=3）。この測定の対極にあるのは Grok 4.20 Reasoning [n/a] の 37966 ± 16419 ms（95% CI、n=3）。

68件の測定構成のうち最低値：**GPT-5.4 nano [low]** が 623 ms（n=1）。この測定の対極にあるのは Grok 4.20 Reasoning [n/a] の 38918 ± 16237 ms（95% CI、n=3）。

## 6. 再現方法

### 再現手順

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# キー不要のセルフテスト（コミットされた比較用フィクスチャを投影する）:
npm run research -- speed --fixture

# 実プロバイダーに対して、共有スイープを実行してから投影する:
npm run compare
npm run research -- speed --real
```

### 再現コスト（目安）

フィクスチャの投影はキー不要でコストもかからない。実測パスでは共有の `npm run compare` スイープの料金が発生する。プロバイダー実行の前に `npm run compare -- --estimate` を実行し、呼び出し回数・推定コスト・所要時間の見積もりを事前に確認すること。

### クリーンアップ

投影処理は外部リソースを作成しない。実測実行ではローカルに `.real` の Markdown／データ成果物が書き込まれ、共有の比較履歴が更新される。コミット前にこれらのファイルを確認すること。

## 7. 検証データ

| プロバイダー | モデル | ティア | Effort | コスト（入力／出力 per MTok） | スループット（tok/s） | TTFT (ms) | 総レイテンシ (ms) |
| -------- | ----- | ---- | ------ | ------------------------ | --- | --- | --- |
| Anthropic | Claude Fable 5 | frontier | low | $10.00 / $50.00 | 82 ± 11 tok/s (95% CI, n=3) | 15753 ± 1690 ms (95% CI, n=3) | 18494 ± 1864 ms (95% CI, n=3) |
| Anthropic | Claude Fable 5 | frontier | medium | $6.00 / $30.00 | 15 tok/s (n=1) | 3434 ms (n=1) | 4418 ms (n=1) |
| Anthropic | Claude Fable 5 | frontier | high | $10.00 / $50.00 | 86 ± 3 tok/s (95% CI, n=3) | 17777 ± 955 ms (95% CI, n=3) | 20659 ± 1020 ms (95% CI, n=3) |
| Anthropic | Claude Fable 5 | frontier | xhigh | $6.00 / $30.00 | 12 tok/s (n=1) | 3466 ms (n=1) | 4253 ms (n=1) |
| Anthropic | Claude Fable 5 | frontier | max | $10.00 / $50.00 | 90 ± 2 tok/s (95% CI, n=3) | 0 ± 0 ms (95% CI, n=3) | 22807 ± 460 ms (95% CI, n=3) |
| Anthropic | Claude Opus 4.8 | flagship | low | $5.00 / $25.00 | 54 ± 5 tok/s (95% CI, n=3) | 1180 ± 179 ms (95% CI, n=3) | 7058 ± 652 ms (95% CI, n=3) |
| Anthropic | Claude Opus 4.8 | flagship | medium | $5.00 / $25.00 | 23 tok/s (n=1) | 1176 ms (n=1) | 1935 ms (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | high | $5.00 / $25.00 | 53 ± 1 tok/s (95% CI, n=3) | 1072 ± 56 ms (95% CI, n=3) | 7141 ± 255 ms (95% CI, n=3) |
| Anthropic | Claude Opus 4.8 | flagship | xhigh | $5.00 / $25.00 | 16 tok/s (n=1) | 2143 ms (n=1) | 2896 ms (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | max | $5.00 / $25.00 | 59 ± 6 tok/s (95% CI, n=3) | 890 ± 153 ms (95% CI, n=3) | 6444 ± 872 ms (95% CI, n=3) |
| Anthropic | Claude Sonnet 5 | mid | low | $3.00 / $15.00 | 47 ± 9 tok/s (95% CI, n=3) | 3373 ± 1454 ms (95% CI, n=3) | 8304 ± 1913 ms (95% CI, n=3) |
| Anthropic | Claude Sonnet 5 | mid | medium | $3.00 / $15.00 | 38 tok/s (n=1) | 938 ms (n=1) | 1757 ms (n=1) |
| Anthropic | Claude Sonnet 5 | mid | high | $3.00 / $15.00 | 58 ± 18 tok/s (95% CI, n=3) | 4568 ± 2883 ms (95% CI, n=3) | 8670 ± 1450 ms (95% CI, n=3) |
| Anthropic | Claude Sonnet 5 | mid | xhigh | $3.00 / $15.00 | 36 tok/s (n=1) | 961 ms (n=1) | 1589 ms (n=1) |
| Anthropic | Claude Sonnet 5 | mid | max | $3.00 / $15.00 | 104 ± 6 tok/s (95% CI, n=3) | 0 ± 0 ms (95% CI, n=3) | 19642 ± 1159 ms (95% CI, n=3) |
| Anthropic | Claude Haiku 4.5 | small | n/a | $1.00 / $5.00 | 70 ± 7 tok/s (95% CI, n=3) | 1005 ± 320 ms (95% CI, n=3) | 3816 ± 271 ms (95% CI, n=3) |
| OpenAI | GPT-5.5 | flagship | none | $5.00 / $30.00 | 38 ± 4 tok/s (95% CI, n=3) | 1295 ± 797 ms (95% CI, n=3) | 6264 ± 685 ms (95% CI, n=3) |
| OpenAI | GPT-5.5 | flagship | low | $5.00 / $30.00 | 13 tok/s (n=1) | 912 ms (n=1) | 1380 ms (n=1) |
| OpenAI | GPT-5.5 | flagship | medium | $5.00 / $30.00 | 72 ± 17 tok/s (95% CI, n=3) | 10768 ± 477 ms (95% CI, n=3) | 12439 ± 474 ms (95% CI, n=3) |
| OpenAI | GPT-5.5 | flagship | high | $5.00 / $30.00 | 80 ± 6 tok/s (95% CI, n=3) | 12353 ± 2045 ms (95% CI, n=3) | 13931 ± 2101 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 | mid | none | $2.50 / $15.00 | 69 ± 2 tok/s (95% CI, n=3) | 559 ± 120 ms (95% CI, n=3) | 3209 ± 30 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 | mid | low | $2.50 / $15.00 | 10 tok/s (n=1) | 1099 ms (n=1) | 1387 ms (n=1) |
| OpenAI | GPT-5.4 | mid | medium | $2.50 / $15.00 | 134 ± 12 tok/s (95% CI, n=3) | 6614 ± 732 ms (95% CI, n=3) | 7608 ± 707 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 | mid | high | $2.50 / $15.00 | 158 ± 15 tok/s (95% CI, n=3) | 7369 ± 3281 ms (95% CI, n=3) | 8246 ± 3266 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 mini | small | none | $0.50 / $2.00 | 99 ± 11 tok/s (95% CI, n=3) | 567 ± 27 ms (95% CI, n=3) | 2388 ± 325 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 mini | small | low | $0.50 / $2.00 | 54 tok/s (n=1) | 410 ms (n=1) | 678 ms (n=1) |
| OpenAI | GPT-5.4 mini | small | medium | $0.50 / $2.00 | 191 ± 12 tok/s (95% CI, n=3) | 5594 ± 246 ms (95% CI, n=3) | 6450 ± 260 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 mini | small | high | $0.50 / $2.00 | 179 ± 4 tok/s (95% CI, n=3) | 7211 ± 3669 ms (95% CI, n=3) | 7943 ± 3262 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 nano | small | none | $0.15 / $0.60 | 121 ± 11 tok/s (95% CI, n=3) | 592 ± 79 ms (95% CI, n=3) | 1751 ± 154 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 nano | small | low | $0.15 / $0.60 | 57 tok/s (n=1) | 368 ms (n=1) | 623 ms (n=1) |
| OpenAI | GPT-5.4 nano | small | medium | $0.15 / $0.60 | 171 ± 8 tok/s (95% CI, n=3) | 5618 ± 926 ms (95% CI, n=3) | 6918 ± 794 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 nano | small | high | $0.15 / $0.60 | 167 ± 3 tok/s (95% CI, n=3) | 6161 ± 364 ms (95% CI, n=3) | 7551 ± 354 ms (95% CI, n=3) |
| OpenAI | o4-mini | mid | low | $1.10 / $4.40 | 184 ± 7 tok/s (95% CI, n=3) | 6121 ± 869 ms (95% CI, n=3) | 7380 ± 847 ms (95% CI, n=3) |
| OpenAI | o4-mini | mid | medium | $1.10 / $4.40 | 194 ± 6 tok/s (95% CI, n=3) | 4896 ± 5005 ms (95% CI, n=3) | 9089 ± 1797 ms (95% CI, n=3) |
| OpenAI | o4-mini | mid | high | $1.10 / $4.40 | 184 ± 4 tok/s (95% CI, n=3) | 0 ± 0 ms (95% CI, n=3) | 11146 ± 249 ms (95% CI, n=3) |
| OpenAI | GPT Realtime | flagship | n/a | $4.00 / $16.00 | 91 ± 9 tok/s (95% CI, n=3) | 1137 ± 656 ms (95% CI, n=3) | 3595 ± 1462 ms (95% CI, n=3) |
| OpenAI | GPT-5.3 Codex | flagship | low | $1.75 / $14.00 | 108 ± 6 tok/s (95% CI, n=3) | 7582 ± 252 ms (95% CI, n=3) | 9396 ± 674 ms (95% CI, n=3) |
| OpenAI | GPT-5.3 Codex | flagship | medium | $1.75 / $14.00 | 29 tok/s (n=1) | 760 ms (n=1) | 1529 ms (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | high | $1.75 / $14.00 | 112 ± 11 tok/s (95% CI, n=3) | 11015 ± 4210 ms (95% CI, n=3) | 12711 ± 4083 ms (95% CI, n=3) |
| OpenAI | GPT-5.3 Codex | flagship | xhigh | $1.75 / $14.00 | 40 ± 78 tok/s (95% CI, n=3) | 10810 ± 11322 ms (95% CI, n=3) | 17586 ± 3612 ms (95% CI, n=3) |
| OpenAI | GPT-5.1 Codex mini | small | low | $0.25 / $2.00 | 172 ± 43 tok/s (95% CI, n=3) | 3795 ± 3067 ms (95% CI, n=3) | 5090 ± 3057 ms (95% CI, n=3) |
| OpenAI | GPT-5.1 Codex mini | small | medium | $0.25 / $2.00 | 117 ± 119 tok/s (95% CI, n=3) | 3814 ± 3858 ms (95% CI, n=3) | 8022 ± 2015 ms (95% CI, n=3) |
| OpenAI | GPT-5.1 Codex mini | small | high | $0.25 / $2.00 | 63 ± 123 tok/s (95% CI, n=3) | 1726 ± 3383 ms (95% CI, n=3) | 8873 ± 2365 ms (95% CI, n=3) |
| Google | Gemini 3.1 Pro | flagship | low | $2.00 / $12.00 | 5 ± 0 tok/s (95% CI, n=3) | 14977 ± 45 ms (95% CI, n=3) | 15276 ± 43 ms (95% CI, n=3) |
| Google | Gemini 3.1 Pro | flagship | medium | $2.00 / $12.00 | 5 ± 0 tok/s (95% CI, n=3) | 15376 ± 903 ms (95% CI, n=3) | 15646 ± 864 ms (95% CI, n=3) |
| Google | Gemini 3.1 Pro | flagship | high | $2.00 / $12.00 | 5 ± 0 tok/s (95% CI, n=3) | 15497 ± 979 ms (95% CI, n=3) | 15782 ± 988 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash | mid | low | $1.50 / $9.00 | 10 ± 0 tok/s (95% CI, n=3) | 7520 ± 661 ms (95% CI, n=3) | 7699 ± 600 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash | mid | medium | $1.50 / $9.00 | 10 ± 1 tok/s (95% CI, n=3) | 7333 ± 351 ms (95% CI, n=3) | 7511 ± 381 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash | mid | high | $1.50 / $9.00 | 10 ± 1 tok/s (95% CI, n=3) | 7852 ± 460 ms (95% CI, n=3) | 8002 ± 413 ms (95% CI, n=3) |
| Google | Gemini 3.1 Flash-Lite | small | low | $0.25 / $1.50 | 117 ± 8 tok/s (95% CI, n=3) | 903 ± 51 ms (95% CI, n=3) | 1980 ± 196 ms (95% CI, n=3) |
| Google | Gemini 3.1 Flash-Lite | small | medium | $0.25 / $1.50 | 13 ± 1 tok/s (95% CI, n=3) | 6014 ± 79 ms (95% CI, n=3) | 6079 ± 65 ms (95% CI, n=3) |
| Google | Gemini 3.1 Flash-Lite | small | high | $0.25 / $1.50 | 13 ± 1 tok/s (95% CI, n=3) | 6180 ± 337 ms (95% CI, n=3) | 6252 ± 369 ms (95% CI, n=3) |
| xAI | Grok 4.3 | frontier | none | $1.25 / $2.50 | 84 ± 8 tok/s (95% CI, n=3) | 524 ± 27 ms (95% CI, n=3) | 2382 ± 186 ms (95% CI, n=3) |
| xAI | Grok 4.3 | frontier | low | $1.25 / $2.50 | 4 tok/s (n=1) | 3083 ms (n=1) | 3258 ms (n=1) |
| xAI | Grok 4.3 | frontier | medium | $1.25 / $2.50 | 11 ± 3 tok/s (95% CI, n=3) | 19640 ± 5470 ms (95% CI, n=3) | 20490 ± 5423 ms (95% CI, n=3) |
| xAI | Grok 4.3 | frontier | high | $1.25 / $2.50 | 9 ± 2 tok/s (95% CI, n=3) | 23565 ± 5250 ms (95% CI, n=3) | 24423 ± 5203 ms (95% CI, n=3) |
| xAI | Grok 4.20 Reasoning | flagship | n/a | $1.25 / $2.50 | 6 ± 3 tok/s (95% CI, n=3) | 37966 ± 16419 ms (95% CI, n=3) | 38918 ± 16237 ms (95% CI, n=3) |
| xAI | Grok 4.20 Non-Reasoning | mid | n/a | $1.25 / $2.50 | 85 ± 2 tok/s (95% CI, n=3) | 435 ± 40 ms (95% CI, n=3) | 2919 ± 123 ms (95% CI, n=3) |
| xAI | Grok Build 0.1 | small | n/a | $1.00 / $2.00 | 6 ± 1 tok/s (95% CI, n=3) | 35660 ± 6588 ms (95% CI, n=3) | 36444 ± 6613 ms (95% CI, n=3) |
| AWS Bedrock | Claude Opus 4.8 (Bedrock) | flagship | low | $5.00 / $25.00 | n/a (エラー) | n/a (エラー) | n/a (エラー) |
| AWS Bedrock | Claude Opus 4.8 (Bedrock) | flagship | high | $5.00 / $25.00 | n/a (エラー) | n/a (エラー) | n/a (エラー) |
| AWS Bedrock | Claude Opus 4.8 (Bedrock) | flagship | max | $5.00 / $25.00 | n/a (エラー) | n/a (エラー) | n/a (エラー) |
| AWS Bedrock | Claude Sonnet 5 (Bedrock) | mid | low | $3.00 / $15.00 | n/a (エラー) | n/a (エラー) | n/a (エラー) |
| AWS Bedrock | Claude Sonnet 5 (Bedrock) | mid | high | $3.00 / $15.00 | n/a (エラー) | n/a (エラー) | n/a (エラー) |
| AWS Bedrock | Claude Sonnet 5 (Bedrock) | mid | max | $3.00 / $15.00 | n/a (エラー) | n/a (エラー) | n/a (エラー) |
| Google | Gemini 3.6 Flash | mid | low | $1.50 / $7.50 | 9 ± 0 tok/s (95% CI, n=3) | 9078 ± 372 ms (95% CI, n=3) | 9245 ± 412 ms (95% CI, n=3) |
| Google | Gemini 3.6 Flash | mid | medium | $1.50 / $7.50 | 8 ± 0 tok/s (95% CI, n=3) | 9459 ± 399 ms (95% CI, n=3) | 9609 ± 429 ms (95% CI, n=3) |
| Google | Gemini 3.6 Flash | mid | high | $1.50 / $7.50 | 8 ± 0 tok/s (95% CI, n=3) | 9469 ± 743 ms (95% CI, n=3) | 9657 ± 736 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash-Lite | small | low | $0.30 / $2.50 | 14 ± 0 tok/s (95% CI, n=3) | 5424 ± 147 ms (95% CI, n=3) | 5603 ± 87 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash-Lite | small | medium | $0.30 / $2.50 | 16 ± 2 tok/s (95% CI, n=3) | 5052 ± 534 ms (95% CI, n=3) | 5170 ± 566 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash-Lite | small | high | $0.30 / $2.50 | 14 ± 1 tok/s (95% CI, n=3) | 5512 ± 180 ms (95% CI, n=3) | 5628 ± 138 ms (95% CI, n=3) |
| Anthropic | Claude Opus 5 | flagship | low | $5.00 / $25.00 | 97 ± 8 tok/s (95% CI, n=3) | 13378 ± 3470 ms (95% CI, n=3) | 16046 ± 3430 ms (95% CI, n=3) |
| Anthropic | Claude Opus 5 | flagship | high | $5.00 / $25.00 | 92 ± 2 tok/s (95% CI, n=3) | 10459 ± 11314 ms (95% CI, n=3) | 19883 ± 4784 ms (95% CI, n=3) |
| Anthropic | Claude Opus 5 | flagship | max | $5.00 / $25.00 | 91 ± 2 tok/s (95% CI, n=3) | 7250 ± 14211 ms (95% CI, n=3) | 22622 ± 443 ms (95% CI, n=3) |

**凡例。** Provider、Model、Tier、Effort、Cost はキュレーションされたカタログデータです。メトリクス列は実測値です。`n/a (fixtured)` は決定論的なフィクスチャクライアントがそのセルを生成したことを意味し、`n/a (error)` はその構成のすべての試行が失敗したことを意味します。

各詳細テーブルは、1つの測定項目について観測された最小～最大値と寄与した試行数を示しています。

**リクエスト全体での出力スループット**

| 構成 | 平均 ± 95% CI | 最小～最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 82 ± 11 tok/s (95% CI, n=3) | 70.5–87.8 | 3 |
| Claude Fable 5 [medium] | 15 tok/s (n=1) | 14.6–14.6 | 1 |
| Claude Fable 5 [high] | 86 ± 3 tok/s (95% CI, n=3) | 84.4–89.6 | 3 |
| Claude Fable 5 [xhigh] | 12 tok/s (n=1) | 12.3–12.3 | 1 |
| Claude Fable 5 [max] | 90 ± 2 tok/s (95% CI, n=3) | 88.8–91.7 | 3 |
| Claude Opus 4.8 [low] | 54 ± 5 tok/s (95% CI, n=3) | 50.1–58.2 | 3 |
| Claude Opus 4.8 [medium] | 23 tok/s (n=1) | 23.5–23.5 | 1 |
| Claude Opus 4.8 [high] | 53 ± 1 tok/s (95% CI, n=3) | 51.9–54.3 | 3 |
| Claude Opus 4.8 [xhigh] | 16 tok/s (n=1) | 16.3–16.3 | 1 |
| Claude Opus 4.8 [max] | 59 ± 6 tok/s (95% CI, n=3) | 52.1–61.7 | 3 |
| Claude Sonnet 5 [low] | 47 ± 9 tok/s (95% CI, n=3) | 39.2–55.2 | 3 |
| Claude Sonnet 5 [medium] | 38 tok/s (n=1) | 38.4–38.4 | 1 |
| Claude Sonnet 5 [high] | 58 ± 18 tok/s (95% CI, n=3) | 47.2–76.4 | 3 |
| Claude Sonnet 5 [xhigh] | 36 tok/s (n=1) | 35.5–35.5 | 1 |
| Claude Sonnet 5 [max] | 104 ± 6 tok/s (95% CI, n=3) | 98.4–108.5 | 3 |
| Claude Haiku 4.5 [n/a] | 70 ± 7 tok/s (95% CI, n=3) | 65.3–76.6 | 3 |
| GPT-5.5 [none] | 38 ± 4 tok/s (95% CI, n=3) | 35.1–42.1 | 3 |
| GPT-5.5 [low] | 13 tok/s (n=1) | 13.0–13.0 | 1 |
| GPT-5.5 [medium] | 72 ± 17 tok/s (95% CI, n=3) | 55.1–80.5 | 3 |
| GPT-5.5 [high] | 80 ± 6 tok/s (95% CI, n=3) | 76.3–85.7 | 3 |
| GPT-5.4 [none] | 69 ± 2 tok/s (95% CI, n=3) | 68.1–71.4 | 3 |
| GPT-5.4 [low] | 10 tok/s (n=1) | 9.9–9.9 | 1 |
| GPT-5.4 [medium] | 134 ± 12 tok/s (95% CI, n=3) | 121.6–141.9 | 3 |
| GPT-5.4 [high] | 158 ± 15 tok/s (95% CI, n=3) | 148.7–172.9 | 3 |
| GPT-5.4 mini [none] | 99 ± 11 tok/s (95% CI, n=3) | 87.9–104.4 | 3 |
| GPT-5.4 mini [low] | 54 tok/s (n=1) | 54.5–54.5 | 1 |
| GPT-5.4 mini [medium] | 191 ± 12 tok/s (95% CI, n=3) | 181.4–201.9 | 3 |
| GPT-5.4 mini [high] | 179 ± 4 tok/s (95% CI, n=3) | 175.2–182.2 | 3 |
| GPT-5.4 nano [none] | 121 ± 11 tok/s (95% CI, n=3) | 113.0–131.4 | 3 |
| GPT-5.4 nano [low] | 57 tok/s (n=1) | 57.3–57.3 | 1 |
| GPT-5.4 nano [medium] | 171 ± 8 tok/s (95% CI, n=3) | 165.4–179.2 | 3 |
| GPT-5.4 nano [high] | 167 ± 3 tok/s (95% CI, n=3) | 164.0–169.1 | 3 |
| o4-mini [low] | 184 ± 7 tok/s (95% CI, n=3) | 178.9–190.4 | 3 |
| o4-mini [medium] | 194 ± 6 tok/s (95% CI, n=3) | 190.3–200.0 | 3 |
| o4-mini [high] | 184 ± 4 tok/s (95% CI, n=3) | 181.5–188.0 | 3 |
| GPT Realtime [n/a] | 91 ± 9 tok/s (95% CI, n=3) | 82.4–98.9 | 3 |
| GPT-5.3 Codex [low] | 108 ± 6 tok/s (95% CI, n=3) | 104.6–113.8 | 3 |
| GPT-5.3 Codex [medium] | 29 tok/s (n=1) | 29.2–29.2 | 1 |
| GPT-5.3 Codex [high] | 112 ± 11 tok/s (95% CI, n=3) | 101.8–120.3 | 3 |
| GPT-5.3 Codex [xhigh] | 40 ± 78 tok/s (95% CI, n=3) | 0.0–118.8 | 3 |
| GPT-5.1 Codex mini [low] | 172 ± 43 tok/s (95% CI, n=3) | 129.1–199.7 | 3 |
| GPT-5.1 Codex mini [medium] | 117 ± 119 tok/s (95% CI, n=3) | 0.0–201.3 | 3 |
| GPT-5.1 Codex mini [high] | 63 ± 123 tok/s (95% CI, n=3) | 0.0–188.5 | 3 |
| Gemini 3.1 Pro [low] | 5 ± 0 tok/s (95% CI, n=3) | 5.2–5.2 | 3 |
| Gemini 3.1 Pro [medium] | 5 ± 0 tok/s (95% CI, n=3) | 4.9–5.4 | 3 |
| Gemini 3.1 Pro [high] | 5 ± 0 tok/s (95% CI, n=3) | 4.7–5.2 | 3 |
| Gemini 3.5 Flash [low] | 10 ± 0 tok/s (95% CI, n=3) | 9.8–10.5 | 3 |
| Gemini 3.5 Flash [medium] | 10 ± 1 tok/s (95% CI, n=3) | 9.8–11.3 | 3 |
| Gemini 3.5 Flash [high] | 10 ± 1 tok/s (95% CI, n=3) | 9.7–10.7 | 3 |
| Gemini 3.1 Flash-Lite [low] | 117 ± 8 tok/s (95% CI, n=3) | 108.4–122.6 | 3 |
| Gemini 3.1 Flash-Lite [medium] | 13 ± 1 tok/s (95% CI, n=3) | 12.6–13.6 | 3 |
| Gemini 3.1 Flash-Lite [high] | 13 ± 1 tok/s (95% CI, n=3) | 11.9–13.9 | 3 |
| Grok 4.3 [none] | 84 ± 8 tok/s (95% CI, n=3) | 78.9–91.8 | 3 |
| Grok 4.3 [low] | 4 tok/s (n=1) | 4.1–4.1 | 1 |
| Grok 4.3 [medium] | 11 ± 3 tok/s (95% CI, n=3) | 8.5–13.3 | 3 |
| Grok 4.3 [high] | 9 ± 2 tok/s (95% CI, n=3) | 7.1–10.9 | 3 |
| Grok 4.20 Reasoning [n/a] | 6 ± 3 tok/s (95% CI, n=3) | 3.9–8.8 | 3 |
| Grok 4.20 Non-Reasoning [n/a] | 85 ± 2 tok/s (95% CI, n=3) | 83.5–87.8 | 3 |
| Grok Build 0.1 [n/a] | 6 ± 1 tok/s (95% CI, n=3) | 5.1–7.0 | 3 |
| Claude Opus 4.8 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Opus 4.8 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [low] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [high] | n/a (error) | n/a (error) | n/a (error) |
| Claude Sonnet 5 (Bedrock) [max] | n/a (error) | n/a (error) | n/a (error) |
| Gemini 3.6 Flash [low] | 9 ± 0 tok/s (95% CI, n=3) | 8.4–8.9 | 3 |
| Gemini 3.6 Flash [medium] | 8 ± 0 tok/s (95% CI, n=3) | 7.9–8.4 | 3 |
| Gemini 3.6 Flash [high] | 8 ± 0 tok/s (95% CI, n=3) | 7.9–8.7 | 3 |
| Gemini 3.5 Flash-Lite [low] | 14 ± 0 tok/s (95% CI, n=3) | 13.8–14.4 | 3 |
| Gemini 3.5 Flash-Lite [medium] | 16 ± 2 tok/s (95% CI, n=3) | 14.8–17.8 | 3 |
| Gemini 3.5 Flash-Lite [high] | 14 ± 1 tok/s (95% CI, n=3) | 13.4–14.7 | 3 |
| Claude Opus 5 [low] | 97 ± 8 tok/s (95% CI, n=3) | 88.8–100.8 | 3 |
| Claude Opus 5 [high] | 92 ± 2 tok/s (95% CI, n=3) | 90.0–93.7 | 3 |
| Claude Opus 5 [max] | 91 ± 2 tok/s (95% CI, n=3) | 89.2–92.3 | 3 |

測定された68件の構成のうち最高値：**o4-mini [medium]** が 194 ± 6 tok/s (95% CI, n=3)。この測定における対極は Grok 4.3 [low] で 4 tok/s (n=1)。

**最初のトークンまでの時間**

| 設定 | 平均 ± 95%信頼区間 | 最小～最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 15753 ± 1690 ms (95% CI, n=3) | 14089–16976 | 3 |
| Claude Fable 5 [medium] | 3434 ms (n=1) | 3434–3434 | 1 |
| Claude Fable 5 [high] | 17777 ± 955 ms (95% CI, n=3) | 17205–18746 | 3 |
| Claude Fable 5 [xhigh] | 3466 ms (n=1) | 3466–3466 | 1 |
| Claude Fable 5 [max] | 0 ± 0 ms (95% CI, n=3) | 0–0 | 3 |
| Claude Opus 4.8 [low] | 1180 ± 179 ms (95% CI, n=3) | 1071–1361 | 3 |
| Claude Opus 4.8 [medium] | 1176 ms (n=1) | 1176–1176 | 1 |
| Claude Opus 4.8 [high] | 1072 ± 56 ms (95% CI, n=3) | 1028–1126 | 3 |
| Claude Opus 4.8 [xhigh] | 2143 ms (n=1) | 2143–2143 | 1 |
| Claude Opus 4.8 [max] | 890 ± 153 ms (95% CI, n=3) | 743–1008 | 3 |
| Claude Sonnet 5 [low] | 3373 ± 1454 ms (95% CI, n=3) | 2612–4856 | 3 |
| Claude Sonnet 5 [medium] | 938 ms (n=1) | 938–938 | 1 |
| Claude Sonnet 5 [high] | 4568 ± 2883 ms (95% CI, n=3) | 2151–7229 | 3 |
| Claude Sonnet 5 [xhigh] | 961 ms (n=1) | 961–961 | 1 |
| Claude Sonnet 5 [max] | 0 ± 0 ms (95% CI, n=3) | 0–0 | 3 |
| Claude Haiku 4.5 [n/a] | 1005 ± 320 ms (95% CI, n=3) | 781–1323 | 3 |
| GPT-5.5 [none] | 1295 ± 797 ms (95% CI, n=3) | 722–2082 | 3 |
| GPT-5.5 [low] | 912 ms (n=1) | 912–912 | 1 |
| GPT-5.5 [medium] | 10768 ± 477 ms (95% CI, n=3) | 10484–11253 | 3 |
| GPT-5.5 [high] | 12353 ± 2045 ms (95% CI, n=3) | 10922–14383 | 3 |
| GPT-5.4 [none] | 559 ± 120 ms (95% CI, n=3) | 487–681 | 3 |
| GPT-5.4 [low] | 1099 ms (n=1) | 1099–1099 | 1 |
| GPT-5.4 [medium] | 6614 ± 732 ms (95% CI, n=3) | 6151–7353 | 3 |
| GPT-5.4 [high] | 7369 ± 3281 ms (95% CI, n=3) | 5665–10717 | 3 |
| GPT-5.4 mini [none] | 567 ± 27 ms (95% CI, n=3) | 546–593 | 3 |
| GPT-5.4 mini [low] | 410 ms (n=1) | 410–410 | 1 |
| GPT-5.4 mini [medium] | 5594 ± 246 ms (95% CI, n=3) | 5449–5844 | 3 |
| GPT-5.4 mini [high] | 7211 ± 3669 ms (95% CI, n=3) | 4935–10923 | 3 |
| GPT-5.4 nano [none] | 592 ± 79 ms (95% CI, n=3) | 511–634 | 3 |
| GPT-5.4 nano [low] | 368 ms (n=1) | 368–368 | 1 |
| GPT-5.4 nano [medium] | 5618 ± 926 ms (95% CI, n=3) | 4877–6496 | 3 |
| GPT-5.4 nano [high] | 6161 ± 364 ms (95% CI, n=3) | 5821–6461 | 3 |
| o4-mini [low] | 6121 ± 869 ms (95% CI, n=3) | 5418–6940 | 3 |
| o4-mini [medium] | 4896 ± 5005 ms (95% CI, n=3) | 0–8601 | 3 |
| o4-mini [high] | 0 ± 0 ms (95% CI, n=3) | 0–0 | 3 |
| GPT Realtime [n/a] | 1137 ± 656 ms (95% CI, n=3) | 788–1807 | 3 |
| GPT-5.3 Codex [low] | 7582 ± 252 ms (95% CI, n=3) | 7329–7749 | 3 |
| GPT-5.3 Codex [medium] | 760 ms (n=1) | 760–760 | 1 |
| GPT-5.3 Codex [high] | 11015 ± 4210 ms (95% CI, n=3) | 8341–15264 | 3 |
| GPT-5.3 Codex [xhigh] | 10810 ± 11322 ms (95% CI, n=3) | 0–19746 | 3 |
| GPT-5.1 Codex mini [low] | 3795 ± 3067 ms (95% CI, n=3) | 697–5729 | 3 |
| GPT-5.1 Codex mini [medium] | 3814 ± 3858 ms (95% CI, n=3) | 0–6567 | 3 |
| GPT-5.1 Codex mini [high] | 1726 ± 3383 ms (95% CI, n=3) | 0–5178 | 3 |
| Gemini 3.1 Pro [low] | 14977 ± 45 ms (95% CI, n=3) | 14932–15008 | 3 |
| Gemini 3.1 Pro [medium] | 15376 ± 903 ms (95% CI, n=3) | 14633–16220 | 3 |
| Gemini 3.1 Pro [high] | 15497 ± 979 ms (95% CI, n=3) | 14636–16367 | 3 |
| Gemini 3.5 Flash [low] | 7520 ± 661 ms (95% CI, n=3) | 7035–8169 | 3 |
| Gemini 3.5 Flash [medium] | 7333 ± 351 ms (95% CI, n=3) | 7021–7641 | 3 |
| Gemini 3.5 Flash [high] | 7852 ± 460 ms (95% CI, n=3) | 7384–8122 | 3 |
| Gemini 3.1 Flash-Lite [low] | 903 ± 51 ms (95% CI, n=3) | 868–954 | 3 |
| Gemini 3.1 Flash-Lite [medium] | 6014 ± 79 ms (95% CI, n=3) | 5936–6070 | 3 |
| Gemini 3.1 Flash-Lite [high] | 6180 ± 337 ms (95% CI, n=3) | 5851–6432 | 3 |
| Grok 4.3 [none] | 524 ± 27 ms (95% CI, n=3) | 505–551 | 3 |
| Grok 4.3 [low] | 3083 ms (n=1) | 3083–3083 | 1 |
| Grok 4.3 [medium] | 19640 ± 5470 ms (95% CI, n=3) | 15124–24739 | 3 |
| Grok 4.3 [high] | 23565 ± 5250 ms (95% CI, n=3) | 19629–28680 | 3 |
| Grok 4.20 Reasoning [n/a] | 37966 ± 16419 ms (95% CI, n=3) | 24169–53096 | 3 |
| Grok 4.20 Non-Reasoning [n/a] | 435 ± 40 ms (95% CI, n=3) | 405–474 | 3 |
| Grok Build 0.1 [n/a] | 35660 ± 6588 ms (95% CI, n=3) | 28981–39657 | 3 |
| Claude Opus 4.8 (Bedrock) [low] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Opus 4.8 (Bedrock) [high] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Opus 4.8 (Bedrock) [max] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Sonnet 5 (Bedrock) [low] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Sonnet 5 (Bedrock) [high] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Claude Sonnet 5 (Bedrock) [max] | n/a（エラー） | n/a（エラー） | n/a（エラー） |
| Gemini 3.6 Flash [low] | 9078 ± 372 ms (95% CI, n=3) | 8699–9292 | 3 |
| Gemini 3.6 Flash [medium] | 9459 ± 399 ms (95% CI, n=3) | 9079–9777 | 3 |
| Gemini 3.6 Flash [high] | 9469 ± 743 ms (95% CI, n=3) | 8898–10186 | 3 |
| Gemini 3.5 Flash-Lite [low] | 5424 ± 147 ms (95% CI, n=3) | 5285–5543 | 3 |
| Gemini 3.5 Flash-Lite [medium] | 5052 ± 534 ms (95% CI, n=3) | 4511–5378 | 3 |
| Gemini 3.5 Flash-Lite [high] | 5512 ± 180 ms (95% CI, n=3) | 5359–5677 | 3 |
| Claude Opus 5 [low] | 13378 ± 3470 ms (95% CI, n=3) | 10825–16779 | 3 |
| Claude Opus 5 [high] | 10459 ± 11314 ms (95% CI, n=3) | 0–19922 | 3 |
| Claude Opus 5 [max] | 7250 ± 14211 ms (95% CI, n=3) | 0–21751 | 3 |

測定した68件の設定のうち、最も低かったのは **Claude Fable 5 [max]** で 0 ± 0 ms（95%信頼区間、n=3）でした。この測定の対極にあるのは Grok 4.20 Reasoning [n/a] で、37966 ± 16419 ms（95%信頼区間、n=3）でした。

**合計応答時間**

| 設定 | 平均 ± 95% CI | 最小–最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 18494 ± 1864 ms (95% CI, n=3) | 16646–19808 | 3 |
| Claude Fable 5 [medium] | 4418 ms (n=1) | 4418–4418 | 1 |
| Claude Fable 5 [high] | 20659 ± 1020 ms (95% CI, n=3) | 19756–21559 | 3 |
| Claude Fable 5 [xhigh] | 4253 ms (n=1) | 4253–4253 | 1 |
| Claude Fable 5 [max] | 22807 ± 460 ms (95% CI, n=3) | 22338–23055 | 3 |
| Claude Opus 4.8 [low] | 7058 ± 652 ms (95% CI, n=3) | 6446–7590 | 3 |
| Claude Opus 4.8 [medium] | 1935 ms (n=1) | 1935–1935 | 1 |
| Claude Opus 4.8 [high] | 7141 ± 255 ms (95% CI, n=3) | 6985–7400 | 3 |
| Claude Opus 4.8 [xhigh] | 2896 ms (n=1) | 2896–2896 | 1 |
| Claude Opus 4.8 [max] | 6444 ± 872 ms (95% CI, n=3) | 5638–7174 | 3 |
| Claude Sonnet 5 [low] | 8304 ± 1913 ms (95% CI, n=3) | 6826–10148 | 3 |
| Claude Sonnet 5 [medium] | 1757 ms (n=1) | 1757–1757 | 1 |
| Claude Sonnet 5 [high] | 8670 ± 1450 ms (95% CI, n=3) | 7373–9935 | 3 |
| Claude Sonnet 5 [xhigh] | 1589 ms (n=1) | 1589–1589 | 1 |
| Claude Sonnet 5 [max] | 19642 ± 1159 ms (95% CI, n=3) | 18872–20804 | 3 |
| Claude Haiku 4.5 [n/a] | 3816 ± 271 ms (95% CI, n=3) | 3602–4075 | 3 |
| GPT-5.5 [none] | 6264 ± 685 ms (95% CI, n=3) | 5602–6789 | 3 |
| GPT-5.5 [low] | 1380 ms (n=1) | 1380–1380 | 1 |
| GPT-5.5 [medium] | 12439 ± 474 ms (95% CI, n=3) | 12192–12923 | 3 |
| GPT-5.5 [high] | 13931 ± 2101 ms (95% CI, n=3) | 12447–16013 | 3 |
| GPT-5.4 [none] | 3209 ± 30 ms (95% CI, n=3) | 3180–3231 | 3 |
| GPT-5.4 [low] | 1387 ms (n=1) | 1387–1387 | 1 |
| GPT-5.4 [medium] | 7608 ± 707 ms (95% CI, n=3) | 7062–8289 | 3 |
| GPT-5.4 [high] | 8246 ± 3266 ms (95% CI, n=3) | 6570–11579 | 3 |
| GPT-5.4 mini [none] | 2388 ± 325 ms (95% CI, n=3) | 2196–2718 | 3 |
| GPT-5.4 mini [low] | 678 ms (n=1) | 678–678 | 1 |
| GPT-5.4 mini [medium] | 6450 ± 260 ms (95% CI, n=3) | 6301–6714 | 3 |
| GPT-5.4 mini [high] | 7943 ± 3262 ms (95% CI, n=3) | 5895–11239 | 3 |
| GPT-5.4 nano [none] | 1751 ± 154 ms (95% CI, n=3) | 1598–1858 | 3 |
| GPT-5.4 nano [low] | 623 ms (n=1) | 623–623 | 1 |
| GPT-5.4 nano [medium] | 6918 ± 794 ms (95% CI, n=3) | 6305–7684 | 3 |
| GPT-5.4 nano [high] | 7551 ± 354 ms (95% CI, n=3) | 7255–7878 | 3 |
| o4-mini [low] | 7380 ± 847 ms (95% CI, n=3) | 6702–8184 | 3 |
| o4-mini [medium] | 9089 ± 1797 ms (95% CI, n=3) | 7278–10242 | 3 |
| o4-mini [high] | 11146 ± 249 ms (95% CI, n=3) | 10892–11281 | 3 |
| GPT Realtime [n/a] | 3595 ± 1462 ms (95% CI, n=3) | 2579–5049 | 3 |
| GPT-5.3 Codex [low] | 9396 ± 674 ms (95% CI, n=3) | 8860–10037 | 3 |
| GPT-5.3 Codex [medium] | 1529 ms (n=1) | 1529–1529 | 1 |
| GPT-5.3 Codex [high] | 12711 ± 4083 ms (95% CI, n=3) | 10105–16829 | 3 |
| GPT-5.3 Codex [xhigh] | 17586 ± 3612 ms (95% CI, n=3) | 14189–20523 | 3 |
| GPT-5.1 Codex mini [low] | 5090 ± 3057 ms (95% CI, n=3) | 1999–7000 | 3 |
| GPT-5.1 Codex mini [medium] | 8022 ± 2015 ms (95% CI, n=3) | 6175–9729 | 3 |
| GPT-5.1 Codex mini [high] | 8873 ± 2365 ms (95% CI, n=3) | 6460–10115 | 3 |
| Gemini 3.1 Pro [low] | 15276 ± 43 ms (95% CI, n=3) | 15234–15307 | 3 |
| Gemini 3.1 Pro [medium] | 15646 ± 864 ms (95% CI, n=3) | 14937–16455 | 3 |
| Gemini 3.1 Pro [high] | 15782 ± 988 ms (95% CI, n=3) | 14921–16666 | 3 |
| Gemini 3.5 Flash [low] | 7699 ± 600 ms (95% CI, n=3) | 7307–8302 | 3 |
| Gemini 3.5 Flash [medium] | 7511 ± 381 ms (95% CI, n=3) | 7179–7853 | 3 |
| Gemini 3.5 Flash [high] | 8002 ± 413 ms (95% CI, n=3) | 7581–8236 | 3 |
| Gemini 3.1 Flash-Lite [low] | 1980 ± 196 ms (95% CI, n=3) | 1860–2178 | 3 |
| Gemini 3.1 Flash-Lite [medium] | 6079 ± 65 ms (95% CI, n=3) | 6016–6128 | 3 |
| Gemini 3.1 Flash-Lite [high] | 6252 ± 369 ms (95% CI, n=3) | 5901–6545 | 3 |
| Grok 4.3 [none] | 2382 ± 186 ms (95% CI, n=3) | 2201–2521 | 3 |
| Grok 4.3 [low] | 3258 ms (n=1) | 3258–3258 | 1 |
| Grok 4.3 [medium] | 20490 ± 5423 ms (95% CI, n=3) | 15982–25523 | 3 |
| Grok 4.3 [high] | 24423 ± 5203 ms (95% CI, n=3) | 20529–29495 | 3 |
| Grok 4.20 Reasoning [n/a] | 38918 ± 16237 ms (95% CI, n=3) | 25329–53921 | 3 |
| Grok 4.20 Non-Reasoning [n/a] | 2919 ± 123 ms (95% CI, n=3) | 2843–3043 | 3 |
| Grok Build 0.1 [n/a] | 36444 ± 6613 ms (95% CI, n=3) | 29735–40428 | 3 |
| Claude Opus 4.8 (Bedrock) [low] | 該当なし（エラー） | 該当なし（エラー） | 該当なし（エラー） |
| Claude Opus 4.8 (Bedrock) [high] | 該当なし（エラー） | 該当なし（エラー） | 該当なし（エラー） |
| Claude Opus 4.8 (Bedrock) [max] | 該当なし（エラー） | 該当なし（エラー） | 該当なし（エラー） |
| Claude Sonnet 5 (Bedrock) [low] | 該当なし（エラー） | 該当なし（エラー） | 該当なし（エラー） |
| Claude Sonnet 5 (Bedrock) [high] | 該当なし（エラー） | 該当なし（エラー） | 該当なし（エラー） |
| Claude Sonnet 5 (Bedrock) [max] | 該当なし（エラー） | 該当なし（エラー） | 該当なし（エラー） |
| Gemini 3.6 Flash [low] | 9245 ± 412 ms (95% CI, n=3) | 8833–9523 | 3 |
| Gemini 3.6 Flash [medium] | 9609 ± 429 ms (95% CI, n=3) | 9218–9974 | 3 |
| Gemini 3.6 Flash [high] | 9657 ± 736 ms (95% CI, n=3) | 9098–10371 | 3 |
| Gemini 3.5 Flash-Lite [low] | 5603 ± 87 ms (95% CI, n=3) | 5530–5683 | 3 |
| Gemini 3.5 Flash-Lite [medium] | 5170 ± 566 ms (95% CI, n=3) | 4602–5548 | 3 |
| Gemini 3.5 Flash-Lite [high] | 5628 ± 138 ms (95% CI, n=3) | 5516–5758 | 3 |
| Claude Opus 5 [low] | 16046 ± 3430 ms (95% CI, n=3) | 13562–19423 | 3 |
| Claude Opus 5 [high] | 19883 ± 4784 ms (95% CI, n=3) | 15029–22763 | 3 |
| Claude Opus 5 [max] | 22622 ± 443 ms (95% CI, n=3) | 22198–22970 | 3 |

測定された68件の設定のうち最も低い値：**GPT-5.4 nano [low]** の 623 ms（n=1）。この測定の対極にあるのは Grok 4.20 Reasoning [n/a] の 38918 ± 16237 ms（95% CI, n=3）。

投影されたアーティファクトには、このトピックのプロンプト、生の試行結果、トークン数、タイミング値、そして（正確性のための）スキーマ準拠結果やプロバイダーの拒否メッセージが保存されています。このページは、プロバイダーを再実行せずに、そのアーティファクトから再生成できます。

**統一速度プローブ**（ストリーミングによる厳密な長さの生成を、各設定につき
3回繰り返します。1回の呼び出しから、生成ウィンドウ全体における持続的な
tok/s（Time To First Token を除く）に加えて、TTFT と応答全体の時間が得られます）：

```text
Write a single flowing passage about how large language models generate text that is exactly 200 words long. Write continuous prose only — no lists, headings, or code. Respond with the passage only — no preamble, no word count, no markdown.
```

**完全な生データ記録。** すべての設定、試行、そしてこのトピックの呼び出しは、このページとともに JSON アーティファクトとしてコミットされています：
[`llm-speed-comparison.data.json`](./llm-speed-comparison.data.json)。
これは、統合比較レコード `llm-model-comparison.real.data.json` から投影されたものであり、
同じ測定値であって再実行されたものではありません。

#### 世代間比較（旧世代 → 新世代）

各ラウンドで世代交代があった各プロバイダーのティアについて、旧モデルと新モデルは同一条件下（同一ティア、同一エフォート段階 — 異なるのはモデルIDのみ）で計測されており、これらの差分は世代交代による変化のみを切り分けている。速度または精度の差分は、両世代がこのフレームで`measured`（実測）である場合にのみ表示される。コストの数値はキュレーションされたレジストリの事実である。総合判定はメトリクスごとの差分に対する機械的なルールに基づく（各メトリクスは相対閾値1%を超えて初めて「動いた」とみなされる）。少なくとも1つのメトリクスが改善し、悪化したものがない場合は**改善**、その鏡像となる場合は**悪化**、両方が発生する場合は**混在**、すべてのメトリクスが閾値内にとどまる場合は**変化なし**となる。実測されたメトリクスは、2つの平均値の差が両者の実行間ばらつきの合計（2つの標準偏差の和で、専用の列に示される）を上回らない場合、さらに**判別不能**とラベル付けされ、判定から除外される。各平均値の背後にある試行回数は専用の列に記載されており、方向性はそれを生み出したサンプルに照らして読み取ることができる。数時間空けて同一の測定を再実行しただけで、同一構成でもスループットが最大88%変動しており、単なるパーセンテージの変化だけでは世代交代による方向性の証拠にはならない。（この88%は、2026-08-04にこのメトリクスが置き換えられる前の、廃止済みの初回トークン後スループット定義の下で観測されたものである。現在のエンドツーエンド定義の下では再計測されておらず、現在の推定値としてではなく、実際に観測された最後の数値としてここに引用している。）差分は段階全体で集約されるのではなく、**エフォートレベルごと**に保持される。low、medium、highはそれぞれ異なる動作点であり、それらを平均すると、どの構成でも実際には計測されていない数値を報告することになるためである。コストの数値はレジストリの事実であり、ばらつきを持たない。安価であることは改善であり、速いが高価という結果は混在として扱われ、暗黙のうちに改善へと相殺されることはない。

##### Claude Opus 4.8 → Claude Opus 5

**Effort `low`。**

| メトリクス | 旧 | 新 | 変化 | 実行間ばらつき | 試行回数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 出力スループット | 54.2 tok/s | 96.5 tok/s | +42.4 tok/s (+78%) | ±10.8 tok/s | 3 | 改善 |
| 初回トークンまでの時間 | 1180 ms | 13378 ms | +12198 ms (+1034%) | ±3224 ms | 3 | 悪化 |
| 総応答時間 | 7058 ms | 16046 ms | +8988 ms (+127%) | ±3607 ms | 3 | 悪化 |
| 入力コスト | $5.00 | $5.00 | +0.00 $/MTok (+0%) | — | — | 変化なし |
| 出力コスト | $25.00 | $25.00 | +0.00 $/MTok (+0%) | — | — | 変化なし |

_総合判定: **混在** — 9個のメトリクスのうち改善3、悪化3、変化なし3。_

**Effort `high`。**

| メトリクス | 旧 | 新 | 変化 | 実行間ばらつき | 試行回数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 出力スループット | 53.2 tok/s | 92.3 tok/s | +39.1 tok/s (+73%) | ±3.3 tok/s | 3 | 改善 |
| 初回トークンまでの時間 | 1072 ms | 10459 ms | +9387 ms (+876%) | ±10048 ms | 3 | 判別不能 |
| 総応答時間 | 7141 ms | 19883 ms | +12741 ms (+178%) | ±4453 ms | 3 | 悪化 |
| 入力コスト | $5.00 | $5.00 | +0.00 $/MTok (+0%) | — | — | 変化なし |
| 出力コスト | $25.00 | $25.00 | +0.00 $/MTok (+0%) | — | — | 変化なし |

_総合判定: **混在** — 9個のメトリクスのうち改善1、悪化3、変化なし3。実行間ばらつきにより判別不能で除外2件。_

**Effort `max`。**

| メトリクス | 旧 | 新 | 変化 | 実行間ばらつき | 試行回数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 出力スループット | 58.5 tok/s | 90.5 tok/s | +32.0 tok/s (+55%) | ±7.1 tok/s | 3 | 改善 |
| 初回トークンまでの時間 | 890 ms | 7250 ms | +6360 ms (+714%) | ±12693 ms | 3 | 判別不能 |
| 総応答時間 | 6444 ms | 22622 ms | +16178 ms (+251%) | ±1162 ms | 3 | 悪化 |
| 入力コスト | $5.00 | $5.00 | +0.00 $/MTok (+0%) | — | — | 変化なし |
| 出力コスト | $25.00 | $25.00 | +0.00 $/MTok (+0%) | — | — | 変化なし |

_総合判定: **混在** — 9個のメトリクスのうち改善1、悪化4、変化なし3。実行間ばらつきにより判別不能で除外1件。_

##### Gemini 3.5 Flash → Gemini 3.6 Flash

**Effort `low`。**

| メトリクス | 旧 | 新 | 変化 | 実行間ばらつき | 試行回数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 出力スループット | 10.2 tok/s | 8.6 tok/s | −1.6 tok/s (−15%) | ±0.7 tok/s | 3 | 悪化 |
| 初回トークンまでの時間 | 7520 ms | 9078 ms | +1558 ms (+21%) | ±914 ms | 3 | 悪化 |
| 総応答時間 | 7699 ms | 9245 ms | +1545 ms (+20%) | ±894 ms | 3 | 悪化 |
| 入力コスト | $1.50 | $1.50 | +0.00 $/MTok (+0%) | — | — | 変化なし |
| 出力コスト | $9.00 | $7.50 | −1.50 $/MTok (−17%) | — | — | 改善 |

_総合判定: **混在** — 9個のメトリクスのうち改善2、悪化3、変化なし3。実行間ばらつきにより判別不能で除外1件。_

**Effort `medium`。**

| メトリクス | 旧 | 新 | 変化 | 実行間ばらつき | 試行回数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 出力スループット | 10.5 tok/s | 8.1 tok/s | −2.4 tok/s (−23%) | ±1.0 tok/s | 3 | 悪化 |
| 初回トークンまでの時間 | 7333 ms | 9459 ms | +2126 ms (+29%) | ±663 ms | 3 | 悪化 |
| 総応答時間 | 7511 ms | 9609 ms | +2098 ms (+28%) | ±716 ms | 3 | 悪化 |
| 入力コスト | $1.50 | $1.50 | +0.00 $/MTok (+0%) | — | — | 変化なし |
| 出力コスト | $9.00 | $7.50 | −1.50 $/MTok (−17%) | — | — | 改善 |

_総合判定: **混在** — 9個のメトリクスのうち改善2、悪化4、変化なし3。_

**Effort `high`。**

| メトリクス | 旧 | 新 | 変化 | 実行間ばらつき | 試行回数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 出力スループット | 10.1 tok/s | 8.2 tok/s | −1.8 tok/s (−18%) | ±0.9 tok/s | 3 | 悪化 |
| 初回トークンまでの時間 | 7852 ms | 9469 ms | +1617 ms (+21%) | ±1063 ms | 3 | 悪化 |
| 総応答時間 | 8002 ms | 9657 ms | +1656 ms (+21%) | ±1015 ms | 3 | 悪化 |
| 入力コスト | $1.50 | $1.50 | +0.00 $/MTok (+0%) | — | — | 変化なし |
| 出力コスト | $9.00 | $7.50 | −1.50 $/MTok (−17%) | — | — | 改善 |

_総合判定: **混在** — 9個のメトリクスのうち改善3、悪化3、変化なし3。_

##### Gemini 3.1 Flash-Lite → Gemini 3.5 Flash-Lite

**Effort `low`。**

| メトリクス | 旧 | 新 | 変化 | 実行間ばらつき | 試行回数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 出力スループット | 116.8 tok/s | 14.1 tok/s | −102.7 tok/s (−88%) | ±7.8 tok/s | 3 | 悪化 |
| 初回トークンまでの時間 | 903 ms | 5424 ms | +4521 ms (+501%) | ±175 ms | 3 | 悪化 |
| 総応答時間 | 1980 ms | 5603 ms | +3623 ms (+183%) | ±250 ms | 3 | 悪化 |
| 入力コスト | $0.25 | $0.30 | +0.05 $/MTok (+20%) | — | — | 悪化 |
| 出力コスト | $1.50 | $2.50 | +1.00 $/MTok (+67%) | — | — | 悪化 |

_総合判定: **混在** — 9個のメトリクスのうち改善1、悪化6、変化なし2。_

**Effort `medium`。**

| メトリクス | 旧 | 新 | 変化 | 実行間ばらつき | 試行回数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 出力スループット | 13.0 tok/s | 15.9 tok/s | +2.9 tok/s (+22%) | ±2.2 tok/s | 3 | 改善 |
| 初回トークンまでの時間 | 6014 ms | 5052 ms | −962 ms (−16%) | ±542 ms | 3 | 改善 |
| 総応答時間 | 6079 ms | 5170 ms | −909 ms (−15%) | ±558 ms | 3 | 改善 |
| 入力コスト | $0.25 | $0.30 | +0.05 $/MTok (+20%) | — | — | 悪化 |
| 出力コスト | $1.50 | $2.50 | +1.00 $/MTok (+67%) | — | — | 悪化 |

_総合判定: **混在** — 9個のメトリクスのうち改善5、悪化2、変化なし2。_

**Effort `high`。**

| メトリクス | 旧 | 新 | 変化 | 実行ごとのばらつき | 試行回数 | 方向性 |
| ------ | ------ | --- | ------ | ----------------- | ------ | --------- |
| 出力スループット | 12.8 tok/s | 14.0 tok/s | +1.2 tok/s (+9%) | ±1.7 tok/s | 3 | 判別不能 |
| 初回トークンまでの時間 | 6180 ms | 5512 ms | −668 ms (−11%) | ±458 ms | 3 | 改善 |
| 総応答時間 | 6252 ms | 5628 ms | −624 ms (−10%) | ±448 ms | 3 | 改善 |
| 入力コスト | $0.25 | $0.30 | +0.05 $/MTok (+20%) | — | — | 悪化 |
| 出力コスト | $1.50 | $2.50 | +1.00 $/MTok (+67%) | — | — | 悪化 |

_総合判定: **まちまち** — 9個のメトリクスのうち3個が改善、2個が悪化、2個が変化なし。2個は実行ごとのばらつきの範囲内で判別不能なため除外。_

このプロジェクションは `llm-speed-comparison.data.json` と本Markdownページを出力する。元となるスイープは `llm-model-comparison.real.data.json` のままであり、そのため速度と精度は同一の基礎実行データまで遡って監査可能な状態を保っている。
