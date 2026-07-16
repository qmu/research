---
created_at: 2026-07-14T01:00:01+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 2h
commit_hash:
category: Added
mission: periodic-research-target-trend-catchable-ai-models-grok-perplexity
depends_on: [20260714010000-scaffold-trend-recency-instrument.md]
blocked_on: developer approval + scaffold ticket + provider keys (this run spends money)
---

# Trend-recency: first validation trial (--real) and design review

> **BLOCKED on approval, scaffold, and keys.** Do not run until the scaffold
> ticket lands and the developer approves the spend. This ticket makes paid API
> calls.

## Overview

Run the disposable first trial that proves the design (guideline step 3). Not a
cadence commitment — a validation of whether the metrics discriminate and the
cost matches the estimate.

## Implementation Steps

1. `npm run research -- trend-recency --estimate` (from `packages/tech`); confirm
   the figure sits under the approved ceiling ($30), else stop for re-approval.
2. Curate/generate the trailing-window probe set + ground truth; commit it to
   `docs/research-reports/trend-recency-history/`.
3. `npm run research -- trend-recency --real`.
4. Review: do grounded configs beat their ungrounded controls on
   `recencyAccuracy`? Do providers separate? Did cost match the estimate? Did
   citation resolution work against live URLs?
5. Record findings in the mission changelog; confirm or revise the monthly
   cadence.

## Considerations

If the metrics do not discriminate or cost overshoots, revise the design before
committing to recurrence. Keep the trial narrow first if the developer chose the
"two surfaces + controls" trial-1 scope in the proposal's open questions.
