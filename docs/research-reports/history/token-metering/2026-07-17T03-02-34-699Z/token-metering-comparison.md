---
title: Token counting and metering
description: A reproducible check of library-independent LLM input-token counting — exact self-implemented BPE where the vocabulary is published, calibrated estimation where it is not — validated against each provider's API-reported counts on a pinned English/Japanese/code sample set.
---

# Token counting and metering

This report measures whether the input tokens an LLM API bills for can be counted **without the provider's tokenizer library**. Where a provider publishes its tokenizer's vocabulary and merge rules (OpenAI's encodings; open-weight models' `tokenizer.json`), a self-implemented byte-pair-encoding counter is checked for exactness. Where the tokenizer is unpublished (Anthropic Claude, Google Gemini), a calibrated estimator is fitted against the provider's unbilled count endpoint and its error band is reported — an estimate with a stated band, never false precision. The distinction between the two counting methods, and the billing edge cases around them (Japanese text, output-token pre-estimation, cache/tool billing, image conversion), decide whether per-principal usage metering can be built provider-independently.

## 1. Research Purpose

The purpose is to record, for four provider families, how input tokens are counted, under what conditions a library-independent self-count is possible, what accuracy it reaches against the API-reported count on a pinned sample set, and what the price structure applies those counts to — the properties a usage-metering and cost-attribution layer is built on.

## 2. Measurement Targets

### Target Models

The subjects are the 4 provider families in the curated registry (`packages/tech/src/token-metering/models.ts`), one representative model each, with the counting method dictated by what the provider publishes:

- **Anthropic Claude** (`anthropic-claude`, measured against `claude-sonnet-5`): Tokenizer unpublished for current models (the archived @anthropic-ai/tokenizer covers legacy Claude 2 only), so no exact self-count exists; the self-count is a calibrated estimator against the unbilled count_tokens endpoint. Source: https://platform.claude.com/docs/en/build-with-claude/token-counting (verified 2026-07-17).
- **OpenAI GPT** (`openai-gpt`, measured against `gpt-5.5`): OpenAI publishes its encodings' vocabulary as ranked byte sequences (o200k_base, ~200k entries) plus the pre-tokenization pattern; there is no count-tokens endpoint, so the ground truth is usage.prompt_tokens from a minimal billed completion. Source: https://developers.openai.com/api/docs/pricing (verified 2026-07-17).
- **Google Gemini** (`google-gemini`, measured against `gemini-3.1-pro-preview`): SentencePiece lineage; Google publishes the Gemma tokenizer model but not the current Gemini API tokenizer, so the self-count is a calibrated estimator against the unbilled countTokens endpoint. Source: https://ai.google.dev/gemini-api/docs/tokens (verified 2026-07-17).
- **OSS / local (Qwen2.5)** (`oss-qwen`, measured against `@cf/qwen/qwen2.5-coder-32b-instruct`): Open-weight models ship tokenizer.json (vocabulary + ordered merge list + pre-tokenizer pattern, Apache-2.0 for Qwen2.5), so an exact self-count exists; the ground truth is usage.prompt_tokens reported by a hosted serving stack (Cloudflare Workers AI). Source: https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct (verified 2026-07-17).

### Target Metrics

The primary metrics are the holdout mean and max absolute error (%) of the self-count's prediction against the API-reported token count — lower is better, with the agreed target |error| ≤ 5% per class — plus the signed error band [min, max] per class. Descriptive metrics: fitted wrapper overhead (tokens per request), per-class tokens-per-character rates, and probe spend (USD, reference). Prices for cost derivation are the published per-MTok rates from the foundation-models catalog.

## 3. Scope and Constraints

