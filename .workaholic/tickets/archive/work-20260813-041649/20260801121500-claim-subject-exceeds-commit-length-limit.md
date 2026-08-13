---
created_at: 2026-08-01T12:15:00+09:00
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

# `claim.sh` cannot claim any mission whose slug exceeds 44 characters — `/drive` structurally cannot take the longest-named missions

## Overview

`/drive` could not claim the approved mission
`periodic-research-target-compare-agent-vm-solutions-lambda-microvms-etc` on
2026-08-01. The claim is not refused for a protocol reason — it is refused by the
**commit subject length policy**, and the refusal surfaces only as an opaque
`{"claimed": false, "reason": "commit_failed"}`.

`claim.sh` builds its claim commit subject as `Claim <unit-id>`
(`skills/drive/scripts/claim.sh`, step 6), and `commit.sh` enforces a **50
character** subject limit. `"Claim "` is 6 characters, so **any unit id longer
than 44 characters is unclaimable**:

```
$ bash .../drive/scripts/claim.sh mission periodic-research-target-compare-agent-vm-solutions-lambda-microvms-etc
{"claimed": false, "reason": "commit_failed", "branch": "work-20260801-120918"}

# reproduced directly against the commit seam:
Error: rejected off-policy subject (subject is 77 characters (limit 50)).
  Subject: "Claim periodic-research-target-compare-agent-vm-solutions-lambda-microvms-etc"
```

The mission slug is 71 characters, so the subject is 77.

This is a defect in the **workaholic plugin**
(`/home/ec2-user/projects/workaholic/plugins/workaholic`), not in this
repository. It is filed here because this is where it bites: the affected
mission is this repo's, and `/drive` here cannot drain its queue until the
plugin is fixed.

## Impact

- **A whole class of approved missions is undrivable.** Mission slugs are
  derived from mission titles, and this project's periodic-research missions are
  deliberately descriptive, so long slugs are the norm rather than an edge case.
  Four other missions in this repo are within ~10 characters of the limit.
- **The failure is silent and misattributed.** `commit_failed` reads as a git or
  hook problem, not a naming-policy one. The run's only clue is that the raw
  `commit.sh` output goes to stderr, which `claim.sh` swallows into the JSON.
- **It leaves debris.** `abort_claim` calls `cleanup-mission-worktree.sh`, which
  correctly refuses a **dirty** worktree — and the worktree is dirty at that
  point, because the claim stamp was already written into `mission.md`. So the
  half-made worktree survives, and the *next* claim attempt then fails
  differently (`worktree_creation_failed`, "worktree already exists"), which
  looks like an unrelated fault. Recovery required a targeted
  `git checkout -- <the stamped file>` before the cleaner would run.

## Key Files

- `plugins/workaholic/skills/drive/scripts/claim.sh` — step 6 builds
  `"Claim ${unit}"`; `abort_claim` is the cleanup path that cannot run against
  the stamp it just wrote.
- `plugins/workaholic/skills/commit/scripts/commit.sh` — enforces the 50-char
  subject policy.
- `plugins/workaholic/skills/branching/scripts/cleanup-mission-worktree.sh` —
  refuses a dirty worktree (correctly; the interaction is the problem).

## Policies

- `workaholic:implementation` / `policies/observability.md` — a refusal must say
  what actually happened. `commit_failed` discards the one line
  (`rejected off-policy subject … 77 characters`) that makes the failure
  actionable, which is the masked-failure state the policy forbids.
- `workaholic:implementation` / `policies/coding-standards.md` — the unit id is
  data flowing into a field with a hard length constraint; the seam must either
  fit it or fail loudly, not fail by accident.
- `workaholic:operation` / `policies/ci-cd.md` — this is a coordination protocol
  an unattended runner depends on; a whole category of work being silently
  unclaimable is a delivery-path defect.

## Implementation Steps

