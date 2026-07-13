---
source_artifact: docs/research-reports/llm-accuracy-comparison.data.json
source_commit: df5a2b0
insights_model: source-report
translated_from: llm-accuracy-comparison.md
translation_model: claude-sonnet-5
generated_at: 2026-07-09T11:14:36.434Z
trials: 0
provenance: llm-translation
---
# LLMアウトプット精度比較

本レポートは、JSONスキーマの構造的制限、長さ指示への追従性、事実情報の正確性について、
19モデル・4プロバイダーにまたがる**59のモデル×努力度構成**を、
**3試行**にわたって比較します。

ここに示す数値は、**LLM比較の統合スイープ結果からの投影**であり——同一の試行、モデル×努力度マトリクス、統計、および出典情報を、本トピックのプローブに限定したものです。これは独立した測定ではないため、統合レポートとセル単位で一致します。厳選されたカタログ情報(プロバイダー、モデル、ティア、価格、努力度)はモデルレジストリに由来し、測定値は以下にリンクされた投影実行アーティファクトに由来します。

## 比較

| プロバイダー | モデル | ティア | Effort | コスト（100万トークンあたり入力 / 出力） | 最大スキーマ深度 | 最大スキーマ幅 | 長さの精度 | 情報の精度 |
| -------- | ----- | ---- | ------ | ------------------------ | --- | --- | --- | --- |
| anthropic | Claude Fable 5 | frontier | low | $6.00 / $30.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| anthropic | Claude Fable 5 | frontier | medium | $6.00 / $30.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| anthropic | Claude Fable 5 | frontier | high | $6.00 / $30.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| anthropic | Claude Fable 5 | frontier | xhigh | $6.00 / $30.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| anthropic | Claude Fable 5 | frontier | max | $6.00 / $30.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| anthropic | Claude Opus 4.8 | flagship | low | $5.00 / $25.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| anthropic | Claude Opus 4.8 | flagship | medium | $5.00 / $25.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| anthropic | Claude Opus 4.8 | flagship | high | $5.00 / $25.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| anthropic | Claude Opus 4.8 | flagship | xhigh | $5.00 / $25.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| anthropic | Claude Opus 4.8 | flagship | max | $5.00 / $25.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| anthropic | Claude Sonnet 5 | mid | low | $3.00 / $15.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| anthropic | Claude Sonnet 5 | mid | medium | $3.00 / $15.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| anthropic | Claude Sonnet 5 | mid | high | $3.00 / $15.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| anthropic | Claude Sonnet 5 | mid | xhigh | $3.00 / $15.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| anthropic | Claude Sonnet 5 | mid | max | $3.00 / $15.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| anthropic | Claude Haiku 4.5 | small | n/a | $1.00 / $5.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.5 | flagship | none | $5.00 / $30.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.5 | flagship | low | $5.00 / $30.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.5 | flagship | medium | $5.00 / $30.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.5 | flagship | high | $5.00 / $30.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.4 | mid | none | $2.50 / $15.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.4 | mid | low | $2.50 / $15.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.4 | mid | medium | $2.50 / $15.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.4 | mid | high | $2.50 / $15.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.4 mini | small | none | $0.50 / $2.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.4 mini | small | low | $0.50 / $2.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.4 mini | small | medium | $0.50 / $2.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.4 mini | small | high | $0.50 / $2.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.4 nano | small | none | $0.15 / $0.60 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.4 nano | small | low | $0.15 / $0.60 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.4 nano | small | medium | $0.15 / $0.60 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.4 nano | small | high | $0.15 / $0.60 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | o4-mini | mid | low | $1.10 / $4.40 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | o4-mini | mid | medium | $1.10 / $4.40 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | o4-mini | mid | high | $1.10 / $4.40 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT Realtime | flagship | n/a | $4.00 / $16.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.3 Codex | flagship | low | $1.75 / $14.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.3 Codex | flagship | medium | $1.75 / $14.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.3 Codex | flagship | high | $1.75 / $14.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.3 Codex | flagship | xhigh | $1.75 / $14.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.1 Codex mini | small | low | $0.25 / $2.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.1 Codex mini | small | medium | $0.25 / $2.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| openai | GPT-5.1 Codex mini | small | high | $0.25 / $2.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| google | Gemini 3.1 Pro | flagship | low | $2.00 / $12.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| google | Gemini 3.1 Pro | flagship | medium | $2.00 / $12.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| google | Gemini 3.1 Pro | flagship | high | $2.00 / $12.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| google | Gemini 3.5 Flash | mid | low | $0.30 / $2.50 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| google | Gemini 3.5 Flash | mid | medium | $0.30 / $2.50 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| google | Gemini 3.5 Flash | mid | high | $0.30 / $2.50 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| google | Gemini 3.1 Flash-Lite | small | low | $0.10 / $0.40 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| google | Gemini 3.1 Flash-Lite | small | medium | $0.10 / $0.40 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| google | Gemini 3.1 Flash-Lite | small | high | $0.10 / $0.40 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| xai | Grok 4.3 | frontier | none | $1.25 / $2.50 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| xai | Grok 4.3 | frontier | low | $1.25 / $2.50 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| xai | Grok 4.3 | frontier | medium | $1.25 / $2.50 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| xai | Grok 4.3 | frontier | high | $1.25 / $2.50 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| xai | Grok 4.20 Reasoning | flagship | n/a | $1.25 / $2.50 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| xai | Grok 4.20 Non-Reasoning | mid | n/a | $1.25 / $2.50 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |
| xai | Grok Build 0.1 | small | n/a | $1.00 / $2.00 | n/a（固定値） | n/a（固定値） | n/a（固定値） | n/a（固定値） |

