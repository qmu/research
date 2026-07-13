---
title: 対象モデル
source_artifact: docs/research-reports/foundation-models.data.json
source_commit: 734686c
insights_model: source-report
translated_from: foundation-models.md
translation_model: claude-sonnet-5
generated_at: 2026-07-13T10:11:48.528Z
trials: 0
provenance: llm-translation
---
# 対象モデル

これはベンチマークではなく、**参照用カタログ**です。比較対象となる基盤モデルを一覧化し、測定対象トピックで使用されるカタログ情報を記録しています。

## 1. 調査の目的

このカタログは、速度・精度・可用性に関する測定レポートを読む前に、どのプロバイダー、モデル名、APIモデルID、ティア、価格、努力度（effort）制御、APIサーフェスが調査対象に含まれているかを読者が一箇所で確認できるようにするためのものです。

## 2. 測定対象

### 対象モデル

4のプロバイダーにまたがる19の基盤モデルが掲載されている。信頼できる唯一の情報源はモデルレジストリ（`packages/tech/src/llm-model-comparison/models.ts`）である。

### 対象メトリクス

このトピックには測定されたメトリクスは存在しない。プロバイダー、モデル、API model id、ティア、APIサーフェス、リリースラベル、入力・出力のカタログ価格、対応するeffortレベルといった、精選済みのカタログ項目のみを記録する。

## 3. 範囲と制約

すべての値は、出典を明記したキュレーション済みのカタログデータであり、ライブ計測ではありません。スループット、レイテンシ、精度、OCR、RAG、可用性に関する数値はここには一切登場しません。各セルは、その出典の日付時点でのみ正しいものとして扱ってください。プロバイダーのカタログページは、本ページ生成後に変更される可能性があります。Vision／マルチモーダル対応については **要検証** であり、推測で埋めることを避けるため意図的に省略しています。

## 4. 検証結果

| プロバイダー | モデル数 | ティア | 入力 $/MTok | 出力 $/MTok |
| -------- | ------ | ----- | ------------ | ------------- |
| Anthropic | 4 | frontier, flagship, mid, small | $1.00–$6.00 | $5.00–$30.00 |
| OpenAI | 8 | flagship, mid, small | $0.15–$5.00 | $0.60–$30.00 |
| Google | 3 | flagship, mid, small | $0.10–$2.00 | $0.40–$12.00 |
| xAI | 4 | frontier, flagship, mid, small | $1.00–$1.25 | $2.00–$2.50 |

いずれの値も精選されたカタログデータ（出所: `catalog`）であり、実測値ではありません。価格は各プロバイダーが公開しているモデルにおける、100万トークンあたりのUSD価格の範囲です。モデルごとの完全なカタログ表はセクション7「検証データ」に記載しています。

**推移 / Trend across surveys**

これはシリーズ内で初めて比較可能な調査であるため、まだ複数調査にまたがる推移を図示することはできません。同一手法による2回目の調査がアーカイブされた時点で、ここに推移グラフが表示されます。過去の調査は検証データの項でリンクされています。

## 5. 考察

このページは、測定ページを読む前に比較マトリクスを理解するために使用してください。モデル選定はこのカタログのみに基づくべきではありません。価格とeffort制御はコストと実行時間の挙動を制約しますが、実測された速度、出力精度、OCR能力、RAGの挙動、可用性については他の調査トピックで扱っています。

## 6. 再現方法

### 再現手順

```sh
cd packages/tech
npm run research -- foundation-models --fixture
```

### 再現コスト（目安）

カタログの経路はキー不要かつコストゼロです。コミットされたモデルレジストリを読み込むのみで、プロバイダのAPIは呼び出しません。

### クリーンアップ

外部リソースは作成されません。再レンダリングは`docs/research-reports/`内のカタログMarkdownとJSON成果物を書き直すだけです。

## 7. 検証データ

**フルカタログ**

