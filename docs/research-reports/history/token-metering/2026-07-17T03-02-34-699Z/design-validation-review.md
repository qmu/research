# Design-validation review — first real trial (guideline step 3)

Trial: `2026-07-17T03:02:34.699Z`, one pass over sample manifest tm-v1
(30 samples: 10 English / 10 Japanese / 10 code, split 5 calibration +
5 holdout per class), instrument version 1. 4/4 family rows `measured`.

## Did the measurement work as designed?

Yes, with no instrument fixes needed during the trial:

- **Exact self-BPE reproduced the billed counts exactly.** The o200k_base
  self-count matched `gpt-5.5`'s `usage.prompt_tokens` on all 30 samples with
  a constant wrapper overhead of 6 tokens (holdout error 0.00% everywhere),
  and the Qwen2.5 `tokenizer.json` self-count matched the Workers AI
  `usage.prompt_tokens` on all 30 samples with a constant overhead of
  29 tokens (0.00% everywhere). Both vocabularies were fetched from their
  published sources at run time; no tokenizer library was involved.
- **The estimator families measured as estimators, as designed.** Anthropic
  count_tokens and Gemini countTokens returned counts for all 60 reads
  (unbilled), and the affine per-class calibration fitted without failures.
- **Edge probes all returned.** Anthropic one-tool overhead 483 tokens;
  Anthropic 300×300 PNG 124 tokens (documented width×height/750 = 120;
  +4 within the count's rounding behavior); Gemini 300×300 PNG 1089 tokens —
  NOT the documented flat 258 for ≤384px, a finding recorded as-is for
  follow-up against the current Gemini 3 documentation.

## Did the metrics discriminate between subjects?

Yes. The holdout error separates the two counting methods sharply:

- **Exact families: 0.00% mean / 0.00% max** (OpenAI, OSS/Qwen) — the ±5%
  target is met with margin.
- **Estimator families miss ±5% and the bands are stated:** Anthropic Claude
  mean 8.54% / max 16.24% (english [-10.74%, +15.56%], japanese
  [-11.11%, +12.88%], code [-7.80%, +16.24%]); Google Gemini mean 6.60% /
  max 15.73% (english [-11.11%, +8.89%], japanese [-15.73%, +10.96%], code
  [-8.33%, +5.88%]). A cross-tokenizer ratio predictor (Claude/Gemini count
  per o200k self-count) and a two-feature least-squares variant were both
  checked against the same holdout and did not reach ±5% either (the
  two-feature fit overfits at n=5 per class), so the shipped calibration
  stays the simplest per-class affine model with its band stated, and
  post-hoc usage-field accounting is the recommended metering path for the
  unpublished-tokenizer providers.

A pricing-relevant side finding: on identical texts, Claude's counted tokens
run ≈1.5–1.6× the o200k count for English and code (ja-01: 76 vs 65+wrapper;
en-01: 54 vs 32+wrapper), so per-MTok price alone does not order per-request
cost across providers.

## Did the cost match the estimate?

Yes. Estimate ~$0.032 for the benchmark; actual $0.028 (OpenAI $0.026,
Workers AI $0.002, count endpoints and edge probes $0). With the insights
call and the two Japanese translations (this measured frame and the canonical
fixture page), the full trial stays in the sub-dollar range, far inside the
mission's $5 approved ceiling.

## Cadence confirmation

Quarterly, as proposed, with off-cadence triggers on a new tokenizer
generation or a published pricing-structure change. Tokenizers move with
model generations, not weekly; the trial is cheap enough that an off-cadence
re-validation is never cost-gated.
