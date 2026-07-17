---
source_artifact: token-metering-comparison.real.data.json
source_commit: ec158df
insights_model: claude-sonnet-5
generated_at: 2026-07-17T03:02:34.699Z
trials: 0
provenance: llm-insights
---
The most decision-relevant split in this artifact is architectural, not vendor-specific: families that ship an exact, published tokenizer (OpenAI GPT via o200k_base-style BPE, and the open-weight Qwen2.5 stack) reproduce API-reported token counts with 0% mean and max absolute error on all three holdout classes (English, Japanese, code). Families whose vendors do not publish a current tokenizer (Anthropic Claude, Google Gemini) must fall back to a calibrated character-rate estimator, and both land well outside the artifact's own 5% accuracy target — Claude's holdout mean absolute error is 8.54% (max 16.24%, on code), and Gemini's is 6.6% (max 15.73%, on Japanese). None of the calibrated-estimator families meets `withinTarget`.

This is an observation about tokenizer transparency, not raw model quality: where vendors publish vocabulary and merge rules (or ship `tokenizer.json`), local pretokenization can exactly replicate server-side billing counts, because the counting logic itself is public. Where the tokenizer is undisclosed, any local estimator — however well calibrated — is only as good as its calibration sample, and the artifact shows that error is uneven across content classes: Claude's worst band is code (up to +16.24%) while Gemini's worst band is Japanese (up to -15.73% and +19.23% on individual calibration rows, e.g. en-05 at -26.39%), suggesting script/tokenization density (Japanese) and syntax-heavy text (code) are the harder cases for a byte/char-rate approximation regardless of vendor.

There's a cost/verifiability trade-off worth naming: for OpenAI and Qwen, "ground truth" required a real billed call (`usage-field-probe`), reflected in nonzero spend ($0.026 and $0.002 respectively in this run), because no free count-only endpoint exists. For Anthropic and Gemini, ground truth came from an unbilled `count-tokens`/`countTokens` endpoint ($0 spend), which is cheaper to query repeatedly but is precisely the reason no exact self-tokenizer exists yet — the vendor keeps the tokenizer itself opaque even while exposing a free counting service. So the practical choice is: pay a little to get exact, reproducible, offline-computable counts (OpenAI, open-weight), or count for free but accept an estimator with double-digit worst-case error against Anthropic/Google's own billed values.

Two edge probes are worth flagging as context, not comparison points: Anthropic's tool-use overhead measured 483 tokens and its image tokens 124 for a 300×300 image, versus Google's 1089 image tokens for the same dimensions — these are single measured data points in this artifact, not distributions, and shouldn't be read as general scaling laws for tool or image costs.

Finally, the practical caveat: the artifact does not state a trial count per sample (documented here as unspecified), all error figures come from one calibration/holdout split of 30 samples per family (10 English, 10 Japanese, 10 code), and the Claude/Gemini calibration coefficients (`tokensPerChar`, `overheadTokens`) are fit to this specific sample set — the reported error bands describe holdout performance on this run's samples only, not a guaranteed bound on arbitrary production text.
