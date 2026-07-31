---
created_at: 2026-07-23T15:30:02+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, UX]
effort:
commit_hash:
category: Changed
depends_on: 20260723153001-gemini-comparison-registry-add-new-models.md
mission: support-newly-released-gemini-models-in-the-llm-comparison
---

# Add a dedicated generational-delta insight — quantify how the new Gemini improved over the former, in EN + JP

## Overview

The developer wants to **see, explicitly, how the new Gemini generation improved**
over the one it replaced — not infer it from the comparison table. Building on the
former→new pairing metadata from ticket 20260723153001, add a dedicated
**generational-delta insight** to the shared `compare` topic: for each paired
tier (Gemini 3.5 Flash → 3.6 Flash, Gemini 3.1 Flash-Lite → 3.5 Flash-Lite),
compute the per-metric delta and render an explicit narrative.

This is a first-class output of the report, reused by future refresh rounds under
the same strategy (any provider's former→new pairing), not a one-off for Gemini.

## Scope decisions (developer, /mission planning session 2026-07-23)

- Insight style = **dedicated generational-delta**, quantified per metric (speed,
  accuracy, cost), with an explicit "what improved / what regressed / net verdict"
  narrative — chosen over relying on the generic sweep insight.
- Pairing source = the metadata added in ticket 20260723153001 (do not re-derive
  or hardcode which model supersedes which).
- Language = both EN report and JP insights carry the delta section.

## Policies

- `workaholic:implementation` / `objective-documentation` — the delta is real
  arithmetic over measured metrics (median latency, accuracy score, $/1M tokens);
  the narrative states the numbers, not adjectives. "Net verdict" is a mechanical
  rule over the per-metric deltas (e.g. improved if speed & accuracy both
  non-worse and neither cost nor either regresses beyond a stated threshold), not
  a hand-judgment.
- **No fabrication — provenance load-bearing.** A delta is only computed between
  two rows that are both `measured` in the same frame; if either side is
  `fixtured`/`error`, the delta is labelled not-measured, never synthesized.
- `workaholic:design` — the pairing is read from the registry metadata (one source
  of truth), so the insight generalizes to future former→new pairs automatically.

## Implementation Steps

1. Read the former→new pairing from the registry metadata (ticket 153001).
2. For each pair, compute per-metric deltas (speed, accuracy, cost) over the sweep
   data, guarding on both sides being `measured` in the same frame.
3. Derive the net verdict from a stated mechanical rule over the deltas.
4. Render the generational-delta section into the EN comparison report (§4/§7) and
   ensure it flows into the JP insights (`research:translate-report`).
5. Keyless fixture path: compute the delta over the fixture sweep so the section
   renders deterministically with no key and no spend; unit-test the pairing
   selection, the delta math, and the verdict rule (including the not-measured
   guard).

## Quality Gate

- The report contains an explicit per-tier former→new Gemini delta with real
  numbers for speed, accuracy, and cost, plus a mechanically-derived net verdict,
  in both EN and JP.
- Delta math is unit-tested, including the guard that refuses a delta when either
  side is not `measured`.
- Pairing is read from registry metadata, not hardcoded; adding a future pair
  requires no insight-code change.
- Keyless path renders deterministically (re-run → byte-identical).
- Per-package bare exit codes, run separately, no masking:
  `( cd packages/tech && npm test )`, `( cd packages/tech && npm run build )`,
  `( cd packages/tech && npm run lint )`.

## Considerations

- **Cost delta sign.** Be explicit about direction — cheaper is an improvement,
  and mixed outcomes (faster but pricier) must read as "mixed", not silently
  netted to "improved".
- **Saturation.** If accuracy is already saturated for both generations, say so
  (delta ≈ 0 is a finding, not a gap) — mirrors how other topics flag saturated
  metrics for a harder manifest.
- **Plain language.** Follow the repo terminology standard in the prose.
