---
created_at: 2026-07-06T10:50:42+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure, Config]
effort: 2h
commit_hash: 2aa9fb0
category: Added
depends_on: 20260706102837-ship-and-follow-up-llm-comparison-redesign.md
---

# Recurring, incremental LLM-comparison sweeps with historical benchmark storage and error recovery

## Overview

Today `npm run compare` sweeps the entire 15-model × effort matrix (47 configs)
from scratch and **overwrites** a single `llm-model-comparison.data.json` +
`.md`. There is no history, no merge, and no way to re-measure a subset without
losing every config not selected — so the sweep is all-or-nothing, expensive to
repeat, and keeps no record over time. It is also a fact that a real sweep leaves
**errored configs** (7 at last run) permanently zeroed, because nothing ever
re-runs or resolves them.

This ticket makes the comparison a **recurring, on-demand, incremental** research
instrument that (1) can re-benchmark an **explicit list** of configs cheaply and
**merge** the results into the canonical latest record without disturbing the
rest, (2) **stores a historical benchmark** so results are a time series, not a
single snapshot, and (3) **covers the errored configs** so the record ends up
with no unresolved errors — both by re-running transient failures and by
resolving the structural ones.

There is **no scheduler** (owner decision): recurrence is the owner running a
documented command on demand ("when I say go"). Nothing auto-spends API budget.

## Design decisions (per owner, 2026-07-06)

1. **History = compact series + latest full** (Q1). Git keeps ONE canonical
   latest full-fidelity `.data.json` (report source of truth, unchanged path) PLUS
   an append-only compact per-config metric history (`*.history.json`), plus each
   run's full raw record archived **gzipped** under `history/`. Nothing is lost;
   the repo does not grow by ~1.2 MB of uncompressed JSON per run.
