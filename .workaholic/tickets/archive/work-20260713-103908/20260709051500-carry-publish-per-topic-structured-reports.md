---
created_at: 2026-07-09T05:15:00+09:00
author: a@qmu.jp
type: housekeeping
layer: [UX, Config, Infrastructure]
effort:
commit_hash:
category:
depends_on:
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# Carry: per-topic structured reports are built — publish them + follow-ups

Resumption checkpoint written by `/carry` at the end of a long session. The
per-topic pipeline **mission is functionally complete and committed**; what
remains is outward-facing publishing (owner action) and a small set of optional
follow-ups. **No code is mid-edit — the working tree is clean.**

## ⚠️ Availability topic is being redesigned — see ticket 20260709052000

The owner flagged (2026-07-09) that the **availability topic's design is wrong**:
it makes live LLM API probes, but it should only **read providers' public
status/health pages and record + summarize** them (no API keys). This is now a
dedicated ticket
`20260709052000-availability-status-page-observation.md`. **Do NOT regenerate the
current availability report as-is (Step 1 publish / Step 4 recipe below):** the
`可用性の観測` structured report and the availability pipeline are superseded by
that ticket — do it first, then publish. Everything else in this carry stands.

## Position (verified 2026-07-09)

- Branch `work-20260622-191220`, **71 commits ahead of `main`**; **PR #15 is
  OPEN** ("Initialize research monorepo and build the LLM model-comparison
  instrument"), not a draft. Working tree **clean** (`git status --porcelain`
  empty).
- This session added **12 commits** `8f72cb6..c0a4ba3` (newest last):
  - `8f72cb6` Guarantee RAG teardown on error paths (ticket 20260708200000)
  - `7de604d` unified `research <topic>` CLI skeleton (20260709022000)
  - `d8f1afd` LLM insights report generator (20260709022001)
  - `321dd5d` Japanese auto-translation stage (20260709022002)
  - `90f11d9` split compare into speed/accuracy (20260709022003)
  - `efc5f83` connect insights+translation to RAG/OCR/availability (20260709022004)
  - `279a7bb` non-benchmark reference topics (20260709022005)
  - `585e9a4` surface per-topic EN sources; resolve orphan (partial 20260709022006)
  - `2b9b8a6` generate real per-topic insights + JP for all topics
  - `56d4067` make generated per-topic reports the site main line
  - `834ade8` point publish boundary at per-topic reports
  - `c0a4ba3` **publish well-organized structured reports per topic** (current head)
- All mission tickets `20260709022000`–`022006` and `20260708200000` are
  **archived** under `.workaholic/tickets/archive/work-20260622-191220/`.
- Only **one ticket remains in `todo/`** besides this carry:
  `20260706102837-ship-and-follow-up-llm-comparison-redesign.md` (the ship
  decision — owner-deferred standing item, see Step 3 below).
- Gate is green at head: `cd packages/tech && npm test` (223 tests), `npm run
  lint`, and repo-root `make build` (VitePress, no dead links). All six keyless
  fixtures are byte-stable.

## What the site/reports look like now (the corrected deliverable)

The owner course-corrected mid-session: the earlier short LLM-prose
`*.insights.md` were the WRONG shape. The published deliverable is the
**exporter's structured Japanese report** format (like
`qmu.co.jp/llm-foundation-research/foundation-model-comparison`): numbered
sections, per-metric ranked tables, a full measurement table, reading guidance,
and a closing `考察` section holding the LLM analysis over the same numbers.

- `scripts/export-corporate-research.mjs` now writes **four committed structured
  reports** to `docs/llm-foundation/`: `foundation-model-comparison` (speed +
  accuracy combined), `vector-db-comparison`, `availability-comparison` (new,
  no-ranking health-probe), `ocr-comparison` (new). Each splices its `考察` from
  `docs/research-reports/<topic>.insights.ja.md`.
- Site nav/sidebar (`docs/.vitepress/config.ts`) + JP landing
  (`docs/llm-foundation/index.md`) point at those four + the catalog
  (`foundation-models.insights.ja`) + `agent-sdk-comparison`. Live at
  `research.qmu.dev` (preview serves `docs/.vitepress/dist`; run `make build`
  after any change).

## Key Files

- `scripts/export-corporate-research.mjs` — the structured-report generator
  (`exportLlm`/`exportRag`/`exportOcr`/`exportAvailability`, `kousatsuSection`,
  `insightBody`). Writes committed reports to `docs/llm-foundation/`; reads
  `docs/research-reports/<base>.real.data.json` then falls back to the fixture.
- `scripts/publish-research.sh` — `copy --all` copies `$PUBLISHED_REPORTS` (the
  four reports + agent-sdk + JP catalog) to `../qmu-co-jp/docs/llm-foundation-research/`.
- `packages/tech/src/research/` — the `research <topic>` CLI: `domain/topic.ts`
  (registry), `insights-runner.ts` / `translate-runner.ts` (LLM stages, prefer
  `.real.data.json` on real mode), `domain/insights.ts` / `domain/translate.ts`.
