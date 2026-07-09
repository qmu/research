---
source_artifact: docs/research-reports/llm-speed-comparison.data.json
source_commit: df5a2b0
insights_model: source-report
translated_from: llm-speed-comparison.md
translation_model: claude-sonnet-5
generated_at: 2026-07-09T11:12:01.332Z
trials: 0
provenance: llm-translation
---
# LLM応答速度比較

本レポートでは、**59通りのモデル×エフォート構成**を対象に、
19モデル・4プロバイダにわたる持続的な生成スループット、Time-to-First-Token、および総応答レイテンシを、
**3回の試行**を通じて比較します。

ここに示す数値は、**統合LLM比較スイープの投影結果**です — 同一の試行、モデル×エフォート行列、統計情報、および出所情報を用い、本トピックのプローブに絞り込んだものです。これは独立した測定ではないため、統合レポートとセル単位で一致します。厳選されたカタログ情報（プロバイダ、モデル、ティア、価格、エフォート）はモデルレジストリに由来し、測定値は下記にリンクされている投影実行アーティファクトに由来します。

## 比較

| プロバイダー | モデル | ティア | Effort | コスト（入力 / 出力、MTokあたり） | スループット（tok/s） | TTFT（ms） | 総レイテンシ（ms） |
| -------- | ----- | ---- | ------ | ------------------------ | --- | --- | --- |
| anthropic | Claude Fable 5 | frontier | low | $6.00 / $30.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| anthropic | Claude Fable 5 | frontier | medium | $6.00 / $30.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| anthropic | Claude Fable 5 | frontier | high | $6.00 / $30.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| anthropic | Claude Fable 5 | frontier | xhigh | $6.00 / $30.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| anthropic | Claude Fable 5 | frontier | max | $6.00 / $30.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| anthropic | Claude Opus 4.8 | flagship | low | $5.00 / $25.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| anthropic | Claude Opus 4.8 | flagship | medium | $5.00 / $25.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| anthropic | Claude Opus 4.8 | flagship | high | $5.00 / $25.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| anthropic | Claude Opus 4.8 | flagship | xhigh | $5.00 / $25.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| anthropic | Claude Opus 4.8 | flagship | max | $5.00 / $25.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| anthropic | Claude Sonnet 5 | mid | low | $3.00 / $15.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| anthropic | Claude Sonnet 5 | mid | medium | $3.00 / $15.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| anthropic | Claude Sonnet 5 | mid | high | $3.00 / $15.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| anthropic | Claude Sonnet 5 | mid | xhigh | $3.00 / $15.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| anthropic | Claude Sonnet 5 | mid | max | $3.00 / $15.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| anthropic | Claude Haiku 4.5 | small | n/a | $1.00 / $5.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.5 | flagship | none | $5.00 / $30.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.5 | flagship | low | $5.00 / $30.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.5 | flagship | medium | $5.00 / $30.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.5 | flagship | high | $5.00 / $30.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.4 | mid | none | $2.50 / $15.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.4 | mid | low | $2.50 / $15.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.4 | mid | medium | $2.50 / $15.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.4 | mid | high | $2.50 / $15.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.4 mini | small | none | $0.50 / $2.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.4 mini | small | low | $0.50 / $2.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.4 mini | small | medium | $0.50 / $2.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.4 mini | small | high | $0.50 / $2.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.4 nano | small | none | $0.15 / $0.60 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.4 nano | small | low | $0.15 / $0.60 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.4 nano | small | medium | $0.15 / $0.60 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.4 nano | small | high | $0.15 / $0.60 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | o4-mini | mid | low | $1.10 / $4.40 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | o4-mini | mid | medium | $1.10 / $4.40 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | o4-mini | mid | high | $1.10 / $4.40 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT Realtime | flagship | n/a | $4.00 / $16.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.3 Codex | flagship | low | $1.75 / $14.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.3 Codex | flagship | medium | $1.75 / $14.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.3 Codex | flagship | high | $1.75 / $14.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.3 Codex | flagship | xhigh | $1.75 / $14.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.1 Codex mini | small | low | $0.25 / $2.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.1 Codex mini | small | medium | $0.25 / $2.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| openai | GPT-5.1 Codex mini | small | high | $0.25 / $2.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| google | Gemini 3.1 Pro | flagship | low | $2.00 / $12.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| google | Gemini 3.1 Pro | flagship | medium | $2.00 / $12.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| google | Gemini 3.1 Pro | flagship | high | $2.00 / $12.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| google | Gemini 3.5 Flash | mid | low | $0.30 / $2.50 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| google | Gemini 3.5 Flash | mid | medium | $0.30 / $2.50 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| google | Gemini 3.5 Flash | mid | high | $0.30 / $2.50 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| google | Gemini 3.1 Flash-Lite | small | low | $0.10 / $0.40 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| google | Gemini 3.1 Flash-Lite | small | medium | $0.10 / $0.40 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| google | Gemini 3.1 Flash-Lite | small | high | $0.10 / $0.40 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| xai | Grok 4.3 | frontier | none | $1.25 / $2.50 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| xai | Grok 4.3 | frontier | low | $1.25 / $2.50 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| xai | Grok 4.3 | frontier | medium | $1.25 / $2.50 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| xai | Grok 4.3 | frontier | high | $1.25 / $2.50 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| xai | Grok 4.20 Reasoning | flagship | n/a | $1.25 / $2.50 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| xai | Grok 4.20 Non-Reasoning | mid | n/a | $1.25 / $2.50 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| xai | Grok Build 0.1 | small | n/a | $1.00 / $2.00 | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |

