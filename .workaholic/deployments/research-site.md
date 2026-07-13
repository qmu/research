---
title: Research publishing site (deploy-on-merge)
environment: production
confirmation_method: api-probe
url: https://github.com/qmu/research
---

## Procedure

This repository is deploy-on-merge: the deliverable is the Markdown/site source
on `main`, and the merge itself is the deployment. The ship steps are:

1. Pre-merge readiness proof, run on the work branch at HEAD:
   `make lint`, `env -C packages/tech npm test`, and `make build` (VitePress,
   no dead links) must pass, and the keyless fixture artifact must be
   byte-stable across two consecutive `npm run compare:fixture` runs.
2. Merge the branch's PR into `main` (the promotion).
3. Post-merge handoff to the corporate site per ADR 0003 and CLAUDE.md's
   Deploy section: `npm run research:site -- write-indexes` in `packages/tech`,
   `scripts/publish-research.sh copy --all`, then generate the publish ticket
   into the sibling `qmu-co-jp` worktree with
   `npm run research:site -- qmu-ticket` and run `/drive` there. The corporate
   deploy is owned by the `qmu-co-jp` repository.

## Confirmation

Pre-merge (readiness): the step-1 proof above is green at the branch HEAD.

Post-merge (promotion): the merge commit is present on `origin/main` —
`git ls-remote origin main` returns the merge commit hash (equivalently,
`gh pr view <pr> --json state,mergeCommit` shows `MERGED` with that hash).
This confirms the deployment, because `main` is the published source of truth
this repository delivers.
