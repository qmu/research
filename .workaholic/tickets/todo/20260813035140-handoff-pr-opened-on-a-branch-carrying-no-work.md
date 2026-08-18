---
created_at: 2026-08-13T03:51:40+00:00
author: noreply@anthropic.com
assignees:
depends_on:
mission:
merge_policy: review
claim: work-20260818-143916
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

## Investigation (2026-08-18) — step 1 answered, and it corrects step 2

Step 1 is done. The answer **rules out** the hypothesis step 2 offers, which is
why step 1 was made a precondition.

### The loss is at the push, not at the commit seam

Timeline, from the merged history and the GitHub API (both branches):

| | `work-20260813-024220` (PR #103) | `work-20260813-025737` (PR #104) |
| --- | --- | --- |
| `Claim a PR-unit` | 02:42:22Z | 02:57:39Z |
| **PR created** | **02:55:45Z** | **03:08:53Z** |
| next commit (`Resume a PR-unit`) | 03:41:23Z | 03:53:27Z |

Both PRs were opened while the **remote** head was still the claim commit.

The decisive evidence that the work nevertheless *existed as commits* is the
scan verdict quoted in each PR body. PR #104's body records:

```
scan-branch-safety.sh →
{"verdict": "block", ... "too-large-commit", "2087 added lines of implementation > 500"}
```

`scan-branch-safety.sh` computes `git diff <base>..HEAD` and its
`too-large-commit` rule iterates `git rev-list "${BASE}..HEAD"`
(`skills/release-scan/scripts/scan-branch-safety.sh`). A per-commit finding is
not reachable from an uncommitted worktree: the run's **local HEAD carried the
work** when the scan ran, minutes before the PR was opened on a remote head that
did not.

(The `1289 added lines` figure in this ticket's Overview came from the Slack
post; the PR body says `2087`. The discrepancy does not affect the conclusion —
either number is a committed-history measurement.)

So the sequence was: commit locally → scan → open PR → post 🟡, with the push
that belongs between the commit and the PR never having taken effect. The
container went away and took the only copy with it.

### Why step 2's proposed check would not have fired

Step 2 proposes that `create-or-update.sh` "count the head's commits that are
not `Claim`/`Resume`/`Refresh heartbeat`". Run in the worktree, that counts
**local** `HEAD` — which held the full corpus and would have counted 1+ on both
of these runs. The check would have passed and the PR would have opened exactly
as it did.

**The precondition has to read the remote head**, because that is what the pull
request actually points at: `git rev-list origin/<branch>` (after a `git fetch`),
not `HEAD`. Stated as an invariant rather than a count: *the PR's head commit
must be an ancestor-or-equal of local `HEAD` **and** must carry the work the body
describes* — the cheap, checkable half being `git rev-parse HEAD` equals
`git rev-parse origin/<branch>`.

That single comparison catches this incident directly and catches nothing else:
a run whose push succeeded has the two equal by construction.

### Where the seam actually is

`/report`'s Write Story flow pushes in Phase 4 and creates the PR in Phase 5
(`skills/report/SKILL.md`). Phase 4's push is **prose in the skill, not a step
any script owns or verifies** — `commit.sh` does not push (confirmed: no `git
push` in it), so nothing between the commit and the PR guarantees the remote
moved. `create-or-update.sh` then opens the PR without reading the remote at all;
its own header comment assumes the opposite, describing an earlier failure as
happening "*after* the branch was already pushed".

One seam has since been closed for **archive** commits only: `archive.sh` pushes
itself immediately after committing (line 300, verified live on 2026-08-18 — each
archive in this session reported `Push: pushed`). That covers a ticket archive.
It does **not** cover the story commit or any other `commit.sh` commit, which is
what Phase 4 pushes, so the gap this ticket describes is still open.

### Upstream status: not fixed

Checked against the newest plugin tree on this machine, **1.0.183**, which is
also the registry version (`plugin-src.sh` → `src_immutable: true`):

- `grep -rn 'empty_head|empty-head|no_work_commit|coordination-only'` over
  `skills/` and `hooks/` → no match anywhere.
- `create-or-update.sh` (134 lines) contains no `git fetch`, no remote read, and
  no commit count.
- The rule exists only as prose: `skills/drive/reference/routing.md:201`, "an
  unpublished handoff is not a handoff".

So unlike the three sibling plugin defects filed on 2026-08-01, this one is
**not** already fixed upstream and the `/fb` routing in step 4 is still required.

### What remains, and why this run stopped here

Steps 2–4 all land in `qmu/workaholic`: the fix is in that repository's
`create-or-update.sh`, the Quality Gate's two tests are tests of that script, and
step 4 files the issue there. **This session's GitHub access is scoped to
`qmu/research` alone**, so it can neither open the `/fb` issue on
`qmu/workaholic` nor add tests to a checkout it does not have. Recorded
`blocked` on that, with the analysis above committed so the next attempt starts
from the corrected proposal rather than re-deriving it.

## Re-check (2026-08-18, plugin tree 1.0.185) — still unfixed, and the payload is now ready to file

The blocker is unchanged, so this section adds the two things that make the next
attempt a single act rather than a re-derivation: the upstream status at the
newest tree on the machine, and the concrete patch the `/fb` issue should carry.

### Upstream status at 1.0.185

Re-run of the same three probes the 2026-08-18 investigation ran against 1.0.183,
now against 1.0.185 (`plugin-src.sh` → `source: registry`, `version: 1.0.185`,
`src_immutable: true`, i.e. the registry version and the newest tree present):

| Probe | Result |
| --- | --- |
| `grep -rnE 'empty_head\|no_work_commit\|coordination-only' skills/ hooks/` | no match |
| `grep -nE 'git fetch\|origin/\|rev-list' skills/report/scripts/create-or-update.sh` | only `git rev-parse --show-toplevel` (line 28) and the `BASE_REF#origin/` string trim (line 88) — no remote read |
| `skills/report/scripts/create-or-update.sh` line count | 134, unchanged |

So two plugin releases later the script still opens the pull request without ever
asking what `origin/<branch>` points at.

### The patch to file

Written against `skills/report/scripts/create-or-update.sh` at 1.0.185. It goes
**before** the `command -v gh` degrade at line 61: the check is pure git, needs no
CLI, and must run even in the `gh_unavailable` path — a caller told "open the pull
request by hand" over an unpushed branch is being handed the same silent loss.

```sh
# THE PULL REQUEST POINTS AT THE REMOTE HEAD, SO THE REMOTE IS WHAT MUST CARRY THE WORK.
# Measured 2026-08-13 (qmu/research 20260813035140): two units committed locally, scanned a
# real diff, opened PRs and posted their finish lines while `origin/<branch>` was still the
# `Claim a PR-unit` commit. Every surface reported success and both units' work went away
# with the container. A LOCAL commit count would not have caught it -- local HEAD held the
# work. Comparing the two SHAs does, and costs one fetch.
git fetch --quiet origin "$BRANCH" 2>/dev/null || true
LOCAL_HEAD=$(git rev-parse HEAD 2>/dev/null || echo "")
REMOTE_HEAD=$(git rev-parse FETCH_HEAD 2>/dev/null || echo "")
if [ -z "$REMOTE_HEAD" ] || [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
    printf '{"pr": null, "reason": "unpushed_head", "branch": "%s", "story": "%s", "local_head": "%s", "remote_head": "%s", "detail": "the local branch tip is not what origin/<branch> points at, so a pull request opened now would describe work its head does not carry; push the branch and re-run"}\n' \
        "$BRANCH" "$STORY_FILE" "$LOCAL_HEAD" "$REMOTE_HEAD"
    exit 0
fi
```

Two properties worth stating in the issue, because they are what keep the check
narrow enough to be safe:

- **It cannot fire on a healthy run.** A run whose push succeeded has the two SHAs
  equal by construction, so the happy path is untouched — the third acceptance
  criterion holds without a behavioural carve-out.
- **It is the cheap half of the invariant, deliberately.** The full statement is
  "the PR's head must be an ancestor-or-equal of local `HEAD` *and* carry the work
  the body describes"; only the SHA comparison is checkable, and it is exactly the
  half that catches this incident.

### The caller-side half the issue must also ask for

`unpushed_head` must **not** be treated like `gh_unavailable`.
`workaholic:drive` (`reference/routing.md`, *Report*) says a PR-creation failure
"never changes a unit's outcome classification, the reconciliation counts, or the
terminal token" — correct for a missing CLI, wrong here: `gh_unavailable` means
the work is pushed and only the PR is missing, while `unpushed_head` means the
work is **not** published at all. The route must stop and the finish line must not
be posted, or the check merely moves the false success from the PR to Slack.

### The acceptance criteria this corrects

The Quality Gate above is left as the developer agreed it, but its first two
criteria describe the commit-count check that the investigation ruled out.
Restated for the corrected invariant, for the developer to accept or reject:

- Running the route step on a branch whose **remote** tip differs from local
  `HEAD` produces a reported failure, not a silently-opened PR and not a finish
  post.
- The reported failure names the branch and both SHAs it compared.
- A branch whose push succeeded routes exactly as it does today (unchanged).

The two tests follow the same substitution: the fixture is a branch committed
locally and **not** pushed, plus its pushed counterpart, rather than a branch with
coordination-only commits.

### Status

Still `blocked`, on the same external boundary and nothing else: the code, its
tests, and the `/fb` issue all live in `qmu/workaholic`, and this session's GitHub
access is scoped to `qmu/research` alone. What a person (or a session scoped to
both repositories) has to do is now one act — file the section above as the issue.

## Re-check (2026-08-18, plugin tree 1.0.186) — third block, and the boundary is structural

Nothing in the analysis or the payload above changes. This section records only
what a third attempt measured, so the next reader does not re-run the probes.

### Upstream status at 1.0.186

`plugin-src.sh` → `source: registry`, `version: 1.0.186`, `src_immutable: true`;
`1.0.186` is the only tree on the machine and is also the registry version.

| Probe | Result at 1.0.186 |
| --- | --- |
| `grep -rnE 'empty_head\|no_work_commit\|coordination-only\|unpushed_head' skills/ hooks/` | no match |
| `grep -nE 'git fetch\|origin/\|rev-list\|rev-parse' skills/report/scripts/create-or-update.sh` | `git rev-parse --show-toplevel` (28) and the `BASE_REF#origin/` trim (88) only — still no remote read |
| `wc -l skills/report/scripts/create-or-update.sh` | 134, unchanged (md5 `3df6ca5e72fd252ebcae59dac93fe770`) |
| `grep -n 'git push' skills/commit/scripts/commit.sh` | no match — `commit.sh` still does not push |
| `grep -rn 'unpublished handoff' skills/drive/reference/routing.md` | `routing.md:201`, prose only, same line as at 1.0.183 |

One detail worth adding to *Where the seam actually is*: at 1.0.186 the push is
not merely unowned by a script, it is a **single word in a prose bullet** —
`skills/report/SKILL.md:51`, "commit, push" at the end of Phase 4 — and the only
other mention of it in the whole flow is the `gh_unavailable` degrade note
asserting the branch "is pushed" (`SKILL.md:94`, `reference/create-pr.md:24`).
The assertion the incident falsified is still the one the code relies on.

### The boundary is a property of the environment, not of this attempt

Recorded because three consecutive runs have now hit it and the report is where a
decision about it belongs:

- This checkout is `/home/user/research`, and it is the **only** repository on the
  machine (`ls -d /home/user/* /home/user/projects/*` → `/home/user/research`
  alone). There is no `qmu/workaholic` checkout to add the two tests to.
- The routine's container declares its GitHub access scoped to `qmu/research`
  alone, with calls to other repositories denied. That is per-container
  configuration, identical on every tick, so no retry of this ticket by this
  routine can reach step 4 — the block is structural rather than transient, and
  re-attempting it costs one PR-unit per tick.

**Developer decision needed, deferred rather than guessed** (an unattended run
may neither widen its own GitHub scope nor curate the icebox): either file the
prepared issue on `qmu/workaholic` — the *The patch to file* section above is the
payload, verbatim — or grant this routine's environment access to that
repository, or icebox this ticket so the queue stops re-offering work no run here
can finish. Until one of those happens the ticket is correct to stay in `todo/`
and correct to keep blocking.
