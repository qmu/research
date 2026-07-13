# Design v2

- **Author**: Constructor
- **Status**: approved (consensus: model-v1 + direction-v1 approved; this revision accepts the converged review feedback)
- **Reviewed-by**: Planner (round-1), Architect (round-1), Constructor (round-1)
- **Supersedes**: design-v1 (carries it over verbatim except where the six amendments below apply)

## Content

### 0. Revision summary (what changed from v1)

design-v2 folds in the six converged amendments from Round 1. Everything else from
design-v1 is unchanged.

1. **R2 token normalization (required, Architect):** a pure, unit-testable
   per-adapter `usage → Completion.outputTokens` mapping, extracted into a helper
   so it is keyless CI regression; plus a **non-zero-token guard** that downgrades a
   row to `measured: false` when the count is missing/zero rather than letting
   `tokensPerSecond` silently corrupt Speed.
2. **Honesty rendered unmistakably:** `measured: false` rows render
   `n/a (fixtured)` for the three probe columns **and** suppress/mark the raw
   `elapsedMs`/`outputTokens` cells; `report.test.ts` asserts it. Plus a required
   **"Scope & limitations"** prose block in the report.
3. **Legal/ToS + trademark pre-publication gate:** each `models.ts` entry uses the
   official product name + a cited `source`; a **"Publication constraints"** note in
   the report Method; and a developer ToS/naming confirmation checkpoint at the
   **paused-real-run boundary**.
4. **Runner-owned constants (Architect B/R5):** the probe-depth ladder and length
   target(s) live in the entrypoint runner and are passed into
   `ComparisonResult`/the renderer; they are kept out of `domain/`.
5. **Readonly domain types:** `readonly` on `ComparisonRow.measurement` and the
   domain types generally.
6. **Paused-real-run acceptance evidence:** defined explicitly as a one-key run
   that demonstrably flags the unkeyed providers as fixtured.

### 1. Overview

This design implements the second `packages/tech` foundational-research topic,
`llm-model-comparison`, mirroring the seed `llm-benchmark` layering verbatim:
pure `domain/` logic (fully unit-tested, no SDK imports), provider access behind
the `vendors/llm/` anti-corruption layer, a thin `entrypoints/` runner, a
credential-free fixture path so CI regenerates the report without keys, and a
Markdown result page under `docs/research-reports/`.

The topic scores models across **eight aspects**:

| Provider | Model Name | Released | Cost | Effort Level | Speed | Nested-JSON depth | Length accuracy |

The first five columns are **curated reference data** (a cited in-code registry,
`models.ts`); the last three are **measured live** against the real provider
APIs (Anthropic + OpenAI + Google) behind one `CompletionClient` contract. The
deliberate "minimum for now" is one representative model per provider and one probe
each for the three measured aspects; additional providers, models, and probes slot
into the same shape later. The change also records the now-twice-proven
research-topic anatomy as ADR `0004`.

The defining constraint of this topic over the seed: the vendor layer widens from
**one** provider to **three** behind a single domain-named contract, and the
report must be **honest** — a provider lacking a key (or returning an unusable
token count) in a real run is rendered *fixtured-and-flagged*, never silently
presented as a live measurement.

### 2. Scope and Inventory

Every file to add or edit. New unless marked **(edit)**.

#### New topic — pure domain (`packages/tech/src/llm-model-comparison/`)

- `domain/types.ts` — `Provider` union (`"anthropic" | "openai" | "google"`);
  `ModelCard` (static curated: `id`, `provider`, `modelName`, `apiModelId`,
  `released`, `inputCostPerMTok`, `outputCostPerMTok`, `effortLevels`, `source`);
  `Measurement` (live: `measured: boolean`, `tokensPerSecond`, `maxNestedJsonDepth`,
  `lengthAccuracy`, `elapsedMs`, `outputTokens`); `ComparisonRow = ModelCard &
  Readonly<{ measurement: Measurement }>`; `ComparisonResult` (`rows`,
  `generatedAt`, **plus the runner-owned probe parameters echoed for the Method
  section** — the depth ladder and the length target/topic, see amendment 4).
  **All domain types are `Readonly<{…}>` and use `readonly` arrays** (amendment 5),
  matching the seed's `types.ts` style.