| プロバイダー | モデル | API model id | ティア | APIサーフェス | リリース | 入力 $/MTok | 出力 $/MTok | Effortレベル |
| -------- | ----- | ------------ | ---- | ----------- | -------- | ------------ | ------------- | ------------- |
| Anthropic | Claude Fable 5 | `claude-fable-5` | frontier | chat | 2026-06 | $6.00 | $30.00 | low, medium, high, xhigh, max |
| Anthropic | Claude Opus 4.8 | `claude-opus-4-8` | flagship | chat | 2026 | $5.00 | $25.00 | low, medium, high, xhigh, max |
| Anthropic | Claude Sonnet 5 | `claude-sonnet-5` | mid | chat | 2026-06 | $3.00 | $15.00 | low, medium, high, xhigh, max |
| Anthropic | Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | small | chat | 2025-10 | $1.00 | $5.00 | n/a |
| OpenAI | GPT-5.5 | `gpt-5.5` | flagship | chat | 2026 | $5.00 | $30.00 | none, low, medium, high |
| OpenAI | GPT-5.4 | `gpt-5.4` | mid | chat | 2026 | $2.50 | $15.00 | none, low, medium, high |
| OpenAI | GPT-5.4 mini | `gpt-5.4-mini` | small | chat | 2026 | $0.50 | $2.00 | none, low, medium, high |
| OpenAI | GPT-5.4 nano | `gpt-5.4-nano` | small | chat | 2026 | $0.15 | $0.60 | none, low, medium, high |
| OpenAI | o4-mini | `o4-mini` | mid | chat | 2025 | $1.10 | $4.40 | low, medium, high |
| OpenAI | GPT Realtime | `gpt-realtime` | flagship | realtime | 2025 | $4.00 | $16.00 | n/a |
| OpenAI | GPT-5.3 Codex | `gpt-5.3-codex` | flagship | responses | 2026 | $1.75 | $14.00 | low, medium, high, xhigh |
| OpenAI | GPT-5.1 Codex mini | `gpt-5.1-codex-mini` | small | responses | 2026 | $0.25 | $2.00 | low, medium, high |
| Google | Gemini 3.1 Pro | `gemini-3.1-pro-preview` | flagship | chat | 2026 | $2.00 | $12.00 | low, medium, high |
| Google | Gemini 3.5 Flash | `gemini-3.5-flash` | mid | chat | 2026 | $0.30 | $2.50 | low, medium, high |
| Google | Gemini 3.1 Flash-Lite | `gemini-3.1-flash-lite` | small | chat | 2026 | $0.10 | $0.40 | low, medium, high |
| xAI | Grok 4.3 | `grok-4.3` | frontier | chat | 2026 | $1.25 | $2.50 | none, low, medium, high |
| xAI | Grok 4.20 Reasoning | `grok-4.20-0309-reasoning` | flagship | chat | 2026 | $1.25 | $2.50 | n/a |
| xAI | Grok 4.20 Non-Reasoning | `grok-4.20-0309-non-reasoning` | mid | chat | 2026 | $1.25 | $2.50 | n/a |
| xAI | Grok Build 0.1 | `grok-build-0.1` | small | chat | 2026 | $1.00 | $2.00 | n/a |

**凡例。** すべての列は精選されたカタログデータ（出典: `catalog`）であり、実測値ではありません。コストは1Mトークンあたりの米ドルで、入力／出力の順に記載しています。「Effortレベル」は、レジストリが該当モデルに対して掃引する推論努力量（reasoning-effort）の設定であり、`n/a` はそのモデルがユーザーが選択可能なeffort制御を提供していないことを示します。

**出典**

- **Anthropic:** https://platform.claude.com/docs/en/about-claude/models/overview
- **OpenAI:** https://developers.openai.com/api/docs/pricing
- **Google:** https://ai.google.dev/gemini-api/docs/pricing
- **xAI:** https://docs.x.ai/developers/models/grok-4.3

このカタログは `packages/tech/src/llm-model-comparison/models.ts` から再生成されます。価格やティアの修正は、そこでの1行編集のみで済み、その後このページが再レンダリングされます。

**過去の調査 / Past surveys in this series**

Earlier dated surveys of this topic, newest first — each a complete article for its run.

- [2026-07-09T11:54:54.587Z](./history/foundation-models/2026-07-09T11-54-54-587Z/foundation-models.ja)
- [2026-07-09T11:02:05.370Z](./history/foundation-models/2026-07-09T11-02-05-370Z/foundation-models.ja)
