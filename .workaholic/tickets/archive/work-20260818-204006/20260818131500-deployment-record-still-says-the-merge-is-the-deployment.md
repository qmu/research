---
created_at: 2026-08-18T13:15:00+00:00
status: done
author: a@qmu.jp
assignees: [a@qmu.jp]
depends_on:
mission: auto-deploy-the-docs-site-to-a-cloudflare-worker-on-merge-to-main
merge_policy:
verification_handoff:
claim: work-20260818-204006
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

## Final Report

Development completed as planned.

**Step 1 — decided: one record, gaining a step.** The staging Worker is not a
second deployment target in this record's terms. It has no trigger of its own, no
separately promotable artifact, and no independent release decision: `ci.yml`'s
`deploy` job is `needs: check` on the very same `push` to `main`, keyed to the
same commit. A second file in `deployments/` would make `/prepare-release` report
a target nobody can ship on its own, and would split one merge's post-conditions
across two records that could then disagree — which is the defect this ticket
exists to fix, reproduced in a new place. The reasoning is written into the
record's `## Procedure` so the next reader does not re-litigate it.

**Step 2 — `## Procedure` and `## Confirmation` rewritten.** The procedure now
states both post-conditions of a merge and reads against `ci.yml` line by line:
the `check` job, then the `deploy` job with its `install-docs` + `deploy-docs`
commands, its three `if` conditions (`push` / `refs/heads/main` /
`github.repository == 'qmu/research'`, so no PR and no fork deploys), its two
secrets, and the fact that a failed deploy fails the run. The confirmation is now
three checks, all required, and it separates the two the ticket asked be
separated: check 2 proves the commit is on `main`, check 3 proves the deployed
site is serving it. Step 1's readiness list was also brought onto CI's actual
target list (`gate install build test lint a11y publish-guard drift`) — it still
named a hand-rolled `env -C packages/tech npm test` / `compare:fixture` set that
no longer matches the workflow.

Frontmatter gained `endpoint` and `command` so the declared `api-probe` method is
one a machine can actually execute; `read-deployments.sh` parses the record with
`has_confirmation: true` and `deploy_model: deploy-on-merge` (`body_declaration`).

**Step 3 — the failure mode is stated explicitly**, with the part that makes it
dangerous: nothing rolls back on its own, so after a red `deploy` the endpoint
keeps answering `200` while serving an older commit, and check 2 alone would
report success. Recovery points at CLAUDE.md's *Staging preview → Recovery*
rather than restating it.

**One real deploy was observed**, as the Considerations require — through the
GitHub Actions API rather than by probing the URL. On `200a657` (the merge of
#128): run `32179520697`, job `95849504591` named `deploy`, step *Deploy the
preview site* running 19:59:15Z→19:59:31Z on 2026-08-18, `conclusion: success`.
Those coordinates are quoted in the record as the last-observed deployment.

**The HTTP half of check 3 could not be run here and the record says so.** This
container's network policy denies the host — `curl https://staging-research.qmu.co.jp/`
returns `curl: (56) CONNECT tunnel failed, response 403` from the agent proxy,
and `$HTTPS_PROXY/__agentproxy/status` confirms it is a gateway policy denial.
Rather than describe an unverified probe as verified, the record names who runs
it (anyone with outbound access to that host), tells a denied runner to run
check 3's API half and report the HTTP probe as **unrun**, and forbids inferring
the site's state from the merge.

Verification run: the record read against `.github/workflows/ci.yml` — every
post-condition of a merge appears in the Procedure; `read-deployments.sh` parses
it; `area-freshness.sh` reports `retired_terms: []` for the record; and the full
CI gate is green locally (`make gate`, `install`, `build`, `test`, `lint`,
`a11y` — 5/5 URLs, 0 errors — `publish-guard`, `drift`).

### Discovered Insights

- **Insight**: `make install` rewrites all three `package-lock.json` files on a
  clean checkout under the repository's own pinned Node 22.
  **Context**: npm 10.9.7 (what Node 22 ships) strips the `libc` fields npm 11
  wrote into the committed lockfiles. Any run that executes the declared CI gate
  therefore ends with three unrelated modified files, and a run that does not
  notice commits that churn into an unrelated PR. Reverted here by targeted
  `git checkout --`; minted as
  `20260818204644-make-install-rewrites-all-three-lockfiles-under-node-22.md`.
- **Insight**: the deployed site carries no commit marker, so no probe can prove
  *which* commit it is serving.
  **Context**: this is why the record needs the Actions-API check at all — an
  HTTP 200 is compatible with a failed deploy that left the previous build live.
  The strongest content-side assertion available is that a page the merge changed
  shows its new text, and that only works when the merge touched `docs/`. A
  build-stamped endpoint (a `/version.json` emitted by the VitePress build) would
  collapse both halves of check 3 into one probe; not built here, since the ticket
  asks for one record to stop disagreeing with one workflow, not for a new site
  surface.
