---
created_at: 2026-08-18T12:22:48+00:00
author: a@qmu.jp
assignees: [a@qmu.jp]
depends_on: 20260818122247-build-the-docs-site-into-a-deployable-cloudflare-worker-artifact.md
mission: auto-deploy-the-docs-site-to-a-cloudflare-worker-on-merge-to-main
merge_policy:
verification_handoff: A real deploy needs the qmu Cloudflare account API token and account id, which an unattended run does not hold
---

# Deploy the docs Worker from CI on every merge to main

## Overview

<!-- PROPOSED. -->

This is the "on merge to `main`" half of the feedback. `.github/workflows/ci.yml`
already runs on `push: branches: [main]` and on `pull_request`, and it already
builds the docs site as part of `make build`. What is missing is a deploy that
runs after those gates pass, only for `main`, and never for a pull request.

The credentials are the boundary: the deploy needs a Cloudflare API token and
account id held as repository secrets, so the final proof of this ticket is a
real merge to `main` producing a real deploy — which is why the unit carries a
verification handoff.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout
- `workaholic:implementation` / `policies/coding-standards.md` — style and structure conventions
- `workaholic:operation` / delivery paths — deployment is a repository target CI invokes
- `workaholic:safety` — secret handling: tokens live in repository secrets, never in the tree

## Key Files

- `.github/workflows/ci.yml` — the existing gate chain (`make gate`, `install`,
  `build`, `test`, `lint`, `a11y`, `publish-guard`, `drift`); the deploy must run
  after it, not beside it.
- `.github/workflows/build-research-tech.yml` — the repository's second workflow;
  read it for the established job/secret idiom before adding a third.
- `Makefile` — `deploy-docs` from the previous ticket is what the workflow calls.
- `CLAUDE.md` — "One runner": CI invokes `make` targets; no build logic in YAML.

## Implementation Steps

1. Decide the trigger shape and write it: either a `deploy` job in `ci.yml`
   gated on `needs: check` plus `if: github.event_name == 'push' && github.ref ==
   'refs/heads/main'`, or a separate `deploy-docs.yml` on `workflow_run` of `ci`
   with `conclusion == 'success'`. Prefer the in-`ci.yml` job: one workflow keeps
   the gate-then-deploy order visible in a single file and avoids `workflow_run`'s
   detached-context surprises. Record the choice in the workflow's comments, in
   the style `ci.yml` already uses to explain why `make gate` runs first.
2. Guard against pull requests and forks explicitly — a deploy triggered by a PR
   from a fork would expose the token.
3. Pass `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from repository
   secrets into the `make deploy-docs` step's environment only. Never echo them,
   and never put them in a `run:` string.
4. Make failure loud: no `|| true` on the deploy step (the repository has a
   standing rule about masked exit codes — see `make gate` and the `0b09ddc`
   incident recorded in `CLAUDE.md`).
5. Document the two required secrets and who provisions them, in `CLAUDE.md`'s
   Deploy section beside the new surface.
6. Verify on a real merge to `main`, then confirm the deployed build matches that
   commit. This step needs the account; hand it to a person (see the handoff).

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- A merge to `main` runs the deploy exactly once, after the existing checks pass.
- A pull request (including from a fork) runs no deploy and needs no secret.
- A failing deploy fails the workflow run visibly.
- Required secrets are named in the docs; none appear in the tree or in logs.

**Verification method** — the commands/tests/probes that prove them:

- Open a PR: the deploy job is skipped, and the run is green without secrets.
- Merge it: the deploy job runs, and the Worker's deployed version matches the
  merge commit.
- Temporarily point the deploy at an invalid token in a scratch branch to confirm
  the run goes red rather than green-with-a-warning (or assert the same by
  reasoning about the step's exit code if a scratch run is not available).

**Gate** — what must pass before approval:

- CI green on the pull request, and one observed green deploy on `main`.

## Considerations

- Every merge deploys, so a merge that lands broken content is live until the
  next merge. That is the accepted trade for a staging surface; a rollback path
  (redeploying a previous version) is worth naming in the docs but not worth
  building here.
- Deploy time joins the merge path. The docs build is already in `make build`, so
  the added cost is the upload, not a second build — keep it that way by reusing
  the built `dist` rather than rebuilding in a fresh job.

## Open Decisions

- **Which trigger surface**: a `deploy` job inside `ci.yml` gated on `needs:
  check`, or a separate `deploy-docs.yml` keyed on `workflow_run`. Step 1
  recommends the former, but the repository has two workflows already and may
  prefer deploys to live in their own file; the driving session resolves this
  explicitly and records the resolution in its Final Report.
