---
created_at: 2026-07-05T00:15:43+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure, UX]
effort:
commit_hash:
category:
depends_on:
---

# Redesign the LLM-comparison probes: real throughput/latency, JSON-schema complexity, per-effort-level sweep, and LLM-judge model reviews

## Overview

The current three probes are measured in ways the owner has identified as
misleading or wrong. This ticket redesigns the measurement methodology (the
13-model registry + Realtime adapter from commit `c148f4f` stay). Four owner
decisions drive it:

1. **Speed is latency-confounded → measure throughput and latency separately.**
   Today "speed" is `outputTokens / wallClock` summed over the small probe calls,
   so a slow-to-respond model with tiny outputs reads as e.g. "4 tok/s" — that is
   round-trip latency on small outputs, not generation speed. Replace it with a
   **dedicated throughput probe** (ask for a long output; measure **sustained
   tokens/second during generation**) and report **latency separately**
   (time-to-first-token + total response time). Both clearly labelled with units.
2. **Nested-JSON is wrong → use structured-output mode and find the real max
   complexity.** Today the probe asks for JSON in *normal text output* and caps at
   a fixed ladder (max 16). Instead, use each provider's **dedicated
   structured-output / JSON-schema feature** and **empirically escalate schema
   complexity along BOTH nesting depth AND breadth (field count)** until the model
   stops returning valid, schema-conforming output — recording the **max complexity
   it actually affords**, tested, not the paper spec.
3. **Sweep every effort level.** Each model's effort levels (Anthropic
   `low…max`, OpenAI `minimal…high`, Google `low…high`, etc.) are a **configuration
   to measure**, not curated metadata. The matrix becomes **model × effort level ×
   probe × trial**. Because this is a large, costly run, the runner **must print an
   estimated call count, rough cost, and time BEFORE it starts** (owner decision:
   full effort coverage at 3 trials, but estimate cost first).
4. **Per-configuration developer review by an LLM judge.** For every
   **model × configuration** (aggregated over its trials), an **LLM judge reads the
   actual trial outputs** and writes a short **developer-facing comment**:
   strengths, weaknesses, and what workloads the model+config suits — for a
   developer deciding whether to use it.

Everything must stay **keyless/fixture-runnable, deterministic in fixture mode
(incl. the judge), and CI-green** (type-check, tests, lint, a11y).

## Policies

The standard engineering policies (synced from qmu.co.jp into the `workaholic`
policy skills) that govern this ticket. The implementing session **MUST** read
each linked hard copy before writing code and keep every change defensible against
its Goal (目標), Responsibility (責務), and Practices (実践). `/drive` and `/trip`
consume this section verbatim.

- `workaholic:implementation` / `policies/directory-structure.md` — stays a subfolder under `packages/tech`; new probe/judge logic lands under `src/llm-model-comparison/`.
- `workaholic:implementation` / `policies/coding-standards.md` — strict, compiler-checkable TypeScript; lint gate.
- `workaholic:implementation` / `policies/domain-layer-separation.md` — schema generation, validity grading, throughput/latency math, and review *shaping* live in pure `domain/`; the entrypoint stays a thin wire; structured-output / streaming / judge calls sit behind the `vendors/` port.
- `workaholic:implementation` / `policies/type-driven-design.md` — model the new shapes richly (`Throughput`/`Latency`, `SchemaComplexity`, `Config` = model×effort, `Review`, extended `Measurement`) so a new metric/config is machine-checked.
- `workaholic:implementation` / `policies/functional-programming.md` — schema-complexity generation, conformance checking, and aggregation are pure, unit-tested functions.
- `workaholic:implementation` / `policies/test.md` — boundary vitest per new pure function (schema builder, validity grader, throughput/latency math, review shaping); deterministic-fixture regression.
- `workaholic:implementation` / `policies/objective-documentation.md` — the report states units plainly, separates throughput from latency, labels tested-max-complexity vs paper spec, and states the run's **estimated and actual cost/time**; fixtured/failed cells flagged.
- `workaholic:design` / `policies/vendor-neutrality.md` — **central.** Structured-output, streaming (for TTFT), the effort parameter, and the judge each extend the provider-neutral `CompletionClient` port; per-provider mechanics (OpenAI `response_format` json_schema + `reasoning_effort`; Anthropic tool-use/structured outputs + thinking; Google `responseSchema`/`responseMimeType` + thinking budget) stay inside `vendors/llm/`.
- `workaholic:design` / `policies/interaction-design-standard.md` — the enlarged report (throughput vs latency, per-effort configs, per-config reviews) stays legible and consistently structured.
- `workaholic:planning` / `policies/accessibility-first.md` — the rendered report keeps WCAG 2.2 AA (`make a11y`); the report pages are already in the pa11y URL list.
- `workaholic:planning` / `policies/ai-native-future.md` — per-trial raw + the judge reviews are structured so an AI agent can re-consume them.
- `workaholic:operation` / `policies/ci-cd.md` — the keyless `compare:fixture` stays the CI step (judge stubbed deterministically); the real, costly sweep never runs in CI.

