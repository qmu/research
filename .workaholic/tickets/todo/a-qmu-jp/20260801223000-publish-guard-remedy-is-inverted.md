---
created_at: 2026-08-01T22:30:00+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort:
commit_hash:
category:
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
