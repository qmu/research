---
title: 対象モデル
source_artifact: docs/research-reports/foundation-models.data.json
source_commit: d1e7f4c
insights_model: source-report
translated_from: foundation-models.md
translation_model: none (hand-authored)
generated_at: 2026-08-16T00:00:00.000Z
trials: 0
provenance: hand-authored-translation
---
# 対象モデル

## 概要

これはベンチマークではなく、**参照用カタログ**です。8のプロバイダー（Anthropic、OpenAI、Google、xAI、Perplexity、AWS Bedrock、Google Vertex AI、OpenRouter）にまたがる30の基盤モデルを収録し、各モデルについて、測定対象トピックが前提とする精選済みの事実——プロバイダー、モデル名、API model id、ティア、APIサーフェス、リリースラベル、カタログ価格、対応するeffortレベル、世代ペアリング——を記録しています。

このページでは何も評価していません。これらのモデルが実際にどう振る舞うかは、速度、精度、可用性、OCR、RAG、コンピュータ操作といった測定対象トピックが扱う主題であり、それらのトピックは対象モデルの一覧をこのカタログから取得しています。本ページは、それらを読む前に何が調査対象に含まれているかを確認するための場所です。モデル選定をこのカタログのみに基づいて行うべきではありません。価格とeffort制御はコストと実行時間の挙動を制約しますが、出力品質については何も語らないためです。

## 収録範囲

| プロバイダー | モデル数 | ティア | 入力 $/MTok | 出力 $/MTok |
| -------- | ------ | ----- | ------------ | ------------- |
| Anthropic | 5 | frontier, flagship, mid, small | $1.00–$10.00 | $5.00–$50.00 |
| OpenAI | 8 | flagship, mid, small | $0.15–$5.00 | $0.60–$30.00 |
| Google | 5 | flagship, mid, small | $0.25–$2.00 | $1.50–$12.00 |
| xAI | 4 | frontier, flagship, mid, small | $1.00–$1.25 | $2.00–$2.50 |
| Perplexity | 3 | mid, flagship, frontier | $1.00–$3.00 | $1.00–$15.00 |
| AWS Bedrock | 2 | flagship, mid | $3.00–$5.00 | $15.00–$25.00 |
| Google Vertex AI | 1 | flagship | $5.00 | $25.00 |
| OpenRouter | 2 | flagship | $5.00 | $25.00–$30.00 |

価格は、各プロバイダーが公開しているモデルにおける、100万トークンあたりのUSD価格の範囲です。すべての値は、出典を明記した精選済みのカタログデータ（出所: `catalog`）であり、ライブ計測ではありません。スループット、レイテンシ、精度、OCR、RAG、可用性に関する数値はここには一切登場しません。各セルは、その出典の日付時点でのみ正しいものとして扱ってください。プロバイダーのカタログページは、本ページ生成後に変更される可能性があります。Vision／マルチモーダル対応については **要検証** であり、推測で埋めることを避けるため意図的に省略しています。

## カタログ