- `domain/nested-json.ts` — `buildNestedJsonPrompt(targetDepth)`, `jsonDepth(value)`
  (max object/array nesting), `gradeNestedJson(target, text) -> { parsed, achievedDepth, success }`.
  Pure string/JSON functions; **the grader is single-target** (one target in, one
  verdict out). The runner owns the depth ladder and folds per-depth results into
  `maxNestedJsonDepth` (amendment 4 / Architect R5).
- `domain/length-accuracy.ts` — `buildLengthPrompt(targetWords, topic)`,
  `wordCount(text)`, `lengthAccuracy(target, actual) -> 0..1`
  (`1 - min(1, |actual - target| / target)`; clamp `[0,1]`; guard `target <= 0`).
- `domain/speed.ts` — `tokensPerSecond(outputTokens, elapsedMs)` (guard
  `elapsedMs <= 0` and `outputTokens <= 0`).
- `domain/report.ts` — `renderComparisonReport(result)` -> Markdown with YAML
  frontmatter (a non-empty `description` for the Astro publish contract, plus
  `title`), a Method mermaid diagram, the 8-column comparison table, an explicit
  **curated-vs-measured legend**, a required **"Scope & limitations"** prose block
  (single-sample, point-in-time, single run — amendment 2 / Planner), a
  **"Publication constraints"** note in Method (curated cells cite their source;
  official product names used — amendment 3), per-probe detail, and a Reproduce
  section. **For `measured: false` rows the renderer emits `n/a (fixtured)` in the
  three probe columns and suppresses/marks the raw `elapsedMs`/`outputTokens` cells**
  (amendment 2). Reuses the seed `report.ts` cell-escaping and frontmatter idiom.
- Co-located boundary-focused tests: `domain/nested-json.test.ts`,
  `domain/length-accuracy.test.ts`, `domain/speed.test.ts`, `domain/report.test.ts`
  (vitest, same style as the seed).

#### New topic — curated registry

- `models.ts` — curated `ModelCard[]`, one representative model per provider, each
  with the provider's **official product name** in `modelName` and a cited `source`
  URL (amendment 3). `apiModelId`s isolated here so corrections are a one-line edit.
  Current Anthropic/OpenAI/Google model IDs, pricing, and release dates are
  **verified live at implementation time** (WebFetch the providers' pricing/model
  pages); Anthropic Opus 4.8 is `$5/$25` per MTok from the known catalog.

#### Vendor anti-corruption layer (`packages/tech/src/vendors/llm/`)

- `types.ts` **(edit)** — add `Completion = Readonly<{ text, outputTokens, elapsedMs, model }>`
  and `CompletionClient = Readonly<{ model: string; complete(prompt, opts?) => Promise<Completion> }>`,
  where `opts` is provider-neutral (`maxTokens`, optional `topic`).
  **The existing `LlmClient.generateAnswer` contract is left untouched.**
- `anthropic.ts` **(edit)** — add `createAnthropicCompletionClient(apiModelId, apiKey)`:
  `messages.create` with `max_tokens ~2048`, no thinking param, a final-answer-only
  system instruction, capturing `usage.output_tokens` and wall-clock `elapsedMs`
  **measured inside the adapter around its own SDK call**. The existing
  `createAnthropicClient` / `DEFAULT_MODEL` stay for the seed.
- `openai.ts` — `createOpenAiCompletionClient(apiModelId, apiKey)` via the official
  `openai` SDK; normalize `usage.completion_tokens -> outputTokens`.
- `google.ts` — `createGoogleCompletionClient(apiModelId, apiKey)` via the official
  `@google/genai` SDK; normalize `usageMetadata.candidatesTokenCount -> outputTokens`.