## Key Files

- `packages/tech/src/vendors/llm/types.ts` — extend the `CompletionClient` port: an `effort` option; a **structured-output** method (prompt + JSON schema → parsed value + conformance); and **streaming** (or a first-token timestamp) so time-to-first-token is measurable. Keep it provider-neutral.
- `packages/tech/src/vendors/llm/{anthropic,openai,google,openai-realtime}.ts` — implement the extensions per provider (json-schema/structured-output, `reasoning_effort`/thinking/effort mapping, streaming for TTFT). **Do not** leak SDK types past these files.
- `packages/tech/src/llm-model-comparison/domain/throughput.ts` **(new)** + test — sustained tok/s over a long generation; and `latency.ts` (TTFT + total). Replaces `speed.ts`.
- `packages/tech/src/llm-model-comparison/domain/json-schema.ts` **(new)** + test — pure schema **generator escalating depth × breadth**, and a **conformance grader** (valid JSON that matches the schema); replaces `nested-json.ts`. Records the max complexity index that conforms.
- `packages/tech/src/llm-model-comparison/domain/review.ts` **(new)** + test — pure shaping of the judge prompt from a config's outputs/metrics, and typing of the returned `Review`; the judge *call* is a vendor concern.
- `packages/tech/src/llm-model-comparison/domain/types.ts` — `Config` (model × effort), extended per-config `Measurement` (throughput, latency, maxSchemaComplexity, lengthAccuracy), `Review`, updated `ComparisonResult`.
- `packages/tech/src/llm-model-comparison/domain/aggregate.ts` — aggregate the new metrics across trials.
- `packages/tech/src/llm-model-comparison/run.ts` + `entrypoints/run-llm-model-comparison.ts` — sweep model × effort; run the throughput/latency/schema/length probes; call the judge per config; **print a pre-run cost/time estimate** (and a `--estimate`/dry-run mode); keep per-trial/per-config failure isolation.
- `packages/tech/src/vendors/llm/fixture.ts` — deterministic structured-output, streaming, effort, and **judge** stubs so `compare:fixture` stays keyless and byte-stable.
- `packages/tech/src/llm-model-comparison/domain/report.ts` (+ test/snapshot) — render throughput vs latency, per-effort configs, per-config **developer reviews**, tested-max-complexity; keep provenance-in-words and AA contrast.
- `docs/research-reports/llm-model-comparison.md` — regenerated; `.pa11yci` already covers it.

## Related History

Builds directly on the just-shipped engine + report + expansion for this topic.

- [20260704170045-llm-comparison-multimodel-multitrial-engine.md](.workaholic/tickets/archive/work-20260622-191220/20260704170045-llm-comparison-multimodel-multitrial-engine.md) — The multi-trial engine, `ComparisonResult`/artifact shapes, and failure isolation this redesign extends.
- [20260704170046-llm-comparison-comprehensive-report-and-a11y.md](.workaholic/tickets/archive/work-20260622-191220/20260704170046-llm-comparison-comprehensive-report-and-a11y.md) — The comprehensive report + WCAG-AA contract the new metrics/reviews must keep.
- Commit `c148f4f` — expanded the registry to 13 verified models across every current tier + added the Realtime WebSocket adapter and the `ModelCard.api` routing this ticket sweeps over.

## Implementation Steps

