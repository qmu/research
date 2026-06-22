# 0003 — VitePress preview, Astro publish boundary

## Context

Research result pages need a local preview before they appear on the corporate
site qmu.co.jp. The request asked for a VitePress-style preview site. The
corporate site is a separate repository (`../qmu-co-jp`) built with Astro, which
renders Markdown from its repo-root `docs/<section>/<slug>.md` with minimal
frontmatter (`description`, optional `title`).

## Decision

- The research repository hosts its **own** VitePress preview site rooted at
  `docs/` (`docs/.vitepress/`), consuming `docs/research-reports/*.md`.
- Publishing is a one-directional **Markdown file copy**, not a shared framework
  or code import: `scripts/publish-research.sh` copies a finished result page to
  `../qmu-co-jp/docs/research/<slug>.md`, shaped to the Astro content schema.
- Finished research lands in a new `/research` section on the corporate site.

## Alternatives considered

- **Author directly in qmu-co-jp / share its Astro setup**: couples the research
  workflow to the corporate site's build and IA. Rejected — a thin copy boundary
  keeps the two repositories independent (vendor-neutrality).
- **Publish under the existing `/development` section**: rejected in favor of a
  dedicated, browsable `/research` section.

## Consequences

- The two sites use different frameworks; the only link is the copy script,
  which must emit Astro-shaped frontmatter (not VitePress front matter).
- The preview site and the corporate site can evolve independently.