- **`usage.ts` (new, amendment 1 / Architect R2)** — pure, SDK-shape-typed
  `toOutputTokens` helpers (or one shared `normalizeUsage` taking a discriminated
  raw-usage shape) that map each provider's usage object to a single
  `outputTokens: number`. These live in `vendors/llm/` (SDK usage types stop here,
  vendor-neutrality preserved) but are **pure and unit-tested** against
  synthetic/captured usage objects — no network, no key. Each adapter's `complete()`
  calls the SDK and delegates token extraction to this helper. **A `0`/missing
  count returns `0`** so the runner's guard can act (see entrypoint).
- `fixture.ts` **(edit)** — add `createFixtureCompletionClient(...)` returning
  deterministic `Completion`s keyed by prompt shape (valid nested JSON at the asked
  depth; text near the asked word count), so the whole pipeline + report run with no
  keys. Numbers are **plausibly synthetic**; provenance is set by the runner from
  *which client it used*, not by the fixture. The existing `createFixtureClient`
  stays for the seed.

#### Entrypoint

- `entrypoints/run-llm-model-comparison.ts` — thin runner. **Owns the probe
  constants** (the depth ladder, e.g. `[3, 5, 8, 12, 16]`, and the length
  target/topic — amendment 4) and passes them into `ComparisonResult` for the
  Method section. For each `ModelCard`: build the provider's `CompletionClient`;
  with `--fixture` **or** a missing provider key, substitute the fixture client and
  mark that row `measured: false`; run the nested-JSON ladder + length probe;
  derive speed; assemble `ComparisonRow[]`. **Non-zero-token guard (amendment 1):**
  if a live call returns `outputTokens <= 0`, the runner sets that row
  `measured: false` rather than computing a corrupt `tokensPerSecond`. Render to
  `docs/research-reports/llm-model-comparison.md` (`OUTPUT_PATH` overridable);
  print a summary table to stdout. No comparison/correctness logic lives here.
- `packages/tech/src/index.ts` **(edit)** — extend the usage text to mention the
  new `compare:fixture` command/topic.

#### Ops, docs, CI

- `packages/tech/package.json` **(edit)** — add `compare` / `compare:fixture`
  scripts loading `.env` via Node `--env-file-if-exists=.env` (no `dotenv` dep — CI
  Node is 22, which supports the flag; `compare:fixture`/CI needs no env file
  regardless; fall back to a `dotenv` devDependency only if a contributor's Node
  predates the flag); add `openai` and `@google/genai` runtime dependencies.
- `docs/dependency-decisions.md` **(edit)** — record `openai` and `@google/genai`
  with reason/assessment/monitoring/exit-strategy, matching the existing
  `@anthropic-ai/sdk` entry (vendor-neutrality requirement).
- `docs/.vitepress/config.ts` **(edit)** — populate the empty "Research reports"
  sidebar `items` with **both** reports (seed + comparison).
- `docs/research-reports/index.md` **(edit)** — list both reports.
- `.github/workflows/build-research-tech.yml` **(edit)** — add a
  `Comparison pipeline self-test` step running `npm run compare:fixture` beside the
  existing benchmark self-test. Keyless only; the real `compare` target is never run
  in CI.
- `.env.example` — document the three keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
  `GOOGLE_API_KEY`); `.gitignore` already un-ignores it.

#### Records

- `docs/adr/0004-research-topic-anatomy.md` — capture the now-twice-proven anatomy
  (pure `domain/` + tested, per-provider `vendors/` ACL, thin `entrypoints/` runner,
  curated-registry-vs-live-measurement split, fixture path for CI, report -> publish),
  same structure as ADRs 0001–0003.
- Generated `docs/research-reports/llm-model-comparison.md` — produced by
  `compare:fixture`, committed.
- Project memory file noting the registry-plus-live-probe comparison sub-pattern,
  linked from `MEMORY.md`.

### 3. Implementation Approach

1. **Scaffold** `src/llm-model-comparison/domain/` per `TEMPLATE.md`.
2. **Domain types first** (type-driven design): model the eight aspects and probe
   results as rich `readonly` types so the registry and report shapes are
   machine-checked before any logic. The required `measured: boolean` makes a
   `Measurement` unconstructable without stating provenance.
