---
source_artifact: docs/research-reports/llm-speed-comparison.data.json
source_commit: c7072d1
insights_model: source-report
translated_from: llm-speed-comparison.md
translation_model: claude-sonnet-5
generated_at: 2026-07-09T11:52:54.627Z
trials: 0
provenance: llm-translation
---
# LLMレスポンス速度比較

このレポートでは、**59のモデル×エフォート設定**を19モデル・4プロバイダーにわたって比較し、持続的な生成スループット、最初のトークンまでの時間、および総レスポンスレイテンシを、**1試行**にわたって検証します。

ここに示す数値は、**統合LLM比較スイープの投影**です — 同じ試行、モデル×エフォートのマトリクス、統計、および来歴情報を、本トピックのプローブに限定したものです。これは独立した測定ではないため、統合レポートとセル単位で一致します。厳選されたカタログ情報（プロバイダー、モデル、ティア、価格、エフォート）はモデルレジストリから取得され、測定値は以下にリンクされた投影実行アーティファクトから取得されています。

## 比較

| プロバイダー | モデル | ティア | Effort | コスト（入力 / 出力 per MTok） | スループット (tok/s) | TTFT (ms) | 合計レイテンシ (ms) |
| -------- | ----- | ---- | ------ | ------------------------ | --- | --- | --- |
| Anthropic | Claude Fable 5 | frontier | low | $6.00 / $30.00 | 70 tok/s (n=1) | 3613 ms (n=1) | 4678 ms (n=1) |
| Anthropic | Claude Fable 5 | frontier | medium | $6.00 / $30.00 | 66 tok/s (n=1) | 3434 ms (n=1) | 4418 ms (n=1) |
| Anthropic | Claude Fable 5 | frontier | high | $6.00 / $30.00 | 71 tok/s (n=1) | 4103 ms (n=1) | 4545 ms (n=1) |
| Anthropic | Claude Fable 5 | frontier | xhigh | $6.00 / $30.00 | 66 tok/s (n=1) | 3466 ms (n=1) | 4253 ms (n=1) |
| Anthropic | Claude Fable 5 | frontier | max | $6.00 / $30.00 | 131 tok/s (n=1) | 5842 ms (n=1) | 6826 ms (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | low | $5.00 / $25.00 | 67 tok/s (n=1) | 1237 ms (n=1) | 1783 ms (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | medium | $5.00 / $25.00 | 60 tok/s (n=1) | 1176 ms (n=1) | 1935 ms (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | high | $5.00 / $25.00 | 66 tok/s (n=1) | 1078 ms (n=1) | 2014 ms (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | xhigh | $5.00 / $25.00 | 63 tok/s (n=1) | 2143 ms (n=1) | 2896 ms (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | max | $5.00 / $25.00 | 61 tok/s (n=1) | 1643 ms (n=1) | 2343 ms (n=1) |
| Anthropic | Claude Sonnet 5 | mid | low | $3.00 / $15.00 | 85 tok/s (n=1) | 792 ms (n=1) | 1665 ms (n=1) |
| Anthropic | Claude Sonnet 5 | mid | medium | $3.00 / $15.00 | 82 tok/s (n=1) | 938 ms (n=1) | 1757 ms (n=1) |
| Anthropic | Claude Sonnet 5 | mid | high | $3.00 / $15.00 | 84 tok/s (n=1) | 872 ms (n=1) | 1678 ms (n=1) |
| Anthropic | Claude Sonnet 5 | mid | xhigh | $3.00 / $15.00 | 90 tok/s (n=1) | 961 ms (n=1) | 1589 ms (n=1) |
| Anthropic | Claude Sonnet 5 | mid | max | $3.00 / $15.00 | 154 tok/s (n=1) | 16739 ms (n=1) | 16758 ms (n=1) |
| Anthropic | Claude Haiku 4.5 | small | n/a | $1.00 / $5.00 | 83 tok/s (n=1) | 842 ms (n=1) | 1148 ms (n=1) |
| OpenAI | GPT-5.5 | flagship | none | $5.00 / $30.00 | 33 tok/s (n=1) | 1405 ms (n=1) | 1868 ms (n=1) |
| OpenAI | GPT-5.5 | flagship | low | $5.00 / $30.00 | 38 tok/s (n=1) | 912 ms (n=1) | 1380 ms (n=1) |
| OpenAI | GPT-5.5 | flagship | medium | $5.00 / $30.00 | 28 tok/s (n=1) | 1057 ms (n=1) | 1580 ms (n=1) |
| OpenAI | GPT-5.5 | flagship | high | $5.00 / $30.00 | 34 tok/s (n=1) | 1098 ms (n=1) | 1326 ms (n=1) |
| OpenAI | GPT-5.4 | mid | none | $2.50 / $15.00 | 61 tok/s (n=1) | 677 ms (n=1) | 1349 ms (n=1) |
| OpenAI | GPT-5.4 | mid | low | $2.50 / $15.00 | 48 tok/s (n=1) | 1099 ms (n=1) | 1387 ms (n=1) |
| OpenAI | GPT-5.4 | mid | medium | $2.50 / $15.00 | 64 tok/s (n=1) | 1194 ms (n=1) | 1617 ms (n=1) |
| OpenAI | GPT-5.4 | mid | high | $2.50 / $15.00 | 71 tok/s (n=1) | 837 ms (n=1) | 1081 ms (n=1) |
| OpenAI | GPT-5.4 mini | small | none | $0.50 / $2.00 | 109 tok/s (n=1) | 853 ms (n=1) | 1279 ms (n=1) |
| OpenAI | GPT-5.4 mini | small | low | $0.50 / $2.00 | 138 tok/s (n=1) | 410 ms (n=1) | 678 ms (n=1) |
| OpenAI | GPT-5.4 mini | small | medium | $0.50 / $2.00 | 142 tok/s (n=1) | 946 ms (n=1) | 1209 ms (n=1) |
| OpenAI | GPT-5.4 mini | small | high | $0.50 / $2.00 | 146 tok/s (n=1) | 596 ms (n=1) | 827 ms (n=1) |
| OpenAI | GPT-5.4 nano | small | none | $0.15 / $0.60 | 162 tok/s (n=1) | 1130 ms (n=1) | 1858 ms (n=1) |
| OpenAI | GPT-5.4 nano | small | low | $0.15 / $0.60 | 140 tok/s (n=1) | 368 ms (n=1) | 623 ms (n=1) |
| OpenAI | GPT-5.4 nano | small | medium | $0.15 / $0.60 | 158 tok/s (n=1) | 399 ms (n=1) | 643 ms (n=1) |
| OpenAI | GPT-5.4 nano | small | high | $0.15 / $0.60 | 165 tok/s (n=1) | 467 ms (n=1) | 596 ms (n=1) |
| OpenAI | o4-mini | mid | low | $1.10 / $4.40 | 147 tok/s (n=1) | 930 ms (n=1) | 1136 ms (n=1) |
| OpenAI | o4-mini | mid | medium | $1.10 / $4.40 | 223 tok/s (n=1) | 2876 ms (n=1) | 3254 ms (n=1) |
| OpenAI | o4-mini | mid | high | $1.10 / $4.40 | 202 tok/s (n=1) | 7409 ms (n=1) | 7633 ms (n=1) |
| OpenAI | GPT Realtime | flagship | n/a | $4.00 / $16.00 | 127 tok/s (n=1) | 1137 ms (n=1) | 1336 ms (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | low | $1.75 / $14.00 | 51 tok/s (n=1) | 873 ms (n=1) | 1383 ms (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | medium | $1.75 / $14.00 | 58 tok/s (n=1) | 760 ms (n=1) | 1529 ms (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | high | $1.75 / $14.00 | 58 tok/s (n=1) | 1783 ms (n=1) | 4284 ms (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | xhigh | $1.75 / $14.00 | 0 tok/s (n=1) | 2430 ms (n=1) | 3072 ms (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | low | $0.25 / $2.00 | 184 tok/s (n=1) | 725 ms (n=1) | 944 ms (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | medium | $0.25 / $2.00 | 219 tok/s (n=1) | 641 ms (n=1) | 932 ms (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | high | $0.25 / $2.00 | 193 tok/s (n=1) | 522 ms (n=1) | 818 ms (n=1) |
| Google | Gemini 3.1 Pro | flagship | low | $2.00 / $12.00 | 167 tok/s (n=1) | 6530 ms (n=1) | 6530 ms (n=1) |
| Google | Gemini 3.1 Pro | flagship | medium | $2.00 / $12.00 | 155 tok/s (n=1) | 4206 ms (n=1) | 4394 ms (n=1) |
| Google | Gemini 3.1 Pro | flagship | high | $2.00 / $12.00 | 146 tok/s (n=1) | 7122 ms (n=1) | 7123 ms (n=1) |
| Google | Gemini 3.5 Flash | mid | low | $0.30 / $2.50 | 267 tok/s (n=1) | 2762 ms (n=1) | 2762 ms (n=1) |
| Google | Gemini 3.5 Flash | mid | medium | $0.30 / $2.50 | 255 tok/s (n=1) | 2680 ms (n=1) | 2680 ms (n=1) |
| Google | Gemini 3.5 Flash | mid | high | $0.30 / $2.50 | 221 tok/s (n=1) | 3082 ms (n=1) | 3084 ms (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | low | $0.10 / $0.40 | 250 tok/s (n=1) | 928 ms (n=1) | 931 ms (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | medium | $0.10 / $0.40 | 453 tok/s (n=1) | 1250 ms (n=1) | 1250 ms (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | high | $0.10 / $0.40 | 460 tok/s (n=1) | 1259 ms (n=1) | 1259 ms (n=1) |
| xAI | Grok 4.3 | frontier | none | $1.25 / $2.50 | 99 tok/s (n=1) | 584 ms (n=1) | 779 ms (n=1) |
| xAI | Grok 4.3 | frontier | low | $1.25 / $2.50 | 76 tok/s (n=1) | 3083 ms (n=1) | 3258 ms (n=1) |
| xAI | Grok 4.3 | frontier | medium | $1.25 / $2.50 | 177 tok/s (n=1) | 7150 ms (n=1) | 7273 ms (n=1) |
| xAI | Grok 4.3 | frontier | high | $1.25 / $2.50 | 196 tok/s (n=1) | 3735 ms (n=1) | 3962 ms (n=1) |
| xAI | Grok 4.20 Reasoning | flagship | n/a | $1.25 / $2.50 | 104 tok/s (n=1) | 2532 ms (n=1) | 2637 ms (n=1) |
| xAI | Grok 4.20 Non-Reasoning | mid | n/a | $1.25 / $2.50 | 96 tok/s (n=1) | 362 ms (n=1) | 522 ms (n=1) |
| xAI | Grok Build 0.1 | small | n/a | $1.00 / $2.00 | 227 tok/s (n=1) | 9531 ms (n=1) | 9681 ms (n=1) |

**凡例。** プロバイダー、モデル、ティア、Effort、コストはキュレーションされたカタログデータです。
各メトリック列は実測値であり、それぞれ平均 ± 95% 信頼区間（1.96 × サンプル標準偏差 / √n、n は試行回数）として1回の試行に基づき報告されています。
`n/a (fixtured)`は、決定論的なフィクスチャクライアントがそのセルを生成したこと（APIキーは使用されていないこと）を意味し、`n/a (error)`は、その構成のすべての試行が失敗したことを意味します。データの出所はセルのテキストに明記されており、色のみによって符号化されることはありません。

## 項目別測定結果

各表は、測定した1項目について平均値±95%信頼区間、観測された最小値〜最大値、および寄与した試行回数を示す。n < 2 の指標は平均値のみを表示し、その n を明記する。

### 生成中の持続スループット

| 構成 | 平均値 ± 95% CI | 最小〜最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 70 tok/s (n=1) | 69.8–69.8 | 1 |
| Claude Fable 5 [medium] | 66 tok/s (n=1) | 65.6–65.6 | 1 |
| Claude Fable 5 [high] | 71 tok/s (n=1) | 71.3–71.3 | 1 |
| Claude Fable 5 [xhigh] | 66 tok/s (n=1) | 66.3–66.3 | 1 |
| Claude Fable 5 [max] | 131 tok/s (n=1) | 130.7–130.7 | 1 |
| Claude Opus 4.8 [low] | 67 tok/s (n=1) | 66.6–66.6 | 1 |
| Claude Opus 4.8 [medium] | 60 tok/s (n=1) | 59.8–59.8 | 1 |
| Claude Opus 4.8 [high] | 66 tok/s (n=1) | 66.4–66.4 | 1 |
| Claude Opus 4.8 [xhigh] | 63 tok/s (n=1) | 62.5–62.5 | 1 |
| Claude Opus 4.8 [max] | 61 tok/s (n=1) | 60.6–60.6 | 1 |
| Claude Sonnet 5 [low] | 85 tok/s (n=1) | 85.1–85.1 | 1 |
| Claude Sonnet 5 [medium] | 82 tok/s (n=1) | 82.3–82.3 | 1 |
| Claude Sonnet 5 [high] | 84 tok/s (n=1) | 83.8–83.8 | 1 |
| Claude Sonnet 5 [xhigh] | 90 tok/s (n=1) | 89.9–89.9 | 1 |
| Claude Sonnet 5 [max] | 154 tok/s (n=1) | 154.3–154.3 | 1 |
| Claude Haiku 4.5 [n/a] | 83 tok/s (n=1) | 83.5–83.5 | 1 |
| GPT-5.5 [none] | 33 tok/s (n=1) | 32.8–32.8 | 1 |
| GPT-5.5 [low] | 38 tok/s (n=1) | 38.3–38.3 | 1 |
| GPT-5.5 [medium] | 28 tok/s (n=1) | 28.4–28.4 | 1 |
| GPT-5.5 [high] | 34 tok/s (n=1) | 34.2–34.2 | 1 |
| GPT-5.4 [none] | 61 tok/s (n=1) | 61.0–61.0 | 1 |
| GPT-5.4 [low] | 48 tok/s (n=1) | 47.8–47.8 | 1 |
| GPT-5.4 [medium] | 64 tok/s (n=1) | 64.2–64.2 | 1 |
| GPT-5.4 [high] | 71 tok/s (n=1) | 71.0–71.0 | 1 |
| GPT-5.4 mini [none] | 109 tok/s (n=1) | 108.7–108.7 | 1 |
| GPT-5.4 mini [low] | 138 tok/s (n=1) | 137.8–137.8 | 1 |
| GPT-5.4 mini [medium] | 142 tok/s (n=1) | 141.9–141.9 | 1 |
| GPT-5.4 mini [high] | 146 tok/s (n=1) | 145.8–145.8 | 1 |
| GPT-5.4 nano [none] | 162 tok/s (n=1) | 161.7–161.7 | 1 |
| GPT-5.4 nano [low] | 140 tok/s (n=1) | 140.0–140.0 | 1 |
| GPT-5.4 nano [medium] | 158 tok/s (n=1) | 157.7–157.7 | 1 |
| GPT-5.4 nano [high] | 165 tok/s (n=1) | 165.1–165.1 | 1 |
| o4-mini [low] | 147 tok/s (n=1) | 147.4–147.4 | 1 |
| o4-mini [medium] | 223 tok/s (n=1) | 223.3–223.3 | 1 |
| o4-mini [high] | 202 tok/s (n=1) | 201.5–201.5 | 1 |
| GPT Realtime [n/a] | 127 tok/s (n=1) | 127.4–127.4 | 1 |
| GPT-5.3 Codex [low] | 51 tok/s (n=1) | 51.4–51.4 | 1 |
| GPT-5.3 Codex [medium] | 58 tok/s (n=1) | 58.1–58.1 | 1 |
| GPT-5.3 Codex [high] | 58 tok/s (n=1) | 57.5–57.5 | 1 |
| GPT-5.3 Codex [xhigh] | 0 tok/s (n=1) | 0.0–0.0 | 1 |
| GPT-5.1 Codex mini [low] | 184 tok/s (n=1) | 183.7–183.7 | 1 |
| GPT-5.1 Codex mini [medium] | 219 tok/s (n=1) | 219.4–219.4 | 1 |
| GPT-5.1 Codex mini [high] | 193 tok/s (n=1) | 192.9–192.9 | 1 |
| Gemini 3.1 Pro [low] | 167 tok/s (n=1) | 167.1–167.1 | 1 |
| Gemini 3.1 Pro [medium] | 155 tok/s (n=1) | 155.4–155.4 | 1 |
| Gemini 3.1 Pro [high] | 146 tok/s (n=1) | 145.7–145.7 | 1 |
| Gemini 3.5 Flash [low] | 267 tok/s (n=1) | 267.0–267.0 | 1 |
| Gemini 3.5 Flash [medium] | 255 tok/s (n=1) | 254.7–254.7 | 1 |
| Gemini 3.5 Flash [high] | 221 tok/s (n=1) | 221.3–221.3 | 1 |
| Gemini 3.1 Flash-Lite [low] | 250 tok/s (n=1) | 250.0–250.0 | 1 |
| Gemini 3.1 Flash-Lite [medium] | 453 tok/s (n=1) | 453.1–453.1 | 1 |
| Gemini 3.1 Flash-Lite [high] | 460 tok/s (n=1) | 460.5–460.5 | 1 |
| Grok 4.3 [none] | 99 tok/s (n=1) | 99.1–99.1 | 1 |
| Grok 4.3 [low] | 76 tok/s (n=1) | 76.2–76.2 | 1 |
| Grok 4.3 [medium] | 177 tok/s (n=1) | 177.1–177.1 | 1 |
| Grok 4.3 [high] | 196 tok/s (n=1) | 196.0–196.0 | 1 |
| Grok 4.20 Reasoning [n/a] | 104 tok/s (n=1) | 104.1–104.1 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 96 tok/s (n=1) | 96.5–96.5 | 1 |
| Grok Build 0.1 [n/a] | 227 tok/s (n=1) | 226.9–226.9 | 1 |

測定された59件の構成のうち最高値: **Gemini 3.1 Flash-Lite [high]** 460 tok/s (n=1)。この測定の対極: GPT-5.3 Codex [xhigh] 0 tok/s (n=1)。

### 初回トークンまでの時間

| 構成 | 平均値 ± 95% CI | 最小〜最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 3613 ms (n=1) | 3613–3613 | 1 |
| Claude Fable 5 [medium] | 3434 ms (n=1) | 3434–3434 | 1 |
| Claude Fable 5 [high] | 4103 ms (n=1) | 4103–4103 | 1 |
| Claude Fable 5 [xhigh] | 3466 ms (n=1) | 3466–3466 | 1 |
| Claude Fable 5 [max] | 5842 ms (n=1) | 5842–5842 | 1 |
| Claude Opus 4.8 [low] | 1237 ms (n=1) | 1237–1237 | 1 |
| Claude Opus 4.8 [medium] | 1176 ms (n=1) | 1176–1176 | 1 |
| Claude Opus 4.8 [high] | 1078 ms (n=1) | 1078–1078 | 1 |
| Claude Opus 4.8 [xhigh] | 2143 ms (n=1) | 2143–2143 | 1 |
| Claude Opus 4.8 [max] | 1643 ms (n=1) | 1643–1643 | 1 |
| Claude Sonnet 5 [low] | 792 ms (n=1) | 792–792 | 1 |
| Claude Sonnet 5 [medium] | 938 ms (n=1) | 938–938 | 1 |
| Claude Sonnet 5 [high] | 872 ms (n=1) | 872–872 | 1 |
| Claude Sonnet 5 [xhigh] | 961 ms (n=1) | 961–961 | 1 |
| Claude Sonnet 5 [max] | 16739 ms (n=1) | 16739–16739 | 1 |
| Claude Haiku 4.5 [n/a] | 842 ms (n=1) | 842–842 | 1 |
| GPT-5.5 [none] | 1405 ms (n=1) | 1405–1405 | 1 |
| GPT-5.5 [low] | 912 ms (n=1) | 912–912 | 1 |
| GPT-5.5 [medium] | 1057 ms (n=1) | 1057–1057 | 1 |
| GPT-5.5 [high] | 1098 ms (n=1) | 1098–1098 | 1 |
| GPT-5.4 [none] | 677 ms (n=1) | 677–677 | 1 |
| GPT-5.4 [low] | 1099 ms (n=1) | 1099–1099 | 1 |
| GPT-5.4 [medium] | 1194 ms (n=1) | 1194–1194 | 1 |
| GPT-5.4 [high] | 837 ms (n=1) | 837–837 | 1 |
| GPT-5.4 mini [none] | 853 ms (n=1) | 853–853 | 1 |
| GPT-5.4 mini [low] | 410 ms (n=1) | 410–410 | 1 |
| GPT-5.4 mini [medium] | 946 ms (n=1) | 946–946 | 1 |
| GPT-5.4 mini [high] | 596 ms (n=1) | 596–596 | 1 |
| GPT-5.4 nano [none] | 1130 ms (n=1) | 1130–1130 | 1 |
| GPT-5.4 nano [low] | 368 ms (n=1) | 368–368 | 1 |
| GPT-5.4 nano [medium] | 399 ms (n=1) | 399–399 | 1 |
| GPT-5.4 nano [high] | 467 ms (n=1) | 467–467 | 1 |
| o4-mini [low] | 930 ms (n=1) | 930–930 | 1 |
| o4-mini [medium] | 2876 ms (n=1) | 2876–2876 | 1 |
| o4-mini [high] | 7409 ms (n=1) | 7409–7409 | 1 |
| GPT Realtime [n/a] | 1137 ms (n=1) | 1137–1137 | 1 |
| GPT-5.3 Codex [low] | 873 ms (n=1) | 873–873 | 1 |
| GPT-5.3 Codex [medium] | 760 ms (n=1) | 760–760 | 1 |
| GPT-5.3 Codex [high] | 1783 ms (n=1) | 1783–1783 | 1 |
| GPT-5.3 Codex [xhigh] | 2430 ms (n=1) | 2430–2430 | 1 |
| GPT-5.1 Codex mini [low] | 725 ms (n=1) | 725–725 | 1 |
| GPT-5.1 Codex mini [medium] | 641 ms (n=1) | 641–641 | 1 |
| GPT-5.1 Codex mini [high] | 522 ms (n=1) | 522–522 | 1 |
| Gemini 3.1 Pro [low] | 6530 ms (n=1) | 6530–6530 | 1 |
| Gemini 3.1 Pro [medium] | 4206 ms (n=1) | 4206–4206 | 1 |
| Gemini 3.1 Pro [high] | 7122 ms (n=1) | 7122–7122 | 1 |
| Gemini 3.5 Flash [low] | 2762 ms (n=1) | 2762–2762 | 1 |
| Gemini 3.5 Flash [medium] | 2680 ms (n=1) | 2680–2680 | 1 |
| Gemini 3.5 Flash [high] | 3082 ms (n=1) | 3082–3082 | 1 |
| Gemini 3.1 Flash-Lite [low] | 928 ms (n=1) | 928–928 | 1 |
| Gemini 3.1 Flash-Lite [medium] | 1250 ms (n=1) | 1250–1250 | 1 |
| Gemini 3.1 Flash-Lite [high] | 1259 ms (n=1) | 1259–1259 | 1 |
| Grok 4.3 [none] | 584 ms (n=1) | 584–584 | 1 |
| Grok 4.3 [low] | 3083 ms (n=1) | 3083–3083 | 1 |
| Grok 4.3 [medium] | 7150 ms (n=1) | 7150–7150 | 1 |
| Grok 4.3 [high] | 3735 ms (n=1) | 3735–3735 | 1 |
| Grok 4.20 Reasoning [n/a] | 2532 ms (n=1) | 2532–2532 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 362 ms (n=1) | 362–362 | 1 |
| Grok Build 0.1 [n/a] | 9531 ms (n=1) | 9531–9531 | 1 |

測定された59件の構成のうち最低値: **Grok 4.20 Non-Reasoning [n/a]** 362 ms (n=1)。この測定の対極: Claude Sonnet 5 [max] 16739 ms (n=1)。

### 総応答時間

| 設定 | 平均 ± 95% CI | 最小～最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 4678 ms (n=1) | 4678–4678 | 1 |
| Claude Fable 5 [medium] | 4418 ms (n=1) | 4418–4418 | 1 |
| Claude Fable 5 [high] | 4545 ms (n=1) | 4545–4545 | 1 |
| Claude Fable 5 [xhigh] | 4253 ms (n=1) | 4253–4253 | 1 |
| Claude Fable 5 [max] | 6826 ms (n=1) | 6826–6826 | 1 |
| Claude Opus 4.8 [low] | 1783 ms (n=1) | 1783–1783 | 1 |
| Claude Opus 4.8 [medium] | 1935 ms (n=1) | 1935–1935 | 1 |
| Claude Opus 4.8 [high] | 2014 ms (n=1) | 2014–2014 | 1 |
| Claude Opus 4.8 [xhigh] | 2896 ms (n=1) | 2896–2896 | 1 |
| Claude Opus 4.8 [max] | 2343 ms (n=1) | 2343–2343 | 1 |
| Claude Sonnet 5 [low] | 1665 ms (n=1) | 1665–1665 | 1 |
| Claude Sonnet 5 [medium] | 1757 ms (n=1) | 1757–1757 | 1 |
| Claude Sonnet 5 [high] | 1678 ms (n=1) | 1678–1678 | 1 |
| Claude Sonnet 5 [xhigh] | 1589 ms (n=1) | 1589–1589 | 1 |
| Claude Sonnet 5 [max] | 16758 ms (n=1) | 16758–16758 | 1 |
| Claude Haiku 4.5 [n/a] | 1148 ms (n=1) | 1148–1148 | 1 |
| GPT-5.5 [none] | 1868 ms (n=1) | 1868–1868 | 1 |
| GPT-5.5 [low] | 1380 ms (n=1) | 1380–1380 | 1 |
| GPT-5.5 [medium] | 1580 ms (n=1) | 1580–1580 | 1 |
| GPT-5.5 [high] | 1326 ms (n=1) | 1326–1326 | 1 |
| GPT-5.4 [none] | 1349 ms (n=1) | 1349–1349 | 1 |
| GPT-5.4 [low] | 1387 ms (n=1) | 1387–1387 | 1 |
| GPT-5.4 [medium] | 1617 ms (n=1) | 1617–1617 | 1 |
| GPT-5.4 [high] | 1081 ms (n=1) | 1081–1081 | 1 |
| GPT-5.4 mini [none] | 1279 ms (n=1) | 1279–1279 | 1 |
| GPT-5.4 mini [low] | 678 ms (n=1) | 678–678 | 1 |
| GPT-5.4 mini [medium] | 1209 ms (n=1) | 1209–1209 | 1 |
| GPT-5.4 mini [high] | 827 ms (n=1) | 827–827 | 1 |
| GPT-5.4 nano [none] | 1858 ms (n=1) | 1858–1858 | 1 |
| GPT-5.4 nano [low] | 623 ms (n=1) | 623–623 | 1 |
| GPT-5.4 nano [medium] | 643 ms (n=1) | 643–643 | 1 |
| GPT-5.4 nano [high] | 596 ms (n=1) | 596–596 | 1 |
| o4-mini [low] | 1136 ms (n=1) | 1136–1136 | 1 |
| o4-mini [medium] | 3254 ms (n=1) | 3254–3254 | 1 |
| o4-mini [high] | 7633 ms (n=1) | 7633–7633 | 1 |
| GPT Realtime [n/a] | 1336 ms (n=1) | 1336–1336 | 1 |
| GPT-5.3 Codex [low] | 1383 ms (n=1) | 1383–1383 | 1 |
| GPT-5.3 Codex [medium] | 1529 ms (n=1) | 1529–1529 | 1 |
| GPT-5.3 Codex [high] | 4284 ms (n=1) | 4284–4284 | 1 |
| GPT-5.3 Codex [xhigh] | 3072 ms (n=1) | 3072–3072 | 1 |
| GPT-5.1 Codex mini [low] | 944 ms (n=1) | 944–944 | 1 |
| GPT-5.1 Codex mini [medium] | 932 ms (n=1) | 932–932 | 1 |
| GPT-5.1 Codex mini [high] | 818 ms (n=1) | 818–818 | 1 |
| Gemini 3.1 Pro [low] | 6530 ms (n=1) | 6530–6530 | 1 |
| Gemini 3.1 Pro [medium] | 4394 ms (n=1) | 4394–4394 | 1 |
| Gemini 3.1 Pro [high] | 7123 ms (n=1) | 7123–7123 | 1 |
| Gemini 3.5 Flash [low] | 2762 ms (n=1) | 2762–2762 | 1 |
| Gemini 3.5 Flash [medium] | 2680 ms (n=1) | 2680–2680 | 1 |
| Gemini 3.5 Flash [high] | 3084 ms (n=1) | 3084–3084 | 1 |
| Gemini 3.1 Flash-Lite [low] | 931 ms (n=1) | 931–931 | 1 |
| Gemini 3.1 Flash-Lite [medium] | 1250 ms (n=1) | 1250–1250 | 1 |
| Gemini 3.1 Flash-Lite [high] | 1259 ms (n=1) | 1259–1259 | 1 |
| Grok 4.3 [none] | 779 ms (n=1) | 779–779 | 1 |
| Grok 4.3 [low] | 3258 ms (n=1) | 3258–3258 | 1 |
| Grok 4.3 [medium] | 7273 ms (n=1) | 7273–7273 | 1 |
| Grok 4.3 [high] | 3962 ms (n=1) | 3962–3962 | 1 |
| Grok 4.20 Reasoning [n/a] | 2637 ms (n=1) | 2637–2637 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 522 ms (n=1) | 522–522 | 1 |
| Grok Build 0.1 [n/a] | 9681 ms (n=1) | 9681–9681 | 1 |

測定された59件の設定のうち最も低かったのは、**Grok 4.20 Non-Reasoning [n/a]** の 522 ms(n=1)である。これとは対極にあるのが Claude Sonnet 5 [max] の 16758 ms(n=1)である。

## データの透明性

投影されたアーティファクトには、このトピックのプロンプト、生の試行結果、トークン数、タイミング値、そして（精度に関しては）スキーマ準拠結果とプロバイダーの拒否メッセージが保存されています。このページは、プロバイダーを再実行することなく、そのアーティファクトから再生成できます。

**スループットプローブ**（ストリーミングによる長文生成。持続tok/sは、最初のトークンまでの時間を除いた生成ウィンドウ全体で測定）：

```text
Write a detailed, flowing explanation of how large language models generate text of at least 400 words. Write continuous prose only — no lists, headings, or code. Do not stop early; keep going until you have written at least 400 words.
```

**レイテンシプローブ**（ストリーミングによる短いプロンプト。TTFT + 応答時間の合計）：

```text
In one short sentence, state a single interesting fact about the water cycle.
```

**完全な生データ記録。** すべての構成、試行、およびこのトピックの呼び出しは、JSONアーティファクトとしてこのページとともにコミットされています：
[`llm-speed-comparison.data.json`](./llm-speed-comparison.data.json)。
これは、統合比較記録`llm-model-comparison.real.data.json`から投影されたものです — 同一の測定結果であり、再実行は一切行われていません。

## 対象範囲と限界

- 設定×プローブごとに**試行1回**。このサンプル数はラン単位の比較を裏付けるものであり、プロバイダーの挙動が安定しているという統計的な主張を裏付けるものではありません。
- **ある時点でのもの。** 測定された挙動は、以下に記載する生成タイムスタンプ時点のモデルおよびAPIを反映したものです。
- このトピックが検証するのは限定的な挙動（持続的な生成スループット、最初のトークンが出力されるまでの時間、および総応答レイテンシ）のみであり、一般的な能力や推論品質を測定するものではありません。
- **エフォート（effort）のセマンティクスはプロバイダーによって異なる**ため、エフォートレベルはプロバイダー間よりもプロバイダー内で比較する方が妥当です。
- **生成日時:** 2026-07-06T13:08:50.282Z

## 再現方法

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# キー不要のセルフテスト（コミット済みの比較用フィクスチャを投影します）:
npm run research -- speed --fixture

# 実際のプロバイダーに対して、共有スイープを実行してから投影します:
npm run compare        # すべてのプローブを一度ずつ計測します
npm run research -- speed --real
```

このページは統合比較結果の投影です。計測を行うには `compare` を実行し、この特定のビューを再生成するには `research speed` を実行してください。
