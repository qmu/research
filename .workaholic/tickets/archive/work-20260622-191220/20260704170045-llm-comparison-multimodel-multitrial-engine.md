---
created_at: 2026-07-04T17:00:45+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 4h
commit_hash: 4f394cb
category: Added
depends_on:
---

# Comprehensive LLM comparison (1/2) — multi-model, multi-trial engine with per-trial raw capture and aggregated statistics

## Overview

Turn the `llm-model-comparison` PoC into the measurement engine for a **routine
check of today's LLM capabilities**. Today the runner tests **one model per
provider** and runs **each probe once**, recording a single `Measurement` per
model. This ticket widens and hardens the engine (the report rendering is the
sibling ticket 2/2):

1. **Model matrix.** Grow `models.ts` from 3 flagships to **~8 models across the
   three existing providers** — one flagship + one mid + one small each (e.g.
   Anthropic Opus/Sonnet/Haiku, OpenAI GPT-5.5/GPT-5/GPT-5-mini-class, Google
   Gemini 3.1 Pro/Flash). Providers stay at three (no new SDKs); only the curated
   registry grows, each card cited.
2. **Multi-trial.** Run **each probe N times** (configurable `--trials`, default
   **5**, owner-approved 3–5 band) per model, so every measured aspect is a
   distribution, not a single sample.
3. **Per-trial raw capture.** For every trial, keep the **exact prompt sent** and
   the **raw model output**, plus the parsed grade, output tokens, and elapsed
   ms. This raw record is the transparency substrate the report (2/2) surfaces.
4. **Aggregation & statistics** (pure `domain/`): reduce the N trials per
   model×probe to **mean + spread** (std dev, min, max, n) — a new pure,
   unit-tested `domain/aggregate.ts`.
5. **Per-run JSON artifacts.** Emit a versioned, deterministic-in-fixture JSON
   run-artifact carrying every trial's prompt + raw output + grade for each model
   — the committed source the report links (owner chose committed JSON artifacts).
6. **Failure isolation** (correctness fix, essential at this scale). Today any one
   provider's error throws and **aborts the whole run**, discarding other
   providers' already-billed calls (observed live: a Google 429 threw away
   completed Anthropic + OpenAI probes). With ~8 models × 3 probes × 5 trials
   (hundreds of calls) this is untenable. A failed **trial** or **model** must be
   recorded and flagged (`measured:false` / `error`), never fatal to the run.

Keep the whole thing **keyless/fixture-runnable and CI-green**; the fixture client
becomes deterministic **as a function of (prompt, trial index)** so fixture-mode
aggregates are non-degenerate (real spread) yet byte-stable across runs.

## Policies

The standard engineering policies (synced from qmu.co.jp into the `workaholic`
policy skills) that govern this ticket. The implementing session **MUST** read
each linked hard copy before writing code and keep every change defensible against
its Goal (目標), Responsibility (責務), and Practices (実践). `/drive` and `/trip`
consume this section verbatim.

- `workaholic:implementation` / `policies/directory-structure.md` — the overhaul stays a subfolder under the single `packages/tech` npm project (no new package, no root `package.json`, no workspaces); new modules (`aggregate.ts`, trial types) sit under `src/llm-model-comparison/domain/`.
- `workaholic:implementation` / `policies/coding-standards.md` — new TypeScript defaults to features the compiler can check; strict mode already on; enforced by the lint gate.
- `workaholic:implementation` / `policies/domain-layer-separation.md` — the model registry, trial harness *shaping*, aggregation, and statistics live in pure `domain/`; `entrypoints/run-llm-model-comparison.ts` stays a thin wire (select client → run trials → aggregate → write artifact + hand off to renderer). No SDK type reaches the domain.
- `workaholic:implementation` / `policies/type-driven-design.md` — model the new shapes as rich, narrow types (`TrialResult`, `ProbeTrials`, `Aggregate` with `mean/stdDev/min/max/n`, `ModelRun`, `ComparisonResult`) so a new metric/provider/trial-count is machine-checked, not stringly-typed.
- `workaholic:implementation` / `policies/functional-programming.md` — aggregation/statistics are declarative pure functions predictable from their signatures and stable under composition; the compiler stays the cheapest feedback path.
- `workaholic:implementation` / `policies/test.md` — a boundary-condition vitest per public domain function (stats on n=1, identical trials → zero spread, empty/failed trials, deterministic fixture variance), kept in-project as CI regression.
- `workaholic:implementation` / `policies/objective-documentation.md` — the raw capture is the honesty substrate: exact prompt + raw output per trial preserved verbatim; fixtured/failed cells flagged and never emitted as live measurements.
- `workaholic:implementation` / `policies/command-scripts.md` — `compare` / `compare:fixture` (and any new `--trials`/`--models` flags) run through the same make/npm targets CI invokes; no logic inline in workflow YAML.
- `workaholic:design` / `policies/vendor-neutrality.md` — the matrix stays behind the existing `CompletionClient` port; adapters normalize each provider's token/timing fields; **no** new provider SDK is added (matrix grows within the three current providers), so `docs/dependency-decisions.md` needs no new entry.
- `workaholic:planning` / `policies/ai-native-future.md` — structure the per-trial JSON so an AI agent (not only a human) can re-consume and re-verify results; the process stays observable.
- `workaholic:operation` / `policies/ci-cd.md` — the keyless `compare:fixture` remains the CI step; the real `compare` never runs in CI.

