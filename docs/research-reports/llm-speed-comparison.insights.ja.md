---
source_artifact: docs/research-reports/llm-speed-comparison.data.json
source_commit: e522aa0
insights_model: source-report
translated_from: llm-speed-comparison.report.md
translation_model: claude-sonnet-5
generated_at: 2026-07-12T07:39:27.674Z
trials: 0
provenance: llm-translation
---
# LLM応答速度比較

ここに示す数値は、**LLM比較の統合スイープ**からの抜粋です。すなわち、同一の試行、モデル×努力度（effort）のマトリクス、統計処理、そして来歴（provenance）情報を、本トピックのプローブに絞り込んだものとなっています。

## 1. 調査の目的

本レポートは、このトピックにおいて重要となる測定済みの制約条件に基づき、モデル選定の絞り込みを支援することを目的とする。これは一般的なモデルランキングではなく、また独立したベンチマークを再実行するものでもない。

## 2. 測定対象

### 対象モデル

本レポートは、19モデル・4プロバイダーにまたがる**47のモデル×エフォート構成**を対象としています。厳選されたカタログ情報（プロバイダー、モデル、ティア、価格、エフォート）はモデルレジストリに由来します。

### 対象メトリクス

このトピックでは、持続的な生成スループット、最初のトークンまでの時間（time-to-first-token）、および総応答レイテンシを扱います。メトリクスの値は、n ≥ 2の場合は平均値 ± 95%信頼区間として、n < 2の場合は平均値とサンプル数として報告されます。

## 3. 範囲と制約

- 各設定×プローブにつき**3回の試行**。このサンプル数は実行単位の比較を裏付けるものであり、プロバイダの挙動が安定しているという統計的な主張を裏付けるものではありません。
- **特定時点の測定です。** 測定された挙動は `2026-07-12T05:47:26.268Z` 時点のモデルおよびAPIを反映したものです。
- このトピックでは限定的な挙動（持続的な生成スループット、Time To First Token、総応答レイテンシ）のみを検証しており、一般的な能力や推論の質を測定するものではありません。
- **エフォート（effort）のセマンティクスはプロバイダごとに異なる**ため、エフォートレベルはプロバイダ間よりもプロバイダ内での比較の方が妥当です。

## 4. 検証結果

