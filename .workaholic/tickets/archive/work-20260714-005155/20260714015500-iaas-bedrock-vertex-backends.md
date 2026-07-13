---
created_at: 2026-07-14T01:55:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 4h
commit_hash: 90c3a9e
category: Added
mission: support-iaas-hosted-models-vertex-ai-aws-bedrock
depends_on: 20260714005155-kickoff-generalize-credential-contract.md
---

# Add AWS Bedrock and Google Vertex AI Claude backends

## Overview

Mission acceptance items 4 and 5. Serve the same Claude weights through the IaaS
platforms enterprises consume them on — AWS Bedrock (SigV4) and Google Vertex AI
(GCP ADC) — behind the existing `CompletionClient` port, so a config can name
"Claude on Bedrock" and measure it as served. Uses the generalized credential
contract (`awsSigV4` / `gcpAdc`) from the kickoff ticket.

## Key Files

- `packages/tech/src/vendors/llm/messages-completion.ts` — shared Messages
  CompletionClient wiring the three transports delegate to.
- `packages/tech/src/vendors/llm/bedrock.ts` — `AnthropicBedrockMantle` transport,
  `anthropic.`-prefixed wire ids, SigV4 credential.
- `packages/tech/src/vendors/llm/vertex.ts` — `AnthropicVertex` transport, bare
  ids, GCP ADC credential.
- `packages/tech/src/vendors/llm/credentials.ts` — `requireAwsSigV4` /
  `requireGcpAdc` narrowing helpers.
- `packages/tech/src/llm-model-comparison/domain/types.ts` /
  `domain/provider.ts` — `Provider` union + display names.
- `packages/tech/src/llm-model-comparison/models.ts` — Claude-on-Bedrock/Vertex cards.
- `packages/tech/src/entrypoints/run-llm-model-comparison.ts` — CREDENTIAL_SPEC +
  CLIENT_FACTORY entries.
- `docs/dependency-decisions.md` — `@anthropic-ai/bedrock-sdk` / `vertex-sdk`.

## Implementation Steps

1. Extract the Anthropic Messages CompletionClient into a shared module taking any
   transport's SDK client.
2. Add the two official SDKs; write thin Bedrock/Vertex adapters that construct
   their client from the structured credential and delegate.
3. Add `requireAwsSigV4` / `requireGcpAdc`; widen `Provider`; add display names,
   cards, and entrypoint wiring.
4. Verify keyless fixture fallback (make test + a keyless run).
5. Record the decision.

## Considerations

Live Bedrock/Vertex paths are not exercised in CI (no cloud credentials); only the
keyless fallback and type-level wiring are verified. The first real IaaS run is
mission item 7. Prices are curated best-known estimates. AWS/GCP SDK types are
confined to the two adapter files.
