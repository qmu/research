# Design v1

- **Author**: Constructor
- **Status**: draft
- **Reviewed-by**: (pending)

## Content

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
deliberate "minimum for now" is one model per provider and one probe each for
the three measured aspects; additional providers, models, and probes slot into
the same shape later. The change also records the now-twice-proven research-topic
anatomy as ADR `0004`.

The defining constraint of this topic over the seed: the vendor layer widens from
**one** provider to **three** behind a single domain-named contract, and the
report must be **honest** — a provider lacking a key in a real run is rendered
*fixtured-and-flagged*, never silently presented as a live measurement.

### 2. Scope and Inventory

Every file to add or edit. New unless marked **(edit)**.

#### New topic — pure domain (`packages/tech/src/llm-model-comparison/`)

- `domain/types.ts` — `Provider` union (`"anthropic" | "openai" | "google"`);
  `ModelCard` (static curated: `id`, `provider`, `modelName`, `apiModelId`,
  `released`, `inputCostPerMTok`, `outputCostPerMTok`, `effortLevels`, `source`);
  `Measurement` (live: `tokensPerSecond`, `maxNestedJsonDepth`, `lengthAccuracy`,
  `elapsedMs`, `outputTokens`, and a `measured: boolean` flag distinguishing a
  live measurement from a fixtured stand-in); `ComparisonRow = ModelCard & { measurement: Measurement }`;
  `ComparisonResult` (`rows`, `generatedAt`, plus probe parameters echoed for the
  Method section). All `Readonly<{…}>`, matching the seed's `types.ts` style.
- `domain/nested-json.ts` — `buildNestedJsonPrompt(targetDepth)`, `jsonDepth(value)`
  (max object/array nesting), `gradeNestedJson(target, text) -> { parsed, achievedDepth, success }`.
  Pure string/JSON functions; the runner sweeps a fixed depth ladder and records
  the deepest valid, correctly-nested response.
- `domain/length-accuracy.ts` — `buildLengthPrompt(targetWords, topic)`,
  `wordCount(text)`, `lengthAccuracy(target, actual) -> 0..1`
  (`1 - min(1, |actual - target| / target)`).
- `domain/speed.ts` — `tokensPerSecond(outputTokens, elapsedMs)` (guard `elapsedMs <= 0`).
- `domain/report.ts` — `renderComparisonReport(result)` -> Markdown with YAML
  frontmatter (a non-empty `description` for the Astro publish contract, plus
  `title`), a Method mermaid diagram, the 8-column comparison table, an explicit
  **curated-vs-measured legend**, per-probe detail, and a Reproduce section.
  Reuses the seed `report.ts` cell-escaping and frontmatter idiom.
- `domain/{types is type-only}` — co-located boundary-focused tests:
  `domain/nested-json.test.ts`, `domain/length-accuracy.test.ts`,
  `domain/speed.test.ts`, `domain/report.test.ts` (vitest, same style as the seed).

#### New topic — curated registry

- `models.ts` — curated `ModelCard[]`, one model per provider, each with a cited
  `source` URL. `apiModelId`s isolated here so corrections are a one-line edit.
  Current Anthropic/OpenAI/Google model IDs, pricing, and release dates are
  **verified live at implementation time** (WebFetch the providers' pricing/model
  pages); Anthropic Opus 4.8 is `$5/$25` per MTok from the known catalog.

#### Vendor anti-corruption layer (`packages/tech/src/vendors/llm/`)

- `types.ts` **(edit)** — add `Completion = Readonly<{ text, outputTokens, elapsedMs, model }>`
  and `CompletionClient = Readonly<{ model: string; complete(prompt, opts?) => Promise<Completion> }>`.
  **The existing `LlmClient.generateAnswer` contract is left untouched.**
- `anthropic.ts` **(edit)** — add `createAnthropicCompletionClient(apiModelId, apiKey)`:
  `messages.create` with `max_tokens ~2048`, no thinking param, a final-answer-only
  system instruction, capturing `usage.output_tokens` and wall-clock `elapsedMs`.
  The existing `createAnthropicClient` / `DEFAULT_MODEL` stay for the seed.
- `openai.ts` — `createOpenAiCompletionClient(apiModelId, apiKey)` via the official
  `openai` SDK; OpenAI types confined to this file.