| プロバイダー | モデル | ティア | Effort | コスト（入力 / 出力、per MTok） | スループット（tok/s） | TTFT（ms） | 総レイテンシ（ms） |
| -------- | ----- | ---- | ------ | ------------------------ | --- | --- | --- |
| Anthropic | Claude Fable 5 | frontier | low | $6.00 / $30.00 | 272 ± 14 tok/s (95% CI, n=3) | 9888 ± 729 ms (95% CI, n=3) | 12820 ± 506 ms (95% CI, n=3) |
| Anthropic | Claude Fable 5 | frontier | high | $6.00 / $30.00 | 468 ± 372 tok/s (95% CI, n=3) | 12148 ± 11912 ms (95% CI, n=3) | 21810 ± 1100 ms (95% CI, n=3) |
| Anthropic | Claude Fable 5 | frontier | max | $6.00 / $30.00 | 93 ± 2 tok/s (95% CI, n=3) | 0 ± 0 ms (95% CI, n=3) | 22100 ± 544 ms (95% CI, n=3) |
| Anthropic | Claude Opus 4.8 | flagship | low | $5.00 / $25.00 | 60 ± 10 tok/s (95% CI, n=3) | 1560 ± 1232 ms (95% CI, n=3) | 7750 ± 1962 ms (95% CI, n=3) |
| Anthropic | Claude Opus 4.8 | flagship | high | $5.00 / $25.00 | 63 ± 6 tok/s (95% CI, n=3) | 975 ± 81 ms (95% CI, n=3) | 6977 ± 461 ms (95% CI, n=3) |
| Anthropic | Claude Opus 4.8 | flagship | max | $5.00 / $25.00 | 66 ± 4 tok/s (95% CI, n=3) | 864 ± 212 ms (95% CI, n=3) | 6623 ± 544 ms (95% CI, n=3) |
| Anthropic | Claude Sonnet 5 | mid | low | $3.00 / $15.00 | 79 ± 3 tok/s (95% CI, n=3) | 1196 ± 561 ms (95% CI, n=3) | 5880 ± 529 ms (95% CI, n=3) |
| Anthropic | Claude Sonnet 5 | mid | high | $3.00 / $15.00 | 190 ± 225 tok/s (95% CI, n=3) | 2772 ± 2703 ms (95% CI, n=3) | 7338 ± 1136 ms (95% CI, n=3) |
| Anthropic | Claude Sonnet 5 | mid | max | $3.00 / $15.00 | 124 ± 6 tok/s (95% CI, n=3) | 0 ± 0 ms (95% CI, n=3) | 16526 ± 877 ms (95% CI, n=3) |
| Anthropic | Claude Haiku 4.5 | small | n/a | $1.00 / $5.00 | 85 ± 11 tok/s (95% CI, n=3) | 853 ± 131 ms (95% CI, n=3) | 3882 ± 649 ms (95% CI, n=3) |
| OpenAI | GPT-5.5 | flagship | none | $5.00 / $30.00 | 48 ± 4 tok/s (95% CI, n=3) | 1295 ± 797 ms (95% CI, n=3) | 6264 ± 685 ms (95% CI, n=3) |
| OpenAI | GPT-5.5 | flagship | medium | $5.00 / $30.00 | 534 ± 106 tok/s (95% CI, n=3) | 10768 ± 477 ms (95% CI, n=3) | 12439 ± 474 ms (95% CI, n=3) |
| OpenAI | GPT-5.5 | flagship | high | $5.00 / $30.00 | 706 ± 73 tok/s (95% CI, n=3) | 12353 ± 2045 ms (95% CI, n=3) | 13931 ± 2101 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 | mid | none | $2.50 / $15.00 | 84 ± 3 tok/s (95% CI, n=3) | 559 ± 120 ms (95% CI, n=3) | 3209 ± 30 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 | mid | medium | $2.50 / $15.00 | 1030 ± 116 tok/s (95% CI, n=3) | 6614 ± 732 ms (95% CI, n=3) | 7608 ± 707 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 | mid | high | $2.50 / $15.00 | 1522 ± 786 tok/s (95% CI, n=3) | 7369 ± 3281 ms (95% CI, n=3) | 8246 ± 3266 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 mini | small | none | $0.50 / $2.00 | 130 ± 17 tok/s (95% CI, n=3) | 567 ± 27 ms (95% CI, n=3) | 2388 ± 325 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 mini | small | medium | $0.50 / $2.00 | 1442 ± 154 tok/s (95% CI, n=3) | 5594 ± 246 ms (95% CI, n=3) | 6450 ± 260 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 mini | small | high | $0.50 / $2.00 | 2952 ± 3461 tok/s (95% CI, n=3) | 7211 ± 3669 ms (95% CI, n=3) | 7943 ± 3262 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 nano | small | none | $0.15 / $0.60 | 182 ± 12 tok/s (95% CI, n=3) | 592 ± 79 ms (95% CI, n=3) | 1751 ± 154 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 nano | small | medium | $0.15 / $0.60 | 927 ± 245 tok/s (95% CI, n=3) | 5618 ± 926 ms (95% CI, n=3) | 6918 ± 794 ms (95% CI, n=3) |
| OpenAI | GPT-5.4 nano | small | high | $0.15 / $0.60 | 907 ± 78 tok/s (95% CI, n=3) | 6161 ± 364 ms (95% CI, n=3) | 7551 ± 354 ms (95% CI, n=3) |
| OpenAI | o4-mini | mid | low | $1.10 / $4.40 | 1078 ± 104 tok/s (95% CI, n=3) | 6121 ± 869 ms (95% CI, n=3) | 7380 ± 847 ms (95% CI, n=3) |
| OpenAI | o4-mini | mid | medium | $1.10 / $4.40 | 1000 ± 823 tok/s (95% CI, n=3) | 4896 ± 5005 ms (95% CI, n=3) | 9089 ± 1797 ms (95% CI, n=3) |
| OpenAI | o4-mini | mid | high | $1.10 / $4.40 | 184 ± 4 tok/s (95% CI, n=3) | 0 ± 0 ms (95% CI, n=3) | 11146 ± 249 ms (95% CI, n=3) |
| OpenAI | GPT Realtime | flagship | n/a | $4.00 / $16.00 | 132 ± 4 tok/s (95% CI, n=3) | 1137 ± 656 ms (95% CI, n=3) | 3595 ± 1462 ms (95% CI, n=3) |
| OpenAI | GPT-5.3 Codex | flagship | low | $1.75 / $14.00 | 574 ± 117 tok/s (95% CI, n=3) | 7582 ± 252 ms (95% CI, n=3) | 9396 ± 674 ms (95% CI, n=3) |
| OpenAI | GPT-5.3 Codex | flagship | high | $1.75 / $14.00 | 863 ± 422 tok/s (95% CI, n=3) | 11015 ± 4210 ms (95% CI, n=3) | 12711 ± 4083 ms (95% CI, n=3) |
| OpenAI | GPT-5.3 Codex | flagship | xhigh | $1.75 / $14.00 | 374 ± 732 tok/s (95% CI, n=3) | 10810 ± 11322 ms (95% CI, n=3) | 17586 ± 3612 ms (95% CI, n=3) |
| OpenAI | GPT-5.1 Codex mini | small | low | $0.25 / $2.00 | 731 ± 535 tok/s (95% CI, n=3) | 3795 ± 3067 ms (95% CI, n=3) | 5090 ± 3057 ms (95% CI, n=3) |
| OpenAI | GPT-5.1 Codex mini | small | medium | $0.25 / $2.00 | 576 ± 574 tok/s (95% CI, n=3) | 3814 ± 3858 ms (95% CI, n=3) | 8022 ± 2015 ms (95% CI, n=3) |
| OpenAI | GPT-5.1 Codex mini | small | high | $0.25 / $2.00 | 317 ± 621 tok/s (95% CI, n=3) | 1726 ± 3383 ms (95% CI, n=3) | 8873 ± 2365 ms (95% CI, n=3) |
| Google | Gemini 3.1 Pro | flagship | low | $2.00 / $12.00 | 266 ± 5 tok/s (95% CI, n=3) | 14977 ± 45 ms (95% CI, n=3) | 15276 ± 43 ms (95% CI, n=3) |
| Google | Gemini 3.1 Pro | flagship | medium | $2.00 / $12.00 | 302 ± 45 tok/s (95% CI, n=3) | 15376 ± 903 ms (95% CI, n=3) | 15646 ± 864 ms (95% CI, n=3) |
| Google | Gemini 3.1 Pro | flagship | high | $2.00 / $12.00 | 274 ± 16 tok/s (95% CI, n=3) | 15497 ± 979 ms (95% CI, n=3) | 15782 ± 988 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash | mid | low | $0.30 / $2.50 | 717 ± 419 tok/s (95% CI, n=3) | 7707 ± 202 ms (95% CI, n=3) | 7857 ± 283 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash | mid | medium | $0.30 / $2.50 | 579 ± 159 tok/s (95% CI, n=3) | 8118 ± 798 ms (95% CI, n=3) | 8261 ± 833 ms (95% CI, n=3) |
| Google | Gemini 3.5 Flash | mid | high | $0.30 / $2.50 | 982 ± 530 tok/s (95% CI, n=3) | 8050 ± 600 ms (95% CI, n=3) | 8143 ± 593 ms (95% CI, n=3) |
| Google | Gemini 3.1 Flash-Lite | small | low | $0.10 / $0.40 | 256 ± 6 tok/s (95% CI, n=3) | 815 ± 114 ms (95% CI, n=3) | 1726 ± 108 ms (95% CI, n=3) |
| Google | Gemini 3.1 Flash-Lite | small | medium | $0.10 / $0.40 | 730 ± 278 tok/s (95% CI, n=3) | 4696 ± 171 ms (95% CI, n=3) | 4816 ± 145 ms (95% CI, n=3) |
| Google | Gemini 3.1 Flash-Lite | small | high | $0.10 / $0.40 | 9278 ± 17042 tok/s (95% CI, n=3) | 4991 ± 129 ms (95% CI, n=3) | 5089 ± 207 ms (95% CI, n=3) |
| xAI | Grok 4.3 | frontier | none | $1.25 / $2.50 | 108 ± 13 tok/s (95% CI, n=3) | 524 ± 27 ms (95% CI, n=3) | 2382 ± 186 ms (95% CI, n=3) |
| xAI | Grok 4.3 | frontier | medium | $1.25 / $2.50 | 258 ± 18 tok/s (95% CI, n=3) | 19640 ± 5470 ms (95% CI, n=3) | 20490 ± 5423 ms (95% CI, n=3) |
| xAI | Grok 4.3 | frontier | high | $1.25 / $2.50 | 250 ± 7 tok/s (95% CI, n=3) | 23565 ± 5250 ms (95% CI, n=3) | 24423 ± 5203 ms (95% CI, n=3) |
| xAI | Grok 4.20 Reasoning | flagship | n/a | $1.25 / $2.50 | 229 ± 37 tok/s (95% CI, n=3) | 37966 ± 16419 ms (95% CI, n=3) | 38918 ± 16237 ms (95% CI, n=3) |
| xAI | Grok 4.20 Non-Reasoning | mid | n/a | $1.25 / $2.50 | 100 ± 2 tok/s (95% CI, n=3) | 435 ± 40 ms (95% CI, n=3) | 2919 ± 123 ms (95% CI, n=3) |
| xAI | Grok Build 0.1 | small | n/a | $1.00 / $2.00 | 273 ± 4 tok/s (95% CI, n=3) | 35660 ± 6588 ms (95% CI, n=3) | 36444 ± 6613 ms (95% CI, n=3) |

