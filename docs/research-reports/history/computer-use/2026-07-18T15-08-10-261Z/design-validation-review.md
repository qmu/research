# Design-validation review — first real trial (guideline step 3)

Trial: `2026-07-18T15:08:10.261Z`, 1 repetition, task suite v1 (8 deterministic
browser tasks on `computer-use-fixture-site@1`), one fixed Playwright harness
(the `playwright` npm package driving headless Chromium against a local fixture
server). Subjects: Anthropic Claude Sonnet 5 (`computer_20251124`), OpenAI
`computer-use-preview`, Google Gemini 2.5 Computer Use. Result: **2 of 3 rows
measured, 1 `error`** — Anthropic `measured` (25% task success), Google
`measured` (0% — see below), OpenAI `error`.

## Did the measurement work as designed?

Partially — and the trial did exactly what a design-validation run is for: it
proved the harness end to end for one subject and surfaced a real limitation in
the other two.

- **Anthropic measured cleanly.** The harness observed→thought→acted through the
  real Messages computer-use tool and the domain predicate decided success from
  the final page state: 2 of 8 tasks solved (`open-product-from-catalog` in 1
  step, `add-two-items-to-cart` in 3), the other 6 multi-step tasks ran to the
  30-step cap without satisfying their predicate.
- **OpenAI and Google did NOT measure model capability — they exposed a policy
  limitation.** A one-call live probe (thrown away) captured the real first
  turn of each: OpenAI's Responses computer-use returns a `computer_call` with
  `action.type = "screenshot"`, and Gemini's computer-use returns a
  `functionCall` named `open_web_browser`. Both are **stateful-protocol bootstrap
  actions** that only advance when the loop threads prior turns back (OpenAI via
  `computer_call_output` + `previous_response_id`; Gemini via a `functionResponse`
  with the next screenshot). The v1 policy is deliberately memoryless (one
  screenshot-in/action-out request per step), which is sufficient for Anthropic
  but cannot drive the two stateful tools. In the raw run Google therefore took
  0 actions on every task and was scored a misleading `measured` 0%.

Two instrument corrections were made and committed as part of this trial:

- **Honest not-measured, never a fabricated 0% (found by the run).** The OpenAI
  and Google adapters (`vendors/llm/computer-use.ts`) now detect the untranslatable
  stateful bootstrap action (via `ProviderTurn.unsupported`) and surface an
  explicit not-measured error rather than silently mapping it to `finish` and
  scoring the subject 0% — which would misattribute an adapter limitation to the
  model. Keyless unit tests pin the exact live payload shapes (`screenshot`,
  `open_web_browser`). This frame preserves the trial as it ran (Google
  `measured` 0%); the EN/JP report prose caveats that row explicitly, and the
  fix makes every future run record it honestly.
- **Harness label corrected.** The registry/report string was the placeholder
  "Playwright (repo Playwright MCP plugin)"; the runnable harness is the
  `playwright` npm package driving headless Chromium, not the Claude Code MCP
  plugin. Corrected in `models.ts` and across this frame — a label fix that
  changes no measurement.

## Did the metrics discriminate between subjects?

For the one fully measured subject, yes across tasks: task success (2/8), steps
(1 and 3 on the solved tasks vs the 30-step cap on failures), wall-clock
(~4.8 s / ~10.9 s on solved tasks vs ~80–94 s at the cap), and cost per task
($0.024 / $0.050 vs ~$0.37 at the cap) all separate short from long trajectories.
Cross-subject discrimination is not yet possible: the memoryless v1 policy is the
dominant limiter, so the stateful threaded loops (filed follow-up
`20260719003000-computer-use-stateful-provider-loops.md`) are required before
OpenAI and Google can be measured against Anthropic.

## Did the cost match the estimate?

The estimate premise (~15 turns/task) understates cost when tasks fail at the
30-step cap: the 6 failed Anthropic tasks each ran the full 30 turns at ~$0.37,
so the Anthropic benchmark was ≈ $2.31 against a ~$1.01 estimate. Google errored
after one turn per task (≈ $0.02 total) and OpenAI crashed with no completed call.
The benchmark proper was ≈ $2.35; the insights call plus the full-report Japanese
translation of the measured page added ≈ $2.0. One aborted re-run (launched, then
killed to honour "do not re-run") wasted ≈ $1.5 of Anthropic time. Total ≈ $5.9 —
well inside the $40/trial ceiling. Follow-up: the estimate should model a
per-task turn cap (30), not a flat 15, so a low-success run is priced correctly.

## Cadence

Quarterly cadence confirmed (no revision), with the off-cadence trigger — a new
or updated computer-use model/tool at Anthropic, OpenAI, or Google — unchanged.
The stateful-loop follow-up should land before the next scheduled trial so that
run measures all three subjects.
