---
created_at: 2026-08-13T03:51:40+00:00
author: noreply@anthropic.com
assignees:
depends_on:
mission:
merge_policy: review
claim: work-20260818-130526
---

# A handoff PR was opened on a branch carrying no work, and the finish post named a file that was never committed

## Overview

Observed live on 2026-08-13 while resuming unit `batch-20260813024220`.

The `[Implement]` run of session `01A6dJ2DycNYzneQ1Ki8c2NX` posted this finish
line to `#dev-research` at 11:57:04 JST (02:57:04 UTC):

```
🟡 Handoff - #103 Propose the OSS foundational research type
unit:batch-20260813024220
… Next step: read docs/proposals/oss-foundational-research.md and answer its
five open questions …
```

`docs/proposals/oss-foundational-research.md` was never committed. The branch
`work-20260813-024220` carried exactly one commit at that moment — the `Claim a
PR-unit` commit of 02:42:22Z — and PR #103 was created at 02:55:45Z against it.
The next commit on the branch is the *following* run's `Resume a PR-unit` at
03:41:23Z. Between the claim and the resume the branch never moved.

So the run announced a handoff, opened its PR, named the deliverable, and the
deliverable did not exist anywhere a later session could reach. The routing
contract's own words for this case are "an unpublished handoff is not a handoff"
(`workaholic:drive`, `reference/routing.md`), and nothing detected the violation:
the PR was open, the Slack post was green-path, and the only reason the loss was
found at all is that the next run happened to read the thread while resolving its
own finish target.

The same run posted a second 🟡 for `batch-20260813025737` / PR #104 one message
later, and **it failed the same way**:

```
$ git log --oneline origin/main..origin/work-20260813-025737
099305b Claim a PR-unit
```

One commit, the claim. That post claimed "three hard classes … render
deterministically from a versioned manifest", "25 tests", and a branch-safety
`block` at 1289 added lines — none of which exists on the remote. So the failure
is not a one-off slip on a single unit: one session lost two units' work and
announced both as delivered.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — conventional
  project layout (all code work)
- `workaholic:implementation` / `policies/coding-standards.md` — style
  conventions (all code work)
- `workaholic:operation` / `policies/observability.md` — the defect is that a
  failed publish rendered as a successful one; the fix is a check that can tell
  the two apart

## Key Files

- `plugins/workaholic/skills/report/scripts/create-or-update.sh` — opens the PR;
  the natural place to refuse, or to report, a head carrying no non-coordination
  commit
- `plugins/workaholic/skills/drive/SKILL.md` §7 and
  `plugins/workaholic/skills/drive/reference/routing.md` — state "an unpublished
  handoff is not a handoff" but define no check that enforces it
- `plugins/workaholic/skills/notify/SKILL.md` — the finish-post contract; a 🟡
  naming a path is asserting that path exists on the branch

These paths are in `qmu/workaholic`, not in this repository. This repository's
backlog already carries plugin defects filed the same way
(`20260801121500-claim-subject-exceeds-commit-length-limit.md`,
`20260801130000-claim-reader-loses-artifacts-on-low-similarity-archive-rename.md`),
so the local convention is to file here and route the fix through `/fb`.

## Implementation Steps

1. **Localize which step dropped the work.** Both branches are confirmed above to
   carry only their `Claim` commit, so the question left is *where* it was lost:
   an uncommitted worktree, a commit that was never pushed, or a
   `create-or-update.sh` call that ran before any work commit. The 1289-added-lines
   figure in the #104 post is the strongest clue — the run had a real diff in hand
   and a `scan-branch-safety.sh` verdict over it, which places the loss at or after
   the commit seam, not before it. Do not adopt the hypothesis in step 2 before
   this is answered.
2. **Hypothesis to test, not to implement directly:** the route step has no
   published-work precondition. A candidate fix is for `create-or-update.sh` to
   count the head's commits that are not `Claim`/`Resume`/`Refresh heartbeat`
   and report `{"pr": …, "empty_head": true}` when the count is zero, leaving
   the caller to decide.
3. Decide where the refusal belongs — the PR seam, the finish-post seam, or
   both. A 🟡 whose text names a path is the more specific assertion and the
   cheaper thing to verify.
4. Route the agreed change to `qmu/workaholic` via `/fb`, since the code is not
   in this repository.

## Quality Gate

**Acceptance criteria**

- Running the route step on a branch whose only commits are `Claim` / `Resume` /
  `Refresh heartbeat` produces a reported failure, not a silently-opened PR and
  not a finish post.
- The reported failure names the branch and the commit count it found.
- A branch carrying at least one real work commit routes exactly as it does
  today — no behavior change on the happy path.

**Verification method**

- A test that builds a scratch branch with coordination commits only, runs the
  route step against it, and asserts the refusal and its message.
- A second test on the same fixture plus one file commit, asserting the PR is
  created unchanged.

**Gate**

- Both tests green, the localization from step 1 recorded in the Final Report,
  and the `/fb` issue opened against `qmu/workaholic` with the reproduction.

## Considerations

- **The loss is silent by construction, which is what makes it worth a check.**
  Every surface reported success: PR open, post sent, claim released on the next
  heartbeat lapse. Only a human reading the PR diff against the post's text can
  currently tell.
- **A resumed unit masks the damage.** This run's resume re-derived the proposal
  from the ticket, so PR #103 now holds real work and the incident leaves no
  trace in the branch. Neither the PR nor the thread would show it without this
  ticket.
- **Do not widen this into a general "verify every post's claims" rule.** The
  narrow, checkable property is "the head has a work commit"; a general
  assertion-checker over post text is not implementable and would be the kind of
  speculative scope this queue is meant to keep out.
