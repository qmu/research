---
created_at: 2026-07-06T10:28:37+09:00
author: a@qmu.jp
type: housekeeping
layer: [Domain, Infrastructure, Config]
effort:
commit_hash:
category:
depends_on:
---

# Ship the LLM-comparison redesign branch, then optional research follow-ups

## Ship deferred by owner — 2026-07-08

**Decision (owner, 2026-07-08 drive):** shipping is **deferred**. PR #15 stays
open; do **not** merge mid-drive. The ship decision re-queues to **after the
current drive lands more of the research-platform queue**. This satisfies the
Quality Gate's "OR the owner explicitly defers shipping" branch — the ticket
stays in `todo/` as a standing ship decision, not archived, until the owner
ships.

Several of the optional follow-ups below have since been split into their own
dedicated tickets and are being worked in this drive:

- **Step 2 (7 honest error configs):** the Haiku-4.5 `effort` rejection is
  **resolved** by `20260707195944-cover-llm-effort-na-foundation-models` (Haiku
  now uses `effort: "n/a"`; adapters omit the param). The OpenAI `minimal`
  streaming+structured failure is still open.
- **Step 4 (statistical rigor / 3-trial sweep):** now
  `20260708143652-llm-comparison-multi-trial-confidence`.
- **Step 5 (publish decision):** now the publishing/IA tickets
  `20260708182154` (IA reorg), `20260708182159` (boundary reversal),
  `20260708182155` (VitePress canonical site).

### Position (verify first)

- Branch `work-20260622-191220`; **PR #15 is OPEN** ("Initialize research
  monorepo and build the LLM model-comparison instrument"). As of 2026-07-08 the
  branch is **~45 commits ahead of `main`** (was 24 at carry time; the count
  keeps growing as this drive commits — a merge-risk argument for shipping
  sooner rather than later, but the owner has chosen to defer).
- Original carry note (stale): "24 commits ahead of `main`, and there is NO PR
  yet." Superseded — PR #15 now exists.
- The redesign ticket
  `.workaholic/tickets/archive/work-20260622-191220/20260705001543-redesign-llm-comparison-probes.md`
  is implemented and archived. Relevant commits (newest first):
  - `e8c6763` Trim schema-probe caps to depth 48 / breadth 192 (just above real limits)
  - `5e78529` Adaptive per-axis JSON-schema probe (replaces the fixed 6-rung ladder)
  - `2739ddd` Stream per-config progress during the real sweep
  - `711a5b7` Per-call timeout so one stalled request can't freeze the sweep
  - `726b003` Redesign: throughput/latency split, schema sweep, effort matrix, judge reviews
- Verify green before shipping: `cd packages/tech && npm test` (tsc + 77 vitest),
  `npm run lint`, `make build`; `npm run compare:fixture` twice → byte-identical
  report + artifact (incl. the deterministic fixture judge). All were green at
  carry time.
- **A real sweep was run** (keys in `packages/tech/.env`; 1 trial; trimmed caps;
  40/47 configs measured, 7 honest errors). Its report/artifact were **NOT**
  committed — the committed `docs/research-reports/llm-model-comparison.md` is the
  deterministic **fixture** self-test (CI regenerates it via `compare:fixture`,
  so it must stay byte-stable). The real numbers live in the run artifact and in
  the published Drive PDF (below).
- **Drive**: `/My Drive/llm-model-comparison.pdf`
  (id `1ZWBHfH8NoxmOqzXjTAHKgqmgQ4f5_Lhp`) was overwritten in place with the
  real-data report (13 pages, same link). The PDF was rendered from the run
  artifact via `scratchpad/gen-report.mjs` → a served HTML → Playwright MCP
  `page.pdf()` → `gdrive-ftp put`. That scratchpad is session-local and gone; the
  generator would need to be re-created to re-render.

### Real-run findings (the point of the redesign — real per-provider limits)

