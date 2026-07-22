---
created_at: 2026-07-14T01:30:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
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

## OPEN DECISION FOR THE OWNER — the harness needs a new dependency (RESOLVED 2026-07-22)

> **Resolved 2026-07-22:** developer approved adding the `playwright` npm
> dependency (recorded in `docs/dependency-decisions.md`). Implementation: add
> playwright to `packages/tech`, implement the real `--real` harness loop that
> drives the pinned fixture site through the agent, then run the first real trial
> within the $40 ceiling and commit it as a dated history frame with the
> design-validation review. The "Take on `playwright`" option below was the one
> chosen; `models.ts` `HARNESS` and the report/site copy must be corrected from
> "repo Playwright MCP plugin" to the `playwright` package.

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

1. (a) **Add the `playwright` npm dependency** to `packages/tech` (approved
   2026-07-22; recorded in `docs/dependency-decisions.md`) and correct `models.ts`
   `HARNESS` + report/site copy from "repo Playwright MCP plugin" to the
   `playwright` package. (b) Then implement the fixed Playwright harness (observe =
   screenshot + accessibility snapshot → act = click/type/navigate), serving the
   already-committed fixture site for `TASK_SUITE.siteBase`
   (`computer-use-fixture-site@1`), **behind the existing `evaluatePredicate` seam** —
   feed the observed `PageState` to `evaluatePredicate`; do not re-implement scoring.
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

## Policies

The standard engineering policies (synced from qmu.co.jp into the `workaholic`
policy skills) that govern this ticket. The implementing session **MUST** read
each linked hard copy before writing code and keep every change defensible
against its Goal (目標), Responsibility (責務), and Practices (実践).

- `workaholic:implementation` / `policies/vendor-neutrality.md` — **central to this ticket.** The newly approved `playwright` dependency sits behind the `ComputerUseClient` port in `vendors/llm/` so its types never leak into the domain and the harness stays swappable; the dependency is recorded in `docs/dependency-decisions.md` with rationale (approved 2026-07-22, $40/trial ceiling).
- `workaholic:implementation` / `policies/domain-layer-separation.md` — the harness feeds observed `PageState` into the pure `evaluatePredicate` scoring seam; no scoring is re-implemented in the vendor adapter and no Playwright types reach `domain/`.
- `workaholic:implementation` / `policies/test.md` — the keyless deterministic fixture path and all published-page/site-fixture guards stay green and browser-free; do not mistake fixture rows for a live measurement.
- `workaholic:operation` / `policies/ci-cd.md` — CI never launches a browser or calls a provider; only the owner-triggered `--real` run does. The fixture and estimate paths remain byte-stable and keyless.
- `workaholic:implementation` / `policies/command-scripts.md` — the trial runs through `npm run research -- computer-use` (estimate/real) and `research:archive`; no ad-hoc build logic.
- `workaholic:implementation` / `policies/objective-documentation.md` — the dated trial frame and design-validation review are factual and verifiable; honest per-cell provenance, real cost vs. estimate stated plainly.

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

How the outcome's quality is assured, captured from the owner at ticket time.
`/drive` surfaces this in its approval prompt and forwards it into the commit
`Verify:` key. **Mandatory; every line objective and verifiable.**

**Acceptance criteria**

- `playwright` is added to `packages/tech` and recorded in `docs/dependency-decisions.md`; `models.ts` `HARNESS` and the report/site copy no longer say "repo Playwright MCP plugin" but name the `playwright` package.
- The fixed harness drives the committed fixture site (`computer-use-fixture-site@1`) and feeds observed `PageState` into the existing `evaluatePredicate` — scoring is **not** re-implemented in the adapter.
- The three provider loops (Anthropic `computer_20251124`, OpenAI Responses `computer`, Google `computer_use`) each return a real `TaskAttempt` (trajectory, timings, token usage) on a `--real` run instead of the honest `error` stub.
- `npm run research -- computer-use --estimate` reports **≤ $40**; the owner-triggered `--real` run stays within the ceiling.
- The keyless fixture and estimate paths remain **byte-stable and browser-free**; every existing guard (site-fixture, predicate, published-page) stays green and CI launches no browser.
- The real trial is committed as a **dated history frame** (`research:archive`) with the refreshed JP translation, plus a design-validation review (do the metrics discriminate? did cost match the estimate? cadence confirmed/revised).

**Verification method**

- `cd packages/tech && npm test` (tsc --noEmit + vitest) green with bare, unmasked exit code, including the unchanged fixture/predicate/site guards.
- `npm run research -- computer-use --estimate` prints a per-rep estimate ≤ $40 before any spend.
- The `--real` run's dated frame under `docs/research-reports/history/computer-use/<ts>/` shows measured provenance and real token/cost figures; JP page refreshed via `research:translate-report`.
- `make lint` / `make drift` green (per CLAUDE.md, verify per package directly, not through masked `make test`).
- Owner reviews the real trial and the design-validation review at the `/drive` gate.

**Gate**

- Estimate ≤ $40 confirmed before spend; all keyless guards byte-stable and browser-free; the real trial reviewed and accepted at approval, with the dependency decision recorded and the harness isolated behind the `ComputerUseClient` ACL.