2. **Refresh = explicit list, not a TTL engine** (Q2). No automatic staleness
   policy. A run re-benchmarks the configs named **on the command line**
   (`--models` / `--effort`, an exact `--configs` key list, or `--only-errored`
   which derives the list from the latest record's errored cells) and **merges**
   into the latest record. Full-refresh remains available (no selector = today's
   whole-matrix behavior).
3. **Trigger = on-demand only** (Q3). No cron, no cloud routine, no CI schedule.
   Add plain documented commands (npm scripts + a `make` passthrough) the owner
   invokes manually. The keyless `compare:fixture` stays the CI step, byte-stable.

## Policies

- `workaholic:implementation` / `objective-documentation.md` — a merged record
  must stay honest: every cell keeps its own provenance (`measured` / `fixtured`
  / `error`) and its own measured-at timestamp; a partial keyless run must never
  overwrite a real `measured` cell with a `fixtured` one; a cap-limited reading
  stays ">= cap".
- `llm-comparison-artifact-full-record` (project memory) — merging happens at
  **ConfigRun granularity**, so each merged cell keeps its full per-call raw
  capture. The artifact stays the complete record from which any detail level
  renders; history points link back to the archived full record, never replace it.
- `workaholic:design` / `vendor-neutrality.md` — any per-provider fix for the
  errored configs (effort levels a model rejects, a streaming+structured
  incompatibility) stays behind `vendors/llm/` + the registry, never in `domain/`.
- `workaholic:operation` / `ci-cd.md` — CI stays keyless and deterministic;
  `compare:fixture` ×2 must remain byte-identical. History/merge writes must be
  no-ops (or fixture-stable) on the fixture path so CI does not churn.

## Key Files

- `packages/tech/src/entrypoints/run-llm-model-comparison.ts` — CLI/IO wiring:
  add the merge load (`--merge` default when a selector is present), `--only-errored`,
  `--configs`, and the history-append + gzip-archive writes. Owns run policy; no
  domain logic.
- `packages/tech/src/llm-model-comparison/domain/types.ts` — add a per-config
  `measuredAt` (and optionally a `runId`) to `ConfigRun`; add the compact
  `HistoryPoint` / `HistoryEntry` types and a `HistoryFile` shape.
- `packages/tech/src/llm-model-comparison/domain/merge.ts` (**new, pure**) —
  `mergeConfigs(previous, fresh, policy)`: key by `id`+`effort`, replace only the
  selected cells, apply the "don't downgrade measured→fixtured" rule, keep the
  rest. Unit-tested with a throwing/edge fixture set.
- `packages/tech/src/llm-model-comparison/domain/history.ts` (**new, pure**) —
  `toHistoryPoint(run)` (compact projection: provenance + metric means + cost +
  measuredAt), `appendHistory(file, entry)`, `selectErrored(configs)`. Pure; the
  entrypoint does the gzip + file IO.
- `packages/tech/src/llm-model-comparison/domain/report.ts` — optional trend
  column/section rendering deltas vs the previous history point; per-config
  measured-at surfaced at `full` detail.
- `packages/tech/src/llm-model-comparison/models.ts` +
  `packages/tech/src/vendors/llm/{anthropic,openai}.ts` — resolve the structural
  errors (see Step 5).
- `packages/tech/package.json` (+ root `Makefile` if a passthrough is wanted) —
  `compare:repair` (`--only-errored`) and a documented `compare:merge` usage.

## Implementation Steps

Ordered so the owner's explicit "cover errored models" lands first.

1. **Per-config provenance-safe merge (foundation).** New pure `merge.ts`:
   `mergeConfigs(previous, fresh)` keyed by `id`+`effort`. Rule: a fresh cell
   replaces the previous one **only** when it is at least as authoritative
   (`measured` replaces anything; `error`/`fixtured` never overwrites a
   `measured`); unselected previous cells pass through untouched. Add `measuredAt`
   to `ConfigRun` so a merged artifact records when each cell was measured. Full
   unit coverage incl. the downgrade-guard.

2. **`--only-errored` + explicit `--configs` selection.** Entrypoint reads the
   existing latest `.data.json` (when present), and when a selector is given runs
   only those configs then merges (Step 1) instead of overwriting. `--only-errored`
   derives the config set from the latest record's `provenance === "error"` cells
   (via `selectErrored`). `--configs id-effort,…` targets exact keys. No selector
   = full-matrix overwrite (unchanged). This is the "re-benchmark a list I give
   you" path.

3. **Historical benchmark storage.** After a run, append a compact `HistoryPoint`
   per config (timestamp/runId, provenance, metric means, cost) to
   `docs/research-reports/llm-model-comparison.history.json`, and archive the full
   merged artifact gzipped to `docs/research-reports/history/<ISO>.data.json.gz`.
   Latest `.data.json` stays uncompressed and canonical. Fixture path stays
   byte-stable (pinned timestamp, deterministic/no-op archive) so CI does not
   churn.

4. **On-demand commands + docs.** `package.json`: `compare:repair`
   (`compare -- --only-errored`) and document `compare -- --models … --effort …`
   for a targeted merge. Optional `make compare-repair` passthrough. README/topic
   note: "recurrence = run this when you want a fresh point; nothing is scheduled."

5. **Resolve the 7 structural errored configs (cover them for real).** Re-running
   alone will not fix errors that are structural. Diagnose each:
   - **Haiku 4.5 rejects `effort` (×3)** — Haiku has no reasoning-effort knob.
     Either drop the effort levels it cannot honor from its `models.ts` card (so
     the matrix stops generating impossible configs) or map them behind
     `vendors/llm/anthropic.ts` to a no-effort call. Decide with the owner; keep
     it in the ACL/registry, not the domain.
   - **OpenAI `minimal` effort on the streaming+structured path (×4)** — confirm
     whether this is a genuine API incompatibility (then drop `minimal` from those
     cards or document it as capability-absent) or an **adapter bug** in
     `vendors/llm/openai.ts` (then fix it so the config measures). Prefer the fix
     if it is ours.
   After Step 5 a `--only-errored` re-run should leave **zero** `error` cells that
   are actually resolvable, and any remaining non-measured cell is an honest,
   documented capability gap — not a silent failure.

6. **(Optional) Report trends.** Render a delta vs the previous history point
   (throughput/latency/schema up or down) and per-config measured-at at `full`.

## Considerations

- **Merge honesty is the load-bearing invariant.** The one bug that would matter
  is a partial keyless (`fixtured`) run silently overwriting real `measured`
  numbers, or an `--only-errored` re-run that still errors quietly clobbering the
  prior error record with a worse one. The downgrade-guard in Step 1 and full
  unit coverage are the mitigation.
- **Determinism / CI.** Every new write path must be a no-op or fixture-stable on
  `--fixture` so `compare:fixture` ×2 stays byte-identical. History append + gzip
  archive should be skipped or pinned under `--fixture`.
- **Stale committed artifacts (pre-existing).** The committed `.data.json`/`.md`
  are one commit behind HEAD (old single `maxSchemaComplexity` column, pre
  depth/breadth split). A fresh `compare:fixture` regenerates them; do this as
  part of landing so the fixture baseline matches HEAD source.
- **Scope boundary.** This ticket is the engine + error coverage, independent of
  the `ship-and-follow-up` ticket's "ship the branch" primary action. It can be
  built and shipped on its own; it supersedes that ticket's optional Step 2
  (error cleanup) by making error coverage a first-class, repeatable capability.

## Quality Gate

- `--only-errored` re-benchmarks only the errored configs and merges them into the
  latest record without touching any other cell; after Step 5 no resolvable error
  remains.
- A targeted `--models/--effort` (or `--configs`) run merges into — never
  overwrites — the latest `.data.json`; a `fixtured` cell never replaces a
  `measured` one.
- `llm-model-comparison.history.json` grows by one point per config per run; full
  raw records are archived gzipped under `history/`; latest `.data.json` stays the
  full-fidelity canonical record.
- `compare:fixture` ×2 byte-identical; `npm test` (tsc + vitest, incl. new
  `merge`/`history` unit tests), `npm run lint`, `make build` all green.

## Final Report

Development completed as planned, with two scoped deferrals recorded below.

Delivered: pure `domain/merge.ts` (downgrade-guarded merge keyed by id+effort) and
`domain/history.ts` (compact projection + `selectErrored`), `measuredAt` on
`ConfigRun`, `HistoryPoint`/`HistoryEntry`/`HistoryFile` types; entrypoint wiring
for `--only-errored` / `--configs` / merge-into-latest on any selector, plus a
non-fixture history-append + gzipped full-record archive; Haiku 4.5 effort fix
(registry `n/a` + adapter omit); `compare:repair` script; regenerated byte-stable
fixture baseline (matrix 47→45). Verified: `npm test` 90 pass (13 new), `npm run
lint` + `make build` green, `compare:fixture` ×2 byte-identical, and E2E under
fixture (merge preserves the full 45-config matrix; `--only-errored` drives an
injected error to zero; a keyless run writes an append-only history + a valid
gzip archive whose full trials/calls decompress intact).

**Deferred (per approval):**

- Step 5 second half — the 4 OpenAI `minimal`-effort errors are left as documented
  findings rather than resolved. OpenAI's API behavior for `reasoning_effort:
  "minimal"` on the streamed/structured probe path could not be verified without a
  live run, and encoding a speculative "drop minimal" or adapter change would be an
  unverified API claim. `--only-errored` against real keys is now the diagnosis
  tool: a repair run that still errors confirms the limit is structural (then drop
  `minimal` from those cards); one that succeeds proves it was transient.
- Step 6 (optional) — report trend-delta rendering. `measuredAt` is captured per
  config in the artifact, but the report does not yet render deltas vs the previous
  history point.

### Discovered Insights

- **Insight**: The `--only-errored` repair path doubles as the structural-vs-
  transient diagnosis mechanism. Re-running the errored set against live keys and
  observing whether the cells clear tells you which errors are real API limits
  (keep as findings / drop the config) vs transient failures — without any separate
  tooling.
  **Context**: This is why the OpenAI `minimal` question is safe to defer: the
  engine built here IS the way to answer it, so no speculative API claim is needed.
- **Insight**: The merge downgrade-guard must rank `fixtured` and `error` EQUAL
  (both below `measured`), not `fixtured` above `error`. A keyless partial run
  produces `fixtured` cells; if `fixtured` outranked `error` it would overwrite a
  prior honest error record with a meaningless keyless stand-in. Equal rank means
  neither a keyless run nor a re-errored repair can degrade what is already there.
  **Context**: The one subtle correctness point in `merge.ts`; the downgrade-guard
  unit tests pin both directions.
- **Insight**: `compare:fixture` must skip the history-append + gzip-archive
  entirely (not merely pin the timestamp). Those writes GROW files per invocation,
  which would break the byte-stable CI self-test even with a deterministic
  timestamp. History is a real-run-only side effect.
  **Context**: Gating on `!forceFixture` (not on "selector present") is what keeps
  the keyless CI path deterministic while real runs accumulate the time series.
