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
- Point-in-time: measured behavior reflects the providers' tokenizers and count endpoints at `2026-01-01T00:00:00.000Z`; vocabularies and prices are as of each row's source and verification date.

## 4. Verification Results

This run has **4 fixtured** of 4 family rows (the rest are `unreachable` — missing credential or vocabulary — or `error`, never faked counts). Accuracy is judged on the tm-v1 holdout half (15 samples: 5 English, 5 Japanese, 5 code) against each provider's API-reported count.

| Family | Self-count method | Holdout mean abs error | Holdout max abs error | ±5% target |
| ------ | ----------------- | ---------------------- | --------------------- | ------- |
| Anthropic Claude | calibrated estimator | 1.30% | 2.50% | within ±5% |
| OpenAI GPT | exact self-BPE | 0.00% | 0.00% | within ±5% |
| Google Gemini | calibrated estimator | 1.30% | 2.50% | within ±5% |
| OSS / local (Qwen2.5) | exact self-BPE | 0.00% | 0.00% | within ±5% |

Errors compare the self-count's prediction of the provider-reported total (content tokens + fitted wrapper overhead) against that reported total. Per-class error bands, calibration parameters, and per-sample rows are in section 7, Verification Data.

**推移 / Trend across surveys**

This is the first comparable survey in the series, so there is no multi-survey trend to chart yet. A trend chart appears here once a second same-instrument survey is archived; earlier surveys are linked under Verification Data.

## 5. Analysis

This run is the keyless fixture: counts prove the harness (synthetic vocabulary, fixed rates), so no cross-family accuracy claim is made here. The dated survey frames carry the measured comparison.

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

Calibration: wrapper overhead 3 tokens; tokens/char english 0.2646, japanese 1.0393, code 0.3379 (estimator families predict with these; exact families report them as descriptive statistics).

| Class | Holdout n | Mean abs error | Max abs error | Signed band | Within target |
| ----- | --------- | -------------- | ------------- | ----------- | ------------- |
| english | 5 | 1.28% | 1.52% | [-1.52%, 1.19%] | yes |
| japanese | 5 | 0.84% | 1.29% | [-1.11%, 1.29%] | yes |
| code | 5 | 1.79% | 2.50% | [0.98%, 2.50%] | yes |