**凡例。** プロバイダー、モデル、ティア、Effort、コストはキュレーションされたカタログデータです。
メトリック列は測定値であり、それぞれ平均値 ± 95%信頼区間（1.96 × サンプル標準偏差 / √n、nは3回の試行）として報告されています。
`n/a（フィクスチャ）`は、決定論的なフィクスチャクライアントがそのセルを生成したこと（APIキーは使用されていません）を意味し、`n/a（エラー）`はその設定における全試行が失敗したことを意味します。出処（provenance）はセルのテキストに明記されており、色のみで表現されることはありません。

## 各観点ごとの測定結果

各表は、測定対象の1つの観点について、平均値±95%信頼区間、観測された最小〜最大値、および寄与した試行回数を示しています。nが2未満の指標は平均値のみを表示し、そのnを併記しています。

### 生成中の持続スループット

| 構成 | 平均値±95%信頼区間 | 最小〜最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Fable 5 [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Fable 5 [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Fable 5 [xhigh] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Fable 5 [max] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Opus 4.8 [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Opus 4.8 [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Opus 4.8 [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Opus 4.8 [xhigh] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Opus 4.8 [max] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Sonnet 5 [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Sonnet 5 [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Sonnet 5 [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Sonnet 5 [xhigh] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Sonnet 5 [max] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Haiku 4.5 [n/a] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.5 [none] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.5 [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.5 [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.5 [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 [none] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 mini [none] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 mini [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 mini [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 mini [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 nano [none] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 nano [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 nano [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 nano [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| o4-mini [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| o4-mini [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| o4-mini [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT Realtime [n/a] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.3 Codex [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.3 Codex [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.3 Codex [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.3 Codex [xhigh] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.1 Codex mini [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.1 Codex mini [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.1 Codex mini [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.1 Pro [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.1 Pro [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.1 Pro [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.5 Flash [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.5 Flash [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.5 Flash [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.1 Flash-Lite [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.1 Flash-Lite [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.1 Flash-Lite [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Grok 4.3 [none] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Grok 4.3 [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Grok 4.3 [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Grok 4.3 [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Grok 4.20 Reasoning [n/a] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Grok 4.20 Non-Reasoning [n/a] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Grok Build 0.1 [n/a] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |

今回の実行では、この観点についての測定値はありません。すべての構成がフィクスチャ処理されたか、エラーとなりました。

### 最初のトークンが出力されるまでの時間

| 設定 | 平均 ± 95% CI | 最小～最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Fable 5 [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Fable 5 [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Fable 5 [xhigh] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Fable 5 [max] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Opus 4.8 [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Opus 4.8 [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Opus 4.8 [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Opus 4.8 [xhigh] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Opus 4.8 [max] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Sonnet 5 [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Sonnet 5 [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Sonnet 5 [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Sonnet 5 [xhigh] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Sonnet 5 [max] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Claude Haiku 4.5 [n/a] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.5 [none] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.5 [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.5 [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.5 [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 [none] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 mini [none] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 mini [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 mini [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 mini [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 nano [none] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 nano [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 nano [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.4 nano [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| o4-mini [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| o4-mini [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| o4-mini [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT Realtime [n/a] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.3 Codex [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.3 Codex [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.3 Codex [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.3 Codex [xhigh] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.1 Codex mini [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.1 Codex mini [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| GPT-5.1 Codex mini [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.1 Pro [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.1 Pro [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.1 Pro [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.5 Flash [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.5 Flash [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.5 Flash [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.1 Flash-Lite [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.1 Flash-Lite [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Gemini 3.1 Flash-Lite [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Grok 4.3 [none] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Grok 4.3 [low] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Grok 4.3 [medium] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Grok 4.3 [high] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Grok 4.20 Reasoning [n/a] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Grok 4.20 Non-Reasoning [n/a] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |
| Grok Build 0.1 [n/a] | n/a (フィクスチャ) | n/a (フィクスチャ) | n/a (フィクスチャ) |

今回の実行では、この項目について実測値はありません。すべての設定はフィクスチャ処理されたか、エラーになりました。

### 合計応答時間

| 構成 | 平均 ± 95% CI | 最小–最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Claude Fable 5 [medium] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Claude Fable 5 [high] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Claude Fable 5 [xhigh] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Claude Fable 5 [max] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Claude Opus 4.8 [low] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Claude Opus 4.8 [medium] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Claude Opus 4.8 [high] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Claude Opus 4.8 [xhigh] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Claude Opus 4.8 [max] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Claude Sonnet 5 [low] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Claude Sonnet 5 [medium] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Claude Sonnet 5 [high] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Claude Sonnet 5 [xhigh] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Claude Sonnet 5 [max] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Claude Haiku 4.5 [n/a] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.5 [none] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.5 [low] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.5 [medium] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.5 [high] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.4 [none] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.4 [low] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.4 [medium] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.4 [high] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.4 mini [none] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.4 mini [low] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.4 mini [medium] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.4 mini [high] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.4 nano [none] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.4 nano [low] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.4 nano [medium] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.4 nano [high] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| o4-mini [low] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| o4-mini [medium] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| o4-mini [high] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT Realtime [n/a] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.3 Codex [low] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.3 Codex [medium] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.3 Codex [high] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.3 Codex [xhigh] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.1 Codex mini [low] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.1 Codex mini [medium] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| GPT-5.1 Codex mini [high] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Gemini 3.1 Pro [low] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Gemini 3.1 Pro [medium] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Gemini 3.1 Pro [high] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Gemini 3.5 Flash [low] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Gemini 3.5 Flash [medium] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Gemini 3.5 Flash [high] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Gemini 3.1 Flash-Lite [low] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Gemini 3.1 Flash-Lite [medium] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Gemini 3.1 Flash-Lite [high] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Grok 4.3 [none] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Grok 4.3 [low] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Grok 4.3 [medium] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Grok 4.3 [high] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Grok 4.20 Reasoning [n/a] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Grok 4.20 Non-Reasoning [n/a] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |
| Grok Build 0.1 [n/a] | n/a（フィクスチャ） | n/a（フィクスチャ） | n/a（フィクスチャ） |

この実行では、この観点における実測値は得られていません。すべての構成はフィクスチャによる値、またはエラーとなっています。

## データの透明性

投影されたアーティファクトには、このトピックのプロンプト、生の試行出力、トークン数、タイミング値、そして（精度に関しては）スキーマ適合結果とプロバイダーの拒否メッセージが保存されています。このページは、プロバイダーを再実行することなく、そのアーティファクトから再生成できます。

**スループット・プローブ**（ストリーミングによる長文生成。持続tok/sは、最初のトークンまでの時間を除いた生成ウィンドウ全体で計測）：

```text
Write a detailed, flowing explanation of how large language models generate text of at least 400 words. Write continuous prose only — no lists, headings, or code. Do not stop early; keep going until you have written at least 400 words.
```

**レイテンシ・プローブ**（ストリーミングによる短いプロンプト。TTFT＋合計応答時間）：

```text
In one short sentence, state a single interesting fact about the water cycle.
```

**完全な生の記録。** すべての構成、試行、そしてこのトピックの呼び出しは、このページとともにJSONアーティファクトとしてコミットされています：
[`llm-speed-comparison.data.json`](./llm-speed-comparison.data.json)。
これは統合比較記録`llm-model-comparison.data.json`から投影されたものであり、同一の計測結果であって、再実行されたものではありません。

## 範囲と制限事項

- **試行回数は構成×プローブごとに3回**。このサンプル数はラン単位の比較には耐えるが、プロバイダーの挙動が安定しているかどうかについて統計的な主張を裏付けるものではない。
- **特定時点の計測。** 計測された挙動は、下記に記載する生成タイムスタンプ時点のモデルおよびAPIを反映したものである。
- このトピックは限定的な挙動(持続的な生成スループット、最初のトークンまでの時間、および総応答レイテンシ)のみを検証するものであり、一般的な能力や推論の質を測定するものではない。
- **エフォート(effort)の意味づけはプロバイダーごとに異なる**ため、エフォートレベルはプロバイダー間よりもプロバイダー内での比較の方が妥当性が高い。
- **本ランには計測対象外の構成が含まれる。** `n/a (fixtured)` および `n/a (error)` のセルはライブ計測ではない。
- **生成日時:** 2026-01-01T00:00:00.000Z

## 再現方法

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# キー不要のセルフテスト(コミット済みの比較用フィクスチャを投影):
npm run research -- speed --fixture

# 実際のプロバイダーに対して、共通のスイープを実行してから投影:
npm run compare        # 各プローブを1回ずつ計測
npm run research -- speed --real
```

このページは統合比較の投影結果です。計測を行うには `compare` を、この特化ビューを再生成するには `research speed` を実行してください。
