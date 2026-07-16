---
created_at: 2026-07-14T01:30:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure, Config]
effort: 4h
commit_hash:
category: Added
mission: periodic-research-target-compare-deep-research-alike-apis
depends_on: 20260714005156-kickoff-propose-periodic-research.md
---

# Scaffold the deep-research keyless instrument skeleton

## Overview

With the proposal drafted (`proposal.md`), build the **keyless skeleton** for the
`deep-research` topic — the same "skeleton built, real trial + pages gated"
pattern the sibling svg-generation / speech topics followed. This ticket delivers
the layered structure, the subject registry, a deterministic fixture path that
keeps CI green, an `--estimate` cost path, and CI wiring. It does **not** run a
paid trial, publish a page, or register the topic in `site.ts` — those stay at
the proposal-first approval gate as later mission tickets.

## Key Files

- `packages/tech/src/image-generation/` — closest full-topic precedent (domain
  `types`/`score`/`report`, `models.ts` registry, `run.ts`, entrypoint).
- `packages/tech/src/vendors/llm/types.ts` — the `CompletionClient` port to mirror.
- `packages/tech/src/research/domain/topic.ts` — the runnable `TOPICS` registry.
- `packages/tech/src/entrypoints/run-research.ts` — the `RUNNERS` binding + sync test.

## Implementation Steps

1. `src/deep-research/domain/types.ts` — subjects, provider union, question
   manifest, per-call record, subject-run aggregate, result.
2. `src/deep-research/models.ts` — 5-subject registry (OpenAI o3-deep-research,
   Perplexity sonar-deep-research, Gemini Deep Research, Grok DeepSearch, and the
   Anthropic build-your-own baseline) + the fixed judge model.
3. `src/deep-research/domain/manifest.ts` — 4 domain-neutral, reproducible
   research questions, each with a mechanical yes/no rubric.
4. `src/deep-research/domain/score.ts` (+ `.test.ts`) — pure scoring: registrable
   domain, source diversity, rubric answer-quality, citation validity, stat
   summary.
5. `src/deep-research/domain/report.ts` — 7-section English article via
   `renderEnglishResearchArticle`.
6. `src/vendors/deep-research/{types,fixture,providers}.ts` — the
   `DeepResearchClient` port, a deterministic fixture client, and a real factory
   gated on the follow-on `#deep-research-subject-vendors.md` ticket.
7. `src/deep-research/run.ts` + `src/entrypoints/run-deep-research.ts` — fixture
   (full) / estimate (priced) / real (gated) runner and thin CLI.
8. Wire `TOPICS` (`topic.ts`), `RUNNERS` (`run-research.ts`), and `package.json`
   `deep-research*` scripts; keep the runner-sync test green.
9. Record the provider deep-research SDK decision in `docs/dependency-decisions.md`.
10. `npm run research -- deep-research --fixture` to emit the committed fixture
    page; `npm test` + `npm run lint` green.

## Considerations

Keyless CI must stay green (fixture path only). Real subject clients are the next
ticket; here the real factory throws a clear pointer so `--real` fails honestly
rather than faking numbers. Do not touch `site.ts` or the corporate copy.
