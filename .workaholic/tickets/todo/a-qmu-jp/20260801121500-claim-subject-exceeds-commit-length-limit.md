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
