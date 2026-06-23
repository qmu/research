---
instruction: "Implement ticket .workaholic/tickets/todo/a-qmu-jp/20260623215050-llm-model-comparison-poc.md — fundamental LLM model-comparison PoC (second packages/tech research topic): multi-provider (Anthropic/OpenAI/Google) comparison behind one CompletionClient, curated model registry, three live probes (speed, nested-JSON depth, length accuracy), fixture path for keyless CI, generated docs/research-reports/llm-model-comparison.md, VitePress + CI wiring, and ADR 0004. Pause before the first real compare run so the user can populate .env."
phase: coding
step: review-and-testing
iteration: 0
updated_at: 2026-06-24T09:10:00+09:00
---

# Trip Plan

## Initial Idea

Implement ticket .workaholic/tickets/todo/a-qmu-jp/20260623215050-llm-model-comparison-poc.md — fundamental LLM model-comparison PoC (second packages/tech research topic): multi-provider (Anthropic/OpenAI/Google) comparison behind one CompletionClient, curated model registry, three live probes (speed, nested-JSON depth, length accuracy), fixture path for keyless CI, generated docs/research-reports/llm-model-comparison.md, VitePress + CI wiring, and ADR 0004. Pause before the first real compare run so the user can populate .env.

## Plan Amendments

- **2026-06-24 (lead):** `trip-commit.sh` stages with `git add -A`, so concurrent
  Step-1 commits cross-swept files (Architect's `c1524d4` absorbed Constructor's
  `design-v1.md`; Constructor's `a12a1c2` carried the event-log under correct
  attribution). All three artifacts are committed and content-clean. Coding-phase
  implementation is single-author (Constructor), so the race does not recur there;
  review commits accept bundling and retry on index-lock.

## Progress

- [x] planning/artifact-generation — direction-v1 (Planner, `2095435`),
  model-v1 (Architect, `c1524d4`), design-v1 (Constructor, content at HEAD /
  event-log `a12a1c2`). Gate satisfied 3/3.
- [x] planning/one-turn-review — Planner (`636b6bf`), Architect (event-log `c59c303`,
  file bundled in `636b6bf`), Constructor (`3d788d6`). All decisions in the
  "Approve …" family; no "Request revision", no escalation. Gate 3/3.
- [x] planning/respond-to-feedback — Constructor accept-and-revise → `design-v2`
  (`e13b548`) folding all six amendments; response-constructor-to-architect.md written.
  **Consensus Gate met** (all reviews approved, revision accepted, no escalation).
  Plan is FIXED. `design-v2.md` is the authoritative build spec.
- [x] coding/concurrent-launch — Constructor implementation green (`4be4412`, 29 files,
  all six amendments; 47 tests pass incl. seed, lint clean, `compare:fixture` report
  generated, `make build` ok; real `compare` left paused). Architect discovery ready;
  Planner E2E plan (`1cad599`). Gate 3/3.
- [~] coding/review-and-testing —
  - [x] Architect analytical review of `4be4412`: **APPROVE WITH OBSERVATIONS**
    (`9340ff1`), no must-fix; all six points held in code/test/artifact, both Round-1
    changes closed, legal/ToS seam homed, dep-pins + env-file wiring sound. GATE passed.
  - [ ] Planner E2E (Groups A–C) → GATE.

### Non-blocking carry-over observations (Architect, round-2; for `/report` to judge)

- **O1 — `released` granularity:** all three models show bare `"2026"` though the type
  allows `YYYY-MM`; tighten to `YYYY-MM` from the cited sources at the paused-real-run /
  ToS WebFetch checkpoint. Registry-value refinement, no code change.
- **O2 — provenance invariant location:** measured-honesty is enforced by runner
  discipline (correct, tested, ADR-recorded), not a type-level barrier — preserve as the
  topic grows to a 4th provider.

### Environment constraints (lead-recorded; not code defects)

- **npm date cutoff (< 2026-06-17):** latest `openai` 6.44 / `@google/genai` 2.9 are
  unresolvable in this environment; pinned to newest installable `^6.43.0` / `^2.8.0`.
- **`make a11y` exits 127 locally:** pa11y-ci binary not installed here (Chromium pull);
  it is the CI a11y step (`--no-sandbox`). Built site serves 200; report a11y-sound by
  construction (semantic table headers, stable anchors, text-only legend). Planner to
  run pa11y where installed, else confirm CI coverage.
- **`models.ts` OpenAI/Google IDs+pricing** were WebFetch-verified at build time
  (GPT-5.5, Gemini 3.1 Pro) — flagged for a developer sanity-check before the public
  live run.

### Converged amendments adopted into design-v2 (lead synthesis of all three reviews)

1. **R2 token normalization** (Architect required A; Constructor #3) — pure, unit-tested
   per-adapter `usage → Completion.outputTokens` mapping (Anthropic `output_tokens` /
   OpenAI `completion_tokens` / Google `candidatesTokenCount`) + a non-zero-token guard
   that downgrades a row to `measured:false` rather than letting Speed silently corrupt.
2. **Honesty rendered unmistakably** (Planner; Constructor #2; Architect R1) — fixtured
   rows show `n/a (fixtured)` for the three probes AND suppress/mark raw `elapsedMs`/
   `outputTokens`; `report.test.ts` asserts it; a required "Scope & limitations" prose
   block (single-sample, point-in-time) in the report.
3. **Legal/ToS + trademark pre-publication gate** (Architect direction-concern; Planner;
   Constructor #4) — official product name + cited `source` per `models.ts` entry, a
   "Publication constraints" note in the report Method, and a checkpoint at the
   paused-real-run boundary, so the obligation has a structural home.
4. **Runner-owned constants** (Architect B) — probe-depth ladder + length target(s) live
   in the entrypoint runner, passed into the result/renderer; `domain/` stays pure.
5. **Readonly domain types** (Constructor #1) — `readonly` on `ComparisonRow.measurement`
   (and domain types generally).
6. Define paused-real-run **acceptance evidence** (Planner): a one-key run that
   demonstrably flags the unkeyed providers as fixtured.