- **Input tokens only.** Output tokens cannot be counted before a run (the model decides when to stop); their pre-estimation semantics are analyzed in section 5 as an edge case, and their post-run accounting reads the response's usage field.
- **Counting, not billing reconciliation.** The check compares token counts; invoice-level reconciliation (rounding, minimums, tier discounts) is out of scope.
- **One representative model per family.** Counts are validated against `claude-sonnet-5`, `gpt-5.5`, `gemini-3.1-pro-preview`, and `@cf/qwen/qwen2.5-coder-32b-instruct`; other models in a family may use other tokenizers and MUST be re-validated before the calibration is reused.
- **The sample manifest is pinned** (tm-v1: 30 samples, 10 per class, half calibration / half holdout). Accuracy claims hold for these classes and lengths; other content classes (e.g. base64 blobs, dense Unicode art) are unvalidated.
- **Wrapper overhead is fitted, not documented.** Providers do not publish their chat-template token cost; the affine model absorbs it as a fitted constant, which assumes the single-user-message request shape used here.
- The keyless fixture path is deterministic and clearly synthetic (byte-count vocabulary, fixed rates); real error numbers appear only from an owner-triggered real run within the approved cost ceiling (run `--estimate` first).
- Point-in-time: measured behavior reflects the providers' tokenizers and count endpoints at `2026-07-17T03:02:34.699Z`; vocabularies and prices are as of each row's source and verification date.

## 4. Verification Results

This run has **4 measured** of 4 family rows (the rest are `unreachable` — missing credential or vocabulary — or `error`, never faked counts). Accuracy is judged on the tm-v1 holdout half (15 samples: 5 English, 5 Japanese, 5 code) against each provider's API-reported count.

| Family | Self-count method | Holdout mean abs error | Holdout max abs error | ±5% target |
| ------ | ----------------- | ---------------------- | --------------------- | ------- |
| Anthropic Claude | calibrated estimator | 8.54% | 16.24% | NOT within ±5% (band stated per class) |
| OpenAI GPT | exact self-BPE | 0.00% | 0.00% | within ±5% |
| Google Gemini | calibrated estimator | 6.60% | 15.73% | NOT within ±5% (band stated per class) |
| OSS / local (Qwen2.5) | exact self-BPE | 0.00% | 0.00% | within ±5% |

Errors compare the self-count's prediction of the provider-reported total (content tokens + fitted wrapper overhead) against that reported total. Per-class error bands, calibration parameters, and per-sample rows are in section 7, Verification Data.

**推移 / Trend across surveys**

This is the first comparable survey in the series, so there is no multi-survey trend to chart yet. A trend chart appears here once a second same-instrument survey is archived; earlier surveys are linked under Verification Data.

## 5. Analysis

Families with `measured` provenance can be compared on holdout error: the exact-BPE families test whether the published vocabulary plus the published pre-tokenization pattern reproduce the billed count, and the estimator families test how far a per-class characters-per-token model can be trusted. A max error inside the target band means pre-call cost projection and per-principal attribution can run on the self-count alone; a class outside the band must be metered post-hoc from the response usage field, with the band stating the projection risk.

#### Edge case 1 — Japanese text

Japanese tokenizes at several times the per-character token rate of English (see the per-class tokens-per-character rates in section 7): vocabularies are latin-dominated, so many kanji fall back toward byte pieces. Cost projection that assumes English rates underestimates Japanese inputs; the per-class rates in the calibration are the correction, and the Japanese holdout band states how far they can be trusted.

#### Edge case 2 — Output tokens cannot be pre-counted

Two different quantities must not be conflated: the **pre-run estimate** (the model decides when to stop, so only bounds exist — the request's max-tokens cap is the hard ceiling, and a historical output/input ratio per workload gives an expected value) and the **post-run account** (exact, from the response's usage field: output tokens, and reasoning tokens where the provider bills them as output). A metering layer stores the post-run account and uses the pre-run bound only for quota admission, never for billing.

#### Edge case 3 — Cache and tool-use billing

Cached and tool-bearing requests bill the same token counts at different rates, so a meter must keep the usage breakdown, not one number. Prompt-cache writes bill above the base input rate and cache reads bill at a small fraction of it (each provider publishes its own multipliers and minimum cacheable lengths); the response usage field reports cache-write and cache-read tokens separately, and a meter must price each bucket at its own rate. Tool definitions are serialized into the prompt and bill as ordinary input tokens — the measured overhead of one tool definition on the Anthropic count endpoint is in section 7 — and provider-side tool results (e.g. web search) return to the context and bill as input on the next turn.

#### Edge case 4 — Images and multimodal inputs

