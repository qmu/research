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

1. **Preview site** — `make docs` serves the VitePress site under `docs/`. The
   site exposes `LLMs Research` (English source reports) and `LLMs Research
   (Japanese)` in the same topic order. The order and labels come from
   `packages/tech/src/research/domain/site.ts`, not parallel hand-written lists.
2. **Foundational research** — each topic is runnable through `npm run research
   -- <topic> --real` or its topic-specific npm script. After a run, use
   `npm run research:archive -- <topic> --generated-at <iso>` to keep the
   current English Markdown, data artifact when present, and Japanese Markdown as
   a dated frame under `docs/research-reports/history/<topic>/<timestamp>/`.
   `npm run research:translate-report -- <topic> --estimate` prices the
   full-report Japanese translation; running it without `--estimate` writes the
   Japanese page configured in the shared metadata. `npm run research:site --
   write-indexes` regenerates the English and Japanese indexes from the same
   metadata.
3. **Corporate copy** — `scripts/publish-research.sh copy --all` gets its ordered
   source/destination plan from `npm run research:site -- copy-plan` and copies
   Japanese Markdown into
   `../qmu-co-jp/docs/llm-foundation-research/<name>.md`. The corporate site
   (Astro) renders the copies; commit and deploy `qmu-co-jp` separately. See
   `docs/adr/0003-*` for the boundary.

### Reflecting research changes onto `qmu-co-jp` (via `/ship`)

Publishing does not edit `qmu-co-jp` directly — that repo has its own writing
conventions (である体), docker Astro build, and `/ship` deploy. Instead, this
repo's `/ship` generates a **publish ticket** into the sibling `qmu-co-jp` repo,
and a `/drive` there applies it. As part of `/ship`, after the PR is merged:

1. Refresh the published Markdown and indexes from the shared metadata:
   `npm run research:site -- write-indexes` in `packages/tech`, then
   `scripts/publish-research.sh copy --all` (or a single slug), so
   `../qmu-co-jp/docs/llm-foundation-research/*.md` matches this repo's Japanese
   reports and order.
2. Locate the `qmu-co-jp` checkout as a **sibling of this repo** (`../qmu-co-jp`).
   **If there is no `qmu-co-jp` repo at the same directory level, ask the user**
   for its path.
3. **Ask the user which `qmu-co-jp` worktree** to generate the ticket in
   (`git -C <qmu-co-jp> worktree list`); if there is only one, use it.
4. Write a ticket into that worktree's `.workaholic/tickets/todo/` using
   `npm run research:site -- qmu-ticket` as the ordered payload. The ticket tells
   qmu-co-jp to copy/delete Markdown, update navigation and JP/EN indexes in the
   same order, verify with the docker Astro build, then commit and deploy via
   that repo's own `/ship` (`scripts/deploy.sh`).
5. **Tell the user to run `/drive` in `qmu-co-jp`** to apply the ticket.

CI must be green before merge to `main` (type-check, tests, lint, dependency
audit, and — once the site lands — an accessibility check).