| Sample | Class | Role | Chars | UTF-8 bytes | Self content | API total | Predicted | Error | Provenance |
| ------ | ----- | ---- | ----- | ----------- | ------------ | --------- | --------- | ----- | ---------- |
| en-01 | english | calibration | 167 | 167 | — | 49 | 47 | -4.08% | fixtured |
| en-02 | english | holdout | 236 | 236 | — | 66 | 65 | -1.52% | fixtured |
| en-03 | english | calibration | 271 | 271 | — | 75 | 75 | 0.00% | fixtured |
| en-04 | english | holdout | 363 | 365 | — | 98 | 99 | 1.02% | fixtured |
| en-05 | english | calibration | 259 | 259 | — | 72 | 72 | 0.00% | fixtured |
| en-06 | english | holdout | 309 | 309 | — | 84 | 85 | 1.19% | fixtured |
| en-07 | english | calibration | 300 | 302 | — | 82 | 82 | 0.00% | fixtured |
| en-08 | english | holdout | 235 | 237 | — | 66 | 65 | -1.52% | fixtured |
| en-09 | english | calibration | 309 | 309 | — | 84 | 85 | 1.19% | fixtured |
| en-10 | english | holdout | 320 | 320 | — | 87 | 88 | 1.15% | fixtured |
| ja-01 | japanese | calibration | 78 | 228 | — | 85 | 84 | -1.18% | fixtured |
| ja-02 | japanese | holdout | 83 | 249 | — | 90 | 89 | -1.11% | fixtured |
| ja-03 | japanese | calibration | 85 | 255 | — | 92 | 91 | -1.09% | fixtured |
| ja-04 | japanese | holdout | 148 | 440 | — | 155 | 157 | 1.29% | fixtured |
| ja-05 | japanese | calibration | 108 | 324 | — | 115 | 115 | 0.00% | fixtured |
| ja-06 | japanese | holdout | 86 | 254 | — | 93 | 92 | -1.08% | fixtured |
| ja-07 | japanese | calibration | 120 | 358 | — | 127 | 128 | 0.79% | fixtured |
| ja-08 | japanese | holdout | 94 | 282 | — | 101 | 101 | 0.00% | fixtured |
| ja-09 | japanese | calibration | 90 | 270 | — | 97 | 97 | 0.00% | fixtured |
| ja-10 | japanese | holdout | 136 | 384 | — | 143 | 144 | 0.70% | fixtured |
| code-01 | code | calibration | 204 | 204 | — | 72 | 72 | 0.00% | fixtured |
| code-02 | code | holdout | 477 | 477 | — | 160 | 164 | 2.50% | fixtured |
| code-03 | code | calibration | 151 | 151 | — | 55 | 54 | -1.82% | fixtured |
| code-04 | code | holdout | 268 | 268 | — | 93 | 94 | 1.08% | fixtured |
| code-05 | code | calibration | 182 | 182 | — | 65 | 64 | -1.54% | fixtured |
| code-06 | code | holdout | 310 | 310 | — | 106 | 108 | 1.89% | fixtured |
| code-07 | code | calibration | 251 | 251 | — | 87 | 88 | 1.15% | fixtured |
| code-08 | code | holdout | 297 | 297 | — | 102 | 103 | 0.98% | fixtured |
| code-09 | code | calibration | 227 | 227 | — | 80 | 80 | 0.00% | fixtured |
| code-10 | code | holdout | 354 | 354 | — | 120 | 123 | 2.50% | fixtured |

**OpenAI GPT** (`gpt-5.5`, exact self-BPE, ground truth: usage-field-probe, probe spend $0.0000)

Calibration: wrapper overhead 7 tokens; tokens/char english 1.0000, japanese 3.0000, code 1.0000 (estimator families predict with these; exact families report them as descriptive statistics).

| Class | Holdout n | Mean abs error | Max abs error | Signed band | Within target |
| ----- | --------- | -------------- | ------------- | ----------- | ------------- |
| english | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |
| japanese | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |
| code | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |

| Sample | Class | Role | Chars | UTF-8 bytes | Self content | API total | Predicted | Error | Provenance |
| ------ | ----- | ---- | ----- | ----------- | ------------ | --------- | --------- | ----- | ---------- |
| en-01 | english | calibration | 167 | 167 | 167 | 174 | 174 | 0.00% | fixtured |
| en-02 | english | holdout | 236 | 236 | 236 | 243 | 243 | 0.00% | fixtured |
| en-03 | english | calibration | 271 | 271 | 271 | 278 | 278 | 0.00% | fixtured |
| en-04 | english | holdout | 363 | 365 | 365 | 372 | 372 | 0.00% | fixtured |
| en-05 | english | calibration | 259 | 259 | 259 | 266 | 266 | 0.00% | fixtured |
| en-06 | english | holdout | 309 | 309 | 309 | 316 | 316 | 0.00% | fixtured |
| en-07 | english | calibration | 300 | 302 | 302 | 309 | 309 | 0.00% | fixtured |
| en-08 | english | holdout | 235 | 237 | 237 | 244 | 244 | 0.00% | fixtured |
| en-09 | english | calibration | 309 | 309 | 309 | 316 | 316 | 0.00% | fixtured |
| en-10 | english | holdout | 320 | 320 | 320 | 327 | 327 | 0.00% | fixtured |
| ja-01 | japanese | calibration | 78 | 228 | 228 | 235 | 235 | 0.00% | fixtured |
| ja-02 | japanese | holdout | 83 | 249 | 249 | 256 | 256 | 0.00% | fixtured |
| ja-03 | japanese | calibration | 85 | 255 | 255 | 262 | 262 | 0.00% | fixtured |
| ja-04 | japanese | holdout | 148 | 440 | 440 | 447 | 447 | 0.00% | fixtured |
| ja-05 | japanese | calibration | 108 | 324 | 324 | 331 | 331 | 0.00% | fixtured |
| ja-06 | japanese | holdout | 86 | 254 | 254 | 261 | 261 | 0.00% | fixtured |
| ja-07 | japanese | calibration | 120 | 358 | 358 | 365 | 365 | 0.00% | fixtured |
| ja-08 | japanese | holdout | 94 | 282 | 282 | 289 | 289 | 0.00% | fixtured |
| ja-09 | japanese | calibration | 90 | 270 | 270 | 277 | 277 | 0.00% | fixtured |
| ja-10 | japanese | holdout | 136 | 384 | 384 | 391 | 391 | 0.00% | fixtured |
| code-01 | code | calibration | 204 | 204 | 204 | 211 | 211 | 0.00% | fixtured |
| code-02 | code | holdout | 477 | 477 | 477 | 484 | 484 | 0.00% | fixtured |
| code-03 | code | calibration | 151 | 151 | 151 | 158 | 158 | 0.00% | fixtured |
| code-04 | code | holdout | 268 | 268 | 268 | 275 | 275 | 0.00% | fixtured |
| code-05 | code | calibration | 182 | 182 | 182 | 189 | 189 | 0.00% | fixtured |
| code-06 | code | holdout | 310 | 310 | 310 | 317 | 317 | 0.00% | fixtured |
| code-07 | code | calibration | 251 | 251 | 251 | 258 | 258 | 0.00% | fixtured |
| code-08 | code | holdout | 297 | 297 | 297 | 304 | 304 | 0.00% | fixtured |
| code-09 | code | calibration | 227 | 227 | 227 | 234 | 234 | 0.00% | fixtured |
| code-10 | code | holdout | 354 | 354 | 354 | 361 | 361 | 0.00% | fixtured |

**Google Gemini** (`gemini-3.1-pro-preview`, calibrated estimator, ground truth: count-tokens-endpoint, probe spend $0.0000)

Calibration: wrapper overhead 3 tokens; tokens/char english 0.2646, japanese 1.0393, code 0.3379 (estimator families predict with these; exact families report them as descriptive statistics).

| Class | Holdout n | Mean abs error | Max abs error | Signed band | Within target |
| ----- | --------- | -------------- | ------------- | ----------- | ------------- |
| english | 5 | 1.28% | 1.52% | [-1.52%, 1.19%] | yes |
| japanese | 5 | 0.84% | 1.29% | [-1.11%, 1.29%] | yes |
| code | 5 | 1.79% | 2.50% | [0.98%, 2.50%] | yes |

