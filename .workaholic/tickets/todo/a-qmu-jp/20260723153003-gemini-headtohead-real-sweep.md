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
---

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
