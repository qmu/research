---
type: Mission
title: Periodic Research Target: Computer Use via Playwright
slug: periodic-research-target-computer-use-via-playwright
status: active
created_at: 2026-07-14T00:40:40+09:00
author: a@qmu.jp
assignee: a@qmu.jp
strategy: periodically-benchmark-computer-use-browser-agent-capabilities
drive_authorized: true
tickets:
  - 20260714005201-kickoff-propose-periodic-research.md
  - 20260714010000-computer-use-via-playwright-topic.md
  - 20260714013000-computer-use-first-real-trial.md
stories: []
concerns: []
---

# Periodic Research Target: Computer Use via Playwright

## Goal

qmu.co.jp's foundational research measures text-side model behavior (speed,
accuracy, availability, OCR, and — in flight — image generation), but says
nothing about **computer use**: a model driving a real browser to complete a
multi-step web task. Clients increasingly ask which provider's agent actually
gets a task done, at what cost, and how reliably. This mission adds a recurring,
reproducible **computer-use benchmark** topic to the published LLM基礎検証 set,
driving every subject through **one fixed Playwright harness** (the repo already
carries the Playwright MCP plugin) so the only variable is the model/tool —
measured by the same evidence-based standards (keyless deterministic fixture
self-test, honest per-cell provenance, dated trial history, Japanese article) as
every other published topic.

## Scope

Done means: a `computer-use` research topic exists following the proposal-first
protocol and TEMPLATE.md — pure domain scoring (task-suite success predicates,
metric aggregation), the three API-native computer-use tools (Anthropic
`computer_20251124` on Claude Sonnet 5, OpenAI `computer` on
`computer-use-preview`, Google `computer_use` on Gemini 2.5 Computer Use) behind
`vendors/` anti-corruption adapters, a fixed Playwright actuation/observation
harness, a committed deterministic browser-task suite, a thin runner with
fixture/estimate/real modes, a published EN page + JP translation wired through
`site.ts` shared metadata (title == sidebar label), unit tests including the
disk-reading published-page guards, and at least one owner-approved real trial
committed as a dated frame within the $40 ceiling.

The full five-element design proposal (cadence, subjects, metrics,
cost/trial-count range, accumulated history, and the reproducible task-suite
decision) lives in the build ticket
`#20260714010000-computer-use-via-playwright-topic.md`. It was **approved on
2026-07-14** for the keyless build + published pages (both now shipped); only the
real (paid) Playwright-harness trial remains gated
(`#20260714013000-computer-use-first-real-trial.md`, guideline step 3).

Out of scope: desktop-OS tasks (OSWorld) and mobile (AndroidWorld) — v1 is
browser-only; a second DOM-first harness (`browser-use`) — a later
harness-isolation trial; adopting a drifting live-site public suite directly
(v1 pins a self-contained deterministic suite for reproducibility); running the
browser loop / any paid model in CI (the fixture path stays keyless,
network-free, and deterministic).

## Experience

A reader opens the published EN/JP Computer-Use pages and sees, from a committed
real dated trial frame produced within the $40/trial ceiling, per-subject
**measured** rows for the three API-native computer-use tools (Anthropic
`computer_20251124`, OpenAI `computer`, Google `computer_use`) — each driven
through **one fixed Playwright harness** against the pinned deterministic fixture
site — reporting success rate, steps, latency, wall-clock, cost, and recovery,
each cell carrying honest provenance that distinguishes a measured value from the
keyless fixture. The rows **discriminate** the agents (the suite's optimal
trajectory solves 8/8 while a do-nothing agent solves 0/8, so a differing score
reflects capability, not page loading), the committed artifacts re-render the
report at any later time without re-spending, and the mission's quarterly cadence
is confirmed or revised against that first real trial. The keyless fixture and
estimate paths stay byte-stable and never launch a browser, so CI reproduces the
pages without a key or spend.

## Acceptance

