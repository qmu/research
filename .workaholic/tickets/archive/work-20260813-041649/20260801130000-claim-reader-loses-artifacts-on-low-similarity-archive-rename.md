---
created_at: 2026-08-01T13:00:00+09:00
status: abandoned
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort:
commit_hash:
category:
mission:
depends_on:
claim: work-20260813-041649
---

# A claimed ticket is re-offered as claimable when its archive rename falls below git's similarity threshold — the double-pick the claim protocol exists to prevent

## Overview

Observed live on 2026-08-01. After a `/drive` run archived the ticket for unit
`batch-20260801120832`, the closing survey **re-offered that same ticket** as
unclaimed backlog while the unit was still in flight:

```
$ list-claims.sh
batch-20260801120832 work-20260801-120832 artifacts=0     <-- lost its artifact list

$ plan-units.sh
backlog offered: 1
   - 20260723094000-guard-exporter-against-downstream-overwrite.md   <-- the claimed ticket
```

Every other unit in the same run reported its artifacts correctly. This run did
not double-pick it, because one runner cannot race itself — but a second runner,
or the next tick, would have claimed and re-driven work that was already done.

## Mechanism (verified)

`archive.sh` **renames** a driven ticket (`todo/<user>/X.md` →
`archive/<branch>/X.md`), and the claim reader maps old→new with a tree-to-tree
diff so it can still find the `claim:` stamp at the file's *current* path. That
mapping depends on git detecting the move as a **rename**.

Git's default rename detection requires ~50% similarity. The archive commit here
scores **30%**:

```
$ git show --name-status 0cfb3c2          # default detection
A    .workaholic/tickets/archive/work-20260801-120832/20260723094000-....md
D    .workaholic/tickets/todo/a-qmu-jp/20260723094000-....md

$ git show --name-status --find-renames=20% 0cfb3c2
R030 .workaholic/tickets/todo/a-qmu-jp/20260723094000-....md  →  .../archive/...
```

At default thresholds the move reads as an unrelated **add + delete**, the
old→new mapping finds nothing, and the artifact drops out of the claim.

**Why this ticket and not the others:** `/drive` appends a `## Final Report` to
the ticket before archiving. This ticket's body was short (~40 lines) and the
appended report was long (~60 lines), so the archived file shares under a third
of its content with the original. The longer tickets in the same run stayed above
the threshold and mapped correctly. So the trigger is not the ticket — it is the
**ratio of appended report to original body**, which means short tickets with
thorough Final Reports are the exposed case. That is a common, and desirable,
shape.

