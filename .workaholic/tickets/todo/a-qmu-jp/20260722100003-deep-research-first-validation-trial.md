---
title: "First disposable validation trial within the Floor budget (ceiling ≈ $32)"
created_at: 2026-07-22T10:00:03+09:00
author: a@qmu.jp
status: todo
type: enhancement
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Added
mission: periodic-research-target-compare-deep-research-alike-apis
depends_on: [20260722100002-deep-research-metrics-and-graders.md]
---

# First disposable validation trial (Floor budget)

## Overview

With subjects reachable and metrics/graders implemented, this ticket runs the
first **disposable validation trial** (guideline Step 3). First price it, then run
it, then judge whether the metrics discriminate:

1. `npm run research -- deep-research --estimate` prices the trial FIRST and must
   land within the approved **Floor** tier (5 subjects × 4 questions × 1 rep = 20
   queries; ceiling **≈ $32**). An estimate above the ceiling stops for
   re-approval — do not run `--real`.
2. The first disposable `--real` validation trial runs within that budget. A
   subject whose key is absent records an honest **error / unreachable** row — no
   fabricated numbers.
3. Commit the run as a dated history frame under
   `docs/research-reports/history/deep-research/<timestamp>/` with a
   **design-validation review**: do the metrics discriminate between subjects, did
   cost match the estimate, and should the proposed monthly cadence be confirmed
   or revised.

This is a validation trial, not the recurring series; publishing is the next
ticket.

## Key Files

- `packages/tech/src/deep-research/entrypoints/` — the `--estimate` and `--real`
  runners.
- `docs/research-reports/history/deep-research/<timestamp>/` — the dated frame the
  archive step writes (`npm run research:archive -- deep-research --generated-at <iso>`).
- The mission `proposal.md` — the design-validation review confirms/revises its
  cadence + budget premises.

## Policies

- **proposal-first ゲートは充足済み** — 2026-07-22 に developer が Floor tier を
  承認。有償実行は本チケットでのみ許可され、`--estimate` が **≈$32 の Floor 天井**
  内であることを実行前に確認する。天井超過は再承認まで停止（[[proposal-first-gate-blocks-spend-not-scaffold]]）。
- **捏造ゼロ** — キー不在の subject は error/unreachable 行として正直に記録する。
  数値を作らない。
- **disposable validation** — 初回は使い捨て検証。メトリクスが subject を弁別する
  か、コストが見積りと一致したかをレビューし、cadence を確認/修正する。
- **artifact = 完全記録** — dated frame は英語 Markdown・data artifact・（後続の）
  日本語 Markdown を保持する（[[llm-comparison-real-history-in-repo]]）。

## Implementation Steps

1. Run `npm run research -- deep-research --estimate`; confirm the figure is within
   the Floor ceiling (≈ $32). If not, stop and escalate for re-approval.
2. Run the disposable `--real` validation trial within budget; capture honest
   error/unreachable rows for absent keys.
3. Archive the run as a dated history frame with
   `npm run research:archive -- deep-research --generated-at <iso>`.
4. Write the design-validation review (discrimination, cost-vs-estimate, cadence
   confirm/revise) into the frame / proposal.

## Quality Gate

- `cd packages/tech && npm test` の bare exit code が 0（`make` 非経由・非マスク）。
  lint 緑。
- `--estimate` が実行前に記録され、Floor 天井（≈$32）内であることが確認できる。
- `--real` 試行が予算内で完了し、キー不在 subject は error/unreachable として
  現れる（捏造ゼロ）。
- dated history frame が `docs/research-reports/history/deep-research/<timestamp>/`
  に存在し、data artifact が全メトリクスを保持する。
- design-validation review が弁別性・コスト整合・cadence 判断を記述している。

## Considerations

`--estimate` is the binding pre-flight gate; over-ceiling stops for re-approval.
Absent keys are honest error rows. This trial is disposable — its purpose is to
validate the instrument, not to seed the recurring series.
