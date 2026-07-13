---
type: Mission
title: Periodic Research Target: Computer Use via Playwright
slug: periodic-research-target-computer-use-via-playwright
status: active
created_at: 2026-07-14T00:40:40+09:00
author: a@qmu.jp
assignee: a@qmu.jp
tickets:
  - 20260714005201-kickoff-propose-periodic-research.md
  - 20260714010000-computer-use-via-playwright-topic.md
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
`computer-use-preview`, Google `computer_use` on Gemini 3.5 Flash) behind
`vendors/` anti-corruption adapters, a fixed Playwright actuation/observation
harness, a committed deterministic browser-task suite, a thin runner with
fixture/estimate/real modes, a published EN page + JP translation wired through
`site.ts` shared metadata (title == sidebar label), unit tests including the
disk-reading published-page guards, and at least one owner-approved real trial
committed as a dated frame within the $40 ceiling.

The full five-element design proposal (cadence, subjects, metrics,
cost/trial-count range, accumulated history, and the reproducible task-suite
decision) lives in the build ticket
`#20260714010000-computer-use-via-playwright-topic.md`, drafted by the kickoff
and **awaiting owner approval** before any scaffolding or paid run.

Out of scope: desktop-OS tasks (OSWorld) and mobile (AndroidWorld) — v1 is
browser-only; a second DOM-first harness (`browser-use`) — a later
harness-isolation trial; adopting a drifting live-site public suite directly
(v1 pins a self-contained deterministic suite for reproducibility); running the
browser loop / any paid model in CI (the fixture path stays keyless,
network-free, and deterministic).

## Acceptance

- [x] Research design (cadence, subjects, metrics, cost/trial range, accumulated history, task-suite reproducibility) proposed for owner approval before scaffolding (#20260714005201-kickoff-propose-periodic-research.md)
- [ ] Owner approves the design proposal and the $40/trial cost ceiling (proposal-first gate — promotes the build ticket from icebox to todo) (#20260714010000-computer-use-via-playwright-topic.md)
- [ ] Topic runnable via `npm run research -- computer-use` with fixture/estimate/real modes; keyless deterministic fixture (recorded trajectories, no browser in CI) byte-stable and CI-suitable (#20260714010000-computer-use-via-playwright-topic.md)
- [ ] Published EN + JP pages in `publishedResearchTopics` passing the title==sidebar-label, no-mermaid, section-4 budget, and 7-section outline guards (#20260714010000-computer-use-via-playwright-topic.md)
- [ ] First real trial run within the approved cost ceiling, committed as a dated history frame with the design-validation review and confirmed cadence (guideline step 3) (#20260714010000-computer-use-via-playwright-topic.md)
- [ ] qmu-co-jp receives the new article through the publish ticket flow on the next `/ship`

## Changelog

- 2026-07-14 — mission created — mission.md
- 2026-07-14 — kickoff drove the proposal-first protocol: web-verified the mid-2026 computer-use landscape (Anthropic `computer_20251124`/Sonnet 5, OpenAI `computer`/`computer-use-preview`, Google `computer_use`/Gemini 3.5 Flash; Playwright as the fixed harness; OSWorld/WebArena/WebVoyager as reference suites) and drafted the five-element design (quarterly cadence + release trigger; success-rate/steps/latency/wall-clock/cost/recovery metrics; $5–$60 range, $40 ceiling; per-subject HistoryPoint series). Design staged as the gated build ticket for owner approval — no scaffolding or paid run yet — 20260714005201-kickoff-propose-periodic-research.md
- 2026-07-14 — awaiting owner approval of the design proposal + cost ceiling before the build ticket is promoted from icebox to todo — 20260714010000-computer-use-via-playwright-topic.md
- 2026-07-14 — ticket archived — 20260714005201-kickoff-propose-periodic-research.md
