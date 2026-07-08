---
created_at: 2026-07-07T19:59:44+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure, UX]
effort:
commit_hash:
category:
depends_on:
mission:
---

# Cover LLM foundation-model rows whose effort is n/a

## Overview

Make models with no reasoning-effort control a first-class part of the LLM
foundation-model research matrix. The current `llm-model-comparison` registry
uses `effortLevels: ["n/a"]` for models whose provider API has no effort knob
or fixed reasoning behavior:

- Claude Haiku 4.5
- GPT Realtime
- Grok 4.20 Reasoning
- Grok 4.20 Non-Reasoning
- Grok Build 0.1

Those rows must be covered as valid single-configuration foundation-model rows,
not treated as unsupported effort levels, omitted from bounded runs, or confused
with measurement cells that say `n/a (fixtured)` / `n/a (error)`. The research
report should make the distinction explicit:

- **Effort = `n/a`** means the model has no user-selectable effort control.
- **Metric = `n/a (...)`** means that metric was not live-measured for the run.

## Policies

The standard engineering policies that govern this ticket:

- `workaholic:planning` / `policies/market-research.md` — the foundation-model
  comparison must cover the actual product surfaces available to qmu, including
  models without effort controls, rather than only models that fit the reasoning
  effort axis.
- `workaholic:design` / `policies/vendor-neutrality.md` — provider-specific
  effort behavior stays behind the existing `CompletionClient` anti-corruption
  layer; `n/a` omission logic belongs in adapters, not in domain scoring.
- `workaholic:implementation` / `policies/directory-structure.md` — keep domain
  rules under `packages/tech/src/llm-model-comparison/domain/`, provider
  mechanics under `packages/tech/src/vendors/llm/`, and the report in the existing
  docs path.
- `workaholic:implementation` / `policies/coding-standards.md` — model the
  effort sentinel in typed helpers or narrow types instead of scattered string
  comparisons.
- `workaholic:implementation` / `policies/test.md` — add regression tests that
  read as behavior descriptions for the `n/a` effort path.
- `workaholic:implementation` / `policies/objective-documentation.md` — the
  report language must be factual and verifiable, with no row implying that an
  `n/a` effort is an error or a fake measurement.
- `workaholic:operation` / `policies/ci-cd.md` — keep `compare:fixture` byte-stable
  and keyless; any live `n/a` smoke run is owner-triggered and not a CI path.

## Key Files

- `packages/tech/src/llm-model-comparison/models.ts` — registry cards for
  no-effort models; should remain the source of truth for which model rows use
  the `n/a` effort sentinel.
- `packages/tech/src/llm-model-comparison/domain/types.ts` — define or narrow
  the effort vocabulary so no-effort configurations are explicit and testable.
- `packages/tech/src/llm-model-comparison/run.ts` — ensure the matrix builder,
  `--models`, and `--effort n/a` filters include no-effort rows as normal
  configurations.
- `packages/tech/src/entrypoints/run-llm-model-comparison.ts` — CLI filtering and
  estimate output should count `n/a` effort rows correctly.
- `packages/tech/src/vendors/llm/{anthropic,openai,openai-responses,xai,google,openai-realtime}.ts`
  — adapters must omit provider effort fields for `n/a` rather than sending an
  unsupported parameter.
- `packages/tech/src/llm-model-comparison/domain/report.ts` and
  `report.test.ts` — report prose and tests should distinguish effort `n/a` from
  metric/provenance `n/a (...)`.
- `docs/research-reports/llm-model-comparison.md` and `.data.json` — regenerated
  fixture report/artifact must include the no-effort model rows.

## Related History

The LLM comparison engine already widened into a model×effort matrix and later
added provider-specific effort handling. This ticket closes the remaining
coverage gap for the valid rows where effort is not a configurable axis.

- [20260704170045-llm-comparison-multimodel-multitrial-engine.md](.workaholic/tickets/archive/work-20260622-191220/20260704170045-llm-comparison-multimodel-multitrial-engine.md) - established the multi-model, multi-trial matrix and complete JSON artifact.
- [20260705001543-redesign-llm-comparison-probes.md](.workaholic/tickets/archive/work-20260622-191220/20260705001543-redesign-llm-comparison-probes.md) - introduced the model×effort sweep, structured-output probes, and comments noting which models use `n/a`.
- [20260706102837-ship-and-follow-up-llm-comparison-redesign.md](.workaholic/tickets/todo/a-qmu-jp/20260706102837-ship-and-follow-up-llm-comparison-redesign.md) - carry checkpoint identified honest error/no-effort cleanup as an optional follow-up after the redesign.

