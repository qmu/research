---
source_artifact: docs/research-reports/foundation-models.data.json
source_commit: c7072d1
insights_model: source-report
translated_from: foundation-models.md
translation_model: claude-sonnet-5
generated_at: 2026-07-09T11:54:54.587Z
trials: 0
provenance: llm-translation
---
# ファウンデーションモデルカタログ

これは**ベンチマークではなく参照用カタログ**です。4 プロバイダーにまたがる 19
個のファウンデーションモデルについて、そのキュレーション済みティア、価格、対応するエフォートレベル、API サーフェスを一覧にしています。すべての値は出典を明記した**キュレーション済みカタログデータ**であり——**未測定 (not measured)**：スループット、レイテンシ、精度、可用性の数値はここには一切記載されていません。測定済みの挙動については、速度・精度・可用性の各トピックを参照してください。

唯一の信頼できる情報源はモデルレジストリ
（`packages/tech/src/llm-model-comparison/models.ts`）であり、本ページはそこから生成されているため、以下の価格やティアはそのファイルおよび各プロバイダーが引用しているページと照合して検証可能です。各セルは、その出典の日付時点でのみ正しいものとして扱ってください。

## 1. 調査の目的

速度、精度、可用性などの測定ページを読む前に、対象プロバイダー、モデル名、APIモデルID、ティア、価格、エフォート制御、APIサーフェスを確認できる参照カタログとして整理する。

## 2. 測定対象

### 対象モデル

4プロバイダーにまたがる19件のファウンデーションモデルを対象とする。信頼できる情報源は `packages/tech/src/llm-model-comparison/models.ts` のモデルレジストリである。

### 対象メトリクス

このページには実測メトリクスは含まれない。対象は、プロバイダー、モデル、APIモデルID、ティア、APIサーフェス、リリース、入力／出力のカタログ価格、対応するエフォートレベルというカタログ項目である。

## 3. 範囲と制約

すべての値は出典付きのキュレーション済みカタログデータであり、ライブ測定値ではない。スループット、レイテンシ、精度、OCR、RAG、可用性の数値はここには記載しない。各セルは出典の日付時点でのみ正しいものとして扱い、ビジョン／マルチモーダル対応は推測せず意図的に省略する。

## 4. 検証結果

| プロバイダー | モデル | APIモデルID | ティア | APIサーフェス | リリース | 入力 $/MTok | 出力 $/MTok | エフォートレベル |
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

**凡例.** 各列はすべてキュレーションされたカタログデータ（出所: `catalog`）であり、実測値ではありません。コストは100万トークンあたりのUSD価格で、入力／出力の順に表記しています。「エフォートレベル」とは、レジストリが各モデルに対して振る推論エフォート（reasoning-effort）設定のことです。`n/a` は、そのモデルがユーザーによる選択可能なエフォート制御を提供していないことを意味します。ビジョン／マルチモーダル対応については **要確認 (to verify)** — レジストリでは追跡されておらず、推測で埋めるのではなく意図的に省略しています。

## 5. 考察

このページは比較マトリクスの前提を確認するためのものです。価格やエフォート制御はコストと実行時挙動の制約を示すが、モデル選択はこのカタログだけで判断せず、速度、出力精度、OCR、RAG、可用性の各測定ページと合わせて読む必要がある。

## 6. 再現方法

### 再現手順

```sh
cd packages/tech
npm run research -- foundation-models --fixture
```

### 再現コスト（目安）

カタログ生成はキー不要かつコストなし。コミット済みのモデルレジストリを読み、プロバイダーAPIは呼び出さない。

### クリーンアップ

外部リソースは作成しない。再レンダリングでは `docs/research-reports/` 配下のカタログMarkdownとJSONアーティファクトだけが更新される。

## 7. 検証データ

- **Anthropic:** https://platform.claude.com/docs/en/about-claude/models/overview
- **OpenAI:** https://developers.openai.com/api/docs/pricing
- **Google:** https://ai.google.dev/gemini-api/docs/pricing
- **xAI:** https://docs.x.ai/developers/models/grok-4.3

このカタログは `packages/tech/src/llm-model-comparison/models.ts` から再生成されます。価格やティアの修正はそこで一行編集するだけで済み、その後このページが再レンダリングされます。
