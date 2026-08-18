---
created_at: 2026-07-14T02:40:01+09:00
status: abandoned
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

## Blocked (2026-07-18 night drive)

Attempted, still externally blocked — no bootable sandbox provider credential
is reachable:

- **AWS unreachable**: `aws sts get-caller-identity` returns NoCredentials and
  the instance-metadata role list returns 404 (no IAM role attached), so the
  AWS Lambda microVM subject cannot be measured (and has no adapter yet anyway).
- **No provider tokens**: `packages/tech/.env` holds only LLM keys
  (OPENAI/ANTHROPIC/GOOGLE/XAI) and Cloudflare (ACCOUNT_ID/API_TOKEN). None of
  `FLY_API_TOKEN`/`FLY_APP_NAME`, `E2B_*`, `MODAL_*`, `VERCEL_*`, `DAYTONA_*`,
  `NORTHFLANK_*` are set, so the one landed adapter (Fly Machines) cannot boot.
- **Cloudflare is present but not a clean CI boot-timer**: the Cloudflare
  Sandbox SDK is a deployed-Worker + container binding, not a REST create-and-
  time endpoint like Fly Machines, so it has no `vendors/sandbox` adapter and
  standing up / tearing down that infra unattended is outside this drive's
  zero-orphan-resource scope.

Demonstrated the honest real path rather than skipping silently:
`npm run agent-vm:estimate` = 8 providers × 5 reps, ~$0.0004 compute
(order-of-magnitude, inside the $8 ceiling), and `--real` (to a scratch
OUTPUT_PATH) printed the missing-credential guidance and recorded all 8
providers `provenance: "unreachable"` — no boot, no spend, no fabricated
numbers, zero orphaned resources. Path stays: land a bootable provider token
→ `agent-vm:estimate` (≤ $8) → owner-approved `agent-vm:real`.

## Progress (2026-07-19 night drive) — second adapter landed (keyless)

Widened measured-probe coverage per this ticket's "Remaining" list (adapters
for E2B/Modal/Vercel/etc. as small `SANDBOX_ADAPTERS` entries):

- **Daytona adapter** `vendors/sandbox/daytona.ts` over the documented Daytona
  REST API (control plane `app.daytona.io/api`: create `POST /sandbox`, poll
  `GET /sandbox/{id}` until `started`, stop/start for warm reuse, force-delete
  teardown; toolbox exec `proxy.app.daytona.io/toolbox/{id}/process/execute`).
  Plain HTTP through an injectable transport (no Daytona SDK dep — no new
  `docs/dependency-decisions.md` entry needed), so boot/reuse/run/teardown are
  unit-tested without a live token (7 tests). Registered in `SANDBOX_ADAPTERS`
  (env `DAYTONA_API_KEY`); `apiReachable` flipped true for `daytona` and the
  committed fixture artifact regenerated (one line: `apiReachable` false→true;
  report md byte-stable). E2B was evaluated and deferred: its exec runs through
  `envd` on the sandbox host, not a clean control-plane REST endpoint, so it
  does not map to the boot/reuse/run/teardown port without live confirmation.
- Exact Daytona create-body / toolbox-exec response shapes are documented-but-
  unverified (same posture as the Fly adapter): confirmed on the first live run,
  and a wrong shape degrades to an honest `error` row (runner try/catch). Set
  `DAYTONA_API_KEY` (+ optional `DAYTONA_SNAPSHOT`/`DAYTONA_TARGET`) to boot.
- 574 tech tests + lint + typecheck green (raw exit 0); fixture-drift byte-clean.

## Blocked (2026-07-19 night drive)

Still externally blocked for a **real run** — no bootable VM-provider credential
is present this run: `FLY_API_TOKEN`/`FLY_APP_NAME`, `DAYTONA_API_KEY`, `E2B_*`,
`MODAL_*`, `VERCEL_*`, `NORTHFLANK_*` all unset (`.env` holds only LLM keys +
Cloudflare account/token). No monetary spend authorized. Reason recorded:
**no reachable VM provider — FLY_API_TOKEN/FLY_APP_NAME (and now DAYTONA_API_KEY)
absent this run.** The keyless adapter above is the productive work this drive;
`--real` still records every provider `unreachable` with zero boots/spend.

### Spend approval (2026-07-22)

Spend approved by the developer (a@qmu.jp) 2026-07-22 in the /mission planning
session. Remaining gate is environmental credentials only — FLY_API_TOKEN +
FLY_APP_NAME for the Fly.io probe (024001/024004) and an LLM API key for the
pipeline translation (024005). The `--real` path self-reports missing
credentials and records unreachable rows, so the drive proceeds and measures
whatever providers are reachable.
