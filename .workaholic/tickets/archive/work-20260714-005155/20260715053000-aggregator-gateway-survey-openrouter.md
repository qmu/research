---
created_at: 2026-07-15T05:30:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 4h
commit_hash: 5ab0db7
category: Added
mission: support-iaas-hosted-models-vertex-ai-aws-bedrock
depends_on: 20260714005155-kickoff-generalize-credential-contract.md
---

# Survey aggregator gateways and add the chosen subset (OpenRouter)

## Overview

Mission acceptance item 3: survey the candidate aggregator gateways (OpenRouter /
Fireworks / Together / Groq / DeepInfra) and choose a supported subset. All speak
OpenAI-compatible Chat Completions, so adapter cost is not the differentiator —
what each gateway *serves* is. Only OpenRouter serves models this registry already
tracks; the rest host open-weight models we do not track, which the mission's scope
excludes. Decision recorded as ADR 0007; OpenRouter implemented via the
`xai.ts`/`perplexity.ts` base-URL pattern.

## Key Files

- `docs/adr/0007-aggregator-gateway-subset.md` — the survey + decision.
- `packages/tech/src/vendors/llm/openrouter.ts` — thin base-URL wrapper (no new dep).
- `packages/tech/src/llm-model-comparison/domain/types.ts` / `domain/provider.ts` —
  `Provider` union + display name.
- `packages/tech/src/llm-model-comparison/models.ts` — OpenRouter cards.
- `packages/tech/src/llm-model-comparison/domain/matrix.test.ts` — no-effort drift guard.
- `packages/tech/src/entrypoints/run-llm-model-comparison.ts` — CREDENTIAL_SPEC + CLIENT_FACTORY.
- `docs/dependency-decisions.md` — base-URL/auth decision.

## Implementation Steps

1. Survey each gateway's base URL, protocol, and served catalogue against the
   mission's in-scope line (backends for models we already track).
2. Record the survey + chosen subset as an ADR.
3. Add `openrouter.ts` over `createOpenAiCompatibleCompletionClient`; widen
   `Provider`; add display name, cards (explicit pinned ids), and wiring.
4. Verify keyless fixture fallback (make test + a keyless run).

## Considerations

Effort is `n/a` on the OpenRouter cards — the gateway maps a reasoning knob per
underlying model and an unsupported effort is a hard 400; widening the ladder is
gated on a real run. The survey is point-in-time: re-check `/api/v1/models` before
relying on it. Groq/Together/Fireworks/DeepInfra require a prior decision to track
open-weight models; supersede ADR 0007 rather than amend it at that point.
