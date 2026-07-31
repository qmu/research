---
created_at: 2026-07-18T20:45:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category: Added
depends_on: [20260714010000-computer-use-via-playwright-topic.md]
mission: periodic-research-target-computer-use-via-playwright
gate: real-paid-trial-only
---

# Implement the real Playwright harness loop for computer-use (keyless; first real trial then needs only keys + owner trigger)

## Overview

The computer-use topic is built keyless (domain scoring, registry, fixture
client, published EN/JP pages). The one remaining gap before the mission's
first real trial (`#20260714013000-computer-use-first-real-trial.md`, acceptance
item 4) is the **real Playwright harness loop**: today the three provider
adapters in `src/vendors/llm/computer-use.ts` refuse with `HARNESS_PENDING`, so
a `--real` run can only record honest `error` rows. The design's OPEN DECISION
(mission changelog 2026-07-14) — the runnable harness needs the `playwright` npm
package, and the "repo Playwright MCP plugin" drives the *agent's* browser, not
a reader's `--real` CLI — is resolved here: add `playwright` as a dependency and
implement a real model-driven observe→think→act browser loop against the pinned
fixture site.

This ticket is **keyless only**. It lands the harness, the provider-neutral
policy seam, the provider policy adapters (key-gated), and a real-browser
**oracle self-test** that proves the loop end to end with no LLM and no spend.
It does **not** run any paid trial — that stays owner-triggered.

### Design

- **One fixed harness, only the model varies.** A new provider-neutral
  `AgentPolicy` port (the "think" seam) is added next to `ComputerUseClient`.
  The Playwright harness owns everything else: serving the committed fixture
  site over a local origin (so `sessionStorage`/cart and query strings behave),
  navigating, actuating a normalized command vocabulary (selector- and
  coordinate-based), observing (URL + page text + accessibility tree +
  screenshot), and — after the loop ends — reading the final `PageState` and
  deciding success through the domain's existing `evaluatePredicate` (the domain
  alone decides; the harness only observes).
- **Token/latency split.** The harness measures per-action wall-clock
  (think→actuate→next-observation) and the policy reports the token usage of
  each think step; `run.ts` maps the resulting `TaskAttempt` through the existing
  pure scorers unchanged.
- **Keyless proof.** A deterministic **oracle policy** (a per-task scripted
  solver that reads the extraction total off the observed page) drives a real
  chromium through the harness and solves 8/8; a **noop policy** solves 0/8.
  This is free local browser automation — no provider, no key — and is the
  harness self-test. It is env-gated (`COMPUTER_USE_BROWSER_TEST=1`) so the
  default keyless CI test run needs no chromium and stays byte-stable.
- **Provider policies (key-gated).** The three adapters become harness-backed
  clients whose policy is an SDK-backed provider brain. The load-bearing
  provider-action → `HarnessCommand` translation is a pure function with keyless
  unit tests; only the live request is key-gated, so the first real trial needs
  nothing but keys + the owner trigger.

## Key Files

- `packages/tech/src/vendors/llm/types.ts` — add the `AgentPolicy` /
  `HarnessObservation` / `HarnessCommand` / `PolicyStep` port types next to the
  existing `ComputerUseClient`.
- `packages/tech/src/vendors/llm/computer-use.ts` — replace the three
  `pendingClient` refusals with harness-backed clients + provider policies.
- `packages/tech/src/computer-use/vendors/` (new topic-local vendor dir) —
  `playwright-harness.ts` (browser control, dynamic `playwright` import),
  `oracle-policy.ts` (keyless scripted solver + noop), plus the harness
  self-test and pure-helper tests.
- `packages/tech/src/computer-use/run.ts` — wire the `--real` path to build a
  harness-backed client per subject; `--fixture` keeps the canned client.
- `packages/tech/package.json` — add the `playwright` dependency.
- `docs/dependency-decisions.md` — record the `playwright` runtime dependency.

## Implementation Steps

1. Add the policy seam to the port (`AgentPolicy`, `HarnessObservation`,
   `HarnessCommand`, `PolicyStep`).
2. Build `playwright-harness.ts`: local static server for the committed site,
   browser/context lifecycle (fresh context per attempt so `sessionStorage`
   starts clean), the observe→think→act loop with a step ceiling, normalized
   actuation, final-state observation, predicate-decided success, and a
   `TaskAttempt` return.
3. Build `oracle-policy.ts` (scripted 8-task solver + noop) and its real-browser
   self-test, env-gated; add keyless pure-helper unit tests (path derivation,
   oracle-covers-every-task, final-state selector mapping).
4. Replace the provider adapters with harness-backed clients + SDK-backed
   provider brains; unit-test the pure provider-action translators keyless.
5. Wire `run.ts --real` to the harness-backed clients; keep `--fixture`
   byte-stable.
6. Add `playwright` to `package.json`; record the dependency decision.
7. Verify per package with bare exit codes (`npm test`, `npm run build`,
   `npm run lint`); run the env-gated browser self-test locally with chromium.

## Policies

