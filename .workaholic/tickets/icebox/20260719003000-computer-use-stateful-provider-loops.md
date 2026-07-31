---
created_at: 2026-07-19T00:30:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Added
mission: periodic-research-target-computer-use-via-playwright
depends_on: [20260714013000-computer-use-first-real-trial.md]
gate: owner-triggered-real-trial
---

# Computer Use: stateful (threaded) provider loops for OpenAI Responses and Gemini computer-use

> **GATED — owner-triggered (paid, live iteration).** Like the first real trial,
> this needs keys, a browser, and provider spend to develop against the live
> stateful protocols. Keep it gated until the owner triggers it, inside the same
> **$40/trial** ceiling.

## Why (discovered by the first real trial, 2026-07-18)

The first real trial (frame under
`docs/research-reports/history/computer-use/`) measured **Anthropic** cleanly
(Claude Sonnet 5, `computer_20251124`), but **OpenAI** and **Google** recorded
honest **not-measured** rows because their computer-use APIs are **stateful
multi-turn protocols** that the memoryless v1 policy cannot drive:

- **OpenAI Responses `computer_use_preview`:** the model's first output is a
  `computer_call` with `action.type === "screenshot"`. Progress requires
  replying with a `computer_call_output` (a fresh screenshot keyed by the
  `call_id`) and threading turns via `previous_response_id` (or resent input).
  Also carries `pending_safety_checks` that must be acknowledged.
- **Google Gemini `computer_use`:** the model's first `functionCall` is
  `open_web_browser`; subsequent turns emit `click_at` / `type_text_at` /
  `navigate` / `key_combination` / `scroll_document` etc. with coordinates
  **normalized to 0–999** that must be scaled to the viewport, and each turn
  must thread the prior action's screenshot back as a `functionResponse`.

The v1 adapters (`packages/tech/src/vendors/llm/computer-use.ts`) send one
independent screenshot-in/action-out request per step. That is sufficient for
Anthropic (which returns a direct `tool_use` action on turn 1) but not for the
two stateful tools. The adapters were made to fail **honestly** (surface the
untranslatable bootstrap action as a not-measured error via
`ProviderTurn.unsupported`) so no fabricated 0% is ever published — but to
actually **measure** OpenAI and Google, the loops must become stateful.

## Implementation Steps

1. Extend the `AgentPolicy`/`PolicyAttempt` seam usage so a provider brain keeps
   its conversation state in the per-attempt closure (the seam already allows
   this — `begin` returns a stateful `next`). No harness change needed: the
   harness already re-observes and feeds a fresh screenshot each step.
2. **OpenAI:** thread `computer_call_output` (screenshot + `call_id`) and
   `previous_response_id`; map the `screenshot` bootstrap to "observe again";
   acknowledge `pending_safety_checks`. Map the real `computer_call` action
   family (click/type/keypress/scroll/wait) to `HarnessCommand`.
3. **Google:** treat `open_web_browser` as "observe again"; thread the prior
   action's screenshot as a `functionResponse`; scale 0–999 coordinates to the
   viewport; map the Gemini action names to `HarnessCommand`.
4. Keep every parser pure and unit-tested keyless with the **real captured
   payload shapes** (see the `unsupported` tests already in
   `computer-use.test.ts`); only the SDK request stays key-gated.
5. Owner-triggered real trial re-run so all three subjects are `measured`;
   archive a new dated frame and refresh the design-validation review.

## Considerations

Multi-turn threading multiplies token cost (each turn resends/threads
screenshots); re-price with `--estimate` before the run and honour the $40
ceiling. Consider a per-attempt turn budget lower than the harness `maxSteps`
if cost climbs. The memoryless Anthropic loop can stay as-is or be unified onto
the same threaded shape for a fair cross-subject comparison — decide during
implementation and record it in the review.

## Key Files

- `packages/tech/src/vendors/llm/computer-use.ts` — the three provider adapters.
- `packages/tech/src/computer-use/vendors/playwright-harness.ts` — the loop (no
  change expected; it already re-observes each step).
- `packages/tech/src/vendors/llm/computer-use.test.ts` — keyless parser tests.