**凡例。** プロバイダー、モデル、ティア、Effort、コストは整備済みのカタログデータです。各メトリクス列は実測値です。`n/a (fixtured)` は、決定論的なフィクスチャクライアントがそのセルの値を生成したことを意味し、`n/a (error)` はその構成でのすべての試行が失敗したことを意味します。

各詳細テーブルは、測定対象の1つの側面について、観測されたmin-maxと寄与した試行回数を示しています。

**生成中の持続スループット**

| 設定 | 平均 ± 95% CI | 最小～最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 272 ± 14 tok/s (95% CI, n=3) | 262.4–285.6 | 3 |
| Claude Fable 5 [high] | 468 ± 372 tok/s (95% CI, n=3) | 89.5–676.5 | 3 |
| Claude Fable 5 [max] | 93 ± 2 tok/s (95% CI, n=3) | 90.4–94.0 | 3 |
| Claude Opus 4.8 [low] | 60 ± 10 tok/s (95% CI, n=3) | 51.4–68.9 | 3 |
| Claude Opus 4.8 [high] | 63 ± 6 tok/s (95% CI, n=3) | 57.2–68.1 | 3 |
| Claude Opus 4.8 [max] | 66 ± 4 tok/s (95% CI, n=3) | 61.8–68.3 | 3 |
| Claude Sonnet 5 [low] | 79 ± 3 tok/s (95% CI, n=3) | 76.1–81.6 | 3 |
| Claude Sonnet 5 [high] | 190 ± 225 tok/s (95% CI, n=3) | 63.6–419.9 | 3 |
| Claude Sonnet 5 [max] | 124 ± 6 tok/s (95% CI, n=3) | 117.7–128.8 | 3 |
| Claude Haiku 4.5 [n/a] | 85 ± 11 tok/s (95% CI, n=3) | 74.2–90.9 | 3 |
| GPT-5.5 [none] | 48 ± 4 tok/s (95% CI, n=3) | 44.4–50.6 | 3 |
| GPT-5.5 [medium] | 534 ± 106 tok/s (95% CI, n=3) | 426.3–599.4 | 3 |
| GPT-5.5 [high] | 706 ± 73 tok/s (95% CI, n=3) | 644.1–773.0 | 3 |
| GPT-5.4 [none] | 84 ± 3 tok/s (95% CI, n=3) | 81.6–86.3 | 3 |
| GPT-5.4 [medium] | 1030 ± 116 tok/s (95% CI, n=3) | 912.6–1099.9 | 3 |
| GPT-5.4 [high] | 1522 ± 786 tok/s (95% CI, n=3) | 1084.4–2322.5 | 3 |
| GPT-5.4 mini [none] | 130 ± 17 tok/s (95% CI, n=3) | 112.5–139.2 | 3 |
| GPT-5.4 mini [medium] | 1442 ± 154 tok/s (95% CI, n=3) | 1298.3–1568.4 | 3 |
| GPT-5.4 mini [high] | 2952 ± 3461 tok/s (95% CI, n=3) | 1076.0–6481.0 | 3 |
| GPT-5.4 nano [none] | 182 ± 12 tok/s (95% CI, n=3) | 171.6–193.2 | 3 |
| GPT-5.4 nano [medium] | 927 ± 245 tok/s (95% CI, n=3) | 730.4–1159.1 | 3 |
| GPT-5.4 nano [high] | 907 ± 78 tok/s (95% CI, n=3) | 829.8–962.9 | 3 |
| o4-mini [low] | 1078 ± 104 tok/s (95% CI, n=3) | 993.8–1176.8 | 3 |
| o4-mini [medium] | 1000 ± 823 tok/s (95% CI, n=3) | 200.0–1620.1 | 3 |
| o4-mini [high] | 184 ± 4 tok/s (95% CI, n=3) | 181.5–188.0 | 3 |
| GPT Realtime [n/a] | 132 ± 4 tok/s (95% CI, n=3) | 128.3–134.5 | 3 |
| GPT-5.3 Codex [low] | 574 ± 117 tok/s (95% CI, n=3) | 458.9–658.4 | 3 |
| GPT-5.3 Codex [high] | 863 ± 422 tok/s (95% CI, n=3) | 646.8–1293.9 | 3 |
| GPT-5.3 Codex [xhigh] | 374 ± 732 tok/s (95% CI, n=3) | 0.0–1121.0 | 3 |
| GPT-5.1 Codex mini [low] | 731 ± 535 tok/s (95% CI, n=3) | 198.2–1099.9 | 3 |
| GPT-5.1 Codex mini [medium] | 576 ± 574 tok/s (95% CI, n=3) | 0.0–955.4 | 3 |
| GPT-5.1 Codex mini [high] | 317 ± 621 tok/s (95% CI, n=3) | 0.0–950.1 | 3 |
| Gemini 3.1 Pro [low] | 266 ± 5 tok/s (95% CI, n=3) | 261.6–270.3 | 3 |
| Gemini 3.1 Pro [medium] | 302 ± 45 tok/s (95% CI, n=3) | 266.4–344.7 | 3 |
| Gemini 3.1 Pro [high] | 274 ± 16 tok/s (95% CI, n=3) | 260.9–288.9 | 3 |
| Gemini 3.5 Flash [low] | 717 ± 419 tok/s (95% CI, n=3) | 290.3–950.6 | 3 |
| Gemini 3.5 Flash [medium] | 579 ± 159 tok/s (95% CI, n=3) | 427.8–705.4 | 3 |
| Gemini 3.5 Flash [high] | 982 ± 530 tok/s (95% CI, n=3) | 569.3–1490.9 | 3 |
| Gemini 3.1 Flash-Lite [low] | 256 ± 6 tok/s (95% CI, n=3) | 251.6–262.7 | 3 |
| Gemini 3.1 Flash-Lite [medium] | 730 ± 278 tok/s (95% CI, n=3) | 562.5–1011.9 | 3 |
| Gemini 3.1 Flash-Lite [high] | 9278 ± 17042 tok/s (95% CI, n=3) | 440.9–26666.7 | 3 |
| Grok 4.3 [none] | 108 ± 13 tok/s (95% CI, n=3) | 98.7–120.0 | 3 |
| Grok 4.3 [medium] | 258 ± 18 tok/s (95% CI, n=3) | 247.1–275.5 | 3 |
| Grok 4.3 [high] | 250 ± 7 tok/s (95% CI, n=3) | 244.8–256.4 | 3 |
| Grok 4.20 Reasoning [n/a] | 229 ± 37 tok/s (95% CI, n=3) | 192.2–253.3 | 3 |
| Grok 4.20 Non-Reasoning [n/a] | 100 ± 2 tok/s (95% CI, n=3) | 98.9–102.2 | 3 |
| Grok Build 0.1 [n/a] | 273 ± 4 tok/s (95% CI, n=3) | 269.8–277.2 | 3 |