## Implementation Steps

1. Add a typed effort helper in the domain layer, for example
   `isNoEffortLevel(effort)` or an `EffortLevel` union, so `"n/a"` is not handled
   only by scattered string comparisons.
2. Add registry coverage tests asserting that every `ModelCard` has at least one
   effort level, that every no-effort model has exactly `["n/a"]`, and that the
   known no-effort model ids are present in the matrix.
3. Update runner/filter behavior so `--effort n/a` selects the no-effort rows and
   a normal full matrix includes them exactly once each. The estimate must count
   those configurations and API calls.
4. Add adapter-level tests or request-body builders proving `n/a` omits
   provider-specific effort fields:
   - Anthropic: no `output_config.effort`
   - OpenAI Chat / xAI-compatible: no `reasoning_effort`
   - OpenAI Responses: no `reasoning.effort`
   - Google: no `thinkingConfig` for `n/a`
   - Realtime: no effort parameter is attempted
5. Refine the report renderer so the Methodology and Legend explicitly separate
   `Effort = n/a` from `n/a (fixtured)` and `n/a (error)` metric cells.
6. Regenerate the keyless fixture report/artifact and confirm the no-effort rows
   appear in the comparison table and per-configuration review sections.
7. When keys are available and the owner approves cost, run a bounded smoke
   command such as:

   ```sh
   cd packages/tech
   npm run compare -- --estimate --models anthropic-claude-haiku-4-5,openai-gpt-realtime,xai-grok-4-20-0309-reasoning,xai-grok-4-20-0309-non-reasoning,xai-grok-build-0-1 --effort n/a --trials 1
   npm run compare -- --models anthropic-claude-haiku-4-5,openai-gpt-realtime,xai-grok-4-20-0309-reasoning,xai-grok-4-20-0309-non-reasoning,xai-grok-build-0-1 --effort n/a --trials 1
   ```

   Record whether each row is `measured` or honestly `error`; do not fake
   structured-output support for surfaces that do not provide it.

## Quality Gate

**Acceptance criteria**

- The full fixture matrix includes the five known no-effort model rows exactly
  once each, with `effort: "n/a"` and no unsupported synthetic effort levels.
- `--effort n/a` selects the no-effort rows; estimates and run artifacts count
  those configurations correctly.
- Provider adapters omit their effort/reasoning/thinking request fields when
  the configuration effort is `n/a`.
- The report text distinguishes `Effort = n/a` from metric cells labelled
  `n/a (fixtured)` or `n/a (error)`.
- Fixture report and artifact remain byte-stable across repeated
  `npm run compare:fixture` runs.
- Any live no-effort row that fails a probe is marked `error` with the provider
  error preserved; failures are not hidden by dropping the row.

**Verification method**

- `cd packages/tech && npm test` green, including new registry/filter/adapter
  tests for `n/a` effort behavior.
- `npm run compare -- --estimate --effort n/a` prints a non-zero configuration
  count matching the no-effort rows.
- `npm run compare:fixture` twice; the regenerated report and JSON artifact are
  byte-identical and include the no-effort model names.
- `npm run lint` and root `make build` are green.
- Optional owner-gated live smoke: run only the no-effort model subset after
  reviewing `--estimate`, then inspect the artifact for measured/error
  provenance and preserved provider errors.

**Gate**

- Tests, lint, build, and fixture byte-stability pass.
- The fixture artifact proves the no-effort rows are present and unambiguous.
- If a live smoke run is performed, every no-effort result is either measured or
  objectively flagged as error with the raw error retained.

## Considerations

- `n/a` currently serves two visible purposes in the report: effort not
  applicable, and metric not available. The implementation should reduce that
  ambiguity in headings/legend before changing display text wholesale.
- Realtime and some fixed-reasoning models may not support every probe surface,
  especially JSON-schema structured output. That is a measurement result or
  provider limitation to record, not a reason to drop the model from the matrix.
- Avoid broad report restyling here. Keep the change scoped to no-effort
  coverage, provenance wording, and tests so it does not collide with the
  existing uncommitted report-style work in this branch.