Image token conversion is formula-based, not BPE: Anthropic documents width×height/750 (capped by automatic downscaling), Google documents a flat 258 tokens per image up to 384px and 258 per 768×768 tile above it, and OpenAI documents a base-plus-tiles schedule per model family. The probe results for one pinned PNG are in section 7; a meter should implement these conversions per provider behind the same interface as text counting, with the formula version recorded — providers change conversion schedules between model generations.

#### Implementation policy — per-principal usage metering (design chapter)

The consuming design this research feeds (the plgg token-metering library and its users, e.g. qmu-co-jp sync-controller) attributes usage to a **principal** — the RBAC/PBAC subject of the qmu.app plan — via a usage record kept by the caller:

- **Record shape**: `{ recordedAt, principalId, model, inputTokens, cachedInputTokens, outputTokens, costUsd, countingMethod, calibrationVersion }` — the usage breakdown mirrors the provider's usage field, the cost carries its input/cache/output decomposition, and the counting method plus calibration version make every stored number re-derivable.
- **Data minimization / sovereignty**: the record stores counts and money, never prompt or completion text; `principalId` is an opaque internal identifier (non-PII, per the observability policy's structured-log constraint); deletion semantics are decided at schema time — usage records are billing evidence, so account deletion anonymizes `principalId` (irreversibly detaching the person) rather than destroying the financial total, and this retention is disclosed.
- **Metrics output**: aggregates export in a vendor-neutral format (OpenMetrics counters per principal/model/token-bucket), not a provider dashboard, per the observability policy.
- **Branded types**: token counts and USD amounts are separate branded number types, so a count never adds to an amount without an explicit conversion through a price — the compile-time misuse this research's own harness types also enforce.
- **ACL boundary**: tokenizer vocabularies, count endpoints, and usage fields are provider details behind an anti-corruption layer; the domain sees `countTokens(model, text)` and `estimateCost(model, usage)` only.

#### Dependency decision — tokenizer libraries (4-point log)

1. **Reason**: counting needs a tokenizer. Candidates: `tiktoken` (OpenAI encodings), the archived `@anthropic-ai/tokenizer` (legacy Claude 2 only — unusable for current models), Hugging Face `tokenizers`/transformers (OSS models).
2. **Assessment**: all are reputable and permissively licensed (MIT/Apache-2.0), but each covers one provider, none covers Anthropic's current models, and adopting them puts a per-provider native/WASM dependency into every consumer.
3. **Decision and monitoring**: per the vendor-neutrality policy's implement-by-default principle, the self-implementation is adopted: the BPE inference loop is ~150 lines against *published data* (the vocabularies), and this topic's recurring trial IS the monitoring plan — it re-validates the counts against the live APIs each run, so a tokenizer change surfaces as a holdout-error regression, the same signal a library adopter waits for in a release note.
4. **Exit strategy**: the counting interface (`countTokens`) hides the implementation; if a provider ships an encoding whose published rules the self-count cannot reproduce within the band, the reference library can be adopted behind the same interface for that provider only, recorded in `docs/dependency-decisions.md`.

## 6. Reproduction

### Reproduction Steps

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (deterministic fixture vocabulary and counts):
npm run research -- token-metering --fixture

# Cost preview, then the owner-gated real run (needs provider keys):
npm run research -- token-metering --estimate
npm run research -- token-metering --real
```

A real run fetches the published vocabularies (o200k_base.tiktoken; Qwen2.5 tokenizer.json) into `packages/tech/.cache/token-metering/` — they are data downloads recorded in `docs/dependency-decisions.md`, never committed.

### Reproduction Cost (Estimate)

The fixture path is keyless and costless. A real trial reads two unbilled count endpoints (Anthropic count_tokens, Gemini countTokens — $0) and runs one minimal billed completion per sample against the two usage-probe families (30 short prompts each against `gpt-5.5` and the Workers AI Qwen model): the estimate path prices this in the cents range per trial. The agreed ceiling for the whole mission's measurements is $5 and `--estimate` must run first.

### Cleanup

A real run provisions nothing (stateless API reads and minimal completions); there is nothing to tear down. It writes the local Markdown/JSON artifacts and the vocabulary cache under `packages/tech/.cache/` — review the artifacts before committing; the cache is gitignored.

## 7. Verification Data

**Per-family calibration, per-class error, and per-sample counts**

**Anthropic Claude** (`claude-sonnet-5`, calibrated estimator, ground truth: count-tokens-endpoint, probe spend $0.0000)

Calibration: wrapper overhead 4 tokens; tokens/char english 0.3239, japanese 0.9790, code 0.4712 (estimator families predict with these; exact families report them as descriptive statistics).

| Class | Holdout n | Mean abs error | Max abs error | Signed band | Within target |
| ----- | --------- | -------------- | ------------- | ----------- | ------------- |
| english | 5 | 8.98% | 15.56% | [-10.74%, 15.56%] | no |
| japanese | 5 | 8.15% | 12.88% | [-11.11%, 12.88%] | no |
| code | 5 | 8.50% | 16.24% | [-7.80%, 16.24%] | no |

| Sample | Class | Role | Chars | UTF-8 bytes | Self content | API total | Predicted | Error | Provenance |
| ------ | ----- | ---- | ----- | ----------- | ------------ | --------- | --------- | ----- | ---------- |
| en-01 | english | calibration | 167 | 167 | — | 54 | 58 | 7.41% | measured |
| en-02 | english | holdout | 236 | 236 | — | 71 | 80 | 12.68% | measured |
| en-03 | english | calibration | 271 | 271 | — | 89 | 92 | 3.37% | measured |
| en-04 | english | holdout | 363 | 365 | — | 128 | 122 | -4.69% | measured |
| en-05 | english | calibration | 259 | 259 | — | 113 | 88 | -22.12% | measured |
| en-06 | english | holdout | 309 | 309 | — | 90 | 104 | 15.56% | measured |
| en-07 | english | calibration | 300 | 302 | — | 98 | 101 | 3.06% | measured |
| en-08 | english | holdout | 235 | 237 | — | 81 | 80 | -1.23% | measured |
| en-09 | english | calibration | 309 | 309 | — | 92 | 104 | 13.04% | measured |
| en-10 | english | holdout | 320 | 320 | — | 121 | 108 | -10.74% | measured |
| ja-01 | japanese | calibration | 78 | 228 | — | 76 | 80 | 5.26% | measured |
| ja-02 | japanese | holdout | 83 | 249 | — | 89 | 85 | -4.49% | measured |
| ja-03 | japanese | calibration | 85 | 255 | — | 102 | 87 | -14.71% | measured |
| ja-04 | japanese | holdout | 148 | 440 | — | 132 | 149 | 12.88% | measured |
| ja-05 | japanese | calibration | 108 | 324 | — | 104 | 110 | 5.77% | measured |
| ja-06 | japanese | holdout | 86 | 254 | — | 85 | 88 | 3.53% | measured |
| ja-07 | japanese | calibration | 120 | 358 | — | 118 | 121 | 2.54% | measured |
| ja-08 | japanese | holdout | 94 | 282 | — | 108 | 96 | -11.11% | measured |
| ja-09 | japanese | calibration | 90 | 270 | — | 95 | 92 | -3.16% | measured |
| ja-10 | japanese | holdout | 136 | 384 | — | 126 | 137 | 8.73% | measured |
| code-01 | code | calibration | 204 | 204 | — | 86 | 100 | 16.28% | measured |
| code-02 | code | holdout | 477 | 477 | — | 197 | 229 | 16.24% | measured |
| code-03 | code | calibration | 151 | 151 | — | 80 | 75 | -6.25% | measured |
| code-04 | code | holdout | 268 | 268 | — | 141 | 130 | -7.80% | measured |
| code-05 | code | calibration | 182 | 182 | — | 92 | 90 | -2.17% | measured |
| code-06 | code | holdout | 310 | 310 | — | 143 | 150 | 4.90% | measured |
| code-07 | code | calibration | 251 | 251 | — | 143 | 122 | -14.69% | measured |
| code-08 | code | holdout | 297 | 297 | — | 135 | 144 | 6.67% | measured |
| code-09 | code | calibration | 227 | 227 | — | 97 | 111 | 14.43% | measured |
| code-10 | code | holdout | 354 | 354 | — | 160 | 171 | 6.88% | measured |

**OpenAI GPT** (`gpt-5.5`, exact self-BPE, ground truth: usage-field-probe, probe spend $0.0260)

Calibration: wrapper overhead 6 tokens; tokens/char english 0.1916, japanese 0.8333, code 0.2749 (estimator families predict with these; exact families report them as descriptive statistics).

| Class | Holdout n | Mean abs error | Max abs error | Signed band | Within target |
| ----- | --------- | -------------- | ------------- | ----------- | ------------- |
| english | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |
| japanese | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |
| code | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |

| Sample | Class | Role | Chars | UTF-8 bytes | Self content | API total | Predicted | Error | Provenance |
| ------ | ----- | ---- | ----- | ----------- | ------------ | --------- | --------- | ----- | ---------- |
| en-01 | english | calibration | 167 | 167 | 32 | 38 | 38 | 0.00% | measured |
| en-02 | english | holdout | 236 | 236 | 44 | 50 | 50 | 0.00% | measured |
| en-03 | english | calibration | 271 | 271 | 53 | 59 | 59 | 0.00% | measured |
| en-04 | english | holdout | 363 | 365 | 74 | 80 | 80 | 0.00% | measured |
| en-05 | english | calibration | 259 | 259 | 66 | 72 | 72 | 0.00% | measured |
| en-06 | english | holdout | 309 | 309 | 58 | 64 | 64 | 0.00% | measured |
| en-07 | english | calibration | 300 | 302 | 56 | 62 | 62 | 0.00% | measured |
| en-08 | english | holdout | 235 | 237 | 48 | 54 | 54 | 0.00% | measured |
| en-09 | english | calibration | 309 | 309 | 51 | 57 | 57 | 0.00% | measured |
| en-10 | english | holdout | 320 | 320 | 69 | 75 | 75 | 0.00% | measured |
| ja-01 | japanese | calibration | 78 | 228 | 65 | 71 | 71 | 0.00% | measured |
| ja-02 | japanese | holdout | 83 | 249 | 70 | 76 | 76 | 0.00% | measured |
| ja-03 | japanese | calibration | 85 | 255 | 78 | 84 | 84 | 0.00% | measured |
| ja-04 | japanese | holdout | 148 | 440 | 100 | 106 | 106 | 0.00% | measured |
| ja-05 | japanese | calibration | 108 | 324 | 72 | 78 | 78 | 0.00% | measured |
| ja-06 | japanese | holdout | 86 | 254 | 72 | 78 | 78 | 0.00% | measured |
| ja-07 | japanese | calibration | 120 | 358 | 96 | 102 | 102 | 0.00% | measured |
| ja-08 | japanese | holdout | 94 | 282 | 90 | 96 | 96 | 0.00% | measured |
| ja-09 | japanese | calibration | 90 | 270 | 76 | 82 | 82 | 0.00% | measured |
| ja-10 | japanese | holdout | 136 | 384 | 94 | 100 | 100 | 0.00% | measured |
| code-01 | code | calibration | 204 | 204 | 50 | 56 | 56 | 0.00% | measured |
| code-02 | code | holdout | 477 | 477 | 137 | 143 | 143 | 0.00% | measured |
| code-03 | code | calibration | 151 | 151 | 54 | 60 | 60 | 0.00% | measured |
| code-04 | code | holdout | 268 | 268 | 67 | 73 | 73 | 0.00% | measured |
| code-05 | code | calibration | 182 | 182 | 55 | 61 | 61 | 0.00% | measured |
| code-06 | code | holdout | 310 | 310 | 86 | 92 | 92 | 0.00% | measured |
| code-07 | code | calibration | 251 | 251 | 69 | 75 | 75 | 0.00% | measured |
| code-08 | code | holdout | 297 | 297 | 97 | 103 | 103 | 0.00% | measured |
| code-09 | code | calibration | 227 | 227 | 60 | 66 | 66 | 0.00% | measured |
| code-10 | code | holdout | 354 | 354 | 96 | 102 | 102 | 0.00% | measured |

**Google Gemini** (`gemini-3.1-pro-preview`, calibrated estimator, ground truth: count-tokens-endpoint, probe spend $0.0000)

Calibration: wrapper overhead 7 tokens; tokens/char english 0.1782, japanese 0.5019, code 0.3100 (estimator families predict with these; exact families report them as descriptive statistics).

| Class | Holdout n | Mean abs error | Max abs error | Signed band | Within target |
| ----- | --------- | -------------- | ------------- | ----------- | ------------- |
| english | 5 | 5.96% | 11.11% | [-11.11%, 8.89%] | no |
| japanese | 5 | 9.37% | 15.73% | [-15.73%, 10.96%] | no |
| code | 5 | 4.48% | 8.33% | [-8.33%, 5.88%] | no |

| Sample | Class | Role | Chars | UTF-8 bytes | Self content | API total | Predicted | Error | Provenance |
| ------ | ----- | ---- | ----- | ----------- | ------------ | --------- | --------- | ----- | ---------- |
| en-01 | english | calibration | 167 | 167 | — | 32 | 37 | 15.63% | measured |
| en-02 | english | holdout | 236 | 236 | — | 45 | 49 | 8.89% | measured |
| en-03 | english | calibration | 271 | 271 | — | 55 | 55 | 0.00% | measured |
| en-04 | english | holdout | 363 | 365 | — | 74 | 72 | -2.70% | measured |
| en-05 | english | calibration | 259 | 259 | — | 72 | 53 | -26.39% | measured |
| en-06 | english | holdout | 309 | 309 | — | 59 | 62 | 5.08% | measured |
| en-07 | english | calibration | 300 | 302 | — | 57 | 60 | 5.26% | measured |
| en-08 | english | holdout | 235 | 237 | — | 50 | 49 | -2.00% | measured |
| en-09 | english | calibration | 309 | 309 | — | 52 | 62 | 19.23% | measured |
| en-10 | english | holdout | 320 | 320 | — | 72 | 64 | -11.11% | measured |
| ja-01 | japanese | calibration | 78 | 228 | — | 44 | 46 | 4.55% | measured |
| ja-02 | japanese | holdout | 83 | 249 | — | 50 | 49 | -2.00% | measured |
| ja-03 | japanese | calibration | 85 | 255 | — | 58 | 50 | -13.79% | measured |
| ja-04 | japanese | holdout | 148 | 440 | — | 73 | 81 | 10.96% | measured |
| ja-05 | japanese | calibration | 108 | 324 | — | 53 | 61 | 15.09% | measured |
| ja-06 | japanese | holdout | 86 | 254 | — | 52 | 50 | -3.85% | measured |
| ja-07 | japanese | calibration | 120 | 358 | — | 66 | 67 | 1.52% | measured |
| ja-08 | japanese | holdout | 94 | 282 | — | 63 | 54 | -14.29% | measured |
| ja-09 | japanese | calibration | 90 | 270 | — | 57 | 52 | -8.77% | measured |
| ja-10 | japanese | holdout | 136 | 384 | — | 89 | 75 | -15.73% | measured |
| code-01 | code | calibration | 204 | 204 | — | 60 | 70 | 16.67% | measured |
| code-02 | code | holdout | 477 | 477 | — | 162 | 155 | -4.32% | measured |
| code-03 | code | calibration | 151 | 151 | — | 63 | 54 | -14.29% | measured |
| code-04 | code | holdout | 268 | 268 | — | 85 | 90 | 5.88% | measured |
| code-05 | code | calibration | 182 | 182 | — | 62 | 63 | 1.61% | measured |
| code-06 | code | holdout | 310 | 310 | — | 100 | 103 | 3.00% | measured |
| code-07 | code | calibration | 251 | 251 | — | 93 | 85 | -8.60% | measured |
| code-08 | code | holdout | 297 | 297 | — | 108 | 99 | -8.33% | measured |
| code-09 | code | calibration | 227 | 227 | — | 72 | 77 | 6.94% | measured |
| code-10 | code | holdout | 354 | 354 | — | 118 | 117 | -0.85% | measured |

**OSS / local (Qwen2.5)** (`@cf/qwen/qwen2.5-coder-32b-instruct`, exact self-BPE, ground truth: usage-field-probe, probe spend $0.0020)

Calibration: wrapper overhead 29 tokens; tokens/char english 0.1916, japanese 0.7000, code 0.2775 (estimator families predict with these; exact families report them as descriptive statistics).

| Class | Holdout n | Mean abs error | Max abs error | Signed band | Within target |
| ----- | --------- | -------------- | ------------- | ----------- | ------------- |
| english | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |
| japanese | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |
| code | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |

| Sample | Class | Role | Chars | UTF-8 bytes | Self content | API total | Predicted | Error | Provenance |
| ------ | ----- | ---- | ----- | ----------- | ------------ | --------- | --------- | ----- | ---------- |
| en-01 | english | calibration | 167 | 167 | 32 | 61 | 61 | 0.00% | measured |
| en-02 | english | holdout | 236 | 236 | 44 | 73 | 73 | 0.00% | measured |
| en-03 | english | calibration | 271 | 271 | 55 | 84 | 84 | 0.00% | measured |
| en-04 | english | holdout | 363 | 365 | 75 | 104 | 104 | 0.00% | measured |
| en-05 | english | calibration | 259 | 259 | 72 | 101 | 101 | 0.00% | measured |
| en-06 | english | holdout | 309 | 309 | 59 | 88 | 88 | 0.00% | measured |
| en-07 | english | calibration | 300 | 302 | 56 | 85 | 85 | 0.00% | measured |
| en-08 | english | holdout | 235 | 237 | 50 | 79 | 79 | 0.00% | measured |
| en-09 | english | calibration | 309 | 309 | 51 | 80 | 80 | 0.00% | measured |
| en-10 | english | holdout | 320 | 320 | 70 | 99 | 99 | 0.00% | measured |
| ja-01 | japanese | calibration | 78 | 228 | 50 | 79 | 79 | 0.00% | measured |
| ja-02 | japanese | holdout | 83 | 249 | 70 | 99 | 99 | 0.00% | measured |
| ja-03 | japanese | calibration | 85 | 255 | 70 | 99 | 99 | 0.00% | measured |
| ja-04 | japanese | holdout | 148 | 440 | 97 | 126 | 126 | 0.00% | measured |
| ja-05 | japanese | calibration | 108 | 324 | 67 | 96 | 96 | 0.00% | measured |
| ja-06 | japanese | holdout | 86 | 254 | 69 | 98 | 98 | 0.00% | measured |
| ja-07 | japanese | calibration | 120 | 358 | 84 | 113 | 113 | 0.00% | measured |
| ja-08 | japanese | holdout | 94 | 282 | 82 | 111 | 111 | 0.00% | measured |
| ja-09 | japanese | calibration | 90 | 270 | 77 | 106 | 106 | 0.00% | measured |
| ja-10 | japanese | holdout | 136 | 384 | 103 | 132 | 132 | 0.00% | measured |
| code-01 | code | calibration | 204 | 204 | 50 | 79 | 79 | 0.00% | measured |
| code-02 | code | holdout | 477 | 477 | 137 | 166 | 166 | 0.00% | measured |
| code-03 | code | calibration | 151 | 151 | 55 | 84 | 84 | 0.00% | measured |
| code-04 | code | holdout | 268 | 268 | 68 | 97 | 97 | 0.00% | measured |
| code-05 | code | calibration | 182 | 182 | 54 | 83 | 83 | 0.00% | measured |
| code-06 | code | holdout | 310 | 310 | 87 | 116 | 116 | 0.00% | measured |
| code-07 | code | calibration | 251 | 251 | 69 | 98 | 98 | 0.00% | measured |
| code-08 | code | holdout | 297 | 297 | 99 | 128 | 128 | 0.00% | measured |
| code-09 | code | calibration | 227 | 227 | 63 | 92 | 92 | 0.00% | measured |
| code-10 | code | holdout | 354 | 354 | 104 | 133 | 133 | 0.00% | measured |

**Edge-case probes**

- Anthropic tool-definition overhead (count_tokens with vs. without one tool): 483 tokens
- Anthropic image tokens for a 300×300 PNG (published formula width×height/750): 124 tokens
- Gemini image tokens for the same PNG (documented 258 per image up to 384px): 1089 tokens

Probe spend of this benchmark stage: $0.0280 (count endpoints are unbilled; the usage probes bill minimal completions).

The complete run record is committed as [`token-metering-comparison.real.data.json`](./token-metering-comparison.real.data.json): per-sample counts, fitted calibrations, per-class bands, edge-probe readings, and spend.

Generated: 2026-07-17T03:02:34.699Z
