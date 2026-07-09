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
2. **Foundational research** — the reader-facing pages are generated structured
   Japanese reports under `docs/llm-foundation/` (`foundation-model-comparison`,
   `vector-db-comparison`, `availability-comparison`, `ocr-comparison`).
   `scripts/publish-research.sh generate` runs the exporter
   (`scripts/export-corporate-research.mjs`), which builds each report from the
   real measurement artifact — numbered sections, per-metric ranked tables, a
   full measurement table — and splices in the topic's LLM `考察` section (from
   `docs/research-reports/<topic>.insights.ja.md`). Publishing to the corporate
   site is a one-directional copy: `scripts/publish-research.sh copy --all` copies
   the four reports, the hand-written `agent-sdk-comparison`, and the JP catalog
   into `../qmu-co-jp/docs/llm-foundation-research/<name>.md` as plain Markdown;
   it never copies the keyless fixture data reports (the reproducible source). The
   corporate site (Astro) renders the copies; commit and deploy `qmu-co-jp`
   separately. See `docs/adr/0003-*` for the boundary.

### Reflecting research changes onto `qmu-co-jp` (via `/ship`)

Publishing does not edit `qmu-co-jp` directly — that repo has its own writing
conventions (である体), docker Astro build, and `/ship` deploy. Instead, this
repo's `/ship` generates a **publish ticket** into the sibling `qmu-co-jp` repo,
and a `/drive` there applies it. As part of `/ship`, after the PR is merged:

1. Refresh the published Markdown: `scripts/publish-research.sh generate`, then
   `scripts/publish-research.sh copy --all` (or a single slug), so
   `../qmu-co-jp/docs/llm-foundation-research/*.md` matches this repo's reports.
2. Locate the `qmu-co-jp` checkout as a **sibling of this repo** (`../qmu-co-jp`).
   **If there is no `qmu-co-jp` repo at the same directory level, ask the user**
   for its path.
3. **Ask the user which `qmu-co-jp` worktree** to generate the ticket in
   (`git -C <qmu-co-jp> worktree list`); if there is only one, use it.
4. Write a ticket into that worktree's `.workaholic/tickets/todo/` that describes
   what to reflect: which reports changed, wiring any new pages into
   `packages/astro/src/data/navigation.ts` and the JP/EN
   `docs/llm-foundation-research.md` index pages (in that repo's である体 stance,
   with `<small class="updated">` status lines), reconciling the
   `vector-store`/`vector-db` naming, verifying with the docker Astro build, then
   committing and deploying via that repo's own `/ship` (`scripts/deploy.sh`).
5. **Tell the user to run `/drive` in `qmu-co-jp`** to apply the ticket.

CI must be green before merge to `main` (type-check, tests, lint, dependency
audit, and — once the site lands — an accessibility check).