- `google.ts` — `createGoogleCompletionClient(apiModelId, apiKey)` via the official
  `@google/genai` SDK; Google types confined to this file.
- `fixture.ts` **(edit)** — add `createFixtureCompletionClient(...)` returning
  deterministic `Completion`s keyed by prompt shape (valid nested JSON at the asked
  depth; text near the asked word count), so the whole pipeline + report run with
  no keys. The existing `createFixtureClient` stays for the seed.

#### Entrypoint

- `entrypoints/run-llm-model-comparison.ts` — thin runner: for each `ModelCard`,
  build the provider's `CompletionClient`; with `--fixture` **or** a missing
  provider key, substitute the fixture client and mark that row `measured: false`;
  run the nested-JSON ladder + length probe per model; derive speed from those
  calls; assemble `ComparisonRow[]`; render to
  `docs/research-reports/llm-model-comparison.md` (`OUTPUT_PATH` overridable);
  print a summary table to stdout. No comparison logic lives here.
- `packages/tech/src/index.ts` **(edit)** — extend the usage text to mention the
  new `compare:fixture` command/topic.

#### Ops, docs, CI

- `packages/tech/package.json` **(edit)** — add `compare` /
  `compare:fixture` scripts loading `.env` via Node `--env-file-if-exists=.env`
  (no `dotenv` dep — CI Node is 22, and 22 supports the flag; confirm at
  implementation time and fall back to `dotenv` only if the pinned runner rejects
  it); add `openai` and `@google/genai` runtime dependencies.
- `docs/dependency-decisions.md` **(edit)** — record `openai` and `@google/genai`
  with reason/assessment/monitoring/exit-strategy, matching the existing
  `@anthropic-ai/sdk` entry (vendor-neutrality requirement).
- `docs/.vitepress/config.ts` **(edit)** — populate the currently-empty "Research
  reports" sidebar `items` with **both** reports (seed + comparison).
- `docs/research-reports/index.md` **(edit)** — list both reports.
- `.github/workflows/build-research-tech.yml` **(edit)** — add a
  `Comparison pipeline self-test` step running `npm run compare:fixture` beside
  the existing benchmark self-test.
- `.env.example` — document the three keys (`ANTHROPIC_API_KEY`,
  `OPENAI_API_KEY`, `GOOGLE_API_KEY`); `.gitignore` already un-ignores it.

#### Records

- `docs/adr/0004-research-topic-anatomy.md` — capture the now-twice-proven anatomy
  (pure `domain/` + tested, per-provider `vendors/` ACL, thin `entrypoints/`
  runner, curated-registry-vs-live-measurement split, fixture path for CI,
  report -> publish), same structure as ADRs 0001–0003.
- Generated `docs/research-reports/llm-model-comparison.md` — produced by
  `compare:fixture`, committed.
- Project memory file noting the registry-plus-live-probe comparison sub-pattern,
  linked from `MEMORY.md`.

### 3. Implementation Approach

1. **Scaffold** `src/llm-model-comparison/domain/` per `TEMPLATE.md`.
2. **Domain types first** (type-driven design): model the eight aspects and probe
   results as rich types so the registry and report shapes are machine-checked
   before any logic.
3. **Probes as pure functions**: prompt builders, graders, and scorers are pure
   and declarative (`buildNestedJsonPrompt`, `jsonDepth`, `gradeNestedJson`,
   `buildLengthPrompt`, `wordCount`, `lengthAccuracy`, `tokensPerSecond`), each
   unit-tested at its boundaries before wiring.
4. **Report renderer from code**: `renderComparisonReport` generates the Method
   mermaid and the 8-column table deterministically; the diagram is reviewed in
   the same PR as its subject (diagram-generation policy).
5. **Registry** with cited sources and isolated `apiModelId`s; verify current IDs,
   pricing, and release dates against live provider docs at implementation time.
6. **Widen the vendor ACL** additively: a new `Completion` / `CompletionClient`
   contract alongside the untouched `LlmClient`; three provider adapters plus a
   fixture completion client. Provider SDK types never leave `vendors/llm/`.
7. **Thin runner** wires registry -> clients -> probes -> report; the fixture
   fallback guarantees a complete report from any subset of keys (a one-key run
   still produces all rows, with the keyless rows flagged fixtured).
