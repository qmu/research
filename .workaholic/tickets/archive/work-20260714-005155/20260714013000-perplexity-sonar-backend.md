---
created_at: 2026-07-14T01:30:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 2h
commit_hash: 0aeabd5
category: Added
mission: support-iaas-hosted-models-vertex-ai-aws-bedrock
depends_on: 20260714005155-kickoff-generalize-credential-contract
---

# Add Perplexity (Sonar) as an OpenAI-compatible backend

## Overview

Mission acceptance item 2. Perplexity's Sonar models speak the OpenAI Chat
Completions protocol at `https://api.perplexity.ai`, so they reach the existing
`CompletionClient` port through the same base-URL variant of the OpenAI adapter
that `xai.ts` already uses — no new SDK. Adds a `perplexity` provider, a thin
`vendors/llm/perplexity.ts` wrapper, model cards, and the entrypoint wiring
(credential spec + client factory), key-gated on `PERPLEXITY_API_KEY` with the
keyless fixture fallback preserved.

## Key Files

- `packages/tech/src/vendors/llm/perplexity.ts` — new thin wrapper (base URL).
- `packages/tech/src/llm-model-comparison/domain/types.ts` — widen `Provider`.
- `packages/tech/src/llm-model-comparison/domain/provider.ts` — display name.
- `packages/tech/src/llm-model-comparison/models.ts` — Sonar cards.
- `packages/tech/src/entrypoints/run-llm-model-comparison.ts` — CREDENTIAL_SPEC + CLIENT_FACTORY.
- `docs/dependency-decisions.md` — record the base-URL/auth decision (no new dep).

## Implementation Steps

1. `perplexity.ts`: `createPerplexityCompletionClient(id, key)` over
   `createOpenAiCompatibleCompletionClient(id, key, PERPLEXITY_BASE_URL)`.
2. Widen `Provider` union with `"perplexity"`; add its display name.
3. Add curated Sonar cards (cite pricing/model docs; non-reasoning → `n/a`
   effort, reasoning models → their documented effort ladder).
4. Wire `perplexity: { kind: "apiKey", apiKeyEnv: "PERPLEXITY_API_KEY" }` and the
   factory entry.
5. Record the decision; verify keyless fixture fallback (make test + a keyless run).

## Considerations

Sonar is search-grounded — its numbers are not directly comparable to a plain
chat model on the same probes, but the instrument measures a model as served, so
that is the point. Keep the citation/search behaviour out of the domain: it is a
provider fact behind the ACL. Prices are curated best-known estimates.