測定した47設定のうち最高値: **Gemini 3.1 Flash-Lite [high]**、9278 ± 17042 tok/s (95% CI, n=3)。この測定の対極: GPT-5.5 [none]、48 ± 4 tok/s (95% CI, n=3)。

**初回トークンまでの時間**

| 設定 | 平均 ± 95% CI | 最小～最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 9888 ± 729 ms (95% CI, n=3) | 9286–10568 | 3 |
| Claude Fable 5 [high] | 12148 ± 11912 ms (95% CI, n=3) | 0–18569 | 3 |
| Claude Fable 5 [max] | 0 ± 0 ms (95% CI, n=3) | 0–0 | 3 |
| Claude Opus 4.8 [low] | 1560 ± 1232 ms (95% CI, n=3) | 929–2817 | 3 |
| Claude Opus 4.8 [high] | 975 ± 81 ms (95% CI, n=3) | 916–1055 | 3 |
| Claude Opus 4.8 [max] | 864 ± 212 ms (95% CI, n=3) | 755–1081 | 3 |
| Claude Sonnet 5 [low] | 1196 ± 561 ms (95% CI, n=3) | 739–1723 | 3 |
| Claude Sonnet 5 [high] | 2772 ± 2703 ms (95% CI, n=3) | 1272–5527 | 3 |
| Claude Sonnet 5 [max] | 0 ± 0 ms (95% CI, n=3) | 0–0 | 3 |
| Claude Haiku 4.5 [n/a] | 853 ± 131 ms (95% CI, n=3) | 778–986 | 3 |
| GPT-5.5 [none] | 1295 ± 797 ms (95% CI, n=3) | 722–2082 | 3 |
| GPT-5.5 [medium] | 10768 ± 477 ms (95% CI, n=3) | 10484–11253 | 3 |
| GPT-5.5 [high] | 12353 ± 2045 ms (95% CI, n=3) | 10922–14383 | 3 |
| GPT-5.4 [none] | 559 ± 120 ms (95% CI, n=3) | 487–681 | 3 |
| GPT-5.4 [medium] | 6614 ± 732 ms (95% CI, n=3) | 6151–7353 | 3 |
| GPT-5.4 [high] | 7369 ± 3281 ms (95% CI, n=3) | 5665–10717 | 3 |
| GPT-5.4 mini [none] | 567 ± 27 ms (95% CI, n=3) | 546–593 | 3 |
| GPT-5.4 mini [medium] | 5594 ± 246 ms (95% CI, n=3) | 5449–5844 | 3 |
| GPT-5.4 mini [high] | 7211 ± 3669 ms (95% CI, n=3) | 4935–10923 | 3 |
| GPT-5.4 nano [none] | 592 ± 79 ms (95% CI, n=3) | 511–634 | 3 |
| GPT-5.4 nano [medium] | 5618 ± 926 ms (95% CI, n=3) | 4877–6496 | 3 |
| GPT-5.4 nano [high] | 6161 ± 364 ms (95% CI, n=3) | 5821–6461 | 3 |
| o4-mini [low] | 6121 ± 869 ms (95% CI, n=3) | 5418–6940 | 3 |
| o4-mini [medium] | 4896 ± 5005 ms (95% CI, n=3) | 0–8601 | 3 |
| o4-mini [high] | 0 ± 0 ms (95% CI, n=3) | 0–0 | 3 |
| GPT Realtime [n/a] | 1137 ± 656 ms (95% CI, n=3) | 788–1807 | 3 |
| GPT-5.3 Codex [low] | 7582 ± 252 ms (95% CI, n=3) | 7329–7749 | 3 |
| GPT-5.3 Codex [high] | 11015 ± 4210 ms (95% CI, n=3) | 8341–15264 | 3 |
| GPT-5.3 Codex [xhigh] | 10810 ± 11322 ms (95% CI, n=3) | 0–19746 | 3 |
| GPT-5.1 Codex mini [low] | 3795 ± 3067 ms (95% CI, n=3) | 697–5729 | 3 |
| GPT-5.1 Codex mini [medium] | 3814 ± 3858 ms (95% CI, n=3) | 0–6567 | 3 |
| GPT-5.1 Codex mini [high] | 1726 ± 3383 ms (95% CI, n=3) | 0–5178 | 3 |
| Gemini 3.1 Pro [low] | 14977 ± 45 ms (95% CI, n=3) | 14932–15008 | 3 |
| Gemini 3.1 Pro [medium] | 15376 ± 903 ms (95% CI, n=3) | 14633–16220 | 3 |
| Gemini 3.1 Pro [high] | 15497 ± 979 ms (95% CI, n=3) | 14636–16367 | 3 |
| Gemini 3.5 Flash [low] | 7707 ± 202 ms (95% CI, n=3) | 7501–7813 | 3 |
| Gemini 3.5 Flash [medium] | 8118 ± 798 ms (95% CI, n=3) | 7307–8591 | 3 |
| Gemini 3.5 Flash [high] | 8050 ± 600 ms (95% CI, n=3) | 7706–8660 | 3 |
| Gemini 3.1 Flash-Lite [low] | 815 ± 114 ms (95% CI, n=3) | 698–876 | 3 |
| Gemini 3.1 Flash-Lite [medium] | 4696 ± 171 ms (95% CI, n=3) | 4546–4848 | 3 |
| Gemini 3.1 Flash-Lite [high] | 4991 ± 129 ms (95% CI, n=3) | 4876–5104 | 3 |
| Grok 4.3 [none] | 524 ± 27 ms (95% CI, n=3) | 505–551 | 3 |
| Grok 4.3 [medium] | 19640 ± 5470 ms (95% CI, n=3) | 15124–24739 | 3 |
| Grok 4.3 [high] | 23565 ± 5250 ms (95% CI, n=3) | 19629–28680 | 3 |
| Grok 4.20 Reasoning [n/a] | 37966 ± 16419 ms (95% CI, n=3) | 24169–53096 | 3 |
| Grok 4.20 Non-Reasoning [n/a] | 435 ± 40 ms (95% CI, n=3) | 405–474 | 3 |
| Grok Build 0.1 [n/a] | 35660 ± 6588 ms (95% CI, n=3) | 28981–39657 | 3 |

