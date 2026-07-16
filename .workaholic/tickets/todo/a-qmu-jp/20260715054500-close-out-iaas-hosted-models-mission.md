---
created_at: 2026-07-15T05:45:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 1h
commit_hash:
category: Changed
mission: support-iaas-hosted-models-vertex-ai-aws-bedrock
depends_on: 20260715053000-aggregator-gateway-survey-openrouter.md
---

# Close out the IaaS-hosted-models mission: PR, then the first real IaaS sweep

## Overview

**Resumption checkpoint** written by `/carry` (2026-07-15). The
`support-iaas-hosted-models-vertex-ai-aws-bedrock` mission is **7 of 8 acceptance
items complete** on branch `work-20260714-005155`. All backend code is built,
committed, and green; nothing is half-written and the working tree is clean.

Two things remain, in order:

1. **Open the PR — unblocked, do this first.** Nine commits sit unmerged against
   `main` with no PR yet. Run `/report`.
2. **Acceptance item 7 — the first real IaaS run. HARD BLOCKER: credentials.**
   Requires AWS and/or GCP credentials that were not present in the environment
   where this work was built. Do not attempt until they exist.

## Position (verified 2026-07-15)

- Branch `work-20260714-005155`, working tree **clean**, todo queue otherwise empty.
- Nine unmerged commits vs `main`, newest first: `9da5ed8`, `5ab0db7` (OpenRouter +
  ADR 0007), `4655f39`, `90c3a9e` (Bedrock + Vertex), `ef2eb8e`, `0aeabd5`
  (Perplexity), `31b8aea`, `2e9679a` (credential contract), `8b883ec` (kickoff).
- No PR exists for the branch yet.
- `make test` (tsc + 315 vitest) and `make lint` were green at `5ab0db7`.
- Four tickets already archived under
  `.workaholic/tickets/archive/work-20260714-005155/`.

### Acceptance status

| # | Item | State |
| --- | --- | --- |
| 1 | Credential contract generalized (non-`apiKey` auth) | Done — `2e9679a` |
| 2 | Perplexity (Sonar) OpenAI-compatible backend | Done — `0aeabd5` |
| 3 | Aggregator gateways surveyed, subset chosen | Done — `5ab0db7`, ADR 0007 (OpenRouter only) |
| 4 | AWS Bedrock backend | Done — `90c3a9e` |
| 5 | Google Vertex AI backend | Done — `90c3a9e` |
| 6 | Each backend's auth/base-URL decision recorded | Done — `docs/dependency-decisions.md` |
| 7 | **Real run targeting ≥1 IaaS config, archived** | **BLOCKED — needs cloud credentials** |
| 8 | Keyless CI green; every backend falls back to fixture | Done — verified per backend by keyless runs |

## Implementation Steps

1. **`/report`** — generate the branch story and open the PR. Nothing blocks this.
2. When AWS/GCP credentials exist, do acceptance item 7:
   - Export the credentials the specs read (see Considerations for the exact names).
   - **Price it first**: `npm run compare -- --models bedrock-claude-opus-4-8 --estimate`
     from `packages/tech`. A real sweep costs money — confirm the spend with the
     owner before dropping `--estimate` (proposal-first, per `CLAUDE.md`).
   - Run the targeted sweep, e.g.
     `npm run compare -- --models bedrock-claude-opus-4-8,vertex-claude-opus-4-8 --detail standard`.
     A selector run **merges** into the latest artifact rather than overwriting the
     whole matrix, so untouched real measurements are preserved.
   - Confirm the rows report `measured`, not `fixtured` — that is the whole point
     of item 7 and the first live exercise of the SigV4 / ADC paths.
   - Archive the dated frame:
     `npm run research:archive -- <topic> --generated-at <iso>`.
   - Japanese pages need `npm run research:translate-report -- <topic>` after a real
     run (see [[comparison-sweep-v2-run-recipe]]).

## Considerations

**Credentials each backend resolves (all absent → deterministic fixture fallback,
never an error):**

- Bedrock (`awsSigV4`): `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  optional `AWS_SESSION_TOKEN`.
- Vertex (`gcpAdc`): `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, plus ambient
  ADC (`gcloud auth application-default login` or the metadata server).
- Perplexity: `PERPLEXITY_API_KEY`. OpenRouter: `OPENROUTER_API_KEY`.

**Carried concerns — the live paths are unproven:**

- The Bedrock and Vertex **live** paths have never executed. Only the keyless
  fixture fallback and the type-level wiring are verified. The first real run is
  therefore also the first test of those adapters — expect to debug there, not in
  CI. Watch specifically for Bedrock's `anthropic.`-prefixed wire ids and the
  Mantle option name `awsSecretAccessKey` (not the legacy `awsSecretKey`).
- **OpenRouter effort ladder is deliberately `n/a`.** OpenRouter maps a reasoning
  knob per underlying model and an unsupported effort is a hard 400 (a failed run,
  not a finding). Widening the ladder is a follow-up gated on a real run confirming
  the mapping per model — do not widen it speculatively.
- Prices on the Bedrock/Vertex/Perplexity cards are **curated best-known
  estimates**, not measured. OpenRouter's were verified live against its public
  `/api/v1/models` on 2026-07-14 and are passthrough (equal to first-party), so a
  first-party-vs-OpenRouter comparison holds price constant.
- ADR 0007's survey is point-in-time. Groq/Together/Fireworks/DeepInfra were
  deferred because they serve only open-weight models this registry does not track
  — reopening that requires a prior decision to track those models, at which point
  **supersede ADR 0007 rather than amend it**.

**Adding another provider later** touches five places: the `Provider` union
(`domain/types.ts`), `PROVIDER_DISPLAY_NAMES` (`domain/provider.ts`),
`CREDENTIAL_SPEC` + `CLIENT_FACTORY` (`entrypoints/run-llm-model-comparison.ts`),
and model cards (`models.ts`). An `n/a`-only card must also be added to
`KNOWN_NO_EFFORT_MODEL_IDS` in `domain/matrix.test.ts` — that drift guard fails
loudly and is the intended reminder.
