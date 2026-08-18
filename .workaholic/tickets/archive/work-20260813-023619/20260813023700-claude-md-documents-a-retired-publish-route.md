---
created_at: 2026-08-13T02:37:00+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
priority: P1
effort: 1h
commit_hash:
category: Fixed
mission:
depends_on:
---

# `CLAUDE.md` documents a publish route that no longer exists, so every agent that follows it reaches a dead mechanism

## Overview

`CLAUDE.md`'s *Reflecting research changes onto `qmu-co-jp` (via `/ship`)* section
instructs the agent to generate a publish ticket **into the sibling repository's
`.workaholic/tickets/todo/`**, and names `/request` as the route that carries it.

Both were retired on 2026-08-05 (workaholic FB `20260805101319`). `submit-request.sh`
is gone; its logic moved into the `feedback` skill, and the only sanctioned way across
a repository boundary is now `/fb <ask> to <owner/name>`, whose carrier is a **GitHub
issue on the target** — no file is written into any other checkout. `hooks/guard-repo-
confinement.sh` enforces that over Write/Edit and refuses the documented step outright.

Measured 2026-08-12: an agent following the section verbatim created a worktree in the
sibling repository, was refused at the first write, and had to unwind it. Seven active
missions name this step as their remaining acceptance criterion, so the stale text is on
the critical path of every one of them.

## Current behavior

Steps 3–5 of that section describe choosing a `qmu-co-jp` worktree, writing a ticket into
its `todo/` directory, and telling the developer to run `/drive` there. Step 4 cannot be
performed by any sanctioned means.

## Expected behavior

The section describes the route that exists:

- the local export (`research:site -- write-indexes`, then `publish-research.sh copy
  --all`) is unchanged and still correct, including the **downstream-owned** exclusions
  the exporter honours from `scripts/publish-ledger.tsv`;
- the ordered plan reaches the corporate repository as a **GitHub issue** raised with
  `/fb ... to qmu/qmu-co-jp`, composed from `research:site -- qmu-ticket`;
- that repository's own loop ingests the issue, adapts to である体, verifies with its site
  build, and deploys through its own `/ship`.

It must also record the **live blocker**: the outbound backstop refuses the generated
payload because two of its lines carry this repository's basename as an ordinary English
word (the emitter heading at `packages/tech/src/research/domain/site.ts:1331`, and the
published title `Deep research APIs`). That is filed as `qmu/workaholic#384`. Until it is
fixed, the payload cannot be sent as-is, and the section should say so rather than leave
the next agent to rediscover it.

## Steps

1. Rewrite the *Reflecting research changes onto `qmu-co-jp`* subsection around the issue
   carrier, keeping the export steps and the sibling-checkout discovery rule.
2. State the `qmu/workaholic#384` blocker and the interim path (the exporter has already
   placed the files in the sibling checkout, so that repository's `/drive` can apply them
   from there).
3. Check the rest of `CLAUDE.md` for other `/request` references and correct them in the
   same change.
4. Commit `scripts/publish-ledger.tsv`, whose two emit hashes changed when
   `publish-research.sh copy --all` last ran — the exporter's own instruction is to commit
   it, and leaving it uncommitted makes the next run's divergence check read a stale
   baseline.

## Considerations

- The ledger's `downstream` marks are standing decisions, not staleness:
  `image-generation.md` and `agent-vm-comparison.md` are written by the corporate side and
  the exporter must keep excluding them. Only the two changed hashes are in scope.
- Do not describe a route that merely happens to work — writing into another checkout with
  a shell redirect evades the Write/Edit guard, and documenting that would institutionalise
  the exact bypass the guard exists to prevent.
- This is a documentation defect with an operational cost, not a cosmetic one: the repo's
  own standard is that outdated documentation is a defect, and the affected text is the
  last step of seven missions.

## Policies

- `workaholic:operation` / **ci-cd** — a delivery step documented against a removed
  mechanism reports its failure at the point of no recourse, after the work is done.
- `workaholic:implementation` / **fail-fast, machine-checkable gaps** — the instruction and
  the enforced guard must agree; when they disagree the document is the thing that is wrong.
- `workaholic:design` / **security design** — the confinement rule is correct and stays.
  The document changes to match it, never the other way round.

## Quality Gate

**Acceptance criteria**

1. `CLAUDE.md` contains no instruction to write into another repository's checkout and no
   reference to `/request`; the described route is the GitHub-issue carrier.
2. The `qmu/workaholic#384` blocker and the interim path are stated where the publish step
   is described.
3. `scripts/publish-ledger.tsv` is committed with the two changed hashes and both
   `downstream` marks intact.

**Verification method**

`grep -n '/request\|tickets/todo' CLAUDE.md` returns no stale instruction; a diff of
`scripts/publish-ledger.tsv` shows exactly two changed lines and no lost `downstream` mark;
`scripts/publish-research.sh copy --all --dry-run` still reports both destinations excluded.

**Gate that must pass**

`make build` and `make test` green with bare, unmasked exit codes.
