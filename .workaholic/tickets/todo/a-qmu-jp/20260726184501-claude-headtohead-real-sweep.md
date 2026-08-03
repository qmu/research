---
created_at: 2026-07-26T18:45:01+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 2h
commit_hash:
category: Added
depends_on: 20260726184500-claude-comparison-registry-add-opus-5.md
mission: support-newly-released-claude-models-in-the-llm-comparison
---

# Run the owner-approved real Claude head-to-head sweep and publish the refreshed comparison + generational delta

## Overview

With Opus 5 added and Opus 4.8 retained as its paired predecessor, run one real
head-to-head sweep so the article can state the generational delta with measured
numbers instead of a `not-measured` label.

**Spend is pre-approved: $15/run ceiling** (developer, 2026-07-26). The dry-run
estimate for the four current Anthropic models before Opus 5 was added was
**10 configs / ~110 API calls / ~$2.79 / ~17 min**; adding Opus 5 and correcting
the Fable 5 price to $10/$50 puts the expected figure around **$5**. Re-estimate
before spending — an estimate above the ceiling stops for re-approval rather than
being run.

## Implementation

1. **`--estimate` first** to confirm the current price against the ceiling:
   `npm run compare -- --estimate --models anthropic-claude-opus-5,anthropic-claude-opus-4-8,anthropic-claude-fable-5,anthropic-claude-sonnet-5,anthropic-claude-haiku-4-5`
   (adjust the id list to what the registry actually carries after the previous
   ticket). If the estimate exceeds $15, stop and report — do not run.
2. **Run the scoped sweep** (drop `--estimate`). Scoping to the Claude rows keeps
   the run inside the ceiling; the trade-off, which the report must state plainly,
   is that non-Claude rows keep their last real values rather than being
   re-measured in the same frame.
3. **Archive a dated frame** recording the exact Claude ids and prices that
   produced it.
4. **Recompose** the EN speed/accuracy pages and the generational-delta section
   from the measured frame; do not hand-edit the composed output.
5. **`npm run research:translate-report`** for the refreshed JP insights,
   including the delta narrative; regenerate the EN/JP indexes with
   `npm run research:site -- write-indexes`.
6. **Verify** the keyless `--fixture` recomposition is byte-identical, on a clean
   tree after committing (`check-fixture-drift` refuses to run with uncommitted
   `docs/research-reports`).

## Policies

- `workaholic:development` / `policies/overnight-ai.md` — the spend decision and
  the ceiling are pre-answered here so the run does not stop to ask mid-flight.
- `workaholic:implementation` / `policies/objective-documentation.md` — a cell is
  `measured` only when a real call returned; a scoped sweep must say which rows
  were re-measured and which carry forward, rather than letting the reader assume
  one frame measured everything.

## Quality Gate

Decided: real-run verification. The gate is the measured frame plus the
byte-identical keyless recomposition — the same pairing the Gemini round used.

**Acceptance criteria:**

- [ ] `--estimate` run and recorded before any spend; the figure is inside the
      $15 ceiling (or the run stopped for re-approval).
- [ ] Real sweep completed with every Claude config `measured` and zero errored
      rows, or each non-measured row carrying an honest `error` provenance and a
      stated cause.
- [ ] A dated frame is committed recording the exact model ids and prices used.
- [ ] EN comparison pages and the generational-delta section are recomposed from
      the measured frame and state, per metric, how Opus 5 compares to Opus 4.8
      plus a net verdict.
- [ ] The report states plainly which rows this frame re-measured and which
      carry forward from a previous frame.
- [ ] JP insights regenerated via `research:translate-report`; EN/JP indexes
      regenerated from the shared metadata (not hand-edited).
- [ ] Keyless `--fixture` recomposition is byte-identical, verified after commit
      on a clean tree; `npm test`, `npm run build`, `npm run lint` in
      `packages/tech` each exit 0.
