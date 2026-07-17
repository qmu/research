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
