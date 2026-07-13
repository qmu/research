---
type: Mission
title: Periodic Research Target: Compare Agent VM Solutions (Lambda MicroVMs etc)
slug: periodic-research-target-compare-agent-vm-solutions-lambda-microvms-etc
status: active
created_at: 2026-07-14T00:40:40+09:00
author: a@qmu.jp
assignee: a@qmu.jp
tickets:
  - 20260714005157-kickoff-propose-periodic-research.md
stories: []
concerns: []
---

# Periodic Research Target: Compare Agent VM Solutions (Lambda MicroVMs etc)

## Goal

qmu builds AI agents that must execute untrusted, AI-generated code and run
long-lived agent workloads in isolated compute. The backend that provides that
isolation — a microVM, a gVisor/Kata container, or a raw Firecracker primitive —
is the single infrastructure choice that sets an agent's **cold-start latency**
(how quickly it can react), its **running cost**, its **isolation guarantee**
(the security boundary around code we did not write), and its **capability
envelope** (GPU access, filesystem persistence, max runtime, snapshot/resume).

The market for this layer is consolidating quickly — AWS shipped Lambda microVMs
(Firecracker) around 2026-06, and E2B, Modal, Daytona, Fly Machines, Cloudflare,
Vercel, and Northflank all compete on the same axes with very different pricing
and isolation models. This mission builds a **recurring, reproducible comparison**
so the team's sandbox-backend decision stays current as offerings and prices
move, published as a dated survey series like the other research topics.

## Proposal (proposal-first — awaiting developer approval)

Per `CLAUDE.md` and `docs/research-development-guideline.md`, no paid run and no
scaffolding happens before this proposal is approved. The five required elements:

**Working topic id:** `agent-vm` (slug `agent-vm-comparison`). "Sandbox" is the
umbrella term the market uses, but the mission names "VM Solutions", so the id
tracks the mission; rename on approval if preferred.

### 1. Cadence

**Quarterly**, base. Sandbox offerings and their pricing change on a
months-long rhythm — slower than LLM model releases (monthly topics) but this
layer is in active churn (a major provider, AWS, entered the set in 2026-06).
Following the guideline's Step 3, the **first two trials run monthly** to catch
the current consolidation, then settle to quarterly once the metrics prove they
discriminate. **Off-cadence triggers:** a new provider entering the compared
set, a published pricing change at a covered provider, or a new isolation
primitive (e.g. a provider moving from containers to Firecracker).

### 2. Comparison subjects

Eight providers, all present as **catalog subjects** (reference metrics read from
provider docs, keyless). The **measured-probe subset** is those exposing a keyed
create-and-boot API reachable from CI with a token:

| Subject | Isolation (stated) | Probe reachability |
| --- | --- | --- |
| AWS Lambda microVMs | Firecracker microVM | AWS credentials |
| Fly.io Machines | Firecracker microVM | Fly API token |
| E2B | Firecracker microVM (agent-first) | E2B API key |
| Modal | gVisor container (GPU-strong) | Modal token |
| Daytona | container, persistent workspace | Daytona API key |
| Cloudflare Containers / Sandbox SDK | container at edge | Cloudflare token |
| Vercel Sandbox | Firecracker microVM | Vercel token |
| Northflank Sandboxes | Kata / Firecracker / gVisor | Northflank token |

A provider with no reachable API in a given trial stays catalog-only for that
trial (its measured cells read 未測定), so a missing credential never blocks the
report.

### 3. Metrics

**Reference metrics** (from provider docs, keyless catalog):

| Metric | Unit | Direction |
| --- | --- | --- |
| isolationModel | category (Firecracker/gVisor/Kata/container) | reference |
| publishedVcpuHourUsd | USD/vCPU-hr | lower-is-better |
| publishedGbHourUsd | USD/GB-hr | lower-is-better |
| billingGranularity | per-second / per-100ms / per-hour | reference |
| maxRuntime | seconds (∞ = unbounded) | higher-is-better |
| snapshotResume | capability (yes/no, pause-billing) | reference |
| filesystemPersistence | ephemeral / persistent volume | reference |
| networkEgress | allowed / restricted | reference |
| gpuAvailable | yes/no (+ types) | reference |

**Measured metrics** (real probe, gated on approval + credentials):

| Metric | Unit | Direction |
| --- | --- | --- |
| coldStartMsP50 | ms | lower-is-better |
| coldStartMsP95 | ms | lower-is-better |
| warmReuseMs | ms | lower-is-better |
| fixedTaskWallClockMs | ms | lower-is-better |
| measuredCostPerTaskUsd | USD | lower-is-better |

