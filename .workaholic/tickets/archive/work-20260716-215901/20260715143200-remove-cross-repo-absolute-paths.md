---
created_at: 2026-07-15T14:32:00+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on:
mission:
---

# Remove absolute dev-box paths into a private sibling repository from this repo's history

## Overview

This repository is **public**. Six lines across three committed files quote **absolute filesystem paths on the dev box that point into a private sibling repository**, and in doing so publish that repository's name, several of its package names, and one of its CI workflow filenames. They were written as provenance for house conventions ("we pin Node 22 because that repo does"), so the paths are decoration, not substance — the convention is the point, and it survives without them.

Locations (all on `main`):

| file | lines |
| --- | --- |
| `.workaholic/tickets/archive/work-20260622-191220/20260622191214-initialize-research-monorepo-skeleton.md` | 42, 43, 45, 70 |
| `.workaholic/tickets/archive/work-20260622-191220/20260622191217-seed-llm-benchmark-research.md` | 33 |
| `docs/adr/0001-no-workspaces-independent-npm-projects.md` | 8 |

Each is a `(ref /home/ec2-user/projects/<private-repo>/...)` aside inside a sentence that already states the rule. The ADR line is different in kind: it enumerates four sibling repositories by name as evidence that the convention is house-wide.

**Why this matters here and not in a private repo:** a reader of this repository — who knows nothing about the organisation's clients — currently learns the name of a private repository, the layout of its packages, and what its CI is called. That is the exact failure the "keep motivation generic, never name other repos or clients" convention exists to prevent, and this repository is on the wrong side of it today.

**Scope note:** this is a **history** problem, not just a working-tree one. Rewriting the files on `main` leaves the old blobs reachable from the commits that introduced them (`d15e4a1`, `0f6f6bd`), so the strings stay retrievable. Decide deliberately how far to go — see Implementation Steps.

## Policies

- `workaholic:safety` / `policies/standard.md` — the prohibition on naming other projects in artifacts shared beyond their permitted scope. A public repo is the widest possible scope.
- `workaholic:implementation` / `policies/objective-documentation.md` — provenance should make a claim checkable by this repo's readers. An absolute path on one machine, into a repo they cannot open, is not checkable by anyone here; it only leaks.
- `workaholic:design` / `policies/defense-in-depth.md` — the fix is to not carry the detail at all, rather than to rely on anyone noticing it later.

## Implementation Steps

1. Rewrite the six lines so each states the convention **without** the path aside. The rule is already written in every case; delete the parenthetical rather than trying to paraphrase the target. Examples of the shape to land on:
   - `.nvmrc` — pin Node 22 (house standard).
   - `.prettierrc` — house formatting: printWidth 80, double quotes, semi, tabWidth 2, trailingComma all, arrowParens always.
   - The ADR: state that the no-workspaces layout is a house convention used across the organisation's repositories, without listing them.

   Keep every concrete *value* (`22`, `printWidth 80`) — those are this repo's own configuration and are load-bearing. Only the `(ref <path>)` provenance goes.
2. Confirm nothing else in the tree quotes an absolute `/home/ec2-user/projects/<other-repo>/` path: `git grep -n "/home/ec2-user/projects/"` should return only this repository's own path, if any.
3. **Decide the history question explicitly** and record the decision in the ticket's Final Report:
   - **Rewrite history** (`git filter-repo` / `filter-branch` over the two introducing commits, then force-push) — removes the strings from the branch, but the pre-rewrite commits stay retrievable by SHA on the remote until GitHub garbage-collects them. Purging those requires a GitHub Support request naming the full SHAs.
   - **Fix forward only** (a normal commit) — the strings remain in history permanently and are found by anyone reading `git log -p`.

   Neither is free. Pick one knowingly rather than by default.
4. Add `/home/ec2-user/projects/` to this repo's `.workaholic/leak-denylist` so `release-scan` warns if the shape returns. The file is git-ignored, so it must be created locally; **without it the leak rule does nothing at all**, which is why this went unnoticed. Note that a denylist only catches terms someone already wrote down — it is a backstop, not the control.

## Quality Gate

- `git grep -in "/home/ec2-user/projects/"` over the working tree returns no path into another repository.
- No sibling repository is named anywhere in the tree — check the ADR specifically, since its line names four.
- Every configuration **value** the six lines carried (Node version, prettier settings, the per-package path-filtered CI shape) is still stated; only the provenance asides are gone. The prose must still make its point unaided — if removing the path makes a sentence incomplete, the sentence needs rewriting, not the path restored.
- The step-3 decision is written down with its rationale, including — if history was rewritten — whether a Support request was raised for the orphaned SHAs.
- `bash <plugin>/skills/release-scan/scripts/scan-branch-safety.sh` reports no `leak` finding once step 4's denylist entry exists.

## Considerations

- The two introducing commits are `d15e4a1` (four of the six lines, plus the ADR) and `0f6f6bd` (one line). Both are on `main` and pushed.
- The archived tickets are historical records. Editing them is still correct — the convention applies to every committed artifact, not only to live documents — but preserve their meaning; do not simply delete the lines wholesale.
- This request was raised from another repository. Its author cannot see this repo's local state beyond `main`, so if any of these lines have already been fixed in a branch, close the corresponding item rather than redoing it.

## Final Report

- All six listed lines were rewritten with the provenance asides removed and every
  configuration value kept. Beyond the listed six, a tree-wide sweep found four
  more absolute-path lines in two other archived tickets: two naming another
  sibling's VitePress package (rewritten to the generic house shape) and two
  absolute paths into the publish-target sibling already referenced throughout
  this repo (rewritten to the `../` relative form the README/CLAUDE.md use).
- The ADR no longer enumerates sibling repositories; it states the house
  convention generically.
- **Step-3 decision: fix forward only, for now.** History rewriting
  (filter-repo + force-push of public `main`, plus a GitHub Support request for
  orphaned SHAs) is deliberately NOT done here — it rewrites public history and
  needs a separate, explicit user decision. Until then the old strings remain
  reachable via `git log -p` on the introducing commits.
- Step 4 done locally: `.workaholic/leak-denylist` created with
  the dev-box projects-path prefix, and the filename added to `.gitignore`
  (the file was not previously matched by any ignore rule). The denylist is
  per-machine; other checkouts need it created locally too.