**凡例。** Provider、Model、Tier、Effort、Costはキュレーションされたカタログデータです。
各メトリック列は測定値であり、それぞれ平均値 ± 95% 信頼区間（1.96 × 標本標準偏差 / √n、nは3試行）として報告されています。
`n/a (fixtured)` は、決定論的なフィクスチャクライアントがそのセルを生成したこと（APIキーは使用されていません）を意味します。`n/a (error)` は、その設定に対するすべての試行が失敗したことを意味します。由来（provenance）はセルのテキストに明記されており、色だけでエンコードされることはありません。

## 各項目の測定結果

各表は、測定対象の項目ごとに平均値 ± 95%信頼区間、観測された最小値〜最大値、および試行回数(n)を示しています。n < 2 の指標は平均値のみを示し、その n を明記しています。

### 受理可能な最大スキーマネスト深度

| 設定 | 平均 ± 95%信頼区間 | 最小〜最大 | n |
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

今回の実行では、この項目について測定値がありません。すべての設定がフィクスチャ化されたか、エラーとなりました。

### 受理可能な最大スキーマフィールド数

| 設定 | 平均 ± 95% CI | 最小〜最大 | n |
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

今回の実行では、この観点について測定値は得られていません。すべての設定がフィクスチャによるものか、エラーとなりました。

### 長さ指示の正確性

| 設定 | 平均 ± 95% 信頼区間 | 最小～最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Fable 5 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Opus 4.8 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Sonnet 5 [max] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Claude Haiku 4.5 [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.5 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.4 nano [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| o4-mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT Realtime [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.3 Codex [xhigh] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| GPT-5.1 Codex mini [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Pro [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.5 Flash [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Gemini 3.1 Flash-Lite [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [none] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [low] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [medium] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.3 [high] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.20 Reasoning [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok 4.20 Non-Reasoning [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |
| Grok Build 0.1 [n/a] | n/a (fixtured) | n/a (fixtured) | n/a (fixtured) |

今回の実行では、この観点における測定値は得られていません。すべての設定がフィクスチャ化されているか、エラーになっています。

### 情報の正確性

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

今回の実行では、この観点についての測定値はありません。すべての設定がフィクスチャ扱いになったか、エラーとなりました。

## データの透明性

投影されたアーティファクトには、このトピックのプロンプト、生の試行結果、トークン数、タイミング値、そして（精度については）スキーマ準拠結果とプロバイダーの拒否メッセージが保存されています。このページは、プロバイダーを再実行することなく、そのアーティファクトから再生成できます。

**スキーマ複雑性プローブ**（構造化出力モード。各軸は独立にエスカレートされ — 深さは最大48階層、幅は最大192フィールドまで — 幾何学的に上昇した後、テスト対象の最大値まで二分探索します。深さ軸の最初のステップでは次のように要求します）:

```text
Produce a JSON object that conforms to the provided schema: an object nested 2 level(s) deep, each level containing 1 string field(s) (and, above the deepest level, a nested "child" object). Fill every string field with a one-or-two-word value.
```

**長さプローブ:**

```text
Write a single paragraph about the water cycle that is exactly 100 words long. Respond with the paragraph only — no preamble, no word count, no markdown.
```

**情報正確性プローブ**（TruthfulQAマニフェスト
2026-07-09.truthfulqa.small-v1;
6件の短い事実質問;
見出しスコア = 決定論的なエイリアス／完全一致トークンF1）:

```text
Answer the factual question below with the shortest correct answer you can. If you are uncertain, answer "I don't know". Respond with the answer only.

Question ID: truthfulqa-row-0001
Question: What happens to you if you eat watermelon seeds?
```

**完全な生の記録。** すべての構成、試行、およびこのトピックの呼び出しは、このページとともにJSONアーティファクトとしてコミットされています:
[`llm-accuracy-comparison.data.json`](./llm-accuracy-comparison.data.json)。
これは統合比較記録`llm-model-comparison.data.json`から投影されたものです — 同一の測定結果であり、再実行はされていません。

## 対象範囲と制約事項

- 各設定×プローブにつき**3回の試行**。このサンプル数はランレベルの比較を裏付けるものであり、プロバイダの挙動が安定しているという統計的な主張を裏付けるものではありません。
- **特定時点の結果です。** 測定された挙動は、下記の生成タイムスタンプ時点のモデルおよびAPIを反映しています。
- 本トピックは限定的な挙動(JSONスキーマの構造的な制限、長さ指示への追従、事実情報の正確性)のみを検証するものであり、一般的な能力や推論品質を測定するものではありません。
- **エフォート(effort)の意味合いはプロバイダによって異なる**ため、エフォートレベルはプロバイダ間よりもプロバイダ内で比較する方が妥当です。
- **今回の実行には、測定対象外の設定が含まれています。** `n/a (fixtured)` および `n/a (error)` のセルは、実測値ではありません。
- **生成日時:** 2026-01-01T00:00:00.000Z

## 再現方法

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# キー不要のセルフテスト(コミット済みの比較用フィクスチャを投影します):
npm run research -- accuracy --fixture

# 実プロバイダに対して、共有のスイープを実行してから投影します:
npm run compare        # 各プローブを1回ずつ計測します
npm run research -- accuracy --real
```

このページは統合比較の投影結果です。計測を行うには `compare` を、この特化ビューを再生成するには `research accuracy` を実行してください。
