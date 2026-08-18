---
created_at: 2026-08-18T12:22:49+00:00
author: a@qmu.jp
assignees: [a@qmu.jp]
depends_on: 20260818122248-deploy-the-docs-worker-from-ci-on-every-merge-to-main.md
mission: auto-deploy-the-docs-site-to-a-cloudflare-worker-on-merge-to-main
merge_policy:
verification_handoff: Binding the custom hostname and confirming it serves needs Cloudflare account and DNS access for qmu.co.jp
---

# Serve the deployed Worker at staging-research.qmu.co.jp

## Overview

<!-- PROPOSED. -->

The feedback names the hostname: `staging-research.qmu.co.jp`. A deployed Worker
answers on its `*.workers.dev` name by default, which is not what was asked for.
This ticket binds the custom hostname, settles what the site says about its own
URL, and states who may reach it.

`qmu.co.jp` is the corporate site's zone (that site is itself a Cloudflare Worker,
per `CLAUDE.md`), so this touches a zone this repository does not own — the reason
the unit carries a verification handoff and lands with a person.

## Policies

- `workaholic:operation` / delivery paths and runtime behavior — the served surface and its recovery
- `workaholic:design` — access control: who may read a staging surface
- `workaholic:safety` — what is exposed at a public hostname

## Key Files

- `docs/wrangler.jsonc` — the custom-domain / route entry for the Worker.
- `docs/.vitepress/config.ts` — `sitemap.hostname` is `https://research.qmu.dev`,
  which does not match this hostname and does not match qmu.co.jp either; decide
  here what the staging build should advertise (and whether staging should emit a
  sitemap or be marked `noindex` at all).
- `CLAUDE.md` — the Deploy section records delivery surfaces; the staging URL and
  its access rule belong there.
- `docs/adr/0003-vitepress-preview-astro-publish-boundary.md` — states this
  repository previews and qmu-co-jp publishes. A hosted preview does not change
  that; if the reviewer thinks it blurs the boundary, the ADR gets a short
  amendment rather than a silent contradiction.

## Implementation Steps

1. Bind `staging-research.qmu.co.jp` to the Worker (custom domain in
   `wrangler.jsonc`, with the DNS record in the `qmu.co.jp` zone), and record who
   holds that access.
2. Settle the search-engine question for a staging surface: at minimum prevent
   indexing (robots response or `noindex`), and align or disable
   `sitemap.hostname` so the built site does not advertise a hostname it is not
   served from.
3. Apply the access decision from Open Decisions below (open, or gated).
4. Confirm the deployed site serves end to end: the English index, the Japanese
   index, and a per-topic report page each resolve, and `cleanUrls` paths work
   through the real hostname rather than only through `vitepress preview`.
5. Record the URL, the access rule, and the recovery step (redeploy from `main`)
   in `CLAUDE.md`'s Deploy section.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- `https://staging-research.qmu.co.jp/` serves the site built from `main`'s
  latest merge.
- Both indexes and at least one per-topic report page resolve, with working
  in-site navigation and no mixed/broken asset paths.
- The staging surface is not indexable, and the built site advertises no
  hostname it is not served from.
- The URL and its access rule are documented in the repository.

**Verification method** — the commands/tests/probes that prove them:

- `curl -I https://staging-research.qmu.co.jp/` and the same for one report path
  — expect 200 and the expected content type.
- A browser pass over both indexes and one report page.
- Compare the deployed build against the `main` commit it should match.

**Gate** — what must pass before approval:

- The checks above, run by someone with access to the hostname; CI green on the
  configuration change itself.

## Considerations

- Hostname and DNS changes in the corporate zone can affect the production site
  if made carelessly; the change is a new subdomain record only.
- If the account cannot host a second Worker under this zone, the fallback is the
  default `*.workers.dev` hostname, which satisfies the deploy but not the ask —
  report that back rather than substituting it silently.

## Open Decisions

- **Is `staging-research.qmu.co.jp` open to anyone, or gated (e.g. Cloudflare
  Access / basic auth)?** The feedback names the hostname and nothing about
  access. The site carries unpublished draft reports and internal documents
  (`docs/adr/`, `docs/research-development-guideline.md`), so "public preview of
  work in progress" and "internal review surface" are genuinely different
  products and this session cannot recommend one. The driving session resolves it
  explicitly with the requester and records the resolution in its Final Report.
