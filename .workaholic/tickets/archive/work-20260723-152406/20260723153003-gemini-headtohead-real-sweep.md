---
created_at: 2026-07-23T15:30:03+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category: Added
depends_on: 20260723153002-gemini-generational-delta-insight.md
mission: support-newly-released-gemini-models-in-the-llm-comparison
status: deferred
---

> **DEFERRED — night run 2026-07-23 (drive-authorized, but NOT spent).**
> This paid sweep was **not run**. Both gate conditions blocked spend, so per the
> mission's Night-Mode floor the ticket is moved to `icebox/` unspent; tickets 1
> and 2 (registry refresh + generational-delta insight) are committed and green.
>
> **Blocker 1 — full-sweep estimate exceeds the ceiling.** `npm run compare --
> --estimate` (keyless dry run, 3 trials): **67 configs × probes → ~1407 API
> calls, ~$21.18, ~211 min**. The authorized ceiling is **$15/run**, so the
> standard full sweep must NOT run without a re-approved ceiling (≥ ~$22).
>
> **Blocker 2 — no provider API keys present.** `packages/tech/.env` is absent and
> `GOOGLE_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `XAI_API_KEY` /
> `PERPLEXITY_API_KEY` / `OPENROUTER_API_KEY` are all unset in the environment.
> Without at least `GOOGLE_API_KEY` the Gemini rows cannot be `measured` — the
> real path would fixture-and-flag them, never producing a measured delta.
>
> **Cheaper in-ceiling path recorded for the resume.** A Gemini-only scoped sweep
> `npm run compare -- --models
> google-gemini-3-6-flash,google-gemini-3-5-flash-lite,google-gemini-3-5-flash,google-gemini-3-1-flash-lite`
> estimates **12 configs → ~252 calls, ~$1.67, ~38 min** — well under $15. It
> measures the 4 paired Gemini rows (former + new Flash and Flash-Lite) under
> identical instrument-v2 conditions, which is all the generational-delta needs;
> the trade-off is that non-Gemini rows on the published pages stay at their last
> real values rather than being re-measured in the same frame.
>
> **What is already in place (so the resume is a run + publish, not a rebuild).**
> - Registry: `google-gemini-3-6-flash` / `google-gemini-3-5-flash-lite` are the
>   current Gemini tier with web-verified prices; the former `gemini-3.5-flash` /
>   `gemini-3.1-flash-lite` are retained and paired via `supersedes`/`supersededBy`
>   metadata (commit 5a8c391).
> - Insight: the generational-delta section renders in the split EN reports (§4
>   summary + §7 detail) and the combined report; on the keyless path it correctly
>   shows the `not-measured` label; on a measured frame it emits real per-metric
>   deltas + a mechanical net verdict (commit 1b5a2e6).
>
> **To resume (when keys are available and the ceiling covers the chosen path):**
> 1. `--estimate` again to confirm the current price.
> 2. Run the sweep — the ~$1.67 Gemini-scoped run if the $15 ceiling stands, or the
>    full ~$21.18 sweep only after the ceiling is re-approved.
> 3. Archive a dated frame recording the exact Gemini ids/prices; recompose the
>    EN speed/accuracy pages + the delta from the measured frame.
> 4. `npm run research:translate-report` for the refreshed JP insights (the delta
>    narrative included); regenerate the EN/JP indexes.
> 5. Verify the keyless `--fixture` recomposition is byte-identical.

# Run the owner-approved real head-to-head Gemini sweep and publish the refreshed comparison + delta

## Overview

With the registry refreshed (ticket 153001) and the generational-delta insight
built (ticket 153002), run the **real** `compare` sweep so the published LLM
speed/accuracy comparison shows the new Gemini generation with measured numbers,
and the generational-delta section quantifies the improvement over the former
Gemini under identical conditions.

The run is billable and proposal-first gated. The developer authorized it at a
**$15/run ceiling** in the 2026-07-23 `/mission` planning session — price with
`--estimate` first, then run within the ceiling.

## Scope decisions (developer, /mission planning session 2026-07-23)

- **Spend authorized: $15/run ceiling.** `--estimate` first; if the estimate
  exceeds $15, stop and re-approve rather than trimming conditions.
- **Identical conditions.** Run the standard instrument-v2 sweep with both former
  and new Gemini rows present; do not alter prompts/instrument/judge to save cost.
  Warm-start if it helps stay under ceiling, but never at the cost of comparability.
- Provenance honest: a row is `measured` only when the real API call returned;
  otherwise `fixtured`/`error`, labelled, never synthesized.

## Policies

- `workaholic:implementation` / `objective-documentation` — the published deltas
  come from a real measured frame; the dated frame records the exact Gemini model
  ids and prices that produced it.
- **Proposal-first** (`docs/research-development-guideline.md` step 3) — estimate,
  owner-approved ceiling, real run, dated frame, design-validation review.
- **No fabrication** — keyless recomposition of the published pages must be
  byte-identical to the measured frame's content; the fixture path stays $0.

## Implementation Steps

1. `--estimate` the sweep with the refreshed Gemini set; confirm it is within $15.
2. Run the real `npm run compare` sweep (both former + new Gemini, identical
   instrument-v2 conditions) within the ceiling.
3. Archive a dated frame under `docs/research-reports/history/...` with the
   design-validation review; regenerate the EN speed/accuracy comparison pages,
   the data artifact (`fixture:false`), and the generational-delta section from the
   measured frame.
4. JP: `research:translate-report` for the refreshed report + insights (the
   generational-delta narrative included).
5. Regenerate the EN/JP indexes; verify the keyless `--fixture` recomposition is
   byte-identical.

## Quality Gate

- Real sweep run within the $15 ceiling after an `--estimate` check; dated frame
  committed with the design-validation review and the exact Gemini ids/prices
  recorded.
- Published EN + JP comparison pages show the new Gemini measured, with the
  generational-delta section quantifying former→new improvement per tier/metric.
- Every measured cell is a real API result; keyless recomposition byte-identical;
  no fabricated cells.
- Per-package bare exit codes, run separately, no masking:
  `( cd packages/tech && npm test )`, `( cd packages/tech && npm run build )`,
  `( cd packages/tech && npm run lint )`.

## Considerations

- **qmu-co-jp publish** happens on the next `/ship` (the mission's last acceptance
  item) — this ticket produces the refreshed EN/JP Markdown the publish ticket
  copies; it does not edit `qmu-co-jp`.
- **Keys required.** The real sweep needs the provider API keys the shared
  `compare` sweep already uses; the `--real` path self-reports missing keys and
  records unreachable rows rather than fabricating.
- **Comparability across rounds.** Keep the instrument-v2 version stamp so this
  frame connects to prior comparison frames as the same series.