| Sample | Class | Role | Chars | UTF-8 bytes | Self content | API total | Predicted | Error | Provenance |
| ------ | ----- | ---- | ----- | ----------- | ------------ | --------- | --------- | ----- | ---------- |
| en-01 | english | calibration | 167 | 167 | — | 49 | 47 | -4.08% | fixtured |
| en-02 | english | holdout | 236 | 236 | — | 66 | 65 | -1.52% | fixtured |
| en-03 | english | calibration | 271 | 271 | — | 75 | 75 | 0.00% | fixtured |
| en-04 | english | holdout | 363 | 365 | — | 98 | 99 | 1.02% | fixtured |
| en-05 | english | calibration | 259 | 259 | — | 72 | 72 | 0.00% | fixtured |
| en-06 | english | holdout | 309 | 309 | — | 84 | 85 | 1.19% | fixtured |
| en-07 | english | calibration | 300 | 302 | — | 82 | 82 | 0.00% | fixtured |
| en-08 | english | holdout | 235 | 237 | — | 66 | 65 | -1.52% | fixtured |
| en-09 | english | calibration | 309 | 309 | — | 84 | 85 | 1.19% | fixtured |
| en-10 | english | holdout | 320 | 320 | — | 87 | 88 | 1.15% | fixtured |
| ja-01 | japanese | calibration | 78 | 228 | — | 85 | 84 | -1.18% | fixtured |
| ja-02 | japanese | holdout | 83 | 249 | — | 90 | 89 | -1.11% | fixtured |
| ja-03 | japanese | calibration | 85 | 255 | — | 92 | 91 | -1.09% | fixtured |
| ja-04 | japanese | holdout | 148 | 440 | — | 155 | 157 | 1.29% | fixtured |
| ja-05 | japanese | calibration | 108 | 324 | — | 115 | 115 | 0.00% | fixtured |
| ja-06 | japanese | holdout | 86 | 254 | — | 93 | 92 | -1.08% | fixtured |
| ja-07 | japanese | calibration | 120 | 358 | — | 127 | 128 | 0.79% | fixtured |
| ja-08 | japanese | holdout | 94 | 282 | — | 101 | 101 | 0.00% | fixtured |
| ja-09 | japanese | calibration | 90 | 270 | — | 97 | 97 | 0.00% | fixtured |
| ja-10 | japanese | holdout | 136 | 384 | — | 143 | 144 | 0.70% | fixtured |
| code-01 | code | calibration | 204 | 204 | — | 72 | 72 | 0.00% | fixtured |
| code-02 | code | holdout | 477 | 477 | — | 160 | 164 | 2.50% | fixtured |
| code-03 | code | calibration | 151 | 151 | — | 55 | 54 | -1.82% | fixtured |
| code-04 | code | holdout | 268 | 268 | — | 93 | 94 | 1.08% | fixtured |
| code-05 | code | calibration | 182 | 182 | — | 65 | 64 | -1.54% | fixtured |
| code-06 | code | holdout | 310 | 310 | — | 106 | 108 | 1.89% | fixtured |
| code-07 | code | calibration | 251 | 251 | — | 87 | 88 | 1.15% | fixtured |
| code-08 | code | holdout | 297 | 297 | — | 102 | 103 | 0.98% | fixtured |
| code-09 | code | calibration | 227 | 227 | — | 80 | 80 | 0.00% | fixtured |
| code-10 | code | holdout | 354 | 354 | — | 120 | 123 | 2.50% | fixtured |

**OSS / local (Qwen2.5)** (`@cf/qwen/qwen2.5-coder-32b-instruct`, exact self-BPE, ground truth: usage-field-probe, probe spend $0.0000)

Calibration: wrapper overhead 7 tokens; tokens/char english 1.0000, japanese 3.0000, code 1.0000 (estimator families predict with these; exact families report them as descriptive statistics).

| Class | Holdout n | Mean abs error | Max abs error | Signed band | Within target |
| ----- | --------- | -------------- | ------------- | ----------- | ------------- |
| english | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |
| japanese | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |
| code | 5 | 0.00% | 0.00% | [0.00%, 0.00%] | yes |