測定した47設定のうち最低値: **Claude Fable 5 [max]**、0 ± 0 ms (95% CI, n=3)。この測定の対極: Grok 4.20 Reasoning [n/a]、37966 ± 16419 ms (95% CI, n=3)。

**総応答時間**

| 設定 | 平均 ± 95% CI | 最小～最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 12820 ± 506 ms (95% CI, n=3) | 12449–13317 | 3 |
| Claude Fable 5 [high] | 21810 ± 1100 ms (95% CI, n=3) | 21013–22893 | 3 |
| Claude Fable 5 [max] | 22100 ± 544 ms (95% CI, n=3) | 21792–22654 | 3 |
| Claude Opus 4.8 [low] | 7750 ± 1962 ms (95% CI, n=3) | 6392–9703 | 3 |
| Claude Opus 4.8 [high] | 6977 ± 461 ms (95% CI, n=3) | 6669–7439 | 3 |
| Claude Opus 4.8 [max] | 6623 ± 544 ms (95% CI, n=3) | 6068–6904 | 3 |
| Claude Sonnet 5 [low] | 5880 ± 529 ms (95% CI, n=3) | 5351–6238 | 3 |
| Claude Sonnet 5 [high] | 7338 ± 1136 ms (95% CI, n=3) | 6325–8333 | 3 |
| Claude Sonnet 5 [max] | 16526 ± 877 ms (95% CI, n=3) | 15904–17394 | 3 |
| Claude Haiku 4.5 [n/a] | 3882 ± 649 ms (95% CI, n=3) | 3540–4544 | 3 |
| GPT-5.5 [none] | 6264 ± 685 ms (95% CI, n=3) | 5602–6789 | 3 |
| GPT-5.5 [medium] | 12439 ± 474 ms (95% CI, n=3) | 12192–12923 | 3 |
| GPT-5.5 [high] | 13931 ± 2101 ms (95% CI, n=3) | 12447–16013 | 3 |
| GPT-5.4 [none] | 3209 ± 30 ms (95% CI, n=3) | 3180–3231 | 3 |
| GPT-5.4 [medium] | 7608 ± 707 ms (95% CI, n=3) | 7062–8289 | 3 |
| GPT-5.4 [high] | 8246 ± 3266 ms (95% CI, n=3) | 6570–11579 | 3 |
| GPT-5.4 mini [none] | 2388 ± 325 ms (95% CI, n=3) | 2196–2718 | 3 |
| GPT-5.4 mini [medium] | 6450 ± 260 ms (95% CI, n=3) | 6301–6714 | 3 |
| GPT-5.4 mini [high] | 7943 ± 3262 ms (95% CI, n=3) | 5895–11239 | 3 |
| GPT-5.4 nano [none] | 1751 ± 154 ms (95% CI, n=3) | 1598–1858 | 3 |
| GPT-5.4 nano [medium] | 6918 ± 794 ms (95% CI, n=3) | 6305–7684 | 3 |
| GPT-5.4 nano [high] | 7551 ± 354 ms (95% CI, n=3) | 7255–7878 | 3 |
| o4-mini [low] | 7380 ± 847 ms (95% CI, n=3) | 6702–8184 | 3 |
| o4-mini [medium] | 9089 ± 1797 ms (95% CI, n=3) | 7278–10242 | 3 |
| o4-mini [high] | 11146 ± 249 ms (95% CI, n=3) | 10892–11281 | 3 |
| GPT Realtime [n/a] | 3595 ± 1462 ms (95% CI, n=3) | 2579–5049 | 3 |
| GPT-5.3 Codex [low] | 9396 ± 674 ms (95% CI, n=3) | 8860–10037 | 3 |
| GPT-5.3 Codex [high] | 12711 ± 4083 ms (95% CI, n=3) | 10105–16829 | 3 |
| GPT-5.3 Codex [xhigh] | 17586 ± 3612 ms (95% CI, n=3) | 14189–20523 | 3 |
| GPT-5.1 Codex mini [low] | 5090 ± 3057 ms (95% CI, n=3) | 1999–7000 | 3 |
| GPT-5.1 Codex mini [medium] | 8022 ± 2015 ms (95% CI, n=3) | 6175–9729 | 3 |
| GPT-5.1 Codex mini [high] | 8873 ± 2365 ms (95% CI, n=3) | 6460–10115 | 3 |
| Gemini 3.1 Pro [low] | 15276 ± 43 ms (95% CI, n=3) | 15234–15307 | 3 |
| Gemini 3.1 Pro [medium] | 15646 ± 864 ms (95% CI, n=3) | 14937–16455 | 3 |
| Gemini 3.1 Pro [high] | 15782 ± 988 ms (95% CI, n=3) | 14921–16666 | 3 |
| Gemini 3.5 Flash [low] | 7857 ± 283 ms (95% CI, n=3) | 7591–8087 | 3 |
| Gemini 3.5 Flash [medium] | 8261 ± 833 ms (95% CI, n=3) | 7419–8778 | 3 |
| Gemini 3.5 Flash [high] | 8143 ± 593 ms (95% CI, n=3) | 7838–8748 | 3 |
| Gemini 3.1 Flash-Lite [low] | 1726 ± 108 ms (95% CI, n=3) | 1620–1806 | 3 |
| Gemini 3.1 Flash-Lite [medium] | 4816 ± 145 ms (95% CI, n=3) | 4679–4932 | 3 |
| Gemini 3.1 Flash-Lite [high] | 5089 ± 207 ms (95% CI, n=3) | 4879–5210 | 3 |
| Grok 4.3 [none] | 2382 ± 186 ms (95% CI, n=3) | 2201–2521 | 3 |
| Grok 4.3 [medium] | 20490 ± 5423 ms (95% CI, n=3) | 15982–25523 | 3 |
| Grok 4.3 [high] | 24423 ± 5203 ms (95% CI, n=3) | 20529–29495 | 3 |
| Grok 4.20 Reasoning [n/a] | 38918 ± 16237 ms (95% CI, n=3) | 25329–53921 | 3 |
| Grok 4.20 Non-Reasoning [n/a] | 2919 ± 123 ms (95% CI, n=3) | 2843–3043 | 3 |
| Grok Build 0.1 [n/a] | 36444 ± 6613 ms (95% CI, n=3) | 29735–40428 | 3 |