## Key Files

- `packages/tech/src/llm-model-comparison/models.ts` — the curated `ModelCard[]`; grows to ~8 cards (add mid/small tiers per provider), each with a cited `source` and isolated `apiModelId`.
- `packages/tech/src/llm-model-comparison/domain/types.ts` — add trial/aggregate/run types alongside `ModelCard`/`Measurement` (keep `Measurement` or fold it into `Aggregate`-per-probe).
- `packages/tech/src/llm-model-comparison/domain/aggregate.ts` **(new)** + `aggregate.test.ts` — pure `mean/stdDev/min/max/n` over a `number[]`, and reduction of `TrialResult[]` → per-probe `Aggregate`.
- `packages/tech/src/llm-model-comparison/domain/{nested-json,length-accuracy,speed}.ts` (+ tests) — graders stay pure and reused per trial; `speed.ts` `tokensPerSecond` now feeds the aggregate.
- `packages/tech/src/entrypoints/run-llm-model-comparison.ts` — the trial loop, per-trial/per-model try/catch isolation, raw capture, aggregation call, JSON artifact write, `--trials`/`--models` flags; stays free of scoring/stats logic.
- `packages/tech/src/vendors/llm/fixture.ts` — make the fixture `Completion` deterministic as a function of (prompt, trial index): varied-but-stable so fixture aggregates show real spread and stay byte-identical run to run.
- `packages/tech/src/vendors/llm/{types,anthropic,openai,google}.ts` — the `CompletionClient` port is unchanged; adapters may surface a typed error so the runner can isolate a failed call. **Do not** touch the seed `LlmClient.generateAnswer`.
- `packages/tech/package.json` — `compare` / `compare:fixture` scripts (add flag pass-through); **no** new dependencies.
- `.github/workflows/build-research-tech.yml` — keep the keyless `compare:fixture` step; confirm it still regenerates deterministically with the matrix.

## Related History

The research monorepo was built on this branch (skeleton, VitePress site, publish
pipeline, seed benchmark), then the `llm-model-comparison` **PoC** landed the
one-model/one-trial engine and ADR 0004. That PoC's own final consideration
**explicitly deferred "more providers, more probes, effort sweeps" to a
follow-up** — this ticket is that follow-up, not a duplicate.

- [20260623215050-llm-model-comparison-poc.md](.workaholic/tickets/todo/a-qmu-jp/20260623215050-llm-model-comparison-poc.md) — Direct baseline: established the topic's engine (curated `ModelCard` registry, three-provider `CompletionClient` ACL, fixture path, the three probes) and deferred the breadth this ticket adds.
- [20260622191217-seed-llm-benchmark-research.md](.workaholic/tickets/archive/work-20260622-191220/20260622191217-seed-llm-benchmark-research.md) — Canonical topic shape (pure `domain/` + vitest, `vendors/llm` ACL, thin runner, keyless fixture, pinned model IDs, objective docs).
- [20260622191214-initialize-research-monorepo-skeleton.md](.workaholic/tickets/archive/work-20260622-191220/20260622191214-initialize-research-monorepo-skeleton.md) — One-npm-project-per-group rule, the domain/entrypoints/vendors layout, Makefile runner, dependency-decisions log.

