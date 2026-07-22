---
created_at: 2026-07-14T01:30:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash: 82ff282
category: Added
mission: periodic-research-target-computer-use-via-playwright
depends_on: [20260714010000-computer-use-via-playwright-topic.md]
gate: owner-triggered-real-trial
---

# Computer Use: implement the real Playwright harness loop and run the first real trial (guideline step 3)

> **GATED — owner-triggered.** This is the paid, real-model step the
> proposal-first protocol keeps for the owner (guideline §Step 3, within the
> approved **$40/trial** ceiling). It is deliberately separate from the keyless
> build (`20260714010000-computer-use-via-playwright-topic.md`, done): the fixture
> path, estimate, and published EN/JP pages already ship; only the real
> observe→think→act browser loop and the first measured trial remain.

## Overview

The keyless build wired the `computer-use` topic end to end (domain scoring,
`ComputerUseClient` port, keyless fixture, registry, published pages, all guards
green). The three real adapters in `packages/tech/src/vendors/llm/computer-use.ts`
are honest **stubs** that reject at attempt time, so a `--real` run currently
records `error` rows rather than fabricating numbers. This ticket implements the
real loop and runs the first measured trial to validate the design.

## OPEN DECISION FOR THE OWNER — the harness needs a new dependency

The design names the harness "Playwright (repo Playwright MCP plugin)". That is
**not reachable from the runnable topic**: the MCP plugin drives the *agent's*
browser inside Claude Code, whereas `npm run research -- computer-use --real` is
a standalone CLI a reader clones and runs. A real harness therefore needs the
**`playwright` npm package** — a NEW dependency (none exists in this repo today),
which under `docs/dependency-decisions.md` is an owner-level call. Options:

- **Take on `playwright`** (devDependency + `playwright install chromium`), the
  straightforward path; CI stays keyless because the fixture path never launches
  a browser (only the owner-triggered real run does).
- **Drive an already-installed chromium via `playwright-core`** (lighter; still a
  dependency).
- Reject both and keep the topic fixture-only.

Until this is decided the harness cannot be implemented. `models.ts` `HARNESS` and
the report/site copy say "repo Playwright MCP plugin" and must be corrected to
whatever is chosen.

## Already done (no browser needed)

The keyless build settled the parts that do not depend on that decision:

- The **committed fixture site** exists under
  `packages/tech/src/computer-use/domain/data/site/` (8 pages + shared cart/products/css)
  and is guarded by `domain/site-fixture.test.ts` (start pages, predicate targets,
  selectors, and a no-network check).
- The **pure predicate evaluator** (`domain/predicate.ts`, `PageState` →
  boolean) is the harness's scoring seam, with 15 unit tests.
- Both were **verified in a real chromium** with a throwaway oracle-agent script
  (npx-cached playwright, no repo dependency): the optimal trajectory solves
  **8/8**, and a do-nothing agent solves **0/8** — so the suite measures capability
  rather than page-loading. (That control is what caught the original
  `read-order-total` task, which a do-nothing agent passed; it is now
  `confirm-order-total`, an extraction task requiring the agent to read the total.)

So this ticket is now: decide the dependency, implement the loops, run the trial.

## Implementation Steps

1. Resolve the dependency decision above, then implement the fixed Playwright
   harness (observe = screenshot + accessibility snapshot → act =
   click/type/navigate), serving the already-committed fixture site for
   `TASK_SUITE.siteBase` (`computer-use-fixture-site@1`). Feed the observed
   `PageState` to the existing `evaluatePredicate` — do not re-implement scoring.
2. Implement the three provider loops behind the existing adapters (Anthropic
   `computer_20251124` Messages sampling loop; OpenAI Responses `computer` tool
   loop; Google `computer_use` loop), each returning a real `TaskAttempt`
   (trajectory, timings, token usage). Reuse the oracle-agent script's shape from
   the build session (drive → observe → `evaluatePredicate`) as the loop skeleton.
