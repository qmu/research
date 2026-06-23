# Response: Constructor → Architect (Round 1)

- **Author**: Constructor
- **Responding to**: `reviews/round-1-architect.md` (and the converged observations from `reviews/round-1-planner.md`)
- **Resolution**: **Accept and revise** → `designs/design-v2.md`

## Content

I accept the Architect's review in full and revise the design rather than escalate.
All cross-artifact feedback converged in the **design layer**, so a single
accept-and-revise resolves Step 3; `directions/direction-v1.md` and
`models/model-v1.md` stand approved unchanged.

### Required change accepted

- **Architect R2 — token-count normalization is the real work of the ACL.**
  Accepted as a required change. design-v2 specifies a **pure, unit-testable
  per-adapter `usage → Completion.outputTokens` mapping** (Anthropic
  `usage.output_tokens`, OpenAI `usage.completion_tokens`, Google
  `usageMetadata.candidatesTokenCount`) extracted into a helper so the field-name
  mapping is keyless CI regression instead of a manual check — and adds a
  **non-zero-token guard**: if a count is missing or zero, the runner downgrades
  that row to `measured: false` rather than letting `tokensPerSecond` silently
  corrupt Speed. This converts R2 from "documented manual check" to enforced.

### Folded-in observations (no escalation)

- **Architect R1 / Planner honesty gate** — fixtured (`measured: false`) rows render
  `n/a (fixtured)` for the three probe columns **and** suppress/mark the raw
  `elapsedMs`/`outputTokens` cells; `report.test.ts` asserts it. Honesty is rendered,
  not just typed.
- **Architect R5 / B2** — the probe-depth ladder and length target(s) are
  **runner-owned constants**, passed into `ComparisonResult`/the renderer; the
  graders stay single-target and pure. No correctness logic in the entrypoint.
- **Architect §3 typing** — `readonly` on `ComparisonRow.measurement` and across the
  domain types (the explicit `Readonly<{ measurement: Measurement }>` right-hand
  wrapper).
- **Planner direction** — a required **"Scope & limitations"** prose block in the
  report (single-sample, point-in-time, one run); a **publication ToS/trademark
  gate** with a structural home at the paused-real-run boundary, discharged by the
  `models.ts` official-name + cited-`source` work; and an explicit
  **paused-real-run acceptance evidence** definition (a one-key run that
  demonstrably flags the unkeyed providers as fixtured).

Everything else from design-v1 is carried over unchanged. After design-v2 lands,
the Consensus Gate is met (all reviews approved, this one revision accepted, no
escalation) and the plan is fixed for the Coding Phase.

## Review Notes

No escalation to the Planner is required; the Planner's observations are folded into
design-v2 in the same revision, and the two Planner-facing wording items from my
round-1 review (C-D1 "frontier/representative" phrasing, R-D2 ownership) are
addressed structurally here (the ToS/naming gate now has a build owner) and remain
optional wording for the Planner's own artifact.
