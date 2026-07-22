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

## Policies

- **proposal-first / owner-gated real run** — 課金を伴う実行はオーナーの明示
  承認後にのみ行う。`--estimate` が合意レンジ（$1–$8）内であることを事前確認。
- **keyless fixture 不可侵** — CI が依存する fixture 経路はバイト安定・キー
  レスのまま保つ。プローブ失敗は `error` 行として正直に記録し、数値を捏造しない。
- **workaholic:implementation** — ベンダー型は `vendors/sandbox` の
  anti-corruption 境界に留め、`domain/` に漏らさない。新規依存は
  `docs/dependency-decisions.md` に記録する。
- **teardown 保証** — 起動したサンドボックスはエラー経路でも必ず破棄する
  （孤児リソースゼロ、RAG と同じ保証）。

## Implementation Steps

1. Pick the first 2–3 providers with the simplest credential story (e.g. E2B,
   Modal, Fly Machines) and add a `vendors/sandbox/<provider>.ts` adapter each.
2. Boot/reuse/run/teardown honestly; never fake a number — surface probe errors
   as `error` rows.
3. Wire the real factory in `run.ts`; set `apiReachable: true` per landed adapter.
4. Refine `estimateAgentVm` to include per-boot minimums; keep `--estimate`
   truthful against the ceiling.
5. Keep the keyless fixture path byte-stable and CI green.

## Quality Gate

- 到達可能プロバイダーごとに `vendors/sandbox/<provider>.ts` アダプターが実装
  され、`apiReachable` が実態と一致している。
- `--real` 実行が boot/reuse/task/teardown を正直に記録し、失敗は `error` 行と
  して現れる（数値の捏造ゼロ）。実行後に孤児サンドボックスが残らない。
- `--estimate` が per-boot 最低課金を含めて合意レンジ（$1–$8）と照合できる。
- 全テスト・lint が緑のまま、keyless fixture 経路がバイト安定。
- 新規依存があれば `docs/dependency-decisions.md` に記録されている。

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

## Blocked (2026-07-17 drive)

Skipped this drive — externally blocked, not faked complete:

- **No provider credentials in the environment**: `packages/tech/.env` does not
  exist and no `FLY_*`/`E2B_*`/`MODAL_*`/`VERCEL_*` variables are set, so the
  live confirmation of the Fly adapter cannot run.
- **No monetary spend authorized for this run**: live boots bill the provider
  account (and several providers require a funded account), which is outside
  this drive's approval. The developer's 2026-07-15 unblock (provide
  credentials) has not yet materialized in the environment.

The keyless framework is already merged (`42bb286`); the publish wiring landed
this drive (#024002), so once tokens appear the path is
`npm run agent-vm:estimate` (must be ≤ $8) → owner-approved `agent-vm:real`.

### Spend approval (2026-07-22)

Spend approved by the developer (a@qmu.jp) 2026-07-22 in the /mission planning
session. Remaining gate is environmental credentials only — FLY_API_TOKEN +
FLY_APP_NAME for the Fly.io probe (024001/024004) and an LLM API key for the
pipeline translation (024005). The `--real` path self-reports missing
credentials and records unreachable rows, so the drive proceeds and measures
whatever providers are reachable.