8. **Wire ops/docs/CI**; then record the pattern as ADR 0004 and a memory.

### 4. Quality Strategy

- **Vitest boundary tests** — at least one test per public domain function,
  targeting boundary conditions, kept in-project as CI regression:
  - `jsonDepth`: flat value (depth 0/1), nested object, nested array, mixed,
    deeply nested; `gradeNestedJson`: exact depth success, shallow failure,
    unparseable text failure, over-deep still success.
  - `lengthAccuracy`: exact match -> 1, off-by-target -> bounded, zero/over-long
    clamps to `[0,1]`; `wordCount`: empty, single, whitespace-collapsed.
  - `tokensPerSecond`: normal, zero-elapsed guard, zero tokens.
  - `renderComparisonReport`: frontmatter has non-empty `description`; table has
    8 columns and one row per model; legend present; a `measured: false` row is
    visibly flagged; cell escaping handles `|` and newlines.
- **Type-check** — `tsc --noEmit` (strict ESM already on) via `npm test`; rich
  types make the registry and report shapes machine-checked.
- **Lint** — `prettier --check . && eslint .` via `make lint`.
- **Fixture-path verification** — `npm run compare:fixture` regenerates the report
  end-to-end with **no credentials**; manually inspect the 8-column table, the
  curated-vs-measured legend, and that fixtured rows are flagged. This is also the
  CI step, so a developer runs locally exactly what CI runs (command-scripts).
- **Seed regression** — the seed's `generateAnswer` tests and `benchmark:fixture`
  must keep passing; the ACL change is strictly additive.
- **Accessibility** — `make build` then `make a11y`: the VitePress site builds
  with both reports in the sidebar and passes the WCAG 2.2 AA check (semantic
  table headers, stable headings/anchors).
- **Real run (paused)** — after the developer populates `.env`, `npm run compare`
  for the live multi-provider run; confirm live Speed/JSON-depth/Length numbers
  and that any key-less provider is flagged fixtured, not silently measured.

### 5. Delivery Plan (ordered, with commit points)

Each numbered step is an independently-implementable unit; commit points map to
the Decomposition-gate ticket boundaries.

1. **Domain core** — `types.ts`, `nested-json.ts`, `length-accuracy.ts`,
   `speed.ts` + their tests. Verify: `npm test` green. *Commit.*
2. **Report renderer** — `report.ts` + `report.test.ts` (reuse seed escaping/
   frontmatter). Verify: `npm test` green. *Commit.*
3. **Curated registry** — `models.ts` with cited sources and verified IDs/pricing/
   dates. Verify: `tsc --noEmit`. *Commit.*
4. **Vendor ACL widening** — `types.ts`/`anthropic.ts`/`fixture.ts` edits + new
   `openai.ts`/`google.ts`; add `openai` + `@google/genai` deps; record both in
   `docs/dependency-decisions.md`. Verify: `npm install`, `tsc --noEmit`, seed
   tests still green. *Commit.*
5. **Entrypoint + scripts** — `run-llm-model-comparison.ts`, `index.ts` usage,
   `compare`/`compare:fixture` scripts, `.env.example`. Verify:
   `npm run compare:fixture` regenerates the report with no keys. *Commit
   (includes the generated report).*
6. **Docs/CI wiring** — VitePress sidebar `items`, `research-reports/index.md`,
   the CI `compare:fixture` step. Verify: `make build` + `make a11y` green. *Commit.*
7. **Pattern records** — ADR `0004-research-topic-anatomy.md` + project memory +
   `MEMORY.md` pointer. *Commit.*
8. **Paused real run** — STOP for the developer to populate `.env`; then
   `npm run compare` and confirm live numbers / fixtured-flag honesty.

The Decomposition gate will split this into tickets along these boundaries with
`depends_on` ordering (domain -> report -> registry -> ACL -> entrypoint ->
wiring -> records), each carrying the Policies list below and a Trip Origin link
back to this design.

### 6. Risk Assessment

- **Weakening the seed contract** (high impact) — the ACL change must be strictly
  additive (`CompletionClient` alongside `LlmClient`). *Mitigation*: never edit
  `generateAnswer`; run the seed's tests and `benchmark:fixture` after step 4.
