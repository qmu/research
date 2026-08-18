---
created_at: 2026-08-18T13:15:00+00:00
author: a@qmu.jp
assignees: [a@qmu.jp]
depends_on:
mission: auto-deploy-the-docs-site-to-a-cloudflare-worker-on-merge-to-main
merge_policy:
verification_handoff:
---

# Deployment record still says the merge is the deployment

## Overview

`.workaholic/deployments/research-site.md` is the deployment contract `/ship`
reads for this repository. It states:

> This repository is deploy-on-merge: the deliverable is the Markdown/site source
> on `main`, and the merge itself is the deployment.

and its confirmation step is `git ls-remote origin main` returning the merge
commit — `confirmation_method: api-probe`, but the probe is of GitHub, not of a
running site.

That was true until the staging preview landed. A merge to `main` now also runs
the `deploy` job in `ci.yml`, which deploys the built site to a Cloudflare
Worker. So the record understates what a merge does, and — the part that
matters — its confirmation would report a successful deployment for a merge
whose Worker deploy failed. A `/ship` run following this contract confirms the
commit reached `main` and stops, which is exactly the "green indicator with no
evidence of what was verified" the CI/CD policy names as the failure to avoid.

Observed on 2026-08-18 while reporting the branch that added the surface
(`work-20260818-123849`); `area-freshness.sh` also reports the record 36 days
untouched. Not fixed there because no ticket in that unit covered this artifact.

## Policies

- `workaholic:operation` / `policies/ci-cd.md` — after release, confirm the actual response from the production origin
- `workaholic:implementation` / `policies/observability.md` — a deployment is confirmed by the running system, not by the process that started it

## Key Files

- `.workaholic/deployments/research-site.md` — the record: frontmatter
  (`confirmation_method`, `url`), `## Procedure`, `## Confirmation`.
- `.github/workflows/ci.yml` — the `deploy` job whose success or failure the
  confirmation should reflect.
- `CLAUDE.md` — the Deploy section's *Staging preview* entry, which already
  documents the URL, the credentials and the rollback path; the record should
  point at it rather than restate it.

## Implementation Steps

1. Decide whether the staging preview is a second deployment target in this
   record's terms or a step inside the existing one. The repository has one
   record today and two things now happen on merge; the answer decides whether
   `deployments/` gains a second file or this one gains a step.
2. Update `## Procedure` so the merge's post-conditions include the Worker
   deploy, and `## Confirmation` so a merge is confirmed by the deployed site
   responding — an HTTP probe of `https://staging-research.qmu.co.jp/` and one
   report path — in addition to the merge commit being present.
3. State the failure mode explicitly: a green merge with a red `deploy` job is
   not a confirmed deployment, and the recovery is the rollback path already in
   CLAUDE.md.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- The record describes what a merge to `main` actually does, including the
  Worker deploy.
- Its confirmation step distinguishes "the commit is on `main`" from "the
  deployed site is serving that commit", and requires both.
- `/ship` reading the record has a confirmation method it can actually run, or
  the record says plainly who must run it.

**Verification method** — the commands/tests/probes that prove them:

- Read the record against `.github/workflows/ci.yml`'s `deploy` job: every
  post-condition of a merge appears in the Procedure.
- `bash <plugin-src>/skills/report/scripts/area-freshness.sh` reports no
  `retired_terms` for the record.

**Gate** — what must pass before approval:

- CI green (`make gate`, `install`, `build`, `test`, `lint`, `a11y`,
  `publish-guard`, `drift`).

## Considerations

- This ticket cannot be finished honestly until one real deploy has been
  observed: the confirmation step should describe a probe someone has actually
  run. It is sequenced after the mission's verification handoff, not before it.
- Resist widening this into a rewrite of the ship flow. The defect is one
  record disagreeing with one workflow.