## Implementation Steps

1. **Types first** (`domain/types.ts`): add `TrialResult` (`prompt: string`, `rawOutput: string`, `grade`, `outputTokens`, `elapsedMs`, `ok: boolean`, `error?: string`), `ProbeTrials` (probe id + `TrialResult[]`), `Aggregate` (`mean`, `stdDev`, `min`, `max`, `n`, `unit`), `ModelRun` (`ModelCard` + per-probe `Aggregate` + provenance `measured|fixtured|error`), and `ComparisonResult` (`ModelRun[]`, `trials`, `generatedAt`, `probe` params, artifact ref). Let the compiler drive the rest.
2. **Statistics** (`domain/aggregate.ts` + test): pure `mean/stdDev/min/max/n` over `number[]`, and `aggregateProbe(trials) → Aggregate`. Boundary tests: `n=1` (stdDev 0), identical values (zero spread), empty (degenerate/omitted), NaN-guard.
3. **Model registry** (`models.ts`): add mid + small tiers per provider (~8 cards total). Verify each `apiModelId`, price, release, and effort levels against the provider's live docs at implementation time (WebFetch); keep `apiModelId`s isolated and each `source`-cited.
4. **Deterministic fixture variance** (`vendors/llm/fixture.ts`): key the canned `Completion` on (prompt, trialIndex) so repeated trials differ deterministically (e.g. seeded length jitter / depth outcome) — fixture aggregates then show non-zero, byte-stable spread. This keeps `compare:fixture` a real self-test of the multi-trial + stats path.
5. **Trial loop + isolation** (`entrypoints/run-llm-model-comparison.ts`): for each model, for each probe, run `--trials` trials; wrap **each trial** (and each model) in try/catch so a failure records `ok:false` + `error` and continues — never aborts. Capture `prompt` and `rawOutput` verbatim per trial. A model with no successful trials for a probe is flagged (`error`); a key-less/`--fixture` model stays `fixtured`. Add `--trials <n>` and `--models <ids…>` (subset) flags to bound a real run.
6. **Aggregate + emit** : reduce trials → `ModelRun`s via `domain/aggregate.ts`; assemble `ComparisonResult`; write the **JSON run-artifact** (all trials' prompt+raw+grade) to a stable committed location under the topic/docs (final path coordinated with 2/2's link rendering — see Considerations); hand the `ComparisonResult` to the renderer (2/2). Keep the runner free of scoring/stats logic.
7. **Verify** (see Quality Gate): `make test`, `make lint`, keyless `compare:fixture` twice → byte-identical report + artifact; then a bounded real `compare` smoke run once keys are present.

## Quality Gate

How the outcome's quality is assured, captured from the owner at ticket time.
`/drive` surfaces this in its approval prompt and forwards it into the commit
`Verify:` key. **Mandatory; every line objective and verifiable.**

**Acceptance criteria**

- `models.ts` holds **~8 `ModelCard`s across the 3 providers** (≥2 tiers per provider), each with a cited `source` and isolated `apiModelId`; type-check passes.
- Each probe runs **N trials** (`--trials`, default 5); the engine produces a per-model, per-probe `Aggregate` with `mean, stdDev, min, max, n`.
- Every trial's **exact prompt** and **raw output** are captured and written to a committed **JSON run-artifact**; in fixture mode the artifact and the report are **byte-identical across two runs**.
- A single failed trial/model is **flagged and non-fatal**: injecting a forced error in one model still yields a complete run with the other models measured and the failed one marked `error` (never a thrown, aborted run).
- The fixture path is **keyless and deterministic-with-real-spread** (fixture aggregates have non-zero, stable std dev).
- The seed `LlmClient.generateAnswer` and its tests are untouched and still green.

**Verification method**

- `cd packages/tech && npm test` (tsc --noEmit + vitest) green, including new `aggregate.test.ts` boundary tests and a fixture-determinism test.
- `npm run compare:fixture` run twice; `git diff --exit-code` on the report + JSON artifact shows no change (byte-stable).
- A unit/integration test (or a scripted `--models` run with an injected failing fixture) proves failure isolation.
- `make lint` and `make build` green.
- **Live smoke run:** with real keys, `npm run compare -- --trials 3 --models <one-per-provider>` produces sane measured aggregates with correct `measured` provenance — confirmed by the owner at the `/drive` gate.

