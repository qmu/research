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

## Implementation Steps

1. Implement the fixed Playwright harness (observe = screenshot + accessibility
   snapshot via the repo Playwright MCP plugin → act = click/type/navigate),
   and serve the committed fixture site for `TASK_SUITE.siteBase`
   (`computer-use-fixture-site@1`) — commit the site's static HTML under
   `packages/tech/src/computer-use/domain/data/site/`.
2. Implement the three provider loops behind the existing adapters (Anthropic
   `computer_20251124` Messages sampling loop; OpenAI Responses `computer` tool
   loop; Google `computer_use` loop), each returning a real `TaskAttempt`
   (trajectory, timings, token usage) and each evaluating the task's declarative
   `SuccessPredicate` against the final DOM/URL.
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
