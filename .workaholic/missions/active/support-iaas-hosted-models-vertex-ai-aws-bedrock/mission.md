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

- [x] Entrypoint credential contract generalized so a provider can carry
      non-`apiKey` auth (AWS SigV4 / GCP ADC) without breaking the keyless fixture
      fallback (`provenance: "fixtured"`)
      (#20260714005155-kickoff-generalize-credential-contract.md)
- [x] **Perplexity** (Sonar) integrated as an OpenAI-compatible backend via the
      `xai.ts` base-URL pattern, with model cards in `models.ts`
      (#20260714013000-perplexity-sonar-backend.md)
- [x] Candidate aggregator gateways surveyed (OpenRouter / Fireworks / Together /
      Groq / DeepInfra …) and a supported subset chosen in an approved proposal
      (#20260715053000-aggregator-gateway-survey-openrouter.md)
- [x] **AWS Bedrock** backend added behind the `CompletionClient` port (Claude-on-
      Bedrock via the Anthropic SDK Bedrock transport as the first target)
      (#20260714015500-iaas-bedrock-vertex-backends.md)
- [x] **Google Vertex AI** backend added behind the `CompletionClient` port, GCP
      ADC auth (#20260714015500-iaas-bedrock-vertex-backends.md)
- [x] Each new backend + its auth/base-URL decision recorded in
      `docs/dependency-decisions.md`
      (#20260714015500-iaas-bedrock-vertex-backends.md)
- [ ] The comparison sweep completes a **real run** targeting at least one
      IaaS-hosted config, archived to `docs/research-reports/history/…`
      (#20260715054500-close-out-iaas-hosted-models-mission.md — blocked on AWS/GCP
      credentials and owner spend approval)
- [x] Keyless CI stays green — every new backend falls back to the fixture path
      when its credentials are absent
      (#20260715054500-close-out-iaas-hosted-models-mission.md)

## Changelog

- 2026-07-14 — mission created and drafted (Goal / Scope / Acceptance) — mission.md
- 2026-07-16 — all backend work merged to main via PR #37 (merge 84e01eb): c1d14a1
  generalized credential contract (`CREDENTIAL_SPEC`, non-`apiKey` auth, keyless
  fixture fallback intact), 83ef1ae Perplexity Sonar backend
  (`vendors/llm/perplexity.ts`), 9a5e112 AWS Bedrock + Google Vertex AI backends
  (`vendors/llm/{bedrock,vertex}.ts` via `@anthropic-ai/{bedrock,vertex}-sdk`,
  `awsSigV4`/`gcpAdc` credential specs), 3ad6ec9 aggregator gateway survey with
  ADR 0007 choosing OpenRouter only; auth/base-URL decisions recorded in
  `docs/dependency-decisions.md`; four acceptance tickets archived under
  work-20260714-005155; checklist not updated at the time — noted retroactively
  during the 2026-07-17 reconciliation
- 2026-07-17 — reconciliation against main (ticket
  20260715054500-close-out-iaas-hosted-models-mission.md): items 1–6 and 8 checked
  with the commit-level evidence above; keyless CI green on main
  (build-research-tech at PR #37 merge and on subsequent main pushes) — 7/8 checked
- 2026-07-17 — item 7 left unchecked: no AWS (`AWS_ACCESS_KEY_ID`) or GCP
  (`GOOGLE_CLOUD_PROJECT` + ADC) credentials exist in the environment, the
  Bedrock/Vertex live paths have never executed, and a real sweep incurs spend
  requiring owner approval (proposal-first); no IaaS-config frame exists under
  `docs/research-reports/history/`. The run recipe, credential names, and carried
  concerns (Bedrock `anthropic.`-prefixed wire ids, `awsSecretAccessKey` option
  name, OpenRouter `n/a` effort ladder) are preserved in the archived close-out
  ticket
