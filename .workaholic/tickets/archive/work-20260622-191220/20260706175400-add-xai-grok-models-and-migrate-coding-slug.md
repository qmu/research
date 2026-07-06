---
created_at: 2026-07-06T17:54:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Config]
effort: 2h
commit_hash: 6943ae6
category: Added
depends_on: 20260706155233-add-coding-agent-models-codex-grok.md
---

# Add current xAI Grok models and migrate the deprecated coding slug

## Overview

The `xai` provider + a base-URL variant of the OpenAI adapter already exist (from
the coding-models ticket, which added `grok-code-fast-1`). This ticket broadens
xAI coverage to the current general Grok lineup — **registry-only**, no adapter
work — and fixes a deprecation the research surfaced.

Two things:

1. **Add the current xAI general models** (all on the OpenAI-compatible Chat
   Completions endpoint the adapter already reaches):
   - `grok-4.3` — flagship reasoning model; `reasoning_effort` `none`/`low`/
     `medium`/`high` (so one card fills an effort sweep: `none` = fast, `high` = deep).
   - `grok-4.20-0309-reasoning` — reasoning sibling.
   - `grok-4.20-0309-non-reasoning` — the fast / non-reasoning general model
     (best fit for a speed/structure/instruction test); **no effort knob → `n/a`**.
2. **Migrate the deprecated coding slug.** `grok-code-fast-1` was retired in xAI's
   **2026-05-15** model retirement — it currently auto-redirects to `grok-build-0.1`
   (which is why it still measured live) but hard-removes **~2026-08-15**. Replace
   the coding card `grok-code-fast-1` → `grok-build-0.1` (the current coding id).

The multi-agent "heavy" tier (`grok-4.20-multi-agent-0309`) is intentionally OUT
of scope: its `effort` means agent count (nested `reasoning.effort`) and billing
scales with agents — a separate, live-verify-first follow-up.

## Design decisions (per owner, 2026-07-06)

1. **3-model general shortlist** (`grok-4.3`, `grok-4.20-0309-reasoning`,
   `grok-4.20-0309-non-reasoning`) — clean reasoning-vs-non-reasoning spread; skip
   the multi-agent tier for now.
2. **Migrate `grok-code-fast-1` → `grok-build-0.1` in THIS ticket** — proactively
   fix the deprecated id rather than wait for the ~Aug-15 hard removal.

## Policies

- `workaholic:implementation` / `objective-documentation.md` — each new card is
  cited to xAI's docs and correct only as of its source; reasoning vs non-reasoning
  effort is declared honestly (`n/a` where there is no knob) so no config sends an
  unsupported effort (a 400). The deprecated id is removed, not left to rot.
- `workaholic:design` / `vendor-neutrality.md` — pure registry change; the xai
  adapter and the base-URL fact are untouched. No new dependency, no domain change.
- `workaholic:operation` / `ci-cd.md` — `compare:fixture` ×2 stays byte-identical
  after the registry change (regenerate the committed fixture baseline).

## Key Files

- `packages/tech/src/llm-model-comparison/models.ts` — the ONLY code file. Add the
  three `grok-4.*` cards under the `── xAI ──` section, and change the existing
  `xai-grok-code-fast-1` card's `apiModelId` (and id/modelName/cost/context note)
  to `grok-build-0.1`. Cite each to xAI docs. No changes to `vendors/llm/*`,
  `types.ts`, or the entrypoint — the `xai` provider + adapter already handle them.
- `docs/research-reports/llm-model-comparison.{md,data.json}` — regenerate the
  committed fixture baseline (`compare:fixture`) to include the new/changed cards.

## Implementation Steps

1. **Add `grok-4.3`** — provider `xai`, tier frontier/flagship, effort
   `["none","low","medium","high"]`, cost $1.25/$2.50, source
   `https://docs.x.ai/developers/models/grok-4.3`.
2. **Add `grok-4.20-0309-reasoning`** — provider `xai`, tier flagship, reasoning;
   effort `["low","medium","high"]` (the exact value set is not separately
   documented — VERIFY live and drop any level that 400s; `none` is 4.3-only).
   Cost $1.25/$2.50.
3. **Add `grok-4.20-0309-non-reasoning`** — provider `xai`, tier mid, effort
   `["n/a"]` (no reasoning knob), cost $1.25/$2.50.
4. **Migrate the coding card** — `xai-grok-code-fast-1` → id `xai-grok-build-0-1`,
   `apiModelId: "grok-build-0.1"`, modelName "Grok Build 0.1", cost $1.00/$2.00,
   effort `["n/a"]`, source `https://docs.x.ai/developers/models`. Remove the
   `grok-code-fast-1` card entirely.
5. **Regenerate + verify.** `compare:fixture` ×2 byte-identical; then a real
   targeted run (`XAI_API_KEY` is set + funded) — e.g. `compare -- --models
   xai-grok-4-3,xai-grok-4-20-0309-reasoning,xai-grok-4-20-0309-non-reasoning,xai-grok-build-0-1`
   — to confirm each measures `measured`, 0 errors, and that each declared effort
   level is accepted (drop any that 400).

## Considerations

- **Effort value uncertainty (verify live).** Only `grok-4.3`'s effort set is
  documented (`none`/`low`/`medium`/`high`). For `grok-4.20-0309-reasoning`, treat
  the effort levels as provisional — the live run in Step 5 is the source of truth;
  drop any level the API rejects (honest `n/a`/removal, never faked).
- **xAI moves fast.** A mass retirement already happened (2026-05-15). Treat these
  ids as correct-as-of-source; a future retirement may require another migration —
  the `--only-errored`/`--models` repair path surfaces a dead id as an honest error.
- **Reasoning-model param constraint.** xAI reasoning models reject
  `presence_penalty`/`frequency_penalty`/`stop` — the probes don't send these, so
  no change needed, but don't add them for xAI reasoning cards.
- **No adapter/probe changes.** Scored on the same generic probes as every other
  model; the multi-agent tier and any coding-specific probe stay out of scope.

## Quality Gate

- The three new `grok-4.*` cards and `grok-build-0.1` appear in the matrix and
  **measure live (`measured`, 0 errors)** via the existing xai adapter, verified by
  a real `--models` run with the funded `XAI_API_KEY`; any effort level the API
  rejects is dropped (honest), not faked.
- `grok-code-fast-1` no longer appears anywhere in the registry (fully migrated to
  `grok-build-0.1`).
- Every non-measured cell stays honestly flagged; no unsupported effort is sent.
- `compare:fixture` ×2 byte-identical (regenerated); `npm test` (tsc + vitest),
  `npm run lint`, and `make build` all green.