測定された47件の設定のうち、最も低かったのは **Gemini 3.1 Flash-Lite [low]** で、1726 ± 108 ms（95% CI, n=3）でした。これと対照的なのは Grok 4.20 Reasoning [n/a] で、38918 ± 16237 ms（95% CI, n=3）でした。

## 5. 考察

47件の測定構成のうち最高値：**Gemini 3.1 Flash-Lite [high]** が 9278 ± 17042 tok/s（95% CI, n=3）。この測定の対極にあるのは GPT-5.5 [none] の 48 ± 4 tok/s（95% CI, n=3）。

47件の測定構成のうち最低値：**Claude Fable 5 [max]** が 0 ± 0 ms（95% CI, n=3）。この測定の対極にあるのは Grok 4.20 Reasoning [n/a] の 37966 ± 16419 ms（95% CI, n=3）。

47件の測定構成のうち最低値：**Gemini 3.1 Flash-Lite [low]** が 1726 ± 108 ms（95% CI, n=3）。この測定の対極にあるのは Grok 4.20 Reasoning [n/a] の 38918 ± 16237 ms（95% CI, n=3）。

## 6. 再現方法

### 再現手順

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# キー不要のセルフテスト（コミット済みの比較用フィクスチャを投影する）:
npm run research -- speed --fixture

