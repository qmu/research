---
title: Research publishing site (deploy-on-merge)
environment: production
confirmation_method: api-probe
url: https://github.com/qmu/research
endpoint: https://staging-research.qmu.co.jp/
command: curl -fsS -o /dev/null -w '%{http_code}\n' https://staging-research.qmu.co.jp/
---

## Procedure

This repository is deploy-on-merge, and a merge to `main` now does **two**
things: it promotes the Markdown/site source, and it deploys the built preview
site to a Cloudflare Worker. Both are post-conditions of the same merge — there
is no second trigger, no separate artifact and no independent release decision —
so the Worker is a step of this target rather than a second deployment record.

The ship steps are:

1. Pre-merge readiness proof, run on the work branch at HEAD. CI runs the same
   Makefile targets, in this order, and all must pass: `make gate`,
   `make install`, `make build`, `make test`, `make lint`, `make a11y`,
   `make publish-guard`, `make drift` (`.github/workflows/ci.yml`, job `check`).
   `make drift` is the byte-stability proof for the keyless fixture path.
2. Merge the branch's PR into `main` (the promotion). Its post-conditions:
   - the merge commit is on `origin/main`;
   - `ci.yml`'s `check` job runs on the resulting `push` and passes;
   - `ci.yml`'s `deploy` job then runs `make install-docs` and `make deploy-docs`,
     which builds the VitePress site under `docs/` and deploys it to the
     `research-docs-staging` Worker serving <https://staging-research.qmu.co.jp>.
     It is gated on `github.event_name == 'push'`, `github.ref ==
     'refs/heads/main'` and `github.repository == 'qmu/research'`, so no pull
     request — and no fork — deploys. It carries `CLOUDFLARE_API_TOKEN` and
     `CLOUDFLARE_ACCOUNT_ID`; those secrets exist only in that job's environment.
     A failed deploy fails the workflow run.
3. Post-merge handoff to the corporate site per ADR 0003 and CLAUDE.md's
   Deploy section: `npm run research:site -- write-indexes` in `packages/tech`,
   `scripts/publish-research.sh copy --all`, then generate the publish ticket
   into the sibling `qmu-co-jp` worktree with
   `npm run research:site -- qmu-ticket` and run `/drive` there. The corporate
   deploy is owned by the `qmu-co-jp` repository.

## Confirmation

Three checks, and **all three** are required. The first two are about the commit;
the third is about the running site, and they are not interchangeable — "the
commit is on `main`" does not mean "the deployed site is serving that commit".

**1. Readiness (pre-merge).** The step-1 target list above is green at the branch
HEAD.

**2. Promotion (post-merge).** The merge commit is present on `origin/main`:

```
$ git ls-remote origin main
<merge-sha>	refs/heads/main
```

**3. Deployment (post-merge).** Both halves:

*The deploy job for that exact commit succeeded.* Read the run keyed to the
merge sha, not merely the latest run:

```
$ gh api "repos/qmu/research/actions/runs?branch=main&event=push&head_sha=<merge-sha>" \
    --jq '.workflow_runs[0].id'
$ gh api "repos/qmu/research/actions/runs/<run-id>/jobs" \
    --jq '.jobs[] | select(.name=="deploy") | {conclusion, steps: [.steps[].name]}'
```

Expected: `"conclusion": "success"` with a `Deploy the preview site` step. Last
observed on `200a657` — run `32179520697`, job `95849504591`, the deploy step
running 19:59:15Z→19:59:31Z on 2026-08-18 and concluding `success`.

*The site responds.* An HTTP probe of the endpoint, plus one assertion that what
answered is this build rather than a placeholder:

```
$ curl -fsS -o /dev/null -w '%{http_code}\n' https://staging-research.qmu.co.jp/
200
$ curl -fsS https://staging-research.qmu.co.jp/en/ | grep -o '<meta name="robots"[^>]*>'
<meta name="robots" content="noindex, nofollow">
```

**Probe the meta tag on `/en/`, not on `/`.** Since the site became
locale-routed, `/` is a static redirect stub to `/en/` (`docs/public/index.html`)
and carries its own hard-coded robots tag, so a tag found there proves only that
the stub was copied. `/en/` is the English top page — a rendered VitePress page,
which is what makes the tag below a signal about the origin build.

**Do not assert on `/robots.txt`.** Cloudflare serves the zone's Managed
robots.txt ahead of the origin file, so the response is not the `Disallow: /`
this repository builds and a confirmation keyed to it fails on a healthy deploy
(concern `20260819044612-the-deployed-robots-txt-is-cloudflare-managed-not-the-one-this-repository-ships`).
The robots **meta tag** above is emitted by the VitePress build itself
(`docs/.vitepress/config.ts`, driven by `DOCS_PUBLIC_HOSTNAME`) and reaches the
browser unmodified, which is what makes it a usable signal that the origin build
is what answered.

The site carries no commit marker, so the strongest available assertion that it
is serving *this* commit is content: a page the merge added or changed is
reachable at its slug and shows the new text. Check that when the merge touched
`docs/`; say so when it did not.

**Who runs it.** Anyone shipping from an environment with outbound access to
`staging-research.qmu.co.jp`. An unattended runner whose network policy denies
that host (the `[Implement]` container does — `curl` returns
`CONNECT tunnel failed, response 403` from the agent proxy) can still run check 3's
first half through the GitHub API, and must report the HTTP probe as **unrun**.
It must never infer the site's state from the merge: that inference is the whole
defect this section exists to prevent.

**The failure mode, stated.** A green merge with a red `deploy` job is **not** a
confirmed deployment. Nothing rolls back on its own — the previously deployed
build stays live at the endpoint, so the site keeps answering `200` while serving
an older commit, and check 2 alone would report success. Recovery is the path in
CLAUDE.md's *Staging preview → Recovery*: re-run the `deploy` job on the last
good `main` commit, or run `make deploy-docs` from that commit locally. The same
applies in reverse — a merge that deploys broken content is live until the next
merge.
