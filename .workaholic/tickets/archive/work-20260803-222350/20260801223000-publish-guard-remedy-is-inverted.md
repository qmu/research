---
created_at: 2026-08-01T22:30:00+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort:
commit_hash:
category: Changed
mission:
depends_on:
claim: work-20260803-222350
---

# The publish guard's documented "keep the downstream text" remedy hands the file back to the exporter

## Overview

`scripts/publish-research.sh` (merged in PR #71) skips a destination it cannot
prove it wrote, and tells the operator:

> re-run with `--force` to let the generated text win, or record the
> destination's hash in `scripts/publish-ledger.tsv` to **keep the downstream text**.

The second remedy does the opposite of what it says. Recording the destination's
current hash makes the next run take the `hash matches the ledger` branch —
`scripts/publish-research.sh:233-237` — which is the *copy* branch, described in
the header as "untouched since our emit". So the very next `copy --all`
overwrites the downstream-authored prose the operator was trying to protect, and
does it silently, because the guard now believes the exporter owns the file.

Encountered on 2026-08-01 while shipping PRs #68–#76: the guard correctly skipped
`docs/llm-foundation-research/image-generation.md` (downstream carries the real
2026-07-17 trial article; the repo source is a keyless `trials: 0` regeneration)
and `docs/llm-foundation-research/agent-vm-comparison.md` (downstream carries
hand-edited prose, `provenance: authored-fixture-translation`). The developer
ruled "keep the downstream text". Following the script's own instruction would
have destroyed both on the next publish.

## Current behavior

The ledger records exactly one fact per destination — *the hash this exporter
last emitted* — and the guard derives ownership from it. There is no way to
express *"this destination is downstream-owned; never write it"*. The only state
that preserves downstream text is **no ledger entry at all**, which the guard
re-reports as a loud skip on every run. Permanent protection and a permanent
warning are the same state.

## Expected behavior

An explicit, committed downstream-owned marker, distinct from "last emitted
hash". A destination marked downstream-owned is skipped **quietly** (or reported
as an intentional exclusion rather than an unresolved divergence), and `--force`
alone should not silently override it.

## Steps

1. Extend the ledger with a third state — e.g. a sentinel in the hash column
   (`-`/`downstream`) or a sibling `publish-owners.tsv` — meaning "qmu-co-jp owns
   this destination".
2. Branch on it before the hash comparison in the ownership check
   (`publish-research.sh:225-254`): downstream-owned means skip, reported as an
   intentional exclusion, not as a divergence to resolve.
3. Correct the header text (lines 48-58) and the skip message (lines 249-251) so
   the documented remedy matches the code. This is the part that actively misled
   an operator.
4. Extend `scripts/check-publish-guard.sh` with the regression: mark a
   destination downstream-owned, run `copy`, assert the destination bytes are
   unchanged — and assert the same across two consecutive runs, which is exactly
   what the current remedy fails.
5. Record `image-generation.md` and `agent-vm-comparison.md` as downstream-owned
   once the mechanism exists. Until then they must stay **unrecorded**, which is
   the only state that protects them.

## Policies

- `workaholic:implementation` / **objective-documentation** — a tool's own
  instruction is documentation, and this one is not merely vague but factually
  inverted. Correcting the text is as load-bearing as correcting the branch.
- `workaholic:implementation` / **fail-fast, machine-checkable gaps** — the
  ownership rule is currently enforceable in only one direction. The
  downstream-owned state must be expressible in committed data and asserted by
  `check-publish-guard.sh`, not held in an operator's memory.
- `workaholic:operation` / **ci-cd** — the state to prevent is a green,
  quiet-looking indicator that does not mean what a reader assumes. A guard that
  silently reverses its protection on the second run is exactly that.
- `docs/adr/0003-*` — the one-directional publish boundary between this
  repository and `qmu-co-jp`. The rule stands; only its enforcement is defective.

## Quality Gate

**Acceptance criteria**

1. A destination can be marked downstream-owned in committed data, and the mark
   is distinguishable from "last emitted hash".
2. `scripts/publish-research.sh copy --all` leaves a downstream-owned
   destination byte-identical across **two consecutive runs** — the scenario the
   present remedy fails.
3. A downstream-owned destination is reported as an intentional exclusion, not
   as an unresolved divergence, so a clean publish run produces no misleading
   "authored downstream" warning.
4. `--force` does not silently overwrite a downstream-owned destination; it
   requires its own explicit opt-out, or the mark must be removed first.
5. The script header (lines 48-58) and the skip message (lines 249-251) describe
   what the code actually does. No instruction remains that would destroy the
   text it claims to protect.
6. `image-generation.md` and `agent-vm-comparison.md` are marked downstream-owned
   and stop appearing as skips.

**Verification method**

`make publish-guard` — extend `scripts/check-publish-guard.sh` with the
two-consecutive-runs assertion for criterion 2 and a `--force` assertion for
criterion 4, both against a scratch fixture rather than the real sibling
checkout. Mutation-test them the way the existing 9 assertions were: neutralise
the new branch and confirm the added assertions fail.