# 実プロバイダーに対しては、共有のスイープを実行してから投影する:
npm run compare
npm run research -- speed --real
```

### 再現コスト（目安）

フィクスチャの投影はキー不要でコストもかからない。実際の経路では共有の `npm run compare` スイープの料金が発生する。プロバイダーの実行前に `npm run compare -- --estimate` を実行し、呼び出し回数、推定コスト、所要時間の見積もりを事前に確認すること。

### クリーンアップ

投影処理は外部リソースを一切作成しない。実行時（real run）にはローカルの `.real` Markdown／データ成果物が書き出され、共有の比較履歴が更新される。コミット前にそれらのファイルを確認すること。

## 7. 検証データ

投影されたアーティファクトには、本トピックのプロンプト、生の試行出力、トークン数、タイミング値、そして（精度に関しては）スキーマ適合結果とプロバイダーの拒否メッセージが保存されている。このページは、プロバイダーへの再実行なしに、そのアーティファクトから再生成できる。

**統一速度プローブ**（ストリーミングによる正確な長さの生成を、設定ごとに3回繰り返す。1回の呼び出しから、生成ウィンドウ全体での持続tok/s（Time To First Tokenを除く）に加え、TTFTと総応答時間が得られる）：

```text
Write a single flowing passage about how large language models generate text that is exactly 200 words long. Write continuous prose only — no lists, headings, or code. Respond with the passage only — no preamble, no word count, no markdown.
```

**完全な生データ記録。** すべての設定、試行、そして本トピックの呼び出しは、このページとともにJSONアーティファクトとしてコミットされている：
[`llm-speed-comparison.data.json`](./llm-speed-comparison.data.json)。
これは、統合比較記録`llm-model-comparison.real.data.json`から投影されたものであり——同一の測定結果であって、再実行されたものではない。

この投影処理により、`llm-speed-comparison.data.json`と本Markdownページが生成される。元となるスイープは`llm-model-comparison.real.data.json`のままであるため、速度と精度は同一の基礎的な実行結果にまで遡って監査可能である。