The probe boots a sandbox per provider, times cold start over N repetitions,
reuses a warm sandbox once, and runs one fixed CPU task (a fixed deterministic
workload, e.g. a bounded compute loop) to derive wall-clock and measured cost.

### 4. Cost and trial count

Cost is compute-seconds only over short tasks, so it is small but not zero, and
several providers bill a minimum duration or require a funded account.

- **Premises:** 8 providers × **5–20 cold-start repetitions** + 1 warm reuse + 1
  fixed CPU task each; tasks a few seconds of vCPU. The tension: more repetitions
  narrow the cold-start p50/p95 variance the artifact records as stdDev, but
  multiply the boot count (and any per-boot minimum charge).
- **Estimated range:** **$1–$8 per trial** — cents at the cheapest providers
  (~$0.017/vCPU-hr, per-second billing) up to low single dollars at the priciest
  (AWS Lambda microVMs run several× the cheapest published rate). The figure is a
  range with these premises, never a single number; `npm run research -- agent-vm
  --estimate` decides before each real run, and an estimate outside the agreed
  range stops for re-approval.
- Keyless CI runs the **fixture path** (no boots): the reference catalog and the
  report shape stay green without spend, exactly like foundation-models.

### 5. Accumulated history

Per-provider `HistoryPoint` series for **`coldStartMsP50`** and
**`publishedVcpuHourUsd`**, one point per trial. After three or more trials the
current article's 推移 (trend) block shows each provider's cold-start and price
movement across the tendency window; the reference-capability columns (isolation,
snapshot, GPU, max runtime) are shown as the current catalog with a per-survey
changelog of what changed. Charts connect same-instrument-version points only,
per the existing history convention.

## Scope

**Definition of done.** An `agent-vm` research topic that:

- renders a **keyless reference catalog** of the eight providers' capability and
  published-pricing metrics from a committed subject registry;
- carries a **gated real probe** measuring cold-start (p50/p95), warm reuse,
  fixed-task wall-clock, and measured cost, behind `--estimate`;
- publishes the standard **7-section dated survey article** with 推移 (trend) and
  過去の調査 (past-survey) blocks, wired into `publishedResearchTopics` with its
  `ResearchDesign` metadata so indexes, publishing, and the cost gate read one
  source of truth;
- **accumulates per-provider history** and translates to Japanese for the qmu
  publish pipeline.

**Out of scope.** Running production agent workloads on these platforms; GPU /
ML-training benchmarks (a separate topic); a security audit of the isolation
boundary (the topic records each vendor's *stated* isolation model, not a
pen-test of it).

## Acceptance

<!-- One checklist item per criterion, each naming the ticket/story expected to satisfy it.
     Ticket filenames marked (planned) are created after the proposal is approved (gate). -->

- [ ] Proposal (cadence, subjects, metrics, cost/trial range, accumulated history) approved by the developer (#20260714005157-kickoff-propose-periodic-research.md)
- [ ] `agent-vm` subject registry + capability schema behind an anti-corruption `vendors/sandbox/` layer, with a keyless fixture path (planned: #agent-vm-subject-registry-and-vendor-port.md)
- [ ] Keyless reference-catalog renderer + result page for the nine reference metrics (planned: #agent-vm-reference-catalog-renderer.md)
- [ ] Gated real cold-start / warm-reuse / fixed-task cost probe with `--estimate`, one vendor adapter per reachable provider (planned: #agent-vm-real-coldstart-cost-probe.md)
- [ ] `agent-vm` topic wired into `publishedResearchTopics` with `ResearchDesign` metadata; English/Japanese indexes regenerate from it (planned: #agent-vm-wire-into-published-topics.md)
- [ ] Per-provider accumulated `HistoryPoint` history + 推移/過去の調査 composition into the current article (planned: #agent-vm-history-and-trend-composition.md)
- [ ] First validation trial run + design review; cadence confirmed or revised (planned, gated on approval + credentials: #agent-vm-first-validation-trial.md)
- [ ] Japanese translation + qmu publish wiring for the topic (planned: #agent-vm-japanese-translation-and-publish.md)

## Changelog

<!-- Append-only, dated timeline relating this mission's tickets and reports over time. -->

- 2026-07-14 — mission created (scaffold) — mission.md
- 2026-07-14 — kickoff proposal drafted (cadence, 8 subjects, 9 reference + 5 measured metrics, $1–$8/trial range, per-provider history); Goal/Scope/Acceptance filled; awaiting developer approval before scaffolding (proposal-first gate) — 20260714005157-kickoff-propose-periodic-research.md
