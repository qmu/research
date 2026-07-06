---
created_at: 2026-07-06T20:19:30+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure, Config]
effort: 4h
commit_hash:
category: Added
depends_on:
---

# Commit real-run comparison history to the repo and render the report from it

## Overview

The LLM-comparison engine can already record a time series and regenerate a report
from any artifact — but **no real data is committed**. What lives in git is only the
keyless fixture stand-in (`docs/research-reports/llm-model-comparison.{md,data.json}`
are all `provenance: fixtured`, pinned `2026-01-01`). So the real-data report the
owner wants is **not regenerable from the repo**: real numbers only ever lived in a
session-local generator (`scratchpad/gen-report.mjs`, gone) and the one-off Drive PDF
(`/My Drive/llm-model-comparison.pdf`).

This ticket persists **real** runs' history + full records into git — on paths
**separate** from the byte-stable fixture self-test — and adds a keyless command that
renders the **latest real snapshot** on demand. It realizes "generate the report
anytime with all updates over history" from committed repo state alone.

## Design decisions (per owner, 2026-07-06)

1. **Storage — compact history + gzip archives only.** Commit the small
   `llm-model-comparison.history.json` (per-config means, diff-friendly) + gzipped
   full-record archives under `docs/research-reports/history/`. Do **not** commit an
   uncompressed real `.data.json`/`.md`; the renderer reads the gzip archive.
2. **Report scope — latest real snapshot.** The on-demand render produces the newest
   committed real archive's report. A trend view over the series is explicitly OUT of
   scope (future follow-up; the committed `history.json` already supports it).
3. **Retention — cap N most-recent archives.** Prune older gzip archives on write
   (default `N` a documented constant, e.g. 20); `history.json` stays complete.
4. **Fixture untouched.** `compare:fixture` remains the keyless, byte-stable CI
   self-test; real data on separate paths must not perturb its diff. Real runs stay
   owner-triggered (no scheduler); the owner commits real artifacts deliberately.

## Policies

- `workaholic:operation` / `ci-cd.md` — CI runs only the keyless `compare:fixture`
  path and it stays **byte-identical**; real data on separate paths must not change
  that diff. Add a keyless, deterministic test for the render-from-archive + prune
  paths so CI covers them without keys or cost.
- `workaholic:implementation` / `objective-documentation.md` — a rendered real report
  flags provenance honestly (`measured` / `fixtured` / `error` / `">= cap"`); real
  numbers are real-run-only, never faked, and the report states which run/timestamp
  it reflects.
- `workaholic:implementation` / `directory-structure.md` + `coding-standards.md` —
  prune / latest-select / render-from-archive logic stays **pure** in `domain/`
  (`history.ts`); file IO / gzip stays in the entrypoint; no cross-layer leakage.
- `workaholic:design` / `vendor-neutrality.md` — no provider specifics touched;
  registry and adapters unchanged.

## Key Files

- `packages/tech/src/entrypoints/run-llm-model-comparison.ts` — `writeHistory()`
  (~line 335) already appends `history.json` + a gzip archive on non-`--fixture`
  runs and writes under `OUTPUT_PATH` (default the committed report path, ~line 373);
  extend it to **prune to N** and confirm real runs target the committed path (not a
  scratch `OUTPUT_PATH`). `FIXTURE_TIMESTAMP` (line 97) and the `forceFixture`
  branches (incl. the history-skip at ~line 535) stay as-is.
- `packages/tech/src/llm-model-comparison/domain/history.ts` — `buildHistoryEntry` /
  `appendHistory`; add a **pure prune helper** (given archive filenames, return the
  set to delete keeping the N newest) and a **pure "latest full record" selector**.
- `packages/tech/src/llm-model-comparison/domain/report.ts` — `renderComparisonReport`
  (line 317) already renders any artifact at any `DetailLevel`; reuse it for the
  archive render (no new render logic).
- **New render command** (e.g. `npm run compare:render` / a `--render-latest` flag):
  read the newest `history/*.data.json.gz`, gunzip → parse → `renderComparisonReport`,
  write a **real** report to a path SEPARATE from the fixture `.md` (e.g.
  `docs/research-reports/llm-model-comparison.real.md`; that rendered output is
  regenerable, so it may be gitignored — the committed source of truth is the gzip
  archive + `history.json`).
- `docs/research-reports/history/` — NOT gitignored (verified); where real archives +
  `history.json` land and are committed.
- `packages/tech/package.json` — add the render script.

## Implementation Steps

1. **Pin the path split.** Real runs write `history.json` + gzip archives under
   `docs/research-reports/history/`; the fixture `.md`/`.data.json` remain the
   byte-stable self-test. Choose the real-report output path (separate from the
   fixture) and its git status (rendered output is regenerable → may be gitignored;
   commit the gzip archive + `history.json` as the source of truth).
2. **Pure prune helper** in `domain/history.ts`: input the archive filenames (ISO
   stamps), keep the N newest, return those to delete. Unit-test (N boundary, fewer
   than N, ties).
3. **Wire pruning** into `writeHistory()` after the new archive is written — real
   runs only, never under `--fixture`.
4. **Render-from-latest command**: read newest `history/*.data.json.gz`, gunzip,
   `JSON.parse` to the artifact core, `renderComparisonReport(core, detail)`, write to
   the real-report path. Keyless (no API). Add `npm run compare:render`. Honest
   "no real archive yet" message when `history/` is empty.
5. **Keyless deterministic test**: from a committed fixture archive, the render path
   yields a stable report; the prune helper keeps exactly N; a test asserts neither
   path modifies the fixture `.md`/`.data.json`.
6. **Verify** (see Quality Gate).

## Considerations

- **Non-determinism is the whole reason** only the compact `history.json` + gzip
  archives are committed (owner decision) — an uncompressed real `.data.json` would
  be a large, churny diff every run. The uncompressed render output is regenerable
  and best gitignored.
- **Byte-stability guard:** the render command must never write to the fixture
  `.md`/`.data.json`; a test should assert `compare:fixture` output is unaffected.
- **Retention default N** is a documented constant; note that `history.json` keeps
  all means regardless, so pruning archives loses only old raw full-records, not the
  trend data.
- **Trend view is OUT of scope** (owner chose latest-snapshot) — a later ticket can
  add it from the already-committed `history.json`.
- The **Drive PDF** becomes a downstream render step once the real report is
  regenerable from the repo; refreshing it stays a separate, owner-gated action.
- Relates to ship ticket `20260706102837` step 5 (publish decision) and memory
  `llm-comparison-real-history-in-repo`. It also partially answers the redesign
  ticket's real-sweep-vs-fixture publish tension.

## Quality Gate

- A real `npm run compare` run **persists to git-committable paths**:
  `docs/research-reports/llm-model-comparison.history.json` gains a point and
  `docs/research-reports/history/` gains a gzip full-record archive, **pruned to the N
  most-recent**; those files are committed.
- `npm run compare:render` (**keyless**) reads the latest committed real archive and
  regenerates the real-data report **on demand** — no session-local generator, no
  Drive dependency — with every cell's provenance flagged honestly and the run
  timestamp stated.
- The **fixture self-test is untouched**: `compare:fixture` ×2 byte-identical, and a
  test asserts the render/prune paths do not modify the fixture `.md`/`.data.json`.
- New pure helpers (prune, latest-select) and the render path are unit-tested;
  `npm test` (tsc + vitest), `npm run lint`, and `make build` are all green.