- `packages/tech/src/llm-model-comparison/domain/{split,split-report,catalog}.ts`.
- `docs/adr/0003-*` and `CLAUDE.md` `## Deploy` — describe the structured-report
  publish boundary (updated this session).

## Implementation Steps (remaining — do these in a fresh `/drive`)

1. **Publish to the corporate site (owner action, outward-facing — confirm
   first).** `sh scripts/publish-research.sh copy --all` copies the four
   structured reports + agent-sdk + catalog into `../qmu-co-jp/docs/
   llm-foundation-research/`. It was **verified by `--dry-run` only** this
   session; the real copy was NOT run. After copying, review and commit/deploy
   `qmu-co-jp` from its own repo. Note the existing corporate file is named
   `vector-store-comparison.md` while this repo emits `vector-db-comparison.md` —
   reconcile the corporate filename during review.
2. **(Optional, ~$46, owner-gated) Fresh full `compare` sweep.** The
   `foundation-model-comparison` report uses the **2026-07-06** real sweep
   (`llm-model-comparison.real.data.json`), which **predates the
   information-accuracy probe**, so that column is absent (same as the current
   corporate page). To include it: `cd packages/tech && npm run compare --
   --estimate` then `npm run compare`, then re-run the exporter (Step 4 recipe)
   to refresh the report + `考察`.
3. **Ship decision (owner) — ticket `20260706102837`.** PR #15 is open and 71
   commits ahead; shipping was explicitly owner-deferred. When ready: `/report`
   to refresh the PR/story, then `/ship` to merge and run the `## Deploy` steps.
   The branch keeps growing — a merge-risk argument for shipping soon.

## Considerations / gotchas for the next agent

- **`*.real.data.json` are gitignored and session-local.** On disk now:
  llm-model-comparison / llm-speed / llm-accuracy / rag-benchmark / ocr-comparison
  / llm-availability. A fresh clone will NOT have them; regenerating the
  structured reports then requires real runs first (keys in `packages/tech/.env`,
  which HAS a live `ANTHROPIC_API_KEY` + OpenAI/Google/xAI/Cloudflare).
- **Availability has no `.real` split** — its entrypoint writes the canonical
  `llm-availability.{md,data.json}` for both fixture and real, and appends to the
  shared `llm-model-comparison.history.json`. To regenerate its structured report
  without corrupting the committed fixture: run `research availability --real`,
  `cp docs/research-reports/llm-availability.data.json
  docs/research-reports/llm-availability.real.data.json`, then
  `git checkout docs/research-reports/llm-availability.md
  docs/research-reports/llm-availability.data.json
  docs/research-reports/llm-model-comparison.history.json`. The exporter reads the
  `.real` copy.
- **Regenerate-reports recipe:** ensure each topic's `.real.data.json` exists
  (real runs), generate each `考察` source
  (`research <topic> --real` writes `<topic>.insights.ja.md`; for the combined
  foundation-model use the `llm-model-comparison` topic's insight, which is not a
  registered pipeline stage — generate it by calling
  `runInsightsStage`/`runTranslationStage` directly, see how `2b9b8a6` did the
  standalone rag translation), then `node scripts/export-corporate-research.mjs`.
- **RAG real runs**: AutoRAG teardown is now code-guaranteed and was **confirmed
  on the real path this session (0 leaked resources after `npm run rag:sweep`)**,
  but still watch stderr for `[rag-benchmark] teardown warning` and run
  `npm run rag:sweep` if any appear. See memory `rag-real-run-autorag-r2-leak`.
- **Translation numeric-preservation** now retries-then-warns (does not hard-fail
  the batch) and extracts magnitude-only numbers, so word hyphens (`per-1k`,
  `GPT-5`) no longer false-positive. If a real `考察` translation warns about a
  missing figure on stderr, review that one file.
- The prose `*.insights.md` / `*.insights.ja.md` under `docs/research-reports/`
  are now the **`考察` source**, demoted from the site main line but still
  committed and built as orphan pages (reachable by URL, not in nav).

## Quality Gate

- No new gate for the carry itself. When the follow-ups are done: `npm test`,
  `npm run lint`, `make build` green; all keyless fixtures byte-stable; publish
  dry-run lists exactly the four reports + agent-sdk + catalog; and any real run
  leaves zero `rag-bench-*` cloud resources.

## Resolution (2026-07-13, archived without further work)

Superseded and completed by later drives on `work-20260622-191220`: the
availability redesign shipped as tickets `20260709052000` +
`20260709120000`, the publish boundary and per-topic pipeline were reworked
(`20260709190517`, `20260709223740`, `20260710002018`, `20260712031500`), and
PR #15 merged with the result published to qmu-co-jp as v0.1.0. The remaining
outward-facing follow-up is the owner's editorial feedback, tracked as
`20260713103908-qmu-co-jp-editorial-alignment.md`.