This is the same class of defect the reader already fixed once (the 2026-07-30
"every batch unit silently lost its whole artifact list the moment its first
ticket was archived"). The tree-to-tree diff fixed *chained* renames; it did not
fix renames git declines to call renames.

## Impact

- **A live unit's work is offered to another runner.** This is precisely the
  double-pick the claim protocol exists to prevent, and it is silent — the survey
  reports the ticket as ordinary unclaimed backlog with no warning.
- **It is not self-correcting.** The stamp is on the branch and the reader cannot
  see it, so every subsequent survey re-offers the ticket until the unit merges.
- **The reader's own degradation rule is inverted here.** `list-claims.sh` is
  designed to *over*-report claims when uncertain (a stale reader merely makes a
  runner wait); this failure makes it *under*-report, which is the unsafe
  direction.

## Key Files

- `plugins/workaholic/skills/drive/scripts/lib/claims.sh` — the shared scan; the
  tree-to-tree diff that builds the old→new path mapping.
- `plugins/workaholic/skills/drive/scripts/archive.sh` — performs the rename and
  carries the `claim:` stamp along.
- `plugins/workaholic/skills/drive/scripts/plan-units.sh` — subtracts claimed
  artifacts from the offer; it consumed the incomplete list.

## Policies

- `workaholic:implementation` / `policies/observability.md` — a coordination
  reader that silently under-reports is the masked-failure state the policy
  forbids: the survey looked healthy and was wrong.
- `workaholic:implementation` / `policies/test.md` — the existing regression
  tests pin the rename-carrying behaviour but evidently at similarities git still
  classifies as renames; the low-similarity case needs its own fixture.
- `workaholic:operation` / `policies/ci-cd.md` — an unattended fleet depends on
  this reader for correctness, not convenience.

## Implementation Steps

1. **Stop relying on similarity.** Pass an explicit low threshold
   (`git diff --find-renames=10%` or `-M10%`) wherever the mapping is computed,
   or better, stop inferring the move entirely: the archived path is
   deterministic (`archive/<branch>/<same-basename>`), so the reader can match on
   **basename** within the claim's own branch rather than on content similarity.
   Basename matching is exact and cannot degrade with report length.
2. **Make the loss loud if it happens anyway.** A claim commit that stamped N
   artifacts but resolves to fewer at the tip is a detectable inconsistency;
   report it (`artifacts_unresolved`) instead of silently returning a short list.
   A reader that cannot account for a stamp it knows was written must not answer
   "unclaimed".
3. **Consider `--find-copies-harder`-free correctness**: whichever mechanism is
   chosen must not depend on git heuristics that vary with content size.

## Quality Gate

- **Regression fixture at low similarity**: a claim whose ticket is archived with
  a Final Report that leaves under 30% of the original body still resolves its
  artifact, and `plan-units.sh` does **not** re-offer that ticket. Assert on the
  resolved artifact list, not merely on the exit code.
- The reproduction above is the acceptance test: archive a short ticket with a
  long appended report, then confirm `list-claims.sh` reports `artifacts=1` and
  the survey's `backlog` does not contain it.
- A claim whose stamped artifacts cannot all be resolved at the tip reports the
  discrepancy rather than a silently short list.
- Existing claim/resume/release tests stay green, including the chained-rename
  case fixed on 2026-07-30 — that fix must not regress.

## Final Report

Verified fixed upstream. No change was needed in this repository, and none was made.

The double-pick this ticket reported is closed by exactly the mechanism it asked
for. `skills/drive/scripts/lib/claims.sh` now resolves a claimed artifact two
ways: the `git diff --find-renames` map first, and — when that map misses — an
exact **by-filename** lookup. The header comment at lines 249-273 states the
cause in the ticket's own terms: `--find-renames` pairs a delete with an add only
above 50% similarity, and an appended `## Final Report` can push a short ticket
under that bar, so the archive rename goes unmapped and the claim reports zero
artifacts.

The fallback is scoped rather than general, and the scoping is the careful part:

- it applies **only to ticket paths**, where the `YYYYMMDDHHMMSS-slug.md` rule
  makes a basename unique in the tree by construction, and
- **only when the basename resolves to exactly one file**. `mission.md` is the
  counter-example the comment names to fix that scope — its basename is shared by
  every mission, so an unscoped basename fallback would resolve one mission's
  claim onto another's file.

Both halves are live in the read path (lines 440-457: the rename map, then the
by-filename resolution when it missed).

The ticket's second observation — that an empty artifact list is two failures at
once, a re-offered ticket *and* a drained unit called resumable — is recorded in
`skills/drive/reference/claims.md` as the reason the reader's behaviour on an
empty list is pinned by tests.

### Discovered Insights

- **Insight**: A similarity-threshold rename detector is not a safe foundation
  for a correctness-critical identity mapping, because the threshold depends on
  *content* the workflow itself mutates — here, the run appends a Final Report to
  the very file whose rename must be tracked.
  **Context**: The workflow made its own detection fail. Any second resolution
  path has to key on something the workflow does not touch; the filename is that
  thing, which is why the fix works.
- **Insight**: The fallback's value is entirely in its scope. A general
  basename lookup would have traded a missed claim for a *wrong* claim, which is
  strictly worse — under-reporting makes a runner wait, mis-resolving makes two
  runners drive the same unit.
  **Context**: `mission.md` is the shared-basename case that forces the
  single-unambiguous-match rule.
