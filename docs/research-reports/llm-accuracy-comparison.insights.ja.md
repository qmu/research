---
source_artifact: docs/research-reports/llm-accuracy-comparison.data.json
source_commit: 046ac99
insights_model: source-report
translated_from: llm-accuracy-comparison.md
translation_model: claude-sonnet-5
generated_at: 2026-07-09T12:21:25.966Z
trials: 0
provenance: llm-translation
---
# LLM出力精度比較

本レポートは、JSONスキーマの構造的制限および長さ指示への追従性について、
19モデル・4プロバイダーにわたる **59通りのモデル×エフォート構成** を、
**1試行** にわたって比較したものです。

ここに示す数値は、**LLM比較の統合スイープ全体の投影** であり、同一の試行、
モデル×エフォート行列、統計、および出所情報を、本トピックのプローブに限定した
ものです。これは独立した測定ではないため、統合レポートとセルごとに一致します。
（プロバイダー、モデル、ティア、価格、エフォートといった）キュレーションされた
カタログ情報はモデルレジストリに由来し、測定値は以下にリンクされた投影実行の
成果物に由来します。

## 1. 調査の目的

LLM出力精度に関わる構造化出力の制約と長さ指示への追従性を、同一スイープから比較できる形で提示する。これは一般能力や推論品質の総合評価ではない。

## 2. 測定対象

### 対象モデル

19モデル・4プロバイダーにわたる59通りのモデル×エフォート構成を対象とする。プロバイダー、モデル、ティア、価格、エフォートはモデルレジストリ由来のカタログデータである。

### 対象メトリクス

対象メトリクスは、受理可能な最大スキーマ入れ子深度、受理可能な最大スキーマフィールド幅、長さ指示の正確性である。今回の元スイープに含まれない情報正確性は値として表示しない。

## 3. 範囲と制約

- 設定×プローブごとに**1トライアル**のみ実施。このサンプル数は実行単位の比較を裏付けるものであり、プロバイダーの挙動が安定しているという統計的な主張を裏付けるものではない。
- **その時点限定。** 計測された挙動は、以下に示す生成タイムスタンプ時点のモデルおよびAPIの状態を反映している。
- 本トピックは狭い範囲の挙動(JSONスキーマの構造的な制限、および長さ指示への追従性)のみを検証するものであり、一般的な能力や推論品質を測定するものではない。
- **エフォート(effort)の意味づけはプロバイダーごとに異なる**ため、エフォートレベルはプロバイダー間よりもプロバイダー内での比較の方が適切である。
- **生成日時:** 2026-07-06T13:08:50.282Z

## 4. 検証結果

**比較**

