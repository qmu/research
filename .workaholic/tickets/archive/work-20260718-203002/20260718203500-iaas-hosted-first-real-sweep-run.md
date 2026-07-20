---
created_at: 2026-07-18T20:35:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, Domain]
effort:
commit_hash: 49000d2
category: Added
depends_on:
mission: support-iaas-hosted-models-vertex-ai-aws-bedrock
---

# First real IaaS-hosted sweep run (≥1 Bedrock or Vertex config), archived

## Overview

This is the **final** acceptance item of the
`support-iaas-hosted-models-vertex-ai-aws-bedrock` mission (7 of 8 already done —
credential contract, Perplexity, aggregator survey, Bedrock backend, Vertex
backend, dependency-decisions record, keyless CI). All backend code is built,
merged, and green; **only the first live IaaS run remains**. The instrument must
complete a real comparison sweep that includes at least one IaaS-hosted
configuration (`bedrock-claude-opus-4-8` / `bedrock-claude-sonnet-5` or
`vertex-claude-opus-4-8`) whose rows report `provenance: "measured"`, then archive
the dated frame under `docs/research-reports/history/…`.

**Status: BLOCKED on cloud credentials — no spend permitted until reachable.**
The 2026-07-18 pre-flight authorized the run *conditioned on credential
reachability*; the reachability probe that night found neither cloud usable (see
Considerations). This ticket carries the exact recipe and the verified blocker so
a later credentialed run executes without re-deriving any of it.

## Policies

- **Proposal-first spend gate (`CLAUDE.md`, `docs/research-development-guideline.md`).**
  A real sweep incurs API spend and MUST be priced with `--estimate` and confirmed
  against the owner's approved budget before `--estimate` is dropped. The v2 sweep
  has historically been ~$3 actual / ~$6.7 estimated; keep total (sweep + JP
  translation) within the owner's approved ceiling.
- **No fabrication — per-cell provenance is load-bearing.** Every rendered cell
  carries `measured | fixtured | error`. An IaaS row may only be checked off when
  it is genuinely `measured` against the live SigV4/ADC path. A provider whose
  credentials are absent or whose live call fails is recorded as an honest
  `fixtured`/`error` row — never a synthesized number. This is the whole point of
  acceptance item 7: it is the first live exercise of the Bedrock/Vertex adapters.
- **workaholic:operation** — verification must not mask failure. Confirm the run's
  real outcome from the artifact's provenance fields and bare exit codes, not from
  a green-looking log.

## Implementation Steps

1. **Confirm at least one cloud is reachable (read-only) before any spend.**
   - Bedrock: `aws sts get-caller-identity`, then
     `aws bedrock list-foundation-models --region us-east-1` (and/or
     `ap-northeast-1`). Needs `AWS_REGION` + `AWS_ACCESS_KEY_ID` +
     `AWS_SECRET_ACCESS_KEY` (optional `AWS_SESSION_TOKEN`), or an EC2 instance
     role that actually resolves.
   - Vertex: `gcloud auth application-default print-access-token` must succeed
     **and** a project with the Vertex AI API (`aiplatform.googleapis.com`)
     **enabled** and **Anthropic Model Garden access accepted** must be set via
     `GOOGLE_CLOUD_PROJECT` + `GOOGLE_CLOUD_LOCATION` (a Claude-supported region,
     e.g. `us-east5`). ADC alone is not sufficient — see Considerations.
2. **Price it (proposal-first).** From `packages/tech`:
   `npm run compare -- --models vertex-claude-opus-4-8 --estimate`
   (or `--models bedrock-claude-opus-4-8`). Confirm the spend with the owner.
3. **Run the targeted sweep** with the credentials exported:
   `npm run compare -- --models bedrock-claude-opus-4-8,vertex-claude-opus-4-8 --detail standard`.
   A `--models` selector **merges** into the latest artifact rather than
   overwriting the whole matrix, so untouched real measurements are preserved.
4. **Confirm the IaaS rows report `measured`, not `fixtured`** — inspect the
   per-config progress lines on stderr and the `provenance` fields in
   `…real.data.json`. This is the acceptance signal.