- **proposal-first / owner-gated real run** — this ticket is keyless only. No
  paid LLM call and no real trial; the provider request paths are key-gated and
  exercised only by the later owner-triggered trial. Playwright local browser
  automation (no LLM) is free and allowed for the harness self-test.
- **keyless fixture inviolable** — the deterministic fixture path
  (`createFixtureComputerUseClient`) stays byte-stable, network-free, and
  browser-free; the default `npm test` run must not require chromium.
- **layering** — external SDK/browser access stays behind `vendors/`; pure
  scoring stays in `domain/`; `run.ts` stays a thin runner. The domain alone
  decides success (`evaluatePredicate`); the harness only observes.
- **honest provenance** — a subject whose live loop is not wired still records
  an `error` row, never a fabricated `measured` number.
- **workaholic:mission** — on completion, tick only truly-satisfied mission
  Acceptance items and append Changelog lines.

## Quality Gate

- `npm test`, `npm run build`, `npm run lint` in `packages/tech` all pass with
  bare exit code 0 (no `make`, no masking).
- The keyless fixture path is unchanged and byte-stable; the default test run
  needs no chromium and no keys.
- The env-gated harness self-test, run locally with chromium, shows the oracle
  policy solving 8/8 tasks and the noop policy solving 0/8 (the control that
  proves the suite discriminates).
- Pure translators/helpers (provider-action → `HarnessCommand`, path
  derivation, oracle coverage) have keyless unit tests.
- No `any`, no non-null assertions (eslint clean). `playwright` recorded in
  `docs/dependency-decisions.md`.
- No paid provider call is made; no real trial is run.

## Considerations

- Import `playwright` dynamically inside the harness runner so the fixture and
  estimate paths never load it and stay chromium-free.
- Use a fresh browser context per attempt: the cart is `sessionStorage`-backed
  and every attempt must start from a clean cart.
- The provider computer-use tools are coordinate-based; the harness must support
  coordinate actuation and screenshot observation as well as the oracle's
  selector-based commands. Keep the provider-action translation pure and tested;
  keep the SDK request thin and key-gated. Avoid `any` — parse provider
  responses through a typed `unknown` boundary with guards.
- The mission's acceptance item 4 (first real trial) is NOT closed here — only
  its implementation half (the harness loop) lands. Escalate that the first real
  trial within the $40 ceiling now needs only keys + the owner trigger.

## Final Report

**Outcome: implemented (keyless).** The real Playwright harness loop is built and
proven end to end with a real browser and no spend.

What landed:

- **Policy seam** (`src/vendors/llm/types.ts`): `AgentPolicy` / `PolicyAttempt` /
  `HarnessObservation` / `HarnessCommand` / `PolicyStep`. "One fixed harness, only
  the model varies" — the harness owns the loop; a subject supplies only the
  think step. Added `select` to the action/command vocabulary for the dropdown
  task.
- **Playwright harness** (`src/computer-use/vendors/playwright-harness.ts`):
  dynamic `playwright` import (fixture/estimate paths never load it), a local
  static server for the committed site (real http:// origin so the
  `sessionStorage` cart and `?category=` filter behave), a fresh browser context
  per attempt (clean cart), selector- AND coordinate-based actuation, observation
  (URL + page text + interactive-element map + screenshot), and
  predicate-decided success through the domain's `evaluatePredicate` (the domain
  decides; the harness only observes). `run.ts` opens/closes a harness session
  per subject on `--real`; `--fixture` keeps the canned client.
- **Keyless oracle self-test** (`oracle-policy.ts` + `harness.browser.test.ts`):
  a deterministic scripted solver (reads the extraction total off the observed
  page) and a do-nothing control, driven through a REAL chromium against the
  fixture site. Env-gated (`COMPUTER_USE_BROWSER_TEST=1`) so default CI stays
  browser-free.
- **Provider policies** (`src/vendors/llm/computer-use.ts`): the three
  `pendingClient` refusals replaced with harness-backed, SDK-backed brains
  (Anthropic `computer_20251124`, OpenAI `computer_use_preview`, Gemini
  `computer_use`). Load-bearing translation is pure + unit-tested keyless
  (`rawToHarnessCommand`, `extract*ComputerAction`, request builders); only the
  live SDK request is key-gated. Per repo convention the first real trial is the
  live verification of this wiring.
- `playwright` added to `package.json` and recorded in `dependency-decisions.md`.

Verification (bare exit codes, `packages/tech`, no `make`):

- `npm test` → exit 0, 585 passed | 2 skipped (was 566 | 1; +19 new unit tests,
  +1 env-gated browser test).
- `npm run build` → exit 0. `npm run lint` → exit 0 (no `any`, no non-null).
- `COMPUTER_USE_BROWSER_TEST=1` browser self-test → exit 0: **oracle solves 8/8,
  noop control 0/8** in real chromium.
- Keyless fixture byte-stability: `computer-use-comparison.data.json` regenerates
  byte-identical; estimate unchanged (~$2.45/trial, ceiling $40).

**Escalation:** computer-use harness ready — the first real trial within the
approved $40 ceiling now needs only keys + the owner trigger. Mission acceptance
item 4 (run the trial + dated frame) stays open by design; only its
implementation half (the harness loop) landed here.