| プロバイダー | モデル | 階層 | エフォート | コスト（入力 / 出力、per MTok） | 最大スキーマ深度 | 最大スキーマ幅 | 長さの正確性 |
| -------- | ----- | ---- | ------ | ------------------------ | --- | --- | --- |
| Anthropic | Claude Fable 5 | frontier | low | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 100% (n=1) |
| Anthropic | Claude Fable 5 | frontier | medium | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 100% (n=1) |
| Anthropic | Claude Fable 5 | frontier | high | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 100% (n=1) |
| Anthropic | Claude Fable 5 | frontier | xhigh | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 100% (n=1) |
| Anthropic | Claude Fable 5 | frontier | max | $6.00 / $30.00 | 21 (n=1) | 72 (n=1) | 100% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | low | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 100% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | medium | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 100% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | high | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 100% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | xhigh | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 99% (n=1) |
| Anthropic | Claude Opus 4.8 | flagship | max | $5.00 / $25.00 | 21 (n=1) | 73 (n=1) | 99% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | low | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 93% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | medium | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 95% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | high | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 100% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | xhigh | $3.00 / $15.00 | 21 (n=1) | 72 (n=1) | 0% (n=1) |
| Anthropic | Claude Sonnet 5 | mid | max | $3.00 / $15.00 | 15 (n=1) | 72 (n=1) | 0% (n=1) |
| Anthropic | Claude Haiku 4.5 | small | n/a | $1.00 / $5.00 | 21 (n=1) | 73 (n=1) | 97% (n=1) |
| OpenAI | GPT-5.5 | flagship | none | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 96% (n=1) |
| OpenAI | GPT-5.5 | flagship | low | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.5 | flagship | medium | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.5 | flagship | high | $5.00 / $30.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 | mid | none | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 93% (n=1) |
| OpenAI | GPT-5.4 | mid | low | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 | mid | medium | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 | mid | high | $2.50 / $15.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 mini | small | none | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 97% (n=1) |
| OpenAI | GPT-5.4 mini | small | low | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 mini | small | medium | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 mini | small | high | $0.50 / $2.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 nano | small | none | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 91% (n=1) |
| OpenAI | GPT-5.4 nano | small | low | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 nano | small | medium | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.4 nano | small | high | $0.15 / $0.60 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | o4-mini | mid | low | $1.10 / $4.40 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | o4-mini | mid | medium | $1.10 / $4.40 | 10 (n=1) | 7 (n=1) | 100% (n=1) |
| OpenAI | o4-mini | mid | high | $1.10 / $4.40 | 10 (n=1) | 2 (n=1) | 0% (n=1) |
| OpenAI | GPT Realtime | flagship | n/a | $4.00 / $16.00 | 0 (n=1) | 0 (n=1) | 99% (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | low | $1.75 / $14.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | medium | $1.75 / $14.00 | 10 (n=1) | 127 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | high | $1.75 / $14.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.3 Codex | flagship | xhigh | $1.75 / $14.00 | 10 (n=1) | 192 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | low | $0.25 / $2.00 | 10 (n=1) | 13 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | medium | $0.25 / $2.00 | 10 (n=1) | 6 (n=1) | 100% (n=1) |
| OpenAI | GPT-5.1 Codex mini | small | high | $0.25 / $2.00 | 10 (n=1) | 57 (n=1) | 0% (n=1) |
| Google | Gemini 3.1 Pro | flagship | low | $2.00 / $12.00 | 15 (n=1) | 192 (n=1) | 100% (n=1) |
| Google | Gemini 3.1 Pro | flagship | medium | $2.00 / $12.00 | 15 (n=1) | 192 (n=1) | 100% (n=1) |
| Google | Gemini 3.1 Pro | flagship | high | $2.00 / $12.00 | 15 (n=1) | 192 (n=1) | 73% (n=1) |
| Google | Gemini 3.5 Flash | mid | low | $0.30 / $2.50 | 15 (n=1) | 192 (n=1) | 100% (n=1) |
| Google | Gemini 3.5 Flash | mid | medium | $0.30 / $2.50 | 15 (n=1) | 192 (n=1) | 27% (n=1) |
| Google | Gemini 3.5 Flash | mid | high | $0.30 / $2.50 | 15 (n=1) | 192 (n=1) | 15% (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | low | $0.10 / $0.40 | 15 (n=1) | 192 (n=1) | 100% (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | medium | $0.10 / $0.40 | 15 (n=1) | 192 (n=1) | 100% (n=1) |
| Google | Gemini 3.1 Flash-Lite | small | high | $0.10 / $0.40 | 15 (n=1) | 192 (n=1) | 66% (n=1) |
| xAI | Grok 4.3 | frontier | none | $1.25 / $2.50 | 48 (n=1) | 192 (n=1) | 99% (n=1) |
| xAI | Grok 4.3 | frontier | low | $1.25 / $2.50 | 48 (n=1) | 192 (n=1) | 100% (n=1) |
| xAI | Grok 4.3 | frontier | medium | $1.25 / $2.50 | 48 (n=1) | 192 (n=1) | 100% (n=1) |
| xAI | Grok 4.3 | frontier | high | $1.25 / $2.50 | 22 (n=1) | 192 (n=1) | 100% (n=1) |
| xAI | Grok 4.20 Reasoning | flagship | n/a | $1.25 / $2.50 | 32 (n=1) | 192 (n=1) | 99% (n=1) |
| xAI | Grok 4.20 Non-Reasoning | mid | n/a | $1.25 / $2.50 | 48 (n=1) | 192 (n=1) | 97% (n=1) |
| xAI | Grok Build 0.1 | small | n/a | $1.00 / $2.00 | 11 (n=1) | 192 (n=1) | 100% (n=1) |

**凡例。** プロバイダー、モデル、階層、エフォート、コストはキュレーションされたカタログデータです。
指標列は実測値であり、それぞれ平均値 ± 95%信頼区間（1.96 × サンプル標準偏差 / √n）として、1 回の試行における n で報告されています。
`n/a (fixtured)` は、決定論的なフィクスチャクライアントがそのセルを生成したこと（APIキーは使用されていないこと）を意味します。`n/a (error)` は、その構成のすべての試行が失敗したことを意味します。由来（provenance）はセルのテキストに記載されており、色のみでエンコードされることはありません。

**今回の実行では測定されていません。** 情報の正確性 — 元となるスイープ（`llm-model-comparison.real.data.json`）は今回のプローブより前のものであるため、値として表示せず、ここでは省略しています。これを含めるには `compare` を再実行してください。

**項目別測定結果**

各表は、測定対象の1項目について、平均値 ± 95%信頼区間、観測された最小～最大値、および寄与した試行回数を示しています。n < 2 の指標は平均値のみを表示し、その n を明記しています。

**受理可能な最大スキーマ入れ子深度**

| 構成 | 平均 ± 95%信頼区間 | 最小～最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 21 (n=1) | 21–21 | 1 |
| Claude Fable 5 [medium] | 21 (n=1) | 21–21 | 1 |
| Claude Fable 5 [high] | 21 (n=1) | 21–21 | 1 |
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
| Grok 4.3 [medium] | 48 (n=1) | 48–48 | 1 |
| Grok 4.3 [high] | 22 (n=1) | 22–22 | 1 |
| Grok 4.20 Reasoning [n/a] | 32 (n=1) | 32–32 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 48 (n=1) | 48–48 | 1 |
| Grok Build 0.1 [n/a] | 11 (n=1) | 11–11 | 1 |

測定された59件の構成のうち最高値: **Grok 4.3 [none]** の 48 (n=1)。この測定の対極: GPT Realtime [n/a] の 0 (n=1)。

**受理可能な最大スキーマフィールド幅**

| 構成 | 平均 ± 95%信頼区間 | 最小～最大 | n |
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
| o4-mini [high] | 2 (n=1) | 2–2 | 1 |
| GPT Realtime [n/a] | 0 (n=1) | 0–0 | 1 |
| GPT-5.3 Codex [low] | 192 (n=1) | 192–192 | 1 |
| GPT-5.3 Codex [medium] | 127 (n=1) | 127–127 | 1 |
| GPT-5.3 Codex [high] | 192 (n=1) | 192–192 | 1 |
| GPT-5.3 Codex [xhigh] | 192 (n=1) | 192–192 | 1 |
| GPT-5.1 Codex mini [low] | 13 (n=1) | 13–13 | 1 |
| GPT-5.1 Codex mini [medium] | 6 (n=1) | 6–6 | 1 |
| GPT-5.1 Codex mini [high] | 57 (n=1) | 57–57 | 1 |
| Gemini 3.1 Pro [low] | 192 (n=1) | 192–192 | 1 |
| Gemini 3.1 Pro [medium] | 192 (n=1) | 192–192 | 1 |
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

測定された59件の構成のうち最高値: **GPT-5.5 [none]** の 192 (n=1)。この測定の対極: GPT Realtime [n/a] の 0 (n=1)。

**長さ指示の正確性**

| 設定 | 平均 ± 95% CI | 最小〜最大 | n |
| ------------- | ------------ | ------- | - |
| Claude Fable 5 [low] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Fable 5 [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Fable 5 [high] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Fable 5 [xhigh] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Fable 5 [max] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Opus 4.8 [low] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Opus 4.8 [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Opus 4.8 [high] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Opus 4.8 [xhigh] | 99% (n=1) | 0.990–0.990 | 1 |
| Claude Opus 4.8 [max] | 99% (n=1) | 0.990–0.990 | 1 |
| Claude Sonnet 5 [low] | 93% (n=1) | 0.930–0.930 | 1 |
| Claude Sonnet 5 [medium] | 95% (n=1) | 0.950–0.950 | 1 |
| Claude Sonnet 5 [high] | 100% (n=1) | 1.000–1.000 | 1 |
| Claude Sonnet 5 [xhigh] | 0% (n=1) | 0.000–0.000 | 1 |
| Claude Sonnet 5 [max] | 0% (n=1) | 0.000–0.000 | 1 |
| Claude Haiku 4.5 [n/a] | 97% (n=1) | 0.970–0.970 | 1 |
| GPT-5.5 [none] | 96% (n=1) | 0.960–0.960 | 1 |
| GPT-5.5 [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.5 [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.5 [high] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 [none] | 93% (n=1) | 0.930–0.930 | 1 |
| GPT-5.4 [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 [high] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 mini [none] | 97% (n=1) | 0.970–0.970 | 1 |
| GPT-5.4 mini [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 mini [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 mini [high] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 nano [none] | 91% (n=1) | 0.910–0.910 | 1 |
| GPT-5.4 nano [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 nano [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.4 nano [high] | 100% (n=1) | 1.000–1.000 | 1 |
| o4-mini [low] | 100% (n=1) | 1.000–1.000 | 1 |
| o4-mini [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| o4-mini [high] | 0% (n=1) | 0.000–0.000 | 1 |
| GPT Realtime [n/a] | 99% (n=1) | 0.990–0.990 | 1 |
| GPT-5.3 Codex [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.3 Codex [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.3 Codex [high] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.3 Codex [xhigh] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.1 Codex mini [low] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.1 Codex mini [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| GPT-5.1 Codex mini [high] | 0% (n=1) | 0.000–0.000 | 1 |
| Gemini 3.1 Pro [low] | 100% (n=1) | 1.000–1.000 | 1 |
| Gemini 3.1 Pro [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| Gemini 3.1 Pro [high] | 73% (n=1) | 0.730–0.730 | 1 |
| Gemini 3.5 Flash [low] | 100% (n=1) | 1.000–1.000 | 1 |
| Gemini 3.5 Flash [medium] | 27% (n=1) | 0.270–0.270 | 1 |
| Gemini 3.5 Flash [high] | 15% (n=1) | 0.150–0.150 | 1 |
| Gemini 3.1 Flash-Lite [low] | 100% (n=1) | 1.000–1.000 | 1 |
| Gemini 3.1 Flash-Lite [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| Gemini 3.1 Flash-Lite [high] | 66% (n=1) | 0.660–0.660 | 1 |
| Grok 4.3 [none] | 99% (n=1) | 0.990–0.990 | 1 |
| Grok 4.3 [low] | 100% (n=1) | 1.000–1.000 | 1 |
| Grok 4.3 [medium] | 100% (n=1) | 1.000–1.000 | 1 |
| Grok 4.3 [high] | 100% (n=1) | 1.000–1.000 | 1 |
| Grok 4.20 Reasoning [n/a] | 99% (n=1) | 0.990–0.990 | 1 |
| Grok 4.20 Non-Reasoning [n/a] | 97% (n=1) | 0.970–0.970 | 1 |
| Grok Build 0.1 [n/a] | 100% (n=1) | 1.000–1.000 | 1 |

59件の測定済み設定のうち最高値: **Claude Fable 5 [low]** が100%（n=1）。この測定における対極: GPT-5.1 Codex mini [high] が0%（n=1）。

## 5. 考察

この実行は設定×プローブごとに1試行であるため、安定したプロバイダー特性の統計的主張ではなく、当該実行時点の構造化出力制約と指示追従の観測値として読む。深さ、幅、長さ指示は互いに異なる failure mode を測るため、単一の総合順位には圧縮しない。

## 6. 再現方法

### 再現手順

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# キー不要のセルフテスト(コミット済みの比較用フィクスチャを投影):
npm run research -- accuracy --fixture

# 実際のプロバイダーに対して、共有スイープを実行してから投影:
npm run compare        # 各プローブを1回ずつ計測
npm run research -- accuracy --real
```

このページは統合比較結果の投影です。計測を行うには `compare` を、この特化ビューを再生成するには `research accuracy` を実行してください。

### 再現コスト（目安）

フィクスチャ投影はキー不要でコストなし。実プロバイダーに対する `npm run compare` は共有スイープ全体のAPI利用料が発生するため、実行前に `npm run compare -- --estimate` で呼び出し数、概算コスト、所要時間を確認する。

### クリーンアップ

投影処理は外部リソースを作成しない。実行時はローカルの `.real` Markdown／dataアーティファクトと共有比較履歴を更新するため、コミット前に差分を確認する。

## 7. 検証データ

投影されたアーティファクトには、このトピックのプロンプト、生の試行出力、トークン数、タイミング値、そして（精度に関しては）スキーマ準拠結果とプロバイダーの拒否メッセージが保存されています。このページは、プロバイダーを再実行することなく、そのアーティファクトから再生成できます。

**スキーマ複雑度プローブ**（構造化出力モード。各軸は独立して段階的に上げられ、深さは最大48ネストレベル、広さは最大192フィールドまで、幾何級数的に増加させたのち二分探索でテスト上限を絞り込みます。深さ軸の最初の段階で求められる内容は）：

```text
Produce a JSON object that conforms to the provided schema: an object nested 2 level(s) deep, each level containing 1 string field(s) (and, above the deepest level, a nested "child" object). Fill every string field with a one-or-two-word value.
```

**長さプローブ：**

```text
Write a single paragraph about the water cycle that is exactly 100 words long. Respond with the paragraph only — no preamble, no word count, no markdown.
```

**完全な生記録。** すべての設定、試行、そしてこのトピックの呼び出しは、このページとともにJSONアーティファクトとしてコミットされています：
[`llm-accuracy-comparison.data.json`](./llm-accuracy-comparison.data.json)。
これは統合比較記録`llm-model-comparison.real.data.json`から投影されたものであり、同一の測定結果であって再実行されたものではありません。
