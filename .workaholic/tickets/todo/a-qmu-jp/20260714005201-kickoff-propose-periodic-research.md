---
created_at: 2026-07-14T00:51:55+09:00
author: a@qmu.jp
type: research
layer: [Research]
effort: 3h
commit_hash:
category: Added
mission: periodic-research-target-computer-use-via-playwright
depends_on:
---

# Kickoff: propose the Computer Use via Playwright periodic-research instrument (cadence, subjects, metrics, cost)

## Overview

Kicks off the **Computer Use via Playwright** periodic-research mission. Per `CLAUDE.md` (proposal-first) and `docs/research-development-guideline.md`, before building, produce a proposal for developer approval covering **cadence, subjects, metrics, cost/trial-count range, and accumulated history**. Then fill the mission's Goal/Scope/Acceptance and, once approved, scaffold the topic under `packages/tech/src/<topic>/` following the layered `domain/ entrypoints/ vendors/` structure — reusing the LLM comparison instrument's patterns (`vendors/` anti-corruption layer, a `models.ts`-style registry, keyless fixture fallback).

## Key Files

- `docs/research-development-guideline.md` — the proposal-first template to follow.
- `packages/tech/src/llm-model-comparison/` — reference instrument (registry, matrix, run, domain graders).
- `packages/tech/TEMPLATE.md` — how a new topic subfolder is shaped.
- `packages/tech/src/vendors/llm/types.ts` — the CompletionClient-style port to mirror where applicable.
- The mission file: `.workaholic/missions/active/periodic-research-target-computer-use-via-playwright/mission.md`.

## Implementation Steps

1. Read `docs/research-development-guideline.md`.
2. Survey candidate subjects for this topic (see below) and confirm current offerings.
3. Draft the proposal: cadence, subject list, metrics, cost/trial-count range, accumulated-history shape.
4. Get developer approval (proposal-first gate — do not spend before approval).
5. Fill the mission Goal / Scope / Acceptance, each acceptance item naming the ticket that will satisfy it.
6. Scaffold the code skeleton behind an anti-corruption `vendors/` layer with a registry + keyless fixture path.

**Subjects to consider**
- Anthropic Computer Use
- OpenAI Computer Use / Operator
- Playwright-driven agent loops (the repo already has the Playwright MCP plugin)
- browser-use, Gemini computer use

**Candidate metrics:** task success rate on a fixed web-task suite, steps-to-complete, latency per action, cost per task, robustness/recovery

## Considerations

Reuse the existing instrument patterns; do not fork a parallel design. Keep external SDKs behind `vendors/`. Ensure keyless CI stays green via a fixture path. Honour the proposal-first gate before any real (paid) runs.
