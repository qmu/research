---
type: Mission
title: Support IaaS-hosted models (Vertex AI, AWS Bedrock)
slug: support-iaas-hosted-models-vertex-ai-aws-bedrock
status: active
created_at: 2026-07-13T23:56:50+09:00
author: a@qmu.jp
assignee: a@qmu.jp
tickets: []
stories: []
concerns: []
---

# Support IaaS-hosted models (Vertex AI, AWS Bedrock)

## Goal

The LLM comparison instrument currently reaches models only through each vendor's
**first-party API** (`vendors/llm/{anthropic,openai,google,xai}.ts`, keyed by a
single per-provider `apiKey` read in `entrypoints/run-llm-model-comparison.ts`).
Enterprise buyers rarely consume frontier models that way: they reach them through
the **IaaS platform they already trust and bill through** — Google **Vertex AI**,
AWS **Bedrock** — under that platform's IAM, data-residency, and compliance
envelope. Others route through **first-party specialists** (e.g. **Perplexity**'s
Sonar search-grounded models) or **aggregator gateways** (OpenRouter, Fireworks,
Together, Groq) for one key, one bill, and failover.

For public, reproducible research to stay credible and useful to those buyers, the
comparison should be able to measure a model **as it is actually served** — the
same weights on Bedrock or Vertex can differ from the first-party API in latency,
price, region, and available knobs. This mission makes the instrument's backend an
explicit axis, so a config can say "Claude on Bedrock in ap-northeast-1" or
"Gemini on Vertex", not just "Claude, first-party".

## Scope

**In scope** — additional *backends* (transports) for models we already reason
about, behind the existing `CompletionClient` port (`vendors/llm/types.ts`):

- **OpenAI-compatible backends** — the cheap tranche. Follow the `xai.ts` pattern
  (a ~20-line wrapper over `createOpenAiCompatibleCompletionClient(model, key,
  baseURL)` in `openai.ts`, no new SDK): **Perplexity** first, then a chosen subset
  of aggregator gateways.
- **IaaS-hosted backends** — **AWS Bedrock** and **Google Vertex AI**. These need
  real adapters/SDKs (or the Anthropic SDK's Bedrock/Vertex transports for
  Claude), and — the architectural crux — a **credential contract that is not a
  single `apiKey` string** (AWS SigV4 / GCP ADC). Generalizing the `ENV_KEY:
  Record<Provider,string>` + `(apiModelId, apiKey) => CompletionClient` wiring in
  the entrypoint is the load-bearing change everything else depends on.
- Registry + wiring for each backend: cards in `llm-model-comparison/models.ts`,
  the `Provider` union in `domain/types.ts`, `PROVIDER_DISPLAY_NAMES` in
  `domain/provider.ts`, `ENV_KEY`/`CLIENT_FACTORY` in the entrypoint.
- **Proposal-first** (per `CLAUDE.md` + `docs/research-development-guideline.md`):
  before building, propose the backend set, per-backend cost/trial impact, and any
  new subjects for developer approval. Record each new dependency and the
  base-URL/auth decision in `docs/dependency-decisions.md`.

**Out of scope** — new *models* whose weights we don't already track (that's a
`models.ts` change, not a backend); a self-hosted/on-prem inference path (vLLM,
Ollama); rewriting the comparison methodology; and touching the corporate-copy /
`qmu-co-jp` publishing path beyond what a normal report run already does.

## Acceptance

<!-- Progress is checked/total, computed from this list. Tickets are "(ticket TBD)"
     until written via /ticket with `mission: support-iaas-hosted-models-vertex-ai-aws-bedrock`. -->

- [ ] Entrypoint credential contract generalized so a provider can carry
      non-`apiKey` auth (AWS SigV4 / GCP ADC) without breaking the keyless fixture
      fallback (`provenance: "fixtured"`) (ticket TBD)
- [ ] **Perplexity** (Sonar) integrated as an OpenAI-compatible backend via the
      `xai.ts` base-URL pattern, with model cards in `models.ts` (ticket TBD)
- [ ] Candidate aggregator gateways surveyed (OpenRouter / Fireworks / Together /
      Groq / DeepInfra …) and a supported subset chosen in an approved proposal
      (ticket TBD)
- [ ] **AWS Bedrock** backend added behind the `CompletionClient` port (Claude-on-
      Bedrock via the Anthropic SDK Bedrock transport as the first target) (ticket TBD)
- [ ] **Google Vertex AI** backend added behind the `CompletionClient` port, GCP
      ADC auth (ticket TBD)
- [ ] Each new backend + its auth/base-URL decision recorded in
      `docs/dependency-decisions.md` (ticket TBD)
- [ ] The comparison sweep completes a **real run** targeting at least one
      IaaS-hosted config, archived to `docs/research-reports/history/…` (ticket TBD)
- [ ] Keyless CI stays green — every new backend falls back to the fixture path
      when its credentials are absent (ticket TBD)

## Changelog

- 2026-07-14 — mission created and drafted (Goal / Scope / Acceptance) — mission.md