| Sample | Class | Role | Chars | UTF-8 bytes | Self content | API total | Predicted | Error | Provenance |
| ------ | ----- | ---- | ----- | ----------- | ------------ | --------- | --------- | ----- | ---------- |
| en-01 | english | calibration | 167 | 167 | 167 | 174 | 174 | 0.00% | fixtured |
| en-02 | english | holdout | 236 | 236 | 236 | 243 | 243 | 0.00% | fixtured |
| en-03 | english | calibration | 271 | 271 | 271 | 278 | 278 | 0.00% | fixtured |
| en-04 | english | holdout | 363 | 365 | 365 | 372 | 372 | 0.00% | fixtured |
| en-05 | english | calibration | 259 | 259 | 259 | 266 | 266 | 0.00% | fixtured |
| en-06 | english | holdout | 309 | 309 | 309 | 316 | 316 | 0.00% | fixtured |
| en-07 | english | calibration | 300 | 302 | 302 | 309 | 309 | 0.00% | fixtured |
| en-08 | english | holdout | 235 | 237 | 237 | 244 | 244 | 0.00% | fixtured |
| en-09 | english | calibration | 309 | 309 | 309 | 316 | 316 | 0.00% | fixtured |
| en-10 | english | holdout | 320 | 320 | 320 | 327 | 327 | 0.00% | fixtured |
| ja-01 | japanese | calibration | 78 | 228 | 228 | 235 | 235 | 0.00% | fixtured |
| ja-02 | japanese | holdout | 83 | 249 | 249 | 256 | 256 | 0.00% | fixtured |
| ja-03 | japanese | calibration | 85 | 255 | 255 | 262 | 262 | 0.00% | fixtured |
| ja-04 | japanese | holdout | 148 | 440 | 440 | 447 | 447 | 0.00% | fixtured |
| ja-05 | japanese | calibration | 108 | 324 | 324 | 331 | 331 | 0.00% | fixtured |
| ja-06 | japanese | holdout | 86 | 254 | 254 | 261 | 261 | 0.00% | fixtured |
| ja-07 | japanese | calibration | 120 | 358 | 358 | 365 | 365 | 0.00% | fixtured |
| ja-08 | japanese | holdout | 94 | 282 | 282 | 289 | 289 | 0.00% | fixtured |
| ja-09 | japanese | calibration | 90 | 270 | 270 | 277 | 277 | 0.00% | fixtured |
| ja-10 | japanese | holdout | 136 | 384 | 384 | 391 | 391 | 0.00% | fixtured |
| code-01 | code | calibration | 204 | 204 | 204 | 211 | 211 | 0.00% | fixtured |
| code-02 | code | holdout | 477 | 477 | 477 | 484 | 484 | 0.00% | fixtured |
| code-03 | code | calibration | 151 | 151 | 151 | 158 | 158 | 0.00% | fixtured |
| code-04 | code | holdout | 268 | 268 | 268 | 275 | 275 | 0.00% | fixtured |
| code-05 | code | calibration | 182 | 182 | 182 | 189 | 189 | 0.00% | fixtured |
| code-06 | code | holdout | 310 | 310 | 310 | 317 | 317 | 0.00% | fixtured |
| code-07 | code | calibration | 251 | 251 | 251 | 258 | 258 | 0.00% | fixtured |
| code-08 | code | holdout | 297 | 297 | 297 | 304 | 304 | 0.00% | fixtured |
| code-09 | code | calibration | 227 | 227 | 227 | 234 | 234 | 0.00% | fixtured |
| code-10 | code | holdout | 354 | 354 | 354 | 361 | 361 | 0.00% | fixtured |

**Edge-case probes**

- Anthropic tool-definition overhead (count_tokens with vs. without one tool): not measured on this path
- Anthropic image tokens for a —×— PNG (published formula width×height/750): not measured on this path
- Gemini image tokens for the same PNG (documented 258 per image up to 384px): not measured on this path
- edge probes run only on the real path (they read live count endpoints)

Probe spend of this benchmark stage: $0.0000 (count endpoints are unbilled; the usage probes bill minimal completions).

The complete run record is committed as [`token-metering-comparison.data.json`](./token-metering-comparison.data.json): per-sample counts, fitted calibrations, per-class bands, edge-probe readings, and spend.

Generated: 2026-01-01T00:00:00.000Z

**過去の調査 / Past surveys in this series**

Earlier dated surveys of this topic, newest first — each a complete article for its run.

- [2026-07-17T03:02:34.699Z](./history/token-metering/2026-07-17T03-02-34-699Z/token-metering-comparison)