**Gate that must pass**

`make publish-guard` exit 0 (it already runs in `ci.yml`), plus `make gate`,
`packages/tech` lint and tests, and the VitePress docs build — all with bare,
unmasked exit codes.

## Considerations

- Do not "fix" this by recording the two hashes today. That is the inverted
  remedy this ticket exists to remove.
- The image-generation case is the one with real content at stake: the downstream
  article carries a measured trial (`trials: 1`) while the repo source is a
  keyless regeneration, so an overwrite is a factual regression in a published
  article, not a formatting change.
- Related: `docs/adr/0003-*` owns the repo boundary; the ownership rule stated in
  the script header is correct and should survive unchanged — only its
  enforcement and its instructions need repair.

## Final Report

Driven 2026-08-03 on `work-20260803-222350` (unit `batch-20260803222350`).

### What the defect was

The ledger recorded exactly one fact per destination — the hash this exporter
last emitted — and the guard derived ownership from it. "qmu-co-jp owns this
file" was therefore inexpressible, so the skip message's second remedy ("record
the destination's hash … to keep the downstream text") named the one action that
guarantees the opposite: recording the hash satisfies the *copy* branch's
precondition, and the next run overwrites the protected prose. The only state
that preserved downstream text was **no entry at all**, which re-reported itself
as an unresolved divergence forever — permanent protection and a permanent
warning were the same state.

### What changed

The hash column now carries two kinds of fact, and the distinction is the fix:

| value | kind | meaning |
| ----- | ---- | ------- |
| a sha256 | observation | this is the text we last emitted |
| `downstream` | decision | qmu-co-jp owns this file; never write it |

- The decision is read **first**, short-circuiting the hash comparison, so a
  marked destination is never classified as a divergence. Its content is
  irrelevant — the mark holds whether the file matches the source, differs, or
  is absent.
- It is reported on stdout as `downstream-owned (excluded)` and counted
  separately from skips, so a clean publish run emits no misleading "authored
  downstream" warning.
- `--force` no longer reaches a marked destination. `--force-downstream-owned`
  is its own deliberate opt-out and **keeps** the mark, because one override is
  not a revocation.
- `mark-downstream <dest-path>…` sets the mark, so the corrected instruction is
  executable rather than a hand-edit of a TSV — the shape of instruction that
  got followed wrongly to begin with.
- The script header (the part that actively misled an operator) and the skip
  message now describe what the code does, and state explicitly why recording
  the hash is the wrong remedy.

`image-generation.md` and `agent-vm-comparison.md` are marked. Downstream carries
the measured 2026-07-17 trial article and hand-edited prose respectively; this
repo's sources are a keyless `trials: 0` regeneration and an
`authored-fixture-translation`.

### Acceptance criteria

| # | criterion | evidence |
| - | --------- | -------- |
| 1 | ownership expressible in committed data, distinct from a hash | `downstream` sentinel; asserted |
| 2 | byte-identical across **two consecutive** runs | assertion 9 — see below |
| 3 | reported as an intentional exclusion, not a divergence | assertion 10 |
| 4 | `--force` does not silently overwrite; separate opt-out | assertions 11, 13 |
| 5 | header + skip message match the code | header lines 45-78, skip message |
| 6 | the two pages stop appearing as skips | real-checkout dry-run: 0 loud skips |

### Verification

`make publish-guard` — 16 assertions, extended from 9, all green.

Assertion 9 is the load-bearing one: **the second run** is what destroyed the
text under the old remedy, so a single-run check would have passed throughout
the defect's entire life. Mutation-tested by reintroducing the original defect
shape (`ledger_record` on the exclusion path, so run 2 sees "hash matches the
ledger"): assertion 9 fails, as it must. Three further mutations — the mark never
recognised, `--force` collapsed into the mark's opt-out, and the override
revoking the mark — each fail exactly the assertion that should catch them, and
each was checked to have actually applied before its result was read.

Gates, bare unmasked exit codes: `make gate` 0, `make publish-guard` 0,
`packages/tech` lint 0 / test 0 / build 0, VitePress `npm run build` 0.

Criterion 6 verified with `copy --all --dry-run` against the real
`../qmu-co-jp`: both pages report `downstream-owned (excluded)` and the whole
plan yields **0** `SKIPPED (authored downstream)` lines.

### Concerns carried forward

- Reclaiming a destination for the exporter means editing the ledger row by
  hand; there is no `unmark-downstream`. Deliberate — revoking a decision should
  not be one flag away — but worth a command if it recurs.
- `../qmu-co-jp` currently has uncommitted modifications to
  `llm-accuracy-comparison.md` and `llm-speed-comparison.md` from the 2026-08-01
  ship session. Untouched by this work (dry-run only), but they are unrecorded
  divergences someone must resolve — and this ticket's mechanism is now the
  correct way to resolve them if downstream should win.