**Gate**

- All of the above green; fixture run byte-stable; failure-isolation demonstrated; live smoke run reviewed and accepted at approval.

## Considerations

- **Real-run cost/time scales hard.** ~8 models × (5-rung JSON ladder + length) × 5 trials ≈ hundreds of calls, several reasoning models slow. The `--trials`/`--models` flags exist to bound the live smoke run; CI never runs `compare`. State expected cost/time in the report's Reproduce section (`policies/objective-documentation.md`).
- **Failure isolation is a real bug fix, not just scale hygiene** — the current runner aborts the whole run on any provider error (`entrypoints/run-llm-model-comparison.ts`), which at this size would routinely waste billed calls. Isolation also feeds report honesty (flag failed cells).
- **Artifact location vs. publish.** `make publish` copies only the `.md` to `../qmu-co-jp`; a JSON artifact linked from the report won't be copied. Decide the artifact home so the published report's transparency links resolve (co-locate under `docs/research-reports/` and extend the publish copy set, or link by stable GitHub URL) — coordinate the exact path/anchor with ticket 2/2. (`scripts/publish-research.sh`, `policies/objective-documentation.md`.)
- **Fixture determinism vs. meaningful spread** — a fixture that returns identical output every trial makes std dev 0 and hides bugs in the stats path; seed variance on trial index so fixture aggregates are non-degenerate **and** byte-stable (`vendors/llm/fixture.ts`).
- **Model-ID accuracy across the cutoff** — OpenAI/Google mid/small IDs, prices, and release dates move; verify against live docs when filling `models.ts` and keep IDs isolated for one-line correction.
- **Depended on by ticket 2/2** (the comprehensive report + a11y formatting), which consumes `ComparisonResult` and the JSON artifact — keep the result/artifact shapes stable and documented.

## Final Report

Development completed as planned. Delivered 8 models across 3 providers (Anthropic
Opus 4.8 / Sonnet 5 / Haiku 4.5, OpenAI GPT-5.5 / GPT-5 / GPT-5 mini, Google Gemini
3.1 Pro / Flash), an N-trial harness (default 5, `--trials`/`--models` flags), pure
`domain/aggregate.ts` statistics (mean/stdDev/min/max/n), verbatim per-trial raw
capture written to `docs/research-reports/llm-model-comparison.data.json`, and
per-model/per-trial failure isolation. 67 tests green; fixture report+artifact
byte-stable; live smoke run confirmed the real path.

### Discovered Insights

- **Insight**: The report renderer had to change inside this "engine" ticket because
  `ComparisonResult` is its input type — the foundation→presentation split has a real
  coupling at the type boundary.
  **Context**: `report.ts` got only a minimal update here (means + a per-probe
  distribution table); the comprehensive rewrite is ticket 2/2, which must track the
  `ComparisonResult`/artifact shape.
- **Insight**: Fixture-mode determinism required pinning the timestamp
  (`FIXTURE_TIMESTAMP`) — the PoC stamped the wall clock, so its report was never
  byte-stable. Combined with seeding the fixture on the trial index, fixture
  aggregates are now non-degenerate (real spread) yet byte-identical run to run.
  **Context**: This byte-stability is the precondition for ticket 2/2's golden-file
  snapshot; without the fixed timestamp a snapshot would flap every run.
- **Insight**: The trial/run orchestration was extracted from the entrypoint into
  `src/llm-model-comparison/run.ts`.
  **Context**: The entrypoint self-executes `main()` on import, so it cannot be
  imported by a test; `run.ts` makes failure isolation unit-testable with an injected
  throwing client (`run.test.ts`), and keeps the entrypoint thin per
  `domain-layer-separation`.
- **Insight**: The OpenAI/Google mid/small model ids (`gpt-5`, `gpt-5-mini`,
  `gemini-3.1-flash-preview`) are plausible but unverified against live provider docs
  in this environment; the Anthropic ids come from authoritative model metadata.
  **Context**: The live smoke run used the three flagships (known-good). A full
  real-matrix run should confirm the tier ids; they are isolated in `models.ts` for a
  one-line correction.
