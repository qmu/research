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
- **Proposal-first research.** A new or changed research topic starts from
  `docs/research-development-guideline.md`: the agent proposes cadence,
  subjects, metrics, cost/trial-count range, and accumulated history for
  developer approval before building; articles ship as a compact snapshot
  over dated uniform trial reports.

## Commands

Run `make help`. Common: `make install`, `make build`, `make test`, `make lint`,
`make docs`, `make publish`.

## Orchestration (control-master operation)

Since 2026-07-18, this repository orchestrates its own missions the way the
strategy HQ does. The session on the primary checkout
(`~/projects/research`, branch `main`) is the **control master**; it does not
edit files itself.

- **All writes happen on topic desks.** A desk is a worktree of this repository
  at `.worktrees/<topic>/` (already gitignored). One desk per session — never
  send two agents to the same desk. Branches are always cut with the **literal**
  name `work-YYYYMMDD-HHMMSS`; a guard rejects variable expansion in branch
  names. Desk conventions live in
  [.workaholic/desk-rules.md](.workaholic/desk-rules.md).
- **Parallel-first.** When independent work is visible (multiple desks to
  drive, drafting, investigation), fan it out to background agents at once
  instead of serializing. The control master keeps only the gates:
  AskUserQuestion for dispositions, PR merge approval, and integration of
  results.
- **Desk liveness is judged only by the launch ledger.** A subagent's Edit
  writes have no process, so `ps` shows nothing and md5 looks static between
  edits; neither proves a desk is unattended. A desk is free only when the
  ledger shows zero agents sent to it. To recover a stalled agent, either
  resume it or launch a replacement — never both.
- **`make` targets report failures — fixed, and guarded.** `make test`, `build`,
  `lint`, `install` and `format` used to run `@for p in $(PACKAGES); do (cd $$p
  && npm test); done`, whose exit status is the **last** iteration's, so a
  failure in `packages/tech` (first in `PACKAGES`) was structurally masked —
  `main` was genuinely red at `0b09ddc` while CI reported green. They now share
  one status-accumulating `for_each_package` shape that runs every package,
  names each one that failed, and returns non-zero. `make gate`
  (`scripts/check-make-gate.sh`, run first in `ci.yml`) proves this against a
  scratch fixture with the failure in first, middle and last position, so the
  masking cannot return unnoticed.
  Still prefer bare, unmasked exit codes when verifying — no `| tail`, no
  `|| true` — and note `packages/industry` has zero test files with
  `--passWithNoTests`, so its green is weak evidence on its own.
- **PRs are never self-merged.** Agents drive to commit + ticket archive only.
  PR creation and readiness judgment happen via /report; merge, deploy, and
  verification happen via /ship, after the developer names the PR number. Do
  not close work with a raw `gh pr create` plus an ad-hoc merge request.
- **Shell traps in this environment.** `noclobber` is set (use `>|` to
  overwrite); `cp` and `rm` are aliased (`cp -i`, trash-move) — use `/bin/cp`
  and `/bin/rm` deliberately; `diff` is aliased to nvim — use `/usr/bin/diff`;
  the shared scratchpad needs unique filenames; and `commit.sh` both drops
  unlisted new files and disables `add -u` when files are listed — stage
  everything first, run it with `--skip-staging`, then verify the commit stat.

## Deploy

This repository has four delivery surfaces:

1. **Preview site** — `make docs` serves the VitePress site under `docs/`. The
   site exposes `LLMs Research` (English source reports) and `LLM基礎検証`
   (Japanese articles) in the same topic order. The order and labels come from
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
   (Cloudflare Workers, built from `packages/site`) renders the copies; commit
   and deploy `qmu-co-jp` separately. See
   `docs/adr/0003-*` for the boundary.
4. **Hosted staging preview** — the same VitePress build, served from a
   Cloudflare Worker so a report is reviewable by URL without a checkout. This
   is a **preview** surface, not a publishing one: nothing about surface 3 or
   `docs/adr/0003-*` changes, and the published articles still reach readers only
   through `qmu-co-jp`. See *Staging preview* below.

Surfaces 1 and 4 are the same site: `docs/` previewed locally and the same build
hosted. Only surface 3 publishes.

### Staging preview (Cloudflare Worker)

- **Deploy** — `make deploy-docs` builds the site and deploys it to the
  `research-docs-staging` Worker. The whole path lives in the Makefile and
  `docs/wrangler.jsonc`; nothing invokes wrangler flags from a workflow file
  ("one runner"). `npm --prefix docs run deploy:dry` packages the built `dist`
  without contacting Cloudflare.
- **Credentials** — `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, supplied
  from the environment and never from the tree. `make deploy-docs` fails
  immediately and names the missing variable rather than exiting zero.

### Reflecting research changes onto `qmu-co-jp` (via `/ship`)

Publishing does not edit `qmu-co-jp` directly — that repo has its own writing
conventions (である体), a Cloudflare Workers build (Wrangler, `packages/site`),
and `/ship` deploy. Instead, this repo exports the Markdown and then **raises the
ordered plan as a GitHub issue on `qmu/qmu-co-jp`**, which that repo's own loop
ingests. As part of `/ship`, after the PR is merged:

1. Refresh the published Markdown and indexes from the shared metadata:
   `npm run research:site -- write-indexes` in `packages/tech`, then
   `scripts/publish-research.sh copy --all` (or a single slug), so
   `../qmu-co-jp/docs/llm-foundation-research/*.md` matches this repo's Japanese
   reports and order. The exporter skips every destination marked `downstream` in
   `scripts/publish-ledger.tsv` (`image-generation.md`, `agent-vm-comparison.md`)
   — those are written by the corporate side and the plan must ask for them
   rather than overwrite them. Commit the ledger afterwards; it records what was
   emitted, and the next run's divergence check reads it as its baseline.
2. Locate the `qmu-co-jp` checkout as a **sibling of this repo** (`../qmu-co-jp`).
   **If there is no `qmu-co-jp` repo at the same directory level, ask the user**
   for its path.
3. Raise the plan with **`/fb <the ask> to qmu/qmu-co-jp`**, using
   `npm run research:site -- qmu-ticket` as the ordered payload. The carrier is a
   GitHub issue on that repository — **never a file written into its checkout**;
   `hooks/guard-repo-confinement.sh` refuses every other route, and composing a
   file there with a shell redirect to evade it is the bypass the guard exists to
   prevent. The ask tells qmu-co-jp to copy/delete Markdown, update navigation and
   JP/EN indexes in the same order, verify with the site build (`npm run build` in
   `packages/site`), then commit and deploy via that repo's own `/ship`
   (`scripts/deploy.sh`, which runs `npm run deploy` = build + `wrangler deploy`
   to Cloudflare Workers).
4. **Tell the user to run `/drive` in `qmu-co-jp`** to apply it.

**Live blocker (2026-08-12) — `qmu/workaholic#384`.** The outbound backstop
refuses the generated payload: two of its lines carry this repository's basename
as an ordinary English word — the emitter's heading
(`packages/tech/src/research/domain/site.ts:1331`) and the published article title
`Deep research APIs`, which cannot be reworded because it doubles as the
destination's sidebar label. Until that lands, step 3 cannot send the payload
verbatim. Step 1 has already placed the files in the sibling checkout, so the
interim path is a `/drive` there over those working-tree changes.

The route was `/request`, writing a ticket into the sibling repo's
`.workaholic/tickets/todo/`, until 2026-08-05; that command and its
`submit-request.sh` no longer exist. Archived artifacts naming it are history.

CI must be green before merge to `main` (type-check, tests, lint, dependency
audit, and — once the site lands — an accessibility check).
