# CLAUDE.md

Guidance for AI agents and developers working in this repository.

## What this is

Public, reproducible foundational research for qmu.co.jp. Research topics ship as
runnable code under `packages/`; result pages are Markdown under
`docs/research-reports/`, previewed with VitePress and published to the corporate
site (`../qmu-co-jp`) as a one-directional Markdown copy.

## Conventions

- **No workspaces.** `packages/tech/` and `packages/industry/` are each a single,
  independent npm project with its own `package-lock.json` and `tsconfig.json`.
  There is no root `package.json`. See `docs/adr/`.
- **One npm project per group, topics as subfolders.** A new research topic is a
  subfolder under a package's `src/`, not a new package. See the package
  `TEMPLATE.md` files.
- **Layered `src/`.** Per the coding-standards policy, keep pure logic in
  `domain/`, thin CLI runners in `entrypoints/`, and external SDK access behind
  anti-corruption layers in `vendors/`.
- **One runner.** All common operations run through `make`; CI invokes the same
  targets. Do not put build logic inline in workflow YAML.
- **Objective docs.** Write reports and docs in factual, verifiable language.

## Commands

Run `make help`. Common: `make install`, `make build`, `make test`, `make lint`,
`make docs`, `make publish`.

## Deploy

This repository has two delivery surfaces:

1. **Preview site** — `make docs` builds the VitePress site under `docs/`, which
   is the canonical public home of the `LLM基礎検証` Japanese articles
   (`docs/llm-foundation/`). It is a static site; deploy the build output to the
   configured static host.
2. **Foundational research** — this repository holds the source of truth for the
   finished Japanese articles; publishing to the corporate site is a
   one-directional copy. `scripts/publish-research.sh generate` runs the exporter
   (`scripts/export-corporate-research.mjs`) to write regenerable data-skeleton
   drafts into `docs/llm-foundation/_generated/` (gitignored), and
   `scripts/publish-research.sh copy [--all|<slug>]` copies the canonical
   `docs/llm-foundation/<slug>.md` articles into
   `../qmu-co-jp/docs/llm-foundation-research/<slug>.md` as plain Markdown. The
   corporate site (Astro) then renders them; commit and deploy `qmu-co-jp`
   separately from its own repository. See `docs/adr/0003-*` for the boundary.

CI must be green before merge to `main` (type-check, tests, lint, dependency
audit, and — once the site lands — an accessibility check).
