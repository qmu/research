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

1. **Preview site** — `make docs` builds the VitePress site under `docs/`. It is a
   static site; deploy the build output to the configured static host.
2. **Foundational research** — `make publish` runs `scripts/publish-research.sh`,
   which copies finished `docs/research-reports/<slug>.md` into
   `../qmu-co-jp/docs/research/<slug>.md`. The corporate site (Astro) then renders
   it at `/research/<slug>`. Commit and deploy `qmu-co-jp` separately from its own
   repository.

CI must be green before merge to `main` (type-check, tests, lint, dependency
audit, and — once the site lands — an accessibility check).