3. `npm run research -- computer-use --estimate` (confirm ≤ $40), then the
   owner-triggered `--real` run.
4. `npm run research:archive -- computer-use --generated-at <iso>` to commit the
   dated survey frame; refresh the JP page with a real translation
   (`research:translate-report`, needs `ANTHROPIC_API_KEY`).
5. Design-validation review (guideline step 3): do the metrics discriminate
   between subjects? did cost match the estimate? Confirm or revise the quarterly
   cadence in the mission and `site.ts` design metadata.

## Key Files

- `packages/tech/src/vendors/llm/computer-use.ts` — the stub adapters to implement.
- `packages/tech/src/computer-use/domain/manifest.ts` — the task suite + `siteBase`.
- `packages/tech/src/computer-use/run.ts` — the run/estimate orchestration (done).
- Playwright MCP plugin (`mcp__plugin_playwright_playwright__browser_*`).

## Considerations

Keep the harness behind `vendors/`; the keyless fixture path and all guards must
stay green (CI never launches a browser). Honour the $40/trial ceiling — an
estimate above it stops for re-approval.

## Quality Gate

- [x] `--estimate` recorded (~$2.45 total) and confirmed within the $40 ceiling
      before the paid run.
- [x] Real trial executed; dated frame `2026-07-18T15:08:10.261Z` committed with
      measured EN/JP/data + design-validation review.
- [x] Honest provenance: no fabricated numbers; not-measured subjects surfaced as
      `error`/0% with an explicit prose caveat, never a silent fake score.
- [x] `cd packages/tech && npm run build && npm test && npm run lint` all exit 0
      (589 tests pass).
- [x] Keyless fixture path and byte-stable composition preserved (`.fixture.*`
      side files gitignored; compose-from-frame idempotent).

## Final Report

**Outcome: implemented.** The real Playwright harness loop had already landed
keyless (commit 19e2e3b); this ticket ran the first owner-authorized paid trial
and closed the loop honestly.

- **Estimate then run:** `--estimate` = ~$2.45 total (Anthropic $1.01 / OpenAI
  $0.94 / Google $0.51), well under the $40 ceiling. Ran `research -- computer-use
  --real`.
- **Result (frame `2026-07-18T15:08:10.261Z`, 1 rep, 8 tasks):** 2 of 3 rows
  measured. Anthropic Claude Sonnet 5 `measured` — 25% task success (2/8; the
  two solved tasks in 1 and 3 steps, the six multi-step tasks ran to the 30-step
  cap). OpenAI `error` (browser context closed under heavy host load). Google
  Gemini 2.5 `measured` 0% with 0 steps.
- **Root cause found (live probe):** OpenAI Responses computer-use and Gemini
  computer-use are stateful multi-turn protocols — OpenAI's first action is
  `screenshot`, Gemini's first call is `open_web_browser`, both of which only
  advance with threaded history the memoryless v1 policy does not keep.
- **Fixes committed (82ff282):** the OpenAI/Google adapters now record an honest
  not-measured error for the untranslatable stateful bootstrap action instead of
  a silent fabricated 0% (keyless tests pin the real payload shapes); the harness
  label was corrected to the `playwright` npm package. Canonical EN/JP/data pages
  recomposed from the measured frame, JP re-translated from the measured report,
  indexes regenerated. Filed follow-up `20260719003000-computer-use-stateful-provider-loops.md`
  (icebox) for the stateful threaded loops that will let all three subjects be
  measured.
- **Cost:** benchmark ≈ $2.35 (Anthropic $2.31 incl. six 30-step failures —
  the flat 15-turn estimate premise understates a low-success run; noted for the
  estimator), insights + JP full-report translation ≈ $2.0, plus one aborted
  re-run ≈ $1.5 (launched, then killed to honour "do not re-run"). Total ≈ $5.9,
  inside the $40 ceiling.
