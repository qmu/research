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

## Policies

- **proposal-first / owner-gated real run** — 課金を伴う実行はオーナーの明示
  承認後にのみ行う。`--estimate` が $8 の上限を超えたら停止して再承認。
- **guideline Step 3（validation trial）** — 最初の実トライアルは設計の
  使い捨て検証であり、cadence の確定・修正を mission に記録する。
- **workaholic:mission** — 完了時に mission.md の該当 Acceptance をチェックし
  Changelog に行を追記する。
- **teardown 保証** — 実行後に孤児サンドボックスがないことを確認する。

## Implementation Steps

1. `npm run research -- agent-vm --estimate`; confirm ≤ ceiling.
2. `npm run research -- agent-vm --real` (owner-approved).
3. Archive the dated frame; review discrimination and cost-vs-estimate.
4. Confirm or revise cadence in the mission proposal; note it in the Changelog.

## Quality Gate

- 承認上限（$8）内で real トライアルが1回完了し、日付付き履歴フレームとして
  `docs/research-reports/history/agent-vm/<timestamp>/` にコミットされている。
- コールドスタート/コストがプロバイダー間で判別可能かの design review と、
  cadence の確定・修正が mission.md の Changelog に記録されている。
- 実コストが `--estimate` と上限に照らして検証されている。
- 実行後に孤児サンドボックスがない（teardown 保証）。全テスト・ガードが緑。

## Considerations

If the estimate exceeds the ceiling, stop for re-approval. Watch stderr for any
un-torn-down sandbox after a real run (teardown guarantee).

## Blocked (2026-07-17 drive)

Skipped this drive — a real trial is **paid + credentialed + owner-triggered**,
and this run had no provider tokens in the environment and no spend
authorization. Depends on #024001's live confirmation; everything keyless it
needs (publish wiring #024002, trend composition #024003) is now merged, so the
first trial's frame will chart as soon as an owner runs
`research -- agent-vm --estimate` → `--real` with credentials.

## Blocked (2026-07-18 night drive)

Attempted, still blocked on the same root cause as #024001: no bootable sandbox
provider is reachable (AWS instance role absent; no Fly/E2B/Modal/Vercel/
Daytona/Northflank tokens; Cloudflare present but deploy-coupled). A `--real`
run therefore records every provider `unreachable`, which produces **no measured
cold-start/cost data** — so this trial's Quality Gate (cold-start/cost
*discriminate between providers*, cost verified against `--estimate` within the
$8 ceiling) cannot be satisfied and the quarterly cadence cannot yet be
validated. The estimate was run and recorded (~$0.0004 compute, inside the
ceiling); no boot occurred, so no spend and zero orphaned resources. Unblocks
the moment #024001 lands a bootable provider token.

## Blocked (2026-07-19 night drive)

Still blocked on the same root cause as #024001: **no reachable VM provider —
FLY_API_TOKEN/FLY_APP_NAME (and now DAYTONA_API_KEY) absent this run.** #024001
gained a second keyless adapter this drive (Daytona), widening the reachable set
once a token appears, but no VM-provider token is present, so a `--real` run
still records every provider `unreachable` and produces no measured cold-start/
cost data — this trial's Quality Gate (metrics *discriminate between providers*,
cost verified within the $8 ceiling) cannot be satisfied and the cadence cannot
yet be validated. No boot, no spend, zero orphaned resources. Unblocks the
moment #024001 has a bootable provider token.

### Spend approval (2026-07-22)

Spend approved by the developer (a@qmu.jp) 2026-07-22 in the /mission planning
session. Remaining gate is environmental credentials only — FLY_API_TOKEN +
FLY_APP_NAME for the Fly.io probe (024001/024004) and an LLM API key for the
pipeline translation (024005). The `--real` path self-reports missing
credentials and records unreachable rows, so the drive proceeds and measures
whatever providers are reachable.
