---
instruction: "Implement ticket .workaholic/tickets/todo/a-qmu-jp/20260623215050-llm-model-comparison-poc.md — fundamental LLM model-comparison PoC (second packages/tech research topic): multi-provider (Anthropic/OpenAI/Google) comparison behind one CompletionClient, curated model registry, three live probes (speed, nested-JSON depth, length accuracy), fixture path for keyless CI, generated docs/research-reports/llm-model-comparison.md, VitePress + CI wiring, and ADR 0004. Pause before the first real compare run so the user can populate .env."
phase: coding
step: concurrent-launch
iteration: 0
updated_at: 2026-06-24T08:35:00+09:00
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
- [ ] coding/concurrent-launch — Constructor implements + internal tests; Architect
  codebase discovery; Planner E2E scenario plan. **Hard stop before any real `compare`
  run** (paused for the developer's `.env`); the team verifies via keyless
  `compare:fixture` only.

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