3. **Probes as pure single-target functions**: prompt builders, graders, and scorers
   are pure and declarative, each unit-tested at its boundaries before wiring. The
   depth ladder and length targets are *not* domain truth — the runner owns them
   (amendment 4).
4. **Report renderer from code**: `renderComparisonReport` generates the Method
   mermaid and the 8-column table deterministically, renders `n/a (fixtured)` +
   masked raw cells for `measured: false` rows, and emits the Scope-&-limitations
   and Publication-constraints prose. The diagram is reviewed in the same PR as its
   subject (diagram-generation policy).
5. **Registry** with official product names, cited sources, and isolated
   `apiModelId`s; verify current IDs, pricing, and release dates against live
   provider docs at implementation time (this WebFetch *is* the naming/ToS check —
   amendment 3).
6. **Widen the vendor ACL** additively: a new `Completion` / `CompletionClient`
   contract alongside the untouched `LlmClient`; three provider adapters; a pure
   tested `usage.ts` normalization helper (amendment 1); a fixture completion client.
   Provider SDK types never leave `vendors/llm/`.
7. **Thin runner** wires registry -> clients -> probes -> report; owns probe
   constants; sets `measured: false` on missing key OR zero/missing token count
   (amendment 1); guarantees a complete report from any subset of keys.
8. **Wire ops/docs/CI**; then record the pattern as ADR 0004 and a memory.

### 4. Quality Strategy

- **Vitest boundary tests** — at least one test per public domain function, kept
  in-project as CI regression:
  - `jsonDepth`: flat value (depth 0/1), nested object, nested array, mixed,
    deeply nested; `gradeNestedJson`: exact-depth success, shallow failure,
    unparseable-text failure, over-deep still success.
  - `lengthAccuracy`: exact -> 1, off-by-target bounded, zero/over-long clamps to
    `[0,1]`, `target <= 0` guard; `wordCount`: empty, single, whitespace-collapsed.
  - `tokensPerSecond`: normal, zero-elapsed guard, zero tokens.
  - **`usage` normalization (amendment 1 / Architect R2):** each provider's
    `usage -> outputTokens` mapping against a synthetic usage object — Anthropic
    `output_tokens`, OpenAI `completion_tokens`, Google `candidatesTokenCount` — plus
    missing/zero -> `0`. Keyless CI regression for the field that silently corrupts
    Speed.
  - **`renderComparisonReport` (amendment 2):** frontmatter has non-empty
    `description`; table has 8 columns and one row per model; legend present;
    Scope-&-limitations and Publication-constraints prose present; **a
    `measured: false` row shows `n/a (fixtured)` in the three probe columns and no
    bare numeric raw `elapsedMs`/`outputTokens` cell that could be mistaken for a
    live figure**; cell escaping handles `|` and newlines.
- **Type-check** — `tsc --noEmit` (strict ESM already on) via `npm test`.
- **Lint** — `prettier --check . && eslint .` via `make lint`.
- **Fixture-path verification** — `npm run compare:fixture` regenerates the report
  end-to-end with **no credentials**; manually inspect the 8-column table, the
  legend, the Scope-&-limitations block, and that fixtured rows show
  `n/a (fixtured)`. This is also the CI step (command-scripts).
- **Seed regression** — the seed's `generateAnswer` tests and `benchmark:fixture`
  must keep passing; the ACL change is strictly additive.
- **Accessibility** — `make build` then `make a11y`: the VitePress site builds with
  both reports in the sidebar and passes WCAG 2.2 AA (semantic table headers,
  stable headings/anchors, legend as text not color-only).
