---
created_at: 2026-08-18T21:26:02+00:00
author: a@qmu.jp
assignees: []
depends_on:
mission:
merge_policy:
verification_handoff:
---

# `make lockfiles` cannot see what the first, cold install changed

## Overview

`scripts/check-lockfile-stability.sh` (landed 2026-08-18,
[#133](https://github.com/qmu/research/pull/133)) hashes each manifest **either
side of its own `npm install`**. That measures only what *its* install changes,
and by the time it runs, the install that mattered has already happened — CI runs
`make install` in the step before it, and a developer runs `make lockfiles` after
installing too. So the guard is vacuous for exactly the case it exists to catch.

The gap is not theoretical; it is the case that matters, because npm behaves
differently on a **cold** tree than on a warm one. On a checkout with no
`node_modules`, npm builds `better-sqlite3` (a native package) and records that
fact into the lockfile:

```
$ git status --short                       # after `make install` in a FRESH worktree
 M packages/tech/package-lock.json
$ git diff -- packages/tech/package-lock.json
@@ -3030,6 +3030,7 @@
       "version": "13.0.3",
       ...
+      "hasInstallScript": true,
```

A second install on the now-warm tree changes nothing further, which is why
`make lockfiles` reported "npm install rewrote nothing in 3 projects" on the very
branch that introduced it, and why CI on `#133` was green: `make install` mutated
the tree, then the guard hashed the already-mutated file against itself.

Measured 2026-08-18 in a fresh claim worktree cut from `0fe8205`, i.e. *after*
`#133` merged. The committed `packages/tech/package-lock.json` is therefore still
one line short of what a cold install produces, and the ticket that claimed
"`make install` leaves `git status` empty"
(`20260818204644-make-install-rewrites-all-three-lockfiles-under-node-22.md`)
verified that claim on a warm tree only.

## Policies

- `workaholic:implementation` / `policies/observability.md` — a check whose green
  is produced by the ordering of its callers reports a state that is not the case
- `workaholic:operation` / `policies/ci-cd.md` — a green indicator with no
  evidence of what was actually verified is the failure this policy names
- `workaholic:implementation` / `policies/coding-standards.md` — style and
  structure conventions

## Key Files

- `scripts/check-lockfile-stability.sh` — the `digest()` before/after comparison,
  and the header paragraph arguing for it (that argument is what is wrong).
- `.github/workflows/ci.yml` — the `Lockfile stability` step and its position
  immediately after `Install`, which is what makes the comparison vacuous.
- `packages/tech/package-lock.json` — the file currently missing
  `"hasInstallScript": true` on `better-sqlite3@13.0.3`.
- `Makefile` — the `lockfiles` target.

## Implementation Steps

1. Reproduce first, in a **fresh** worktree (`git worktree add`) with no
   `node_modules`: `make install` then `git status --short` shows the modified
   lockfile. A warm tree cannot reproduce this and will look fine.
2. Change the comparison to the committed content — `git show HEAD:<path>` versus
   the working tree after the install — instead of a before/after hash. That is
   the question actually being asked ("does an install reproduce what we
   committed?"), and it does not care which caller installed first.
3. Handle the branch-edits-manifests case the hash comparison was protecting:
   a branch that deliberately changes a manifest commits it before the check runs
   (`archive.sh` and `commit.sh` both commit before the report phase), so
   comparing against `HEAD` is correct there too — verify that on a branch that
   edits a lockfile rather than assuming it.
4. Commit the regenerated `packages/tech/package-lock.json` with the
   `hasInstallScript` line, so the guard's first green is an honest one.
5. Correct the header of `check-lockfile-stability.sh`: the paragraph explaining
   why it hashes rather than reads git is the reasoning this ticket falsifies, and
   leaving it would send the next reader back down the same path.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- In a **fresh** worktree with no `node_modules`: `make install` then
  `git status --short` is empty.
- `make lockfiles` fails when the committed lockfile differs from what an install
  produces, **including** when the difference was created by a preceding
  `make install` rather than by the guard's own install.
- The guard still passes on a branch that legitimately edits a manifest and has
  committed that edit.

**Verification method** — the commands/tests/probes that prove them:

- `git worktree add` a scratch worktree, `make install`, `git status --short` —
  empty.
- In that worktree, revert the `hasInstallScript` line, run `make install` then
  `make lockfiles` — must exit non-zero and name `packages/tech/package-lock.json`.
- `make lockfiles` on a branch carrying a committed manifest edit — exit 0.

**Gate** — what must pass before approval:

- CI green (`make gate`, `install`, `lockfiles`, `build`, `test`, `lint`, `a11y`,
  `publish-guard`, `drift`, `ledger`).

## Considerations

- **The warm/cold distinction is the whole bug and it is easy to lose again.**
  Every local verification after the first install of the day runs warm, so a fix
  tested the convenient way reproduces the same false green. The reproduction step
  is first in the steps above for that reason.
- `better-sqlite3` is the only native package in the tree today, so the symptom is
  one line. That is luck, not a bound: any future dependency with an install
  script adds another, and the guard would keep reporting green.
- The two prior lockfile states are both "correct" to some npm: this is a third
  axis (cold vs warm) on top of the npm-version axis
  `20260818204644` addressed. Fixing the comparison fixes both, because comparing
  against the committed file asks the only question that matters.