1. **Extend the port** (`vendors/llm/types.ts`): add `effort?` to options; a `completeStructured(prompt, schema, options)` returning `{ value, conforms, raw }`; and streaming/first-token timing (e.g. `completeStreaming` yielding tokens with timestamps) so TTFT is measurable. Provider-neutral only.
2. **Per-provider adapters**: implement the three extensions for Anthropic, OpenAI, Google (and, where supported, Realtime), mapping effort to each provider's knob and JSON schema to each provider's structured-output feature; normalize results.
3. **Throughput + latency** (`domain/throughput.ts`, `domain/latency.ts` + tests): a long-generation throughput probe (sustained tok/s) and a latency probe (TTFT + total), pure math with boundary tests. Retire `speed.ts` (or fold in).
4. **JSON-schema complexity** (`domain/json-schema.ts` + test): pure generator escalating a schema over **depth × breadth**; a conformance grader (valid + schema-matching); the runner drives structured-output calls up the escalation and records the max conforming complexity.
5. **Effort sweep** (`run.ts` / entrypoint): iterate model × effortLevels; run the probes per config; keep per-trial/per-config isolation and per-trial raw capture. **Pre-run estimate**: compute total calls = Σ configs × probes × trials, a rough USD cost from `models.ts` prices, and an ETA; print it before executing, and add a `--estimate` (dry-run) mode. Add `--effort`/`--models` bounding flags.
6. **LLM-judge reviews** (`domain/review.ts` + `vendors/`): after a config's trials, pass its outputs + metrics to a fixed judge model behind the port; get a short developer-facing `Review`. Deterministic **fixture judge** for keyless CI.
7. **Aggregate + types + report** : extend `Measurement`/`ComparisonResult`; render throughput vs latency (clear units), per-effort configs, tested-max-schema-complexity, and the per-config reviews; keep provenance-in-words + AA; update the golden snapshot.
8. **Verify** against the Quality Gate (keyless fixture deterministic incl. judge; then a bounded real sweep after reviewing the printed cost estimate).

## Quality Gate

**Acceptance criteria**

- **Speed** is reported as **sustained throughput (tok/s during generation)** on a long output **and** **latency (TTFT + total)**, each with explicit units; the misleading small-output tok/s is gone.
- The **JSON probe uses each provider's structured-output/JSON-schema mode** (not prose) and reports the **empirically tested max schema complexity** over depth × breadth (conformance-graded), not the paper spec.
- The runner **sweeps every effort level** per model (model × effort configs) and **prints an estimated call count, rough cost, and ETA before starting** (and supports a dry-run `--estimate`).
- Each **model × config** carries an **LLM-judge developer review** derived from its actual outputs.
- `compare:fixture` is **keyless, deterministic, and byte-stable** — including a stubbed judge; the golden snapshot holds.
- Failed trials/configs are isolated and flagged; per-trial raw capture preserved.

**Verification method**

- `cd packages/tech && npm test` (tsc + vitest) green incl. new pure-function tests (throughput/latency, schema gen+conformance, review shaping) and the updated snapshot.
- `npm run compare:fixture` twice → byte-identical report + artifact.
- `npm run compare -- --estimate` prints a plausible call/cost/time estimate without making calls.
- `make build` + `make a11y` → 0 violations; `make lint` green.
- A **bounded real sweep** (a subset of configs) produces sustained-throughput + latency, a tested max-schema-complexity, and judge reviews — reviewed by the owner at the `/drive` gate after seeing the cost estimate.

**Gate**

- All the above green; fixture (incl. judge) byte-stable; cost estimate shown before any real sweep; bounded real sweep reviewed and accepted.

## Considerations

- **Cost/time is large and must be surfaced first.** ~13 models × ~3–5 effort levels × (throughput + latency + schema-escalation + length) × 3 trials is thousands of calls plus a judge call per config. The pre-run estimate + `--estimate` dry-run + bounding flags are mandatory (owner: "estimate cost before start"). CI never runs the real sweep.
- **Structured output differs per provider** — OpenAI `response_format: json_schema`, Anthropic tool-use / structured outputs, Google `responseSchema` + `responseMimeType`. Normalize behind the port; some models/efforts may not support schema mode → flag, don't fake (`policies/vendor-neutrality.md`, `objective-documentation.md`).
- **TTFT needs streaming** — the current adapters are non-streaming; measuring time-to-first-token requires streaming responses (or a provider first-token signal). Scope the adapter change.
- **Judge determinism** — the LLM judge must be stubbed deterministically in fixture mode or `compare:fixture` and the golden snapshot break; pick a fixed judge model and record it (a curated fact) for real runs.
- **Report growth** — per-effort configs × 13 models × reviews is a much larger page; keep it navigable and AA (`policies/interaction-design-standard.md`, `self-explanatory-ui.md`); consider linking the full per-config raw to the JSON artifact rather than inlining.
- **Effort semantics vary** — "effort/reasoning" maps differently per provider (reasoning_effort vs thinking budget vs none); document the mapping so a config is interpretable.