- **Real run (paused) + acceptance evidence (amendment 6):** after the developer
  populates `.env` **and confirms ToS/naming for publication (amendment 3
  checkpoint)**, `npm run compare`. The defined acceptance evidence is a **one-key
  run** (only one provider's key set) that produces a complete report in which the
  keyed provider's row is `measured: true` with live numbers and **the two unkeyed
  providers' rows are visibly flagged `n/a (fixtured)`** — demonstrating the honesty
  path end to end, not merely an all-keys happy path.

### 5. Delivery Plan (ordered, with commit points)

Each numbered step is an independently-implementable unit; commit points map to the
Decomposition-gate ticket boundaries.

1. **Domain core** — `types.ts` (readonly), `nested-json.ts`, `length-accuracy.ts`,
   `speed.ts` + their tests. Verify: `npm test` green. *Commit.*
2. **Report renderer** — `report.ts` (incl. `n/a (fixtured)` masking,
   Scope-&-limitations, Publication-constraints) + `report.test.ts`. Verify:
   `npm test` green. *Commit.*
3. **Curated registry** — `models.ts` with official names, cited sources, verified
   IDs/pricing/dates. Verify: `tsc --noEmit`. *Commit.*
4. **Vendor ACL widening** — `types.ts`/`anthropic.ts`/`fixture.ts` edits, new
   `openai.ts`/`google.ts`, new pure tested `usage.ts`; add `openai` +
   `@google/genai` deps; record both in `docs/dependency-decisions.md`. Verify:
   `npm install`, `npm test` (incl. usage tests), seed tests still green. *Commit.*
5. **Entrypoint + scripts** — `run-llm-model-comparison.ts` (runner-owned constants,
   zero-token guard), `index.ts` usage, `compare`/`compare:fixture` scripts,
   `.env.example`. Verify: `npm run compare:fixture` regenerates the report with no
   keys; fixtured rows show `n/a (fixtured)`. *Commit (includes the generated report).*
6. **Docs/CI wiring** — VitePress sidebar `items`, `research-reports/index.md`, the
   CI `compare:fixture` step. Verify: `make build` + `make a11y` green. *Commit.*
7. **Pattern records** — ADR `0004-research-topic-anatomy.md` + project memory +
   `MEMORY.md` pointer. *Commit.*
8. **Paused real run** — STOP for the developer to populate `.env` **and confirm
   ToS/naming for publication (amendment 3)**; then `npm run compare` and confirm
   the one-key acceptance evidence (amendment 6) and live numbers.

The Decomposition gate will split this into tickets along these boundaries with
`depends_on` ordering (domain -> report -> registry -> ACL -> entrypoint -> wiring
-> records), each carrying the Policies list below and a Trip Origin link back to
this design.

### 6. Risk Assessment

- **Weakening the seed contract** (high impact) — the ACL change must be strictly
  additive (`CompletionClient` alongside `LlmClient`). *Mitigation*: never edit
  `generateAnswer`; run the seed's tests and `benchmark:fixture` after step 4.
- **Report dishonesty** (policy-critical) — a key-less provider, or a provider with
  an unusable token count, silently shown as measured. *Mitigation*:
  `measured: boolean` on every `Measurement`; the runner sets it `false` on missing
  key **or zero/missing token count** (amendment 1); the renderer shows
  `n/a (fixtured)` and masks raw cells for those rows (amendment 2);
  `report.test.ts` asserts the masking; the one-key acceptance run (amendment 6)
  demonstrates it.
- **Token-count corruption of Speed** (Architect R2, medium-high) — the three SDKs
  name output tokens differently and a wrong/zero field silently skews Speed for one
  provider. *Mitigation*: pure tested `usage.ts` normalization (amendment 1) makes
  the mapping CI regression; the zero-token guard prevents a corrupt
  `tokensPerSecond`.
- **Vendor type leakage** (vendor-neutrality) — `openai`/`@google/genai` types
  escaping the domain. *Mitigation*: domain imports only `CompletionClient`/
  `Completion`; SDK imports (incl. raw usage shapes) confined to `vendors/llm/`;
  both deps recorded in `docs/dependency-decisions.md`.
- **Model-ID / pricing / naming drift** (medium) — IDs, pricing, dates, and official
  product names are uncertain across the knowledge cutoff. *Mitigation*: WebFetch the
  live provider pages at implementation time; isolate `apiModelId`s; cite each
  `source`; use official product names — this WebFetch discharges the publication
  naming/ToS gate (amendment 3).
- **Publication ToS/trademark** (Planner, medium) — comparative claims about named
  commercial products under each provider's terms. *Mitigation*: factual, sourced,
  official-name claims; a "Publication constraints" note in the report Method; a
  developer ToS/naming confirmation **checkpoint at the paused-real-run boundary**
  before live numbers are published (amendment 3).
- **`--env-file-if-exists` Node-version support** (low) — *Mitigation*: CI Node is 22
  (supports it) and the CI step needs no env file; fall back to `dotenv` only if a
  contributor's Node predates the flag.
- **CI running a keyed target** (must-not) — *Mitigation*: only `compare:fixture` is
  added to CI; the real `compare` target is never run there.
- **A11y regression from the 8-column table** (medium) — *Mitigation*: semantic
  table headers, stable headings/anchors, text (not color-only) legend; `make a11y`
  gates the build.

### 7. Policies

These carry over the ticket's `## Policies` list; all three agents read each named
hard copy in the Coding Phase and judge implementation, review, and testing against
its Goal (目標), Responsibility (責務), and Practices (実践). Always-on code policies
are listed first.

- `workaholic:implementation` / `policies/directory-structure.md` — the new topic
  lands as a subfolder under `packages/tech/src/` (not a new package), with the same
  top-level layout as `llm-benchmark`.
- `workaholic:implementation` / `policies/coding-standards.md` — TypeScript
  conventions; let the compiler catch as much as possible (strict ESM already on);
  `readonly` domain types (amendment 5).
- `workaholic:implementation` / `policies/domain-layer-separation.md` — all
  comparison/scoring/report logic lives in pure `domain/` with no SDK imports; the
  `entrypoints/` runner stays thin and owns probe constants; vendors reached only
  through the `CompletionClient` contract.
- `workaholic:implementation` / `policies/type-driven-design.md` — model the eight
  aspects and probe results as rich `readonly` types (`Provider`, `ModelCard`,
  `Measurement`) with a required `measured` flag so the registry, report, and
  honesty seam are machine-checked.
- `workaholic:implementation` / `policies/functional-programming.md` — domain
  functions (prompt builders, single-target graders, scorers) and the `usage.ts`
  normalizers are declarative and pure so they unit-test cleanly.
- `workaholic:implementation` / `policies/test.md` — vitest boundary tests per public
  domain function plus the `usage` normalization and the report honesty-masking
  assertion, kept in-project as CI regression; passing fixture rows are not mistaken
  for correctness.
- `workaholic:implementation` / `policies/vendor-neutrality.md` — **central.** Each
  provider SDK (and its raw usage shape) sits behind `vendors/llm/` so no provider's
  types leak into the domain and providers stay swappable; record `openai` /
  `@google/genai` in `docs/dependency-decisions.md` with rationale.
- `workaholic:implementation` / `policies/objective-documentation.md` — the report is
  factual and verifiable; clearly label curated vs measured; render `n/a (fixtured)`
  for non-measurements; carry a Scope-&-limitations block and a Publication-constraints
  note; never present a key-less/zero-token row as a live measurement.
- `workaholic:implementation` / `policies/diagram-generation.md` — the Method mermaid
  diagram is generated by the report renderer from code, reviewed in the same PR as
  its subject.
- `workaholic:implementation` / `policies/accessibility-first.md` — the rendered
  report keeps the VitePress site passing WCAG 2.2 AA `make a11y` (stable
  headings/anchors, semantic table headers, text-not-color legend).
- `workaholic:implementation` / `policies/command-scripts.md` — all operations run
  through `make` / npm scripts; CI invokes the same `compare:fixture` target a
  developer runs locally — no build logic inline in workflow YAML.
- `workaholic:operation` / `policies/ci-cd.md` — add the keyless `compare:fixture`
  step to the existing path-filtered tech workflow so the comparison report is
  regenerated and the repo answers for its own deployability.

## Review Notes

design-v2 resolves Round 1 by accept-and-revise (see
`reviews/response-constructor-to-architect.md`): the Architect's required R2 change
and all converged observations from the Planner and Architect are folded in;
direction-v1 and model-v1 stand approved. With this artifact, the Consensus Gate is
met (all reviews approved, the one revision accepted, no escalation) and the plan is
ready to be fixed for the Coding Phase.
