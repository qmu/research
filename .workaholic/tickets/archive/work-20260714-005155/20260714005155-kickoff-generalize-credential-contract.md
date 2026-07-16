---
created_at: 2026-07-14T00:51:55+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 4h
commit_hash: 2e9679a
category: Changed
mission: support-iaas-hosted-models-vertex-ai-aws-bedrock
depends_on:
---

# Generalize the LLM entrypoint credential contract for non-apiKey backends (SigV4 / ADC)

## Overview

Load-bearing first step of the **Support IaaS-hosted models** mission (acceptance item 1). Today `entrypoints/run-llm-model-comparison.ts` wires every provider through a single `ENV_KEY: Record<Provider,string>` apiKey and a `CLIENT_FACTORY` whose adapters take `(apiModelId, apiKey)`. AWS Bedrock (SigV4) and Google Vertex (GCP ADC) do not fit a single apiKey string. Generalize credential resolution so a provider can carry a structured credential (or resolver) **without breaking the keyless fixture fallback** (`provenance: "fixtured"`). This unblocks the Bedrock and Vertex adapter tickets.

## Key Files

- `packages/tech/src/entrypoints/run-llm-model-comparison.ts` — ENV_KEY / CLIENT_FACTORY / buildLiveClient (main change).
- `packages/tech/src/vendors/llm/types.ts` — CompletionClient port (keep stable).
- `packages/tech/src/vendors/llm/fixture.ts` — keyless fallback path to preserve.
- `packages/tech/src/llm-model-comparison/domain/types.ts` — Provider union.
- `docs/dependency-decisions.md` — record the auth-abstraction decision.

## Implementation Steps

1. Read the current ENV_KEY / CLIENT_FACTORY / buildLiveClient wiring.
2. Design a credential abstraction (e.g. discriminated union `apiKey | awsSigV4 | gcpAdc | none`) resolved per provider at the entrypoint.
3. Leave single-apiKey providers behaviourally unchanged; missing credentials must still fall back to the fixture path.
4. Unit-test with the throwing / fixture client (no live keys in CI).
5. Record the decision in `docs/dependency-decisions.md`.

## Considerations

Do not let AWS/GCP SDK types escape the vendors/ ACL. Keep `(apiModelId, credential) => CompletionClient` neutral. This is a **proposal-first** mission item only in that the broader backend set needs approval — but generalizing the contract is safe groundwork and can proceed.