| プロバイダー | モデル | API model id | ティア | APIサーフェス | リリース | 入力 $/MTok | 出力 $/MTok | Effortレベル | 世代 |
| -------- | ----- | ------------ | ---- | ----------- | -------- | ------------ | ------------- | ------------- | ---------- |
| Anthropic | Claude Fable 5 | `claude-fable-5` | frontier | chat | 2026-06 | $10.00 | $50.00 | low, medium, high, xhigh, max | — |
| Anthropic | Claude Opus 5 | `claude-opus-5` | flagship | chat | 2026-07 | $5.00 | $25.00 | low, medium, high, xhigh, max | 現行（Claude Opus 4.8 を置き換え） |
| Anthropic | Claude Opus 4.8 | `claude-opus-4-8` | flagship | chat | 2026 | $5.00 | $25.00 | low, medium, high, xhigh, max | 旧世代（→ Claude Opus 5） |
| Anthropic | Claude Sonnet 5 | `claude-sonnet-5` | mid | chat | 2026-06 | $3.00 | $15.00 | low, medium, high, xhigh, max | — |
| Anthropic | Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | small | chat | 2025-10 | $1.00 | $5.00 | n/a | — |
| OpenAI | GPT-5.5 | `gpt-5.5` | flagship | chat | 2026 | $5.00 | $30.00 | none, low, medium, high | — |
| OpenAI | GPT-5.4 | `gpt-5.4` | mid | chat | 2026 | $2.50 | $15.00 | none, low, medium, high | — |
| OpenAI | GPT-5.4 mini | `gpt-5.4-mini` | small | chat | 2026 | $0.50 | $2.00 | none, low, medium, high | — |
| OpenAI | GPT-5.4 nano | `gpt-5.4-nano` | small | chat | 2026 | $0.15 | $0.60 | none, low, medium, high | — |
| OpenAI | o4-mini | `o4-mini` | mid | chat | 2025 | $1.10 | $4.40 | low, medium, high | — |
| OpenAI | GPT Realtime | `gpt-realtime` | flagship | realtime | 2025 | $4.00 | $16.00 | n/a | — |
| OpenAI | GPT-5.3 Codex | `gpt-5.3-codex` | flagship | responses | 2026 | $1.75 | $14.00 | low, medium, high, xhigh | — |
| OpenAI | GPT-5.1 Codex mini | `gpt-5.1-codex-mini` | small | responses | 2026 | $0.25 | $2.00 | low, medium, high | — |
| Google | Gemini 3.1 Pro | `gemini-3.1-pro-preview` | flagship | chat | 2026 | $2.00 | $12.00 | low, medium, high | — |
| Google | Gemini 3.6 Flash | `gemini-3.6-flash` | mid | chat | 2026-07 | $1.50 | $7.50 | low, medium, high | 現行（Gemini 3.5 Flash を置き換え） |
| Google | Gemini 3.5 Flash-Lite | `gemini-3.5-flash-lite` | small | chat | 2026-07 | $0.30 | $2.50 | low, medium, high | 現行（Gemini 3.1 Flash-Lite を置き換え） |
| Google | Gemini 3.5 Flash | `gemini-3.5-flash` | mid | chat | 2026 | $1.50 | $9.00 | low, medium, high | 旧世代（→ Gemini 3.6 Flash） |
| Google | Gemini 3.1 Flash-Lite | `gemini-3.1-flash-lite` | small | chat | 2026 | $0.25 | $1.50 | low, medium, high | 旧世代（→ Gemini 3.5 Flash-Lite） |
| xAI | Grok 4.3 | `grok-4.3` | frontier | chat | 2026 | $1.25 | $2.50 | none, low, medium, high | — |
| xAI | Grok 4.20 Reasoning | `grok-4.20-0309-reasoning` | flagship | chat | 2026 | $1.25 | $2.50 | n/a | — |
| xAI | Grok 4.20 Non-Reasoning | `grok-4.20-0309-non-reasoning` | mid | chat | 2026 | $1.25 | $2.50 | n/a | — |
| xAI | Grok Build 0.1 | `grok-build-0.1` | small | chat | 2026 | $1.00 | $2.00 | n/a | — |
| Perplexity | Sonar | `sonar` | mid | chat | 2025 | $1.00 | $1.00 | n/a | — |
| Perplexity | Sonar Pro | `sonar-pro` | flagship | chat | 2025 | $3.00 | $15.00 | n/a | — |
| Perplexity | Sonar Reasoning Pro | `sonar-reasoning-pro` | frontier | chat | 2025 | $2.00 | $8.00 | n/a | — |
| AWS Bedrock | Claude Opus 4.8 (Bedrock) | `claude-opus-4-8` | flagship | chat | 2026 | $5.00 | $25.00 | low, medium, high, xhigh, max | — |
| AWS Bedrock | Claude Sonnet 5 (Bedrock) | `claude-sonnet-5` | mid | chat | 2026-06 | $3.00 | $15.00 | low, medium, high, xhigh, max | — |
| Google Vertex AI | Claude Opus 4.8 (Vertex) | `claude-opus-4-8` | flagship | chat | 2026 | $5.00 | $25.00 | low, medium, high, xhigh, max | — |
| OpenRouter | Claude Opus 4.8 (OpenRouter) | `anthropic/claude-opus-4.8` | flagship | chat | 2026 | $5.00 | $25.00 | n/a | — |
| OpenRouter | GPT-5.5 (OpenRouter) | `openai/gpt-5.5` | flagship | chat | 2026 | $5.00 | $30.00 | n/a | — |

**凡例。** すべての列は精選されたカタログデータ（出典: `catalog`）であり、実測値ではありません。コストは1Mトークンあたりの米ドルで、入力／出力の順に記載しています。「Effortレベル」は、レジストリが該当モデルに対して掃引する推論努力量（reasoning-effort）の設定であり、`n/a` はそのモデルがユーザーが選択可能なeffort制御を提供していないことを示します。「世代」は、統制された旧→新のペアリングを示します。`現行（… を置き換え）` が最新の世代、`旧世代（→ …）` がそれに置き換えられた、保持されている前世代です。`—` は、そのモデルが有効なペアリングの対象外であることを意味します。

## 出典

- **Anthropic:** https://platform.claude.com/docs/en/about-claude/models/overview
- **OpenAI:** https://developers.openai.com/api/docs/pricing
- **Google:** https://ai.google.dev/gemini-api/docs/pricing
- **xAI:** https://docs.x.ai/developers/models/grok-4.3
- **Perplexity:** https://docs.perplexity.ai/guides/pricing
- **AWS Bedrock:** https://platform.claude.com/docs/en/build-with-claude/claude-on-amazon-bedrock
- **Google Vertex AI:** https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai
- **OpenRouter:** https://openrouter.ai/anthropic/claude-opus-4.8

このカタログは `packages/tech/src/llm-model-comparison/models.ts` から再生成されます。価格やティアの修正は、そこでの1行編集のみで済み、その後このページが再レンダリングされます。

```sh
cd packages/tech
npm run research -- foundation-models --fixture
```

この経路はキー不要かつコストゼロです。コミットされたモデルレジストリを読み込むのみで、プロバイダのAPIは呼び出さないため、誰でもこのページを再現できます。

**過去の調査 / Past surveys in this series**

Earlier dated surveys of this topic, newest first — each a complete article for its run.

- [2026-07-09T11:54:54.587Z](./history/foundation-models/2026-07-09T11-54-54-587Z/foundation-models.ja)
- [2026-07-09T11:02:05.370Z](./history/foundation-models/2026-07-09T11-02-05-370Z/foundation-models.ja)