The adaptive per-axis probe replaced the useless "everything hits 6/6". Tested
maxima (n=1): Anthropic (Fable 5 / Opus 4.8 / Sonnet 5) **depth 21, breadth 72**;
Google Gemini **depth 15, breadth ≥192 (hit cap)**; OpenAI GPT-5.x **depth 10,
breadth ≥192 (hit cap)**; o4-mini depth 10→5 and breadth 3→0 (collapses on wide
schemas); GPT Realtime 0/0 (no JSON-schema mode). The 7 errors: Haiku 4.5 rejects
the `effort` param (×3); OpenAI `minimal` effort failed on the streaming +
structured path (×4).

## Policies

- `workaholic:operation` / `policies/ci-cd.md` — CI must be green (tsc, tests,
  lint, dep audit, a11y) before merge to `main`; the keyless `compare:fixture`
  stays the CI step. Do not commit real-sweep (non-deterministic) data to the
  fixture report.
- `workaholic:implementation` / `policies/objective-documentation.md` — any error
  config (Haiku effort, OpenAI minimal) stays flagged, never faked; a cap-limited
  reading is reported as ">= cap", not as the true max.
- `workaholic:design` / `policies/vendor-neutrality.md` — any per-provider tuning
  (effort levels, breadth caps) stays behind `vendors/llm/` + the registry, not in
  the domain.

## Key Files

- `.workaholic/tickets/archive/work-20260622-191220/20260705001543-redesign-llm-comparison-probes.md` — the completed redesign ticket (full spec).
- `packages/tech/src/llm-model-comparison/domain/json-schema.ts` — the per-axis escalation state machine (`startAxisProbe`/`advanceAxis`) and conformance grader.
- `packages/tech/src/entrypoints/run-llm-model-comparison.ts` — `PROBE.schemaProbe` caps (depth 48 / breadth 192), the effort matrix, cost estimate, and `--estimate`/`--models`/`--effort`/`--detail`/`--trials` flags.
- `packages/tech/src/llm-model-comparison/models.ts` — the registry (effort levels per model; the Haiku `effortLevels` are what error).
- `packages/tech/src/vendors/llm/{anthropic,openai,google,openai-realtime,fixture}.ts` — the adapters (effort mapping, structured output, streaming for TTFT).
- `docs/research-reports/llm-model-comparison.md` (+ `.data.json`) — the committed **fixture** report/artifact; CI-regenerated, must stay byte-stable.

## Implementation Steps

1. **Ship the branch (primary).** Re-verify the gate (`npm test`, `npm run lint`,
   `make build`, `compare:fixture` ×2). Then `/report` to create the PR + release
   story for `work-20260622-191220` (24 commits), then `/ship` to merge and run
   the `## Deploy` steps. This is the main outstanding action; shipping is an
   owner decision — confirm before merging.
2. **(Optional, owner-gated) Clean the 7 honest error configs.** Decide per the
   owner: either drop the unsupported effort levels from `models.ts` (Haiku 4.5
   has no `effort` knob; OpenAI `minimal` failed on the streaming+structured
   path — confirm whether it's a real incompatibility or an adapter bug) so those
   configs stop erroring, or keep them as documented findings. If it's an adapter
   bug, fix behind `vendors/llm/`.
3. **(Optional, owner-gated) Pin the true breadth for OpenAI/Google.** Both
   cleared the breadth cap (192 → reported ">= 192"). Raise `schemaProbe.breadth.cap`
   (globally or per-provider) to find their real limit — note it is slower/costlier
   (larger schemas). Anthropic's breadth 72 is already a real measured limit.
4. **(Optional, owner-gated) Statistical rigor.** The real run was n=1
   (indicative). A 3-trial sweep (`npm run compare` default trials, ~$46, run
   `--estimate` first) gives mean ± spread. CI never runs the real sweep.
5. **(Optional) Publish decision.** The real numbers are only in the Drive PDF +
   artifact. If the owner wants them on qmu.co.jp (`make publish`), reconcile with
   the fixture-report/CI-byte-stability design first — publishing real,
   non-deterministic data conflicts with the committed fixture self-test.

## Quality Gate

- Branch shipped: PR merged to `main`, CI green, deploy steps run — OR the owner
  explicitly defers shipping.
- Any follow-up (steps 2–5) leaves `compare:fixture` byte-stable, tsc + vitest +
  lint + `make build` green, and every non-measured cell flagged honestly.
