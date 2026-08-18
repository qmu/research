---
created_at: 2026-08-18T12:22:47+00:00
status: done
author: a@qmu.jp
assignees: [a@qmu.jp]
depends_on:
mission: auto-deploy-the-docs-site-to-a-cloudflare-worker-on-merge-to-main
merge_policy:
verification_handoff: 
---

# Build the docs site into a deployable Cloudflare Worker artifact

## Overview

<!-- PROPOSED. -->

The VitePress site under `docs/` builds today (`make build` runs `npm run build`
in `docs/`, emitting `docs/.vitepress/dist`) but nothing packages it for hosting:
there is no `wrangler.*` config anywhere in this repository and no deploy target
in the `Makefile`. This ticket adds the artifact half only — a Worker that serves
the built site's static assets, invocable locally — so the CI trigger
(the next ticket) and the hostname (the third) have something to deploy.

Everything here is local and dry-runnable; no Cloudflare account is touched.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout
- `workaholic:implementation` / `policies/coding-standards.md` — style and structure conventions
- `workaholic:operation` / delivery paths — the deploy path belongs in the repository, not in workflow YAML

## Key Files

- `Makefile` — `make build` already builds the docs site; the deploy target joins
  the same runner (the repository's "one runner" convention: CI invokes `make`,
  never inline build logic).
- `docs/package.json` — holds `dev`/`build`/`preview`/`a11y`; a `deploy` script
  and the `wrangler` devDependency belong here, beside the site they serve.
- `docs/.vitepress/config.ts` — `base` is already environment-driven
  (`DOCS_BASE ?? "/"`), so a root-served Worker needs no change; `sitemap.hostname`
  is `https://research.qmu.dev`, which the staging surface will contradict.
- `docs/.gitignore` / repository ignore rules — `.vitepress/dist` and
  `.wrangler/` must stay untracked.

## Implementation Steps

1. Add `wrangler` as a devDependency of `docs/` and a `docs/wrangler.jsonc`
   naming the Worker (e.g. `research-docs-staging`), with the static-assets
   binding pointed at `.vitepress/dist` and a `compatibility_date`. Use the
   Workers static-assets shape rather than Pages — the ask names a Worker, and
   `qmu-co-jp` already deploys its site as a Worker via Wrangler, so the account
   conventions and tooling are shared.
2. Confirm `not_found_handling` serves the built 404 page and that `cleanUrls: true`
   (already set in the VitePress config) resolves extensionless paths as served by
   the assets runtime — VitePress's own `preview` server is not proof of this.
3. Add `docs/package.json` scripts: `deploy` (`wrangler deploy`) and
   `deploy:dry` (`wrangler deploy --dry-run`), so nothing invokes wrangler flags
   from a workflow file.
4. Add a `deploy-docs` target to the `Makefile` beside `docs`/`a11y`, building
   first and then deploying, and list it in `make help` via the `## ` comment.
5. Ignore `docs/.wrangler/` and keep `docs/.vitepress/dist` untracked.
6. Record the surface in `CLAUDE.md`'s Deploy section as a third delivery
   surface — a hosted *preview*, explicitly not a publishing surface — so
   ADR 0003's boundary (this repo previews; qmu-co-jp publishes) still reads
   correctly with a hosted staging site in the picture.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- `make deploy-docs` exists, appears in `make help`, and fails loudly when
  credentials are absent rather than exiting zero.
- A dry run packages the built `dist` without contacting the Cloudflare API.
- No build logic lives in workflow YAML; the deploy runs through `make`.
- `make build`, `make lint` and `make a11y` stay green.

**Verification method** — the commands/tests/probes that prove them:

- `make build && npm --prefix docs run deploy:dry` — succeeds offline and names
  the asset directory it packaged.
- `make help | grep deploy-docs`.
- `git status --short` after a build shows no `dist/` or `.wrangler/` noise.

**Gate** — what must pass before approval:

- CI green (`make gate`, `install`, `build`, `test`, `lint`, `a11y`,
  `publish-guard`, `drift`).

## Considerations

- The Worker name is durable once bound to a hostname; picking it here rather
  than in the CI ticket keeps the third ticket to DNS and routing.
- Adding `wrangler` to `docs/` grows that project's dependency tree; the
  dependency-decisions record (`docs/dependency-decisions.md`) is where the
  choice is justified.
- `sitemap.hostname` and the staging hostname disagree. Leave the sitemap alone
  here — it describes the published site, not staging — and decide it in the
  hostname ticket, where the served URL is actually known.

## Final Report

Development completed as planned.

The artifact half is in place: `docs/wrangler.jsonc` describes an assets-only
Worker (`research-docs-staging`) pointed at `.vitepress/dist`, `docs/package.json`
gained `deploy` / `deploy:dry` and the `wrangler` devDependency, and
`make deploy-docs` is the single entry point CI will invoke. No Cloudflare
account was touched.

Step 2's confirmation was run against the real assets runtime rather than
assumed: `wrangler dev` served the built `dist` locally on 127.0.0.1:8799 and
`/`, `/research-reports/`, `/research-reports/llm-benchmark` and `/glossary` all
returned 200 `text/html` (so `cleanUrls: true` links resolve to the emitted
`<page>.html`), while `/no-such-page` returned 404 through
`not_found_handling` — wrangler logged the branch by name.

Two resolutions worth recording:

- **`deploy-docs` builds before deploying** rather than consuming a `dist` some
  earlier step left behind. The ticket asked for this and the CI/CD policy wants
  the same delivery reproducible from any machine; the cost is one extra
  `vitepress build` (~13s) in the deploy job.
- **The credential check runs before the build**, not after. Wrangler's own
  failure on a missing token comes a minute later and, in a runner, arrives as an
  interactive-login error; naming the unset variable in the first second is the
  loud failure the gate asked for.

### Discovered Insights

- **Insight**: `make help` silently omits any target whose name contains a digit.
  **Context**: the recipe greps `^[a-zA-Z_-]+:.*?## `, so `a11y` has never
  appeared in the help output even though it carries a `## ` comment. Found while
  checking that `deploy-docs` shows up. Minted as ticket
  `20260818124500-make-help-omits-targets-whose-names-contain-a-digit.md`.
- **Insight**: an assets-only Worker (no `main`, only `assets.directory`) is a
  complete deployable, and `wrangler dev` runs it offline with no credentials.
  **Context**: this makes the served behavior of a static site testable in CI and
  locally — `vitepress preview` proves nothing about `html_handling` or
  `not_found_handling`, which are the assets runtime's, not VitePress's.
- **Insight**: `npm install` under this container's npm 10.9.7 strips `libc`
  fields from lockfiles written by a newer npm.
  **Context**: `make install` dirtied `packages/tech` and `packages/industry`
  lockfiles with pure churn; both were reverted. Expect this on any branch that
  runs `make install` here, and check `git status` before committing.
