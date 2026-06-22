---
created_at: 2026-06-22T19:12:15+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Infrastructure]
effort: 1h
commit_hash: b94209f
category: Added
depends_on: [20260622191214-initialize-research-monorepo-skeleton.md]
---

# Add the VitePress research preview site

## Overview

Add a markdown-based documentation site (VitePress, per the request) to the
research repo so researchers can preview result pages locally before they are
published to the corporate site. The site is rooted at the repo-root `docs/`
directory so it consumes the same research-report markdown that the
`directory-structure` policy already locates there — VitePress config lives in
`docs/.vitepress/`. This is the research repo's **own** preview surface and is
independent of qmu.co.jp (which is Astro); the bridge between them is a plain
markdown copy handled by `20260622191216`.

Covers request item 3.

## Key Files

- `docs/.vitepress/config.ts` - Site config: title, nav/sidebar IA, `vite.server.allowedHosts` for the Cloudflare tunnel host (`research.qmu.dev` or similar), and an env-driven base path (ref `/home/ec2-user/projects/plgg/packages/guide/.vitepress/config.ts` — the only VitePress site in the org).
- `docs/package.json` - VitePress scripts `dev`=`vitepress dev`, `build`=`vitepress build`, `preview`=`vitepress preview`; own lockfile, `private: true`, `type: module` (ref `/home/ec2-user/projects/plgg/packages/guide/package.json`).
- `docs/index.md` - Site landing page describing how to browse research results.
- `docs/research-reports/` - Where finished research result markdown lives and is rendered (consumed later by the publish pipeline).
- `Makefile` - Wire the reserved `docs` target to `vitepress dev`/`build` (created in `20260622191214`).
- `.github/workflows/ci.yml` - Add the docs build + an automated accessibility check (Axe/Lighthouse) as a required check.

## Implementation Steps

1. Add VitePress as a project rooted at `docs/` (`docs/.vitepress/config.ts`, `docs/package.json` with `dev`/`build`/`preview`), mirroring the `plgg/packages/guide` setup but for prose research pages rather than generated API docs.
2. Define the sidebar/nav IA as the contract for browsing research, with a section for `research-reports/`. Author `docs/index.md` and an empty-state-aware landing so a reader with no published reports yet still understands the site (self-explanatory-ui: design loading/empty/error/success states).
3. Ensure output is semantic HTML with a clean, stable heading hierarchy and anchors so both screen-reader/keyboard users and AI agents can reach and cite results by section (accessibility-first: WCAG 2.2 AA floor; AI as information consumer).
4. Set `vite.server.allowedHosts` for the dev tunnel host and an env-driven base path for any static hosting, following the plgg config pattern.
5. Wire the `Makefile` `docs` target to the VitePress scripts; add the docs build and an automated Axe/Lighthouse accessibility check to CI as required checks (ci-cd: accessibility verification in CI).

## Considerations

- The preview site is VitePress; the corporate site (qmu.co.jp) is Astro — do not assume a shared framework. The integration is a markdown file copy, not a code import (`docs/`, see `20260622191216`).
- Rooting VitePress at `docs/` (rather than a `packages/` project like plgg) keeps the site consuming the policy-mandated `docs/research-reports/` markdown directly; record this in an ADR if it diverges from the plgg precedent (`docs/adr/`).
- Labels must use reader vocabulary and every state (loading/empty/error/success) must be designed; no icon-only controls (self-explanatory-ui policy, `docs/.vitepress/config.ts`).
- Heading anchors must be stable so AI agents can reference a result by page + section (accessibility-first policy).
- The accessibility check belongs in the same CI that builds the site, not a manual step (`.github/workflows/ci.yml`).
