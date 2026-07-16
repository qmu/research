---
created_at: 2026-07-14T02:40:04+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Added
mission: periodic-research-target-compare-agent-vm-solutions-lambda-microvms-etc
depends_on: [20260714024001-agent-vm-real-coldstart-cost-probe.md]
---

# Run the first agent-vm validation trial and confirm the cadence

## Overview

The first real trial is a disposable proof of the design (guideline Step 3), not
a commitment to the cadence. With the real adapters in place, run
`npm run research -- agent-vm --estimate` then `--real`, archive the dated frame,
and review: do cold-start / cost discriminate between providers? did cost match
the estimate within the $1–$8 ceiling? Then confirm or revise the quarterly
cadence.

**Gated:** paid + credentialed. Owner-triggered only; `--estimate` must land
inside the ceiling before `--real`.

## Key Files

- `packages/tech/src/entrypoints/run-agent-vm.ts` — the runner (`--real`).
- `npm run research:archive -- agent-vm --generated-at <iso>` — archive the frame.
- The mission file — record the trial in the Changelog and check the acceptance.

## Implementation Steps

1. `npm run research -- agent-vm --estimate`; confirm ≤ ceiling.
2. `npm run research -- agent-vm --real` (owner-approved).
3. Archive the dated frame; review discrimination and cost-vs-estimate.
4. Confirm or revise cadence in the mission proposal; note it in the Changelog.

## Considerations

If the estimate exceeds the ceiling, stop for re-approval. Watch stderr for any
un-torn-down sandbox after a real run (teardown guarantee).