5. **Archive + publish** per the v2 sweep recipe:
   `npm run research:archive -- <topic> --generated-at <artifact generatedAt>`,
   then `npm run research:translate-report -- speed` / `-- accuracy` (mandatory —
   the unified CLI's insights-translation stage overwrites the JP page otherwise),
   then `npm run research:site -- write-snapshots` and `-- write-indexes`.
6. **Tick mission acceptance item 7** and append a mission changelog line with the
   estimated and actual cost.

## Quality Gate

- At least one IaaS-hosted config (`bedrock-*` or `vertex-*`) appears in the
  committed `…real.data.json` with `provenance: "measured"` and per-cell
  provenance intact — verified by reading the artifact, not the rendered page.
- A dated history frame exists under
  `docs/research-reports/history/<topic>/<timestamp>/` containing the full-record
  data artifact.
- No fabricated cells: any unreachable provider is `fixtured`/`error`, labelled as
  such, with the reason legible.
- Per-package bare exit codes green: `( cd packages/tech && npm test )`,
  `npm run build`, `npm run lint` — never `make test`/`make lint` (they mask
  non-final-package failures; see ticket 20260717130639).
- Estimated and actual USD cost recorded in the mission changelog; total within
  the owner-approved ceiling.

## Findings — 2026-07-20 live Bedrock run (research result, ticket kept in todo)

The run recipe was executed for real with AWS SSO credentials (profile `q`,
account 839625015061, PowerUserAccess), `AWS_REGION=us-east-1`:
`npm run compare -- --models bedrock-claude-opus-4-8,bedrock-claude-sonnet-5
--detail standard`.

- **Both target models returned HTTP 403 `permission_error`** on the live
  Converse/Invoke call:
  `anthropic.claude-opus-4-8 is not available for this account. You can explore
  other available models on Amazon Bedrock. For additional access options,
  contact AWS Sales at https://aws.amazon.com/contact-us/sales-support/`
  (identical for `anthropic.claude-sonnet-5`).
- Both configs are recorded as honest **`provenance: "error"`** rows in the
  artifact, the appended history point (`llm-model-comparison.history.json`,
  entry generatedAt 2026-07-20T07:00:41.413Z, 3 trials each), and the archived
  frame `docs/research-reports/history/2026-07-20T07-00-41.413Z.data.json.gz`.
- **Cost: estimated ~$3.05 (rough); actual ~$0** — every call 403s before any
  billable inference.
- The 403 is a **server-side entitlement fact, not an adapter defect** — it
  proves the SigV4 adapter authenticates and reaches Bedrock. Prior-generation
  Claude models (opus-4-7, sonnet-4-6, haiku-4-5, 3-haiku) return 200 on the same
  account/region. `aws bedrock get-foundation-model-availability` does not
  distinguish the working vs non-working models; the invoke result is the ground
  truth.
- **The research finding is this availability/entitlement lag** between
  first-party Claude and AWS Bedrock for the newest models (opus-4-8, sonnet-5).
  Acceptance #7's literal `provenance: "measured"` is not satisfiable for the
  target models until AWS grants entitlement. Ticket intentionally **kept in
  todo**; #7 checkbox left unchecked — reframe/close is an owner decision.

## Considerations

**Credential reachability probe — 2026-07-18 20:30 JST (this desk, read-only):**

- **AWS Bedrock — UNREACHABLE.** `aws sts get-caller-identity` returns
  `NoCredentials` (no `AWS_ACCESS_KEY_ID` in env, no EC2 instance-role credentials
  resolvable). `aws bedrock list-foundation-models` fails the same way. Bedrock is
  honestly out of reach until AWS credentials exist in the run environment.
- **Vertex AI — ADC present but NOT usable this run.**
  `gcloud auth application-default print-access-token` **succeeds** (a user
  refresh-token ADC), but: `GOOGLE_CLOUD_PROJECT` is **unset** (env and
  `gcloud config`), the ADC has **no** `quota_project_id`, and there is **no** GCE
  metadata server to supply a project. The accessible projects checked
  (`gen-lang-client-0052188156` "Internal", `for-gdrive-ftp`) have the Vertex AI
  API (`aiplatform.googleapis.com`) in state **DISABLED**. Enabling the API is a
  billable, owner-level change, and Claude-on-Vertex additionally requires
  **manual Anthropic Model Garden terms acceptance in the console** — neither is
  appropriate for an autonomous run. So ADC availability alone did not make Vertex
  reachable.

**What "reachable" requires, concretely, for the next attempt:**

- Bedrock: real AWS creds + `bedrock:InvokeModel` on `anthropic.*` models in a
  region where they are enabled (Claude on Bedrock uses `anthropic.`-prefixed wire
  ids — the adapter adds the prefix; card `apiModelId` is the bare id).
- Vertex: ADC + a project with Vertex AI enabled + Model Garden Claude access +
  `GOOGLE_CLOUD_PROJECT`/`GOOGLE_CLOUD_LOCATION` set to a Claude-supported region.

**Carried concerns (from the archived close-out ticket, still unproven):** the
Bedrock/Vertex **live** paths have never executed — the first real run is also the
first real test of those adapters; expect to debug there. Watch Bedrock's
`anthropic.`-prefixed wire ids and the Mantle option name `awsSecretAccessKey`.
Prices on the Bedrock/Vertex cards are curated best-known estimates, not measured.