- [x] Research design (cadence, subjects, metrics, cost/trial range, accumulated history, task-suite reproducibility) proposed for owner approval before scaffolding (#20260714005201-kickoff-propose-periodic-research.md)
- [x] Owner approves the design proposal and the $40/trial cost ceiling (proposal-first gate — approved 2026-07-14 for the keyless build + published pages; only the real paid trial stays gated) (#20260714010000-computer-use-via-playwright-topic.md)
- [x] Topic runnable via `npm run research -- computer-use` with fixture/estimate/real modes; keyless deterministic fixture (byte-stable, no browser in CI) — fixture & estimate work; real records honest `error` rows until the harness lands (#20260714010000-computer-use-via-playwright-topic.md)
- [x] Published EN + JP pages in `publishedResearchTopics` passing the title==sidebar-label, no-mermaid, section-4 budget, and 7-section outline guards (#20260714010000-computer-use-via-playwright-topic.md)
- [ ] First real trial run within the approved cost ceiling, committed as a dated history frame with the design-validation review and confirmed cadence (guideline step 3 — implements the real Playwright harness loop) (#20260714013000-computer-use-first-real-trial.md)
- [ ] qmu-co-jp receives the new article through the publish ticket flow on the next `/ship`

## Changelog

- 2026-07-14 — mission created — mission.md
- 2026-07-14 — kickoff drove the proposal-first protocol: web-verified the mid-2026 computer-use landscape (Anthropic `computer_20251124`/Sonnet 5, OpenAI `computer`/`computer-use-preview`, Google `computer_use`/Gemini 3.5 Flash; Playwright as the fixed harness; OSWorld/WebArena/WebVoyager as reference suites) and drafted the five-element design (quarterly cadence + release trigger; success-rate/steps/latency/wall-clock/cost/recovery metrics; $5–$60 range, $40 ceiling; per-subject HistoryPoint series). Design staged as the gated build ticket for owner approval — no scaffolding or paid run yet — 20260714005201-kickoff-propose-periodic-research.md
- 2026-07-14 — awaiting owner approval of the design proposal + cost ceiling before the build ticket is promoted from icebox to todo — 20260714010000-computer-use-via-playwright-topic.md
- 2026-07-14 — owner approved the design + $40/trial ceiling for the keyless build and published pages (real paid trial stays gated); build ticket promoted icebox → todo — 20260714010000-computer-use-via-playwright-topic.md
- 2026-07-14 — built the topic end to end keyless: domain (task-suite scoring, 6 metrics), ComputerUseClient port + keyless fixture + provider adapter stubs, registry (tool versions/prices web-verified), unified-CLI + topic/site/snapshot wiring, published EN + hand-authored JP pages, dependency-decisions entry; estimate ~$2.45/rep (ceiling $40); tsc + 316 tests + lint all green — 20260714010000-computer-use-via-playwright-topic.md
- 2026-07-14 — remaining: implement the real Playwright harness loop + owner-triggered first real trial (guideline step 3), then qmu-co-jp publish on next /ship — 20260714013000-computer-use-first-real-trial.md
- 2026-07-14 — de-risked the gated trial (keyless, no spend): committed the pinned fixture site (8 pages) + the pure `evaluatePredicate` seam (15 tests) + a disk-reading site guard. Verified in a real chromium with a throwaway oracle-agent script (no repo dependency): oracle solves 8/8, do-nothing agent solves 0/8 — the control caught `read-order-total`, which a do-nothing agent passed, now reworked into the `confirm-order-total` extraction task — 20260714013000-computer-use-first-real-trial.md
- 2026-07-14 — OPEN DECISION for the owner: the runnable harness needs the `playwright` npm package (a NEW dependency); the "repo Playwright MCP plugin" named in the design drives the agent's browser, not a reader's `--real` CLI. Blocks the harness implementation; recorded in the real-trial ticket — 20260714013000-computer-use-first-real-trial.md
- 2026-07-14 — ticket archived — 20260714005201-kickoff-propose-periodic-research.md
- 2026-07-14 — ticket archived — 20260714010000-computer-use-via-playwright-topic.md
- 2026-07-22 — playwright npm dependency approved (recorded in docs/dependency-decisions.md); trial ticket 013000 moved icebox→todo and its OPEN DECISION resolved; mission Experience written. Strategy link + drive_authorized deferred pending a strategy-granularity decision with the developer — mission.md
- 2026-07-22 — strategy created — periodically-benchmark-computer-use-browser-agent-capabilities — strategy.md
- 2026-07-22 — mission replanned — playwright dependency approved; first real trial authorized ($40 ceiling); strategy linked; drive-ready — mission.md
