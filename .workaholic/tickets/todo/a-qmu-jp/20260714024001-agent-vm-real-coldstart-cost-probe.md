---
created_at: 2026-07-14T02:40:01+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Added
mission: periodic-research-target-compare-agent-vm-solutions-lambda-microvms-etc
depends_on: [20260714005157-kickoff-propose-periodic-research.md]
---

# Build the real cold-start / cost probe adapters behind vendors/sandbox

## Overview

The keyless `agent-vm` skeleton (registry, `vendors/sandbox` port + fixture,
percentile/cost domain, fixture/estimate runner, 7-section report) landed with
the kickoff drive. This ticket implements the **real** probe: one
`vendors/sandbox` adapter per reachable provider that boots a sandbox, times
cold start over N repetitions, reuses a warm sandbox, runs `FIXED_TASK`, and
tears everything down with **zero orphaned resources** (mirror the RAG teardown
guarantee). Flip each provider's `apiReachable` as its adapter lands, and refine
`estimateAgentVm` to price per-boot minimums and account fees.

**Gated:** introduces provider SDK dependencies (record each in
`docs/dependency-decisions.md`) and needs credentials; do not run `--real`
before the proposal is approved and a cost `--estimate` is within the $1–$8
ceiling.

## Key Files

- `packages/tech/src/vendors/sandbox/types.ts` — the port to implement against.
- `packages/tech/src/vendors/sandbox/fixture.ts` — the keyless reference impl.
- `packages/tech/src/agent-vm/run.ts` — `defaultFactory(false)` currently returns
  `undefined` (unreachable); wire real adapters in here.
- `packages/tech/src/agent-vm/models.ts` — `apiReachable` flags + `FIXTURE_*`.

## Implementation Steps

1. Pick the first 2–3 providers with the simplest credential story (e.g. E2B,
   Modal, Fly Machines) and add a `vendors/sandbox/<provider>.ts` adapter each.
2. Boot/reuse/run/teardown honestly; never fake a number — surface probe errors
   as `error` rows.
3. Wire the real factory in `run.ts`; set `apiReachable: true` per landed adapter.
4. Refine `estimateAgentVm` to include per-boot minimums; keep `--estimate`
   truthful against the ceiling.
5. Keep the keyless fixture path byte-stable and CI green.

## Considerations

Teardown must be code-guaranteed even on error paths. Keep provider SDK types out
of `domain/`. Every new dependency goes in `docs/dependency-decisions.md`.

## Progress (2026-07-15)

Framework + first adapter landed (keyless, unit-tested):

- `vendors/sandbox/credentials.ts` — the adapter registry + `buildRealFactory(env)`
  that returns an adapter per provider whose tokens are present, else
  `unreachable`; `adaptersMissingCredentials(env)` reports exactly which env vars
  to set. Wired into `run-agent-vm.ts` `--real`.
- `vendors/sandbox/fly.ts` — **Fly.io Machines** reference adapter over the
  Machines REST API via an **injectable HTTP transport** (no Fly SDK dep), so
  create→poll→started timing and force-delete teardown are unit-tested without a
  live token. 10 tests; 339 total green. `apiReachable` flipped true for
  fly-machines.
- Verified `--real` with no tokens: prints the missing-cred guidance and records
  every provider `unreachable` (no spend, no crash).

**Remaining:** confirm the Fly adapter against live Fly on first run (exec/metric
shapes are documented-but-unverified); add adapters for E2B/Modal/Vercel/etc. as
their tokens arrive (each a small entry in `SANDBOX_ADAPTERS`). To run now, set
`FLY_API_TOKEN`, `FLY_APP_NAME` (and optionally `FLY_IMAGE`, `FLY_REGION`) in
`packages/tech/.env`, then `npm run agent-vm:estimate` → `agent-vm:real`.
