---
source_artifact: docs/research-reports/foundation-models.data.json
source_commit: df5a2b0
insights_model: source-report
translated_from: foundation-models.md
translation_model: claude-sonnet-5
generated_at: 2026-07-09T11:02:05.370Z
trials: 0
provenance: llm-translation
---
# 基盤モデルカタログ

これは**リファレンスカタログ**であり、ベンチマークではありません。4社のプロバイダーにまたがる19の基盤モデルについて、そのキュレーションされた階層（tier）、価格、対応するeffortレベル、APIサーフェスを一覧にしています。すべての値は出典が明示された**キュレーション済みカタログデータ**です — **未測定 (not measured)**：スループット、レイテンシ、精度、可用性の数値はここには一切登場しません。実測された挙動については、speed、accuracy、availabilityの各トピックを参照してください。

唯一の信頼できる情報源（single source of truth）はモデルレジストリ（`packages/tech/src/llm-model-comparison/models.ts`）であり、このページはそこから生成されています。したがって、以下の価格や階層はそのファイル自体、および各プロバイダーの出典ページと照合して検証可能です。各セルは、その出典の日付時点でのみ正しいものとして扱ってください。

## カタログ

| プロバイダー | モデル | APIモデルID | 階層 | APIサーフェス | リリース | 入力 $/MTok | 出力 $/MTok | Effortレベル |
| -------- | ----- | ------------ | ---- | ----------- | -------- | ------------ | ------------- | ------------- |
| anthropic | Claude Fable 5 | `claude-fable-5` | frontier | chat | 2026-06 | $6.00 | $30.00 | low, medium, high, xhigh, max |
| anthropic | Claude Opus 4.8 | `claude-opus-4-8` | flagship | chat | 2026 | $5.00 | $25.00 | low, medium, high, xhigh, max |
| anthropic | Claude Sonnet 5 | `claude-sonnet-5` | mid | chat | 2026-06 | $3.00 | $15.00 | low, medium, high, xhigh, max |
| anthropic | Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | small | chat | 2025-10 | $1.00 | $5.00 | n/a |
| openai | GPT-5.5 | `gpt-5.5` | flagship | chat | 2026 | $5.00 | $30.00 | none, low, medium, high |
| openai | GPT-5.4 | `gpt-5.4` | mid | chat | 2026 | $2.50 | $15.00 | none, low, medium, high |
| openai | GPT-5.4 mini | `gpt-5.4-mini` | small | chat | 2026 | $0.50 | $2.00 | none, low, medium, high |
| openai | GPT-5.4 nano | `gpt-5.4-nano` | small | chat | 2026 | $0.15 | $0.60 | none, low, medium, high |
| openai | o4-mini | `o4-mini` | mid | chat | 2025 | $1.10 | $4.40 | low, medium, high |
| openai | GPT Realtime | `gpt-realtime` | flagship | realtime | 2025 | $4.00 | $16.00 | n/a |
| openai | GPT-5.3 Codex | `gpt-5.3-codex` | flagship | responses | 2026 | $1.75 | $14.00 | low, medium, high, xhigh |
| openai | GPT-5.1 Codex mini | `gpt-5.1-codex-mini` | small | responses | 2026 | $0.25 | $2.00 | low, medium, high |
| google | Gemini 3.1 Pro | `gemini-3.1-pro-preview` | flagship | chat | 2026 | $2.00 | $12.00 | low, medium, high |
| google | Gemini 3.5 Flash | `gemini-3.5-flash` | mid | chat | 2026 | $0.30 | $2.50 | low, medium, high |
| google | Gemini 3.1 Flash-Lite | `gemini-3.1-flash-lite` | small | chat | 2026 | $0.10 | $0.40 | low, medium, high |
| xai | Grok 4.3 | `grok-4.3` | frontier | chat | 2026 | $1.25 | $2.50 | none, low, medium, high |
| xai | Grok 4.20 Reasoning | `grok-4.20-0309-reasoning` | flagship | chat | 2026 | $1.25 | $2.50 | n/a |
| xai | Grok 4.20 Non-Reasoning | `grok-4.20-0309-non-reasoning` | mid | chat | 2026 | $1.25 | $2.50 | n/a |
| xai | Grok Build 0.1 | `grok-build-0.1` | small | chat | 2026 | $1.00 | $2.00 | n/a |

**凡例。** すべての列はキュレーションされたカタログデータ（出所：`catalog`）であり、実測値ではありません。コストは1Mトークンあたりのアメリカドルで、入力／出力の順です。「Effortレベル」は、そのモデルに対してレジストリが掃引（sweep）する推論effort（reasoning-effort）の設定値です。`n/a`は、そのモデルがユーザーによる選択可能なeffort制御を公開していないことを意味します。ビジョン／マルチモーダル対応については**要確認 (to verify)**です — レジストリでは追跡されておらず、推測するのではなく意図的に省略しています。

## 出典

- **anthropic:** https://platform.claude.com/docs/en/about-claude/models/overview
- **openai:** https://developers.openai.com/api/docs/pricing
- **google:** https://ai.google.dev/gemini-api/docs/pricing
- **xai:** https://docs.x.ai/developers/models/grok-4.3

このカタログは`packages/tech/src/llm-model-comparison/models.ts`から再生成されます。価格や階層の修正は、そこでの1行の編集で済み、その後このページが再レンダリングされます。
