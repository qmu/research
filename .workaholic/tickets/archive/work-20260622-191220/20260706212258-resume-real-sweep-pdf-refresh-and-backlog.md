---
created_at: 2026-07-06T21:22:58+09:00
author: a@qmu.jp
type: housekeeping
layer: [Domain, Infrastructure, Config]
effort: 4h
commit_hash: f39b236
category:
depends_on:
---

# Resume: run the real sweep + refresh the Drive PDF (Grok), then the held ship + rag backlog

## DONE — PRIMARY action complete (2026-07-07, commit `f39b236`)

The PRIMARY action (seed Grok's real numbers + refresh the Drive PDF) is finished
and verified:

- **Full real sweep** at 1 trial (owner-confirmed cost ~$26/~4.5h): **59/59 configs
  measured live, 0 errored** — a cleaner run than the earlier 7-error sweep. All
  seven Grok cards measured (Grok 4.3 ×4, Grok 4.20 Reasoning/Non-Reasoning, Grok
  Build 0.1); Grok 4.3 hits **depth 48 / breadth 192 — both probe caps**.
- **Committed the real-data source of truth** (`f39b236`): `history.json` +
  `docs/research-reports/history/2026-07-06T13-08-50.282Z.data.json.gz`. The
  `.real.{md,data.json}` stay gitignored; the byte-stable fixture is untouched.
- **Gate green:** `compare:render` byte-identical, `compare:fixture` ×2 byte-stable,
  `npm test` (tsc + 96 vitest), `npm run lint`, `make build` all pass.
- **Drive PDF refreshed in place** (id `1ZWBHfH8NoxmOqzXjTAHKgqmgQ4f5_Lhp`, same
  link): 20-page A4 report, all 7 Grok cards, **md5-verified** byte-identical to the
  local render. Uploaded via `gdrive-ftp put … id:<parent>/llm-model-comparison.pdf`
  (the qfs `/local`→`/drive` federation is not yet wired for binary; the gdrive MCP
  token was expired). Rendered `.real.md` → standalone HTML (`marked` + print CSS) →
  Chromium `page.pdf()` via the Playwright MCP.

**Still open (own tickets, owner-gated — NOT done here):** SECONDARY = ship PR #15
(ticket `20260706102837`); BACKLOG = the 4 rag-benchmark tickets on a fresh branch.
Archiving this ticket because its unique deliverable is complete; the remainder lives
in those tickets.

## Resume context (carry checkpoint)

A `/carry` handoff written to continue in a fresh session without compaction.
**Nothing is half-written; the working tree is clean.** Do NOT re-implement the
items marked DONE below — pick up at the PRIMARY action.

### Position (verify first)

- Branch `work-20260622-191220`, HEAD **`0135c6c`**, **34 commits ahead of `main`**,
  working tree **clean**.
- **PR #15** (`https://github.com/qmu/research/pull/15`) is **OPEN, green, MERGEABLE,
  and HELD** — the owner chose "hold the ship" this session. It is the
  "LLM model-comparison instrument" release (see `.workaholic/stories/work-20260622-191220.md`).
- Todo queue (besides this ticket): the ship ticket `20260706102837` + four
  rag-benchmark tickets `202819`/`202820`/`202821`/`203035`.
- **No committed real comparison data yet** — `git ls-files docs/research-reports/history/*`
  is empty; the committed `llm-model-comparison.{md,data.json}` is the fixture
  stand-in (all `fixtured`, pinned `2026-01-01`).

### DONE this session (do NOT redo)

- **xAI Grok models added** (commit `1c734f1`): `grok-4.3` (effort none/low/medium/high),
  `grok-4.20-0309-reasoning` (`n/a` — live-verified it 400s on `reasoning_effort`),
  `grok-4.20-0309-non-reasoning` (`n/a`); retired `grok-code-fast-1` → `grok-build-0.1`.
  All four measure live.
- **Real-history capability built** (commit `0135c6c`, ticket
  `20260706201930-commit-real-run-history…`, now archived). See "Capability" below.
- PR #15 created + branch story updated to the full 30-commit arc.
- Tickets created: the four rag-benchmark tickets (foundation + 3 backends).

### Capability now available (built this session — use it)

- `npm run compare` (real, no `--fixture`): writes a **gitignored**
  `docs/research-reports/llm-model-comparison.real.{md,data.json}` **and commits-worthy**
  `llm-model-comparison.history.json` + a gzip full-record archive under
  `docs/research-reports/history/<stamp>.data.json.gz` (pruned to the 20 newest). It
  **no longer touches the byte-stable fixture** — scratch `OUTPUT_PATH` is no longer
  needed for real runs.
- `npm run compare:render` (`--render-latest`, **keyless**): regenerates the real
  report `.real.md` from the newest committed archive — "generate the report anytime
  from committed history" (verified byte-identical to the run's own render).
- `npm run compare:fixture`: the byte-stable committed CI self-test (unchanged).

## PRIMARY action — populate Grok's real numbers, then refresh the Drive PDF

This is why the owner paused here: the Drive PDF (`/My Drive/llm-model-comparison.pdf`,
id `1ZWBHfH8NoxmOqzXjTAHKgqmgQ4f5_Lhp`) has **no Grok** — it was rendered in an older
session before Grok existed, and the repo held only fixture data. The capability is
now in place; it just needs one real sweep to seed real data. **Owner-gated (real $$
+ hours) — confirm cost/trials before running.**

1. **Estimate, then run a full real sweep** (`XAI_API_KEY`/`OPENAI_API_KEY`/
   `ANTHROPIC_API_KEY`/`GOOGLE_API_KEY` are in `packages/tech/.env`):
   - `npm run compare -- --estimate --trials 1` — full matrix is **59 configs**;
     rough **~$26 / ~266 min (~4.5 h)** at 1 trial, **~$76 / ~13 h** at 3 trials.
   - Run in the **background** (`npm run compare -- --trials 1`, or `--trials 3`).
     It measures all models incl. the four Grok cards, writes `.real.{md,data.json}`,
     appends `history.json`, and archives the gzip full record (pruned to 20).
2. **Commit the real-data source of truth:** `git add docs/research-reports/history/
   docs/research-reports/llm-model-comparison.history.json` and commit. (The
   `.real.md`/`.real.data.json` are **gitignored** on purpose — regenerable.)
3. **Regenerate the report on demand:** `npm run compare:render` → the `.real.md`
   now shows Grok's real numbers.
4. **Refresh the Drive PDF:** render `.real.md` → HTML → PDF with a real browser and
   overwrite the Drive file (same id). **NOTE:** the old `scratchpad/gen-report.mjs`
   is GONE; use the `.real.md` output rendered via the `workaholic:explain` /
   Playwright-MCP HTML→PDF path, then upload via the Google Drive tools (qfs
   `/drive` or the gdrive MCP). A future ticket could add a `compare:pdf` step; for
   now this render+upload is manual.

## Secondary — the held ship of PR #15 (owner-gated)

When the owner wants to release the LLM-comparison instrument: run `/ship`. It will
**halt pre-merge** because there is **no production-confirmation path** (no
`.workaholic/deployments/` entry, no `CLAUDE.md ## Verify` section). The owner must
then choose: author a `.workaholic/deployments/` entry / provide a verify path /
inspect production, or deliberately merge-without-confirmation (recorded accepted
risk). Deploy steps (CLAUDE.md `## Deploy`): `make docs` build + `make publish`
(copies to `../qmu-co-jp`), which deploys separately. Note the push flagged
pre-existing Dependabot alerts on `main` (4 high / 5 moderate / 4 low) — not from
this branch, worth a look.

## Backlog — rag-benchmark (SEPARATE topic; new branch)

A new vector-store research topic, 4 tickets, dependency-ordered:
`202819 foundation-sqlite-vec` → then `202820 openai`, `202821 aws-s3-vectors`
(needs AWS creds), `203035 cloudflare-vectorize+autorag` (needs a Cloudflare account).
**Branch decision:** the owner wanted new-topic work OFF the LLM-comparison release —
so drive these on a **fresh branch** (after `#15` ships, off updated `main`; or a new
branch now), NOT piled onto PR #15. `#5`/`#6` render `fixtured` until their
credentials exist (honest).

## Policies

- `workaholic:operation` / `ci-cd.md` — keep `compare:fixture` the byte-stable keyless
  CI self-test; the real sweep never runs in CI. Committing real data means committing
  ONLY `history.json` + gzip archives (the `.real.*` outputs stay gitignored).
- `workaholic:implementation` / `objective-documentation.md` — a rendered real report
  flags provenance honestly (`measured`/`fixtured`/`error`/`">= cap"`), never faked;
  states the run timestamp it reflects.

## Quality Gate (for the PRIMARY action)

- A full real `compare` run completes; `docs/research-reports/history/` gains a gzip
  archive + `llm-model-comparison.history.json` a point, both **committed**; the
  byte-stable fixture is untouched (`compare:fixture` ×2 byte-identical).
- `npm run compare:render` regenerates `.real.md` showing **all four Grok cards with
  real `measured` numbers** (0 unexpected errors), and the Drive PDF is refreshed to
  match (same file id).
- `npm test` / `npm run lint` / `make build` remain green.
