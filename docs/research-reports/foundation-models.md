---
title: Foundation model catalog
description: A curated reference catalog of 19 foundation models across 4 providers — provider, tier, price, effort levels, and API surface — sourced from the model registry, not a live measurement.
---

# Foundation model catalog

This is a **reference catalog**, not a benchmark. It lists the compared foundation models and records the catalog facts used by measured topics.

## 1. Research Purpose

The catalog gives readers one place to verify which providers, model names, API model ids, tiers, prices, effort controls, and API surfaces are in scope before reading measured speed, accuracy, and availability reports.

## 2. Measurement Targets

### Target Models

19 foundation models across 4 providers are listed. The single source of truth is the model registry (`packages/tech/src/llm-model-comparison/models.ts`).

### Target Metrics

This topic has no measured metrics. It records curated catalog fields only: provider, model, API model id, tier, API surface, release label, input/output catalog price, and supported effort levels.

## 3. Scope and Constraints

Every value is curated catalog data with a cited source, not a live measurement. No throughput, latency, accuracy, OCR, RAG, or availability figure appears here. Treat each cell as correct only as of its source's date; provider catalog pages can change after this page is generated. Vision/multimodal support is **to verify** and is deliberately omitted rather than guessed.

## 4. Verification Results

| Provider | Model | API model id | Tier | API surface | Released | Input $/MTok | Output $/MTok | Effort levels |
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

**Legend.** Every column is curated catalog data (provenance: `catalog`), not a measured value. Cost is USD per 1M tokens, input / output. "Effort levels" are the reasoning-effort settings the registry sweeps for that model; `n/a` means the model exposes no user-selectable effort control.

## 5. Analysis

Use this page to understand the comparison matrix before reading measurement pages. Model selection should not be based on this catalog alone: prices and effort controls constrain cost and runtime behavior, but measured speed, output accuracy, OCR capability, RAG behavior, and availability are covered by the other research topics.

## 6. Reproduction

### Reproduction Steps

```sh
cd packages/tech
npm run research -- foundation-models --fixture
```

### Reproduction Cost (Estimate)

The catalog path is keyless and costless. It reads the committed model registry and does not call provider APIs.

### Cleanup

No external resources are created. Re-rendering only rewrites the catalog Markdown and JSON artifact in `docs/research-reports/`.

## 7. Verification Data

- **Anthropic:** https://platform.claude.com/docs/en/about-claude/models/overview
- **OpenAI:** https://developers.openai.com/api/docs/pricing
- **Google:** https://ai.google.dev/gemini-api/docs/pricing
- **xAI:** https://docs.x.ai/developers/models/grok-4.3

The catalog regenerates from `packages/tech/src/llm-model-comparison/models.ts`; a correction to a price or tier is a one-line edit there, after which this page is re-rendered.
