---
title: Foundation model catalog
description: A curated reference catalog of 19 foundation models across 4 providers — provider, tier, price, effort levels, and API surface — sourced from the model registry, not a live measurement.
---

# Foundation model catalog

This is a **reference catalog**, not a benchmark. It lists 19
foundation models across 4 providers with their curated tier, price,
supported effort levels, and API surface. Every value is **curated catalog data**
with a cited source — **未測定 (not measured)**: no throughput, latency,
accuracy, or availability figure appears here. For measured behavior see the
speed, accuracy, and availability topics.

The single source of truth is the model registry
(`packages/tech/src/llm-model-comparison/models.ts`); this page is generated from it, so the prices and
tiers below are verifiable against that file and against each provider's cited
page. Treat each cell as correct only as of its source's date.

## Catalog

| Provider | Model | API model id | Tier | API surface | Released | Input $/MTok | Output $/MTok | Effort levels |
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

**Legend.** Every column is curated catalog data (provenance: `catalog`), not a
measured value. Cost is USD per 1M tokens, input / output. "Effort levels" are
the reasoning-effort settings the registry sweeps for that model; `n/a` means
the model exposes no user-selectable effort control. Vision/multimodal support is
**要確認 (to verify)** — it is not tracked in the registry and is deliberately
omitted rather than guessed.

## Sources

- **anthropic:** https://platform.claude.com/docs/en/about-claude/models/overview
- **openai:** https://developers.openai.com/api/docs/pricing
- **google:** https://ai.google.dev/gemini-api/docs/pricing
- **xai:** https://docs.x.ai/developers/models/grok-4.3

The catalog regenerates from `packages/tech/src/llm-model-comparison/models.ts`; a correction to a price
or tier is a one-line edit there, after which this page is re-rendered.
