---
created_at: 2026-06-22T19:12:16+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, Config]
effort: 1h
commit_hash: ae688a1
category: Added
depends_on: [20260622191214-initialize-research-monorepo-skeleton.md]
---

# Add the qmu-co-jp markdown publish pipeline

## Overview

Add a repository-level script that copies finished research result markdown out
of this repo into the sibling `../qmu-co-jp` Astro site so it appears on the
corporate site as foundational research. The script is the one-directional
integration boundary between the two repos; it must emit plain markdown shaped
to the Astro content collection's schema, not VitePress front matter.

**Decision (per user):** finished research lands in a new `/research` section —
`qmu-co-jp/docs/research/<slug>.md` (clean URL `/research/<slug>`), distinct from
the existing `docs/development/foundational-research.md` policy article.

Covers request item 4.

## Key Files

- `scripts/publish-research.sh` - Verb-named repository-wide script (directory-structure: `scripts/` holds `[verb]-****.sh`) that copies selected `docs/research-reports/<slug>.md` into `../qmu-co-jp/docs/research/<slug>.md`. Idempotent; validates frontmatter before copying.
- `../qmu-co-jp/packages/astro/src/content.config.ts` - The Astro `docs` collection (`glob` base `../../docs`, schema `{title?, description?, layout?}`) — the contract the emitted markdown must satisfy. Reference only; do not modify from this repo.
- `../qmu-co-jp/docs/development/foundational-research.md` - Template for the house article shape (frontmatter = `description:` line; body = H1 + sections). Reference for the expected page structure.
- `Makefile` - Wire the reserved `publish` target to `scripts/publish-research.sh`.
- `docs/adr/0003-vitepress-preview-astro-publish-boundary.md` - Record the copy-boundary decision and the `/research` section choice (created/extended here).
- `.github/workflows/` - Run the publish step as an automated, reproducible CI stage.

## Implementation Steps

1. Write `scripts/publish-research.sh` to take a research-report slug (or `--all`), read `docs/research-reports/<slug>.md`, and write `../qmu-co-jp/docs/research/<slug>.md`. Create the `research/` section directory on first run and (optionally) a `research.md` section landing alongside it, matching the folder=section / file=slug convention.
2. Transform/validate frontmatter to the Astro schema: keep `description` (required by house convention) and optional `title`; strip any VitePress-only front matter/layout markers so the page renders cleanly under Astro's `[...slug]` route.
3. Make the script idempotent and safe: it overwrites only the target `research/` files it manages, never touches `qmu-co-jp/docs/development/` or other sections, and reports what it copied. Before overwriting an existing target, confirm it is a previously-published research page (not a hand-authored qmu-co-jp article).
4. Wire the `Makefile` `publish` target to the script and add an automated publish stage to CI (ci-cd: deployment has automated stages; the corporate-site copy runs reproducibly, not from operator memory).
5. Document the boundary in `docs/adr/0003-...`: one-directional copy, Astro-shaped output, `/research` section, no cross-repo code imports.

## Considerations

- Output must conform to `qmu-co-jp/packages/astro/src/content.config.ts` (`description`/optional `title`, plain markdown) — NOT VitePress front matter; a mismatch means the page fails to render or gets a wrong URL (`scripts/publish-research.sh`).
- The pipeline is one-directional (research → qmu-co-jp) and the only link between the repos is a file copy, never a code import (vendor-neutrality: keep the integration boundary thin).
- The script writes only under `qmu-co-jp/docs/research/`; it must never modify the existing `docs/development/foundational-research.md` or other corporate-site content (`scripts/publish-research.sh`).
- This depends on the foundation ticket's `scripts/` dir, `Makefile` `publish` target, and `docs/research-reports/` convention. It is conceptually paired with the preview site (`20260622191215`): the site previews the same markdown this script publishes, but it can be implemented independently of the site.
- Public-repo licensing: any third-party data or quotations in a published report must carry attribution before it goes to the corporate site (legal-compliance policy; verify in the report itself).