- **Report dishonesty** (policy-critical) — a key-less provider silently shown as
  measured. *Mitigation*: `measured: boolean` on every `Measurement`; the renderer
  flags `measured: false` rows in the table and legend; entrypoint sets it from
  key presence; `report.test.ts` asserts the flag is visible.
- **Vendor type leakage** (vendor-neutrality) — `openai`/`@google/genai` types
  escaping into the domain. *Mitigation*: domain imports only `CompletionClient`/
  `Completion`; SDK imports confined to `vendors/llm/{openai,google}.ts`; both
  deps recorded in `docs/dependency-decisions.md`.
- **Model-ID / pricing drift across the knowledge cutoff** (medium) — OpenAI/Google
  IDs, pricing, and dates are uncertain. *Mitigation*: WebFetch the live provider
  pages at implementation time; isolate `apiModelId`s and cite each `source` in
  `models.ts` for easy correction.
- **`--env-file-if-exists` Node-version support** (low) — flag must work on the
  pinned/CI Node. *Mitigation*: CI Node is 22 (supports it); confirm at
  implementation, fall back to a `dotenv` devDependency only if rejected.
- **CI running a keyed target** (must-not) — only `compare:fixture` is added to CI;
  the real `compare` target is never run there. *Mitigation*: the workflow step
  invokes `compare:fixture` exclusively.
- **A11y regression from the 8-column table** (medium) — wide table / unstable
  anchors. *Mitigation*: semantic Markdown table headers and stable headings;
  `make a11y` gates the build.

### 7. Policies

These carry over the ticket's `## Policies` list; all three agents read each named
hard copy in the Coding Phase and judge implementation, review, and testing
against its Goal (目標), Responsibility (責務), and Practices (実践). Always-on
code policies are listed first.

- `workaholic:implementation` / `policies/directory-structure.md` — the new topic
  lands as a subfolder under `packages/tech/src/` (not a new package), with the
  same top-level layout as `llm-benchmark`.
- `workaholic:implementation` / `policies/coding-standards.md` — TypeScript
  conventions; let the compiler catch as much as possible (strict ESM already on).
- `workaholic:implementation` / `policies/domain-layer-separation.md` — all
  comparison/scoring/report logic lives in pure `domain/` with no SDK imports; the
  `entrypoints/` runner stays thin; vendors reached only through the domain-named
  `CompletionClient` contract.
- `workaholic:implementation` / `policies/type-driven-design.md` — model the eight
  aspects and probe results as rich types (`Provider`, `ModelCard`, `Measurement`)
  so the registry and report shapes are machine-checked.
- `workaholic:implementation` / `policies/functional-programming.md` — domain
  functions (prompt builders, graders, scorers) are declarative and pure so they
  unit-test cleanly.
- `workaholic:implementation` / `policies/test.md` — vitest boundary tests per
  public domain function, kept in-project as CI regression; passing fixture rows
  are not mistaken for correctness.
- `workaholic:implementation` / `policies/vendor-neutrality.md` — **central to this
  ticket.** Each provider SDK sits behind `vendors/llm/` so no provider's types
  leak into the domain and providers stay swappable; record the new `openai` /
  `@google/genai` dependencies in `docs/dependency-decisions.md` with rationale.
- `workaholic:implementation` / `policies/objective-documentation.md` — the report
  is factual and verifiable; clearly label curated vs measured columns, and never
  present a key-less (fixtured) provider row as a live measurement.
- `workaholic:implementation` / `policies/diagram-generation.md` — the Method
  mermaid diagram is generated by the report renderer from code, reviewed in the
  same PR as its subject.
- `workaholic:implementation` / `policies/accessibility-first.md` — the rendered
  report keeps the VitePress site passing the WCAG 2.2 AA `make a11y` check
  (stable headings/anchors, semantic table headers).
- `workaholic:implementation` / `policies/command-scripts.md` — all operations run
  through `make` / npm scripts; CI invokes the same `compare:fixture` target a
  developer runs locally — no build logic inline in workflow YAML.
- `workaholic:operation` / `policies/ci-cd.md` — add the keyless `compare:fixture`
  step to the existing path-filtered tech workflow so the comparison report is
  regenerated and the repo answers for its own deployability.

## Review Notes

(Awaiting one-turn review from Planner and Architect.)