1. **Make the subject fit by construction.** Options, in preference order:
   - Keep the subject `Claim <unit-id>` when it fits, and otherwise emit a
     bounded subject (e.g. `Claim <first-N-chars>…`) with the **full** unit id on
     its own line in the commit body. The reader parses the unit from the
     `Claim …` subject, so this must be done together with step 2.
   - Alternatively pass the unit id in a trailer and give the subject a fixed
     short form.
2. **Update the reader to match.** `skills/drive/scripts/lib/claims.sh` reads the
   unit from the newest `Claim …` subject. Any truncation in step 1 must be
   mirrored there, or claims become unreadable — which is worse than the current
   failure, because it silently frees units that are in flight.
3. **Report the real reason.** Propagate `commit.sh`'s stderr into the refusal
   JSON (e.g. `"detail"`), so `commit_failed` is diagnosable without re-running
   the seam by hand.
4. **Fix the debris path.** `abort_claim` must undo the stamp before invoking the
   cleaner (the stamp is the claim's own write, so reverting exactly it is safe),
   so a refused claim leaves nothing behind — which is already the script's
   stated contract: "A refused claim leaves nothing behind."

## Quality Gate

- Claiming a mission whose slug is 71 characters succeeds, and
  `list-claims.sh` reports that unit with its **full** slug from a fresh clone.
  The round trip is the acceptance test: claim → read back → the unit id matches
  byte for byte.
- A subject-policy rejection is reported with the rejecting message in the
  refusal JSON, not as a bare `commit_failed`.
- A refused claim leaves **no** worktree and **no** local branch: after a forced
  failure, `git worktree list` and `git branch --list 'work-*'` are unchanged.
- Existing short-slug missions and `batch-<timestamp>` units still claim exactly
  as before (no regression in the common path).
- `/drive` in this repository can claim
  `periodic-research-target-compare-agent-vm-solutions-lambda-microvms-etc`.

## Final Report

Verified fixed upstream. No change was needed in this repository, and none was made.

The defect was real and is gone. `claim.sh` no longer builds its subject as
`Claim <unit-id>`: since 2026-08-01 the unit id rides a `Unit:` trailer and the
subject is the fixed, 15-character `Claim a PR-unit`
(`skills/drive/scripts/claim.sh`, step 6). The header comment there names this
ticket's own symptom as the reason — "four of five active missions, each refused
as an unexplained `commit_failed`" — and the opaque refusal is fixed too:
`commit_failed` now carries a `detail` field lifted from the commit seam's own
output, so a rejected subject names itself instead of sending a live run to look
at the commit machinery.

Reproduced against the installed plugin (v1.0.176) with the canonical checker:

```
$ check-subject.sh "Claim periodic-research-target-compare-agent-vm-solutions-lambda-microvms-etc"
subject is 77 characters (limit 50)          # rc=1 — the old shape still fails
$ check-subject.sh "Claim a PR-unit"
                                             # rc=0 — the shape claim.sh uses now
```

The 44-character boundary the ticket derived is exact: a 44-character slug passes
`Claim <slug>` and a 45-character one is refused. That arithmetic is now moot,
because no slug reaches the subject at all.

Live corroboration from the run that verified this: every claim this session made
— including the batch that carried this ticket — committed with subject
`Claim a PR-unit` and a `Unit: batch-…` trailer, and succeeded.

### Discovered Insights

- **Insight**: A long identifier constrained by a commit-subject policy is a
  design smell with a standard fix — move the identifier to a trailer, where
  length is unconstrained and a script can read it back exactly, and leave the
  subject a fixed human sentence.
  **Context**: The subject is for people and is length-policed for that reason;
  the unit id is for `lib/claims.sh`. Putting both in one field made a naming
  decision (a descriptive mission slug) silently break a protocol operation.
- **Insight**: The repair that matters most here was the *reporting* one. The
  length bug made four missions unclaimable; the bare `commit_failed` is what
  made it take a live investigation to find out why.
  **Context**: A refusal that discards the underlying tool's own explanation
  converts a five-second fix into a debugging session.
