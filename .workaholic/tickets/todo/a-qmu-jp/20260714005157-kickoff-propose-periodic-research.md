---
created_at: 2026-07-14T00:51:55+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 4h
commit_hash:
category: Added
mission: periodic-research-target-compare-agent-vm-solutions-lambda-microvms-etc
depends_on:
---

# Kickoff: propose the Agent VM Solutions periodic-research instrument (cadence, subjects, metrics, cost)

## Overview

Kicks off the **Agent VM Solutions** periodic-research mission. Per `CLAUDE.md` (proposal-first) and `docs/research-development-guideline.md`, before building, produce a proposal for developer approval covering **cadence, subjects, metrics, cost/trial-count range, and accumulated history**. Then fill the mission's Goal/Scope/Acceptance and, once approved, scaffold the topic under `packages/tech/src/<topic>/` following the layered `domain/ entrypoints/ vendors/` structure — reusing the LLM comparison instrument's patterns (`vendors/` anti-corruption layer, a `models.ts`-style registry, keyless fixture fallback).

## Key Files

- `docs/research-development-guideline.md` — the proposal-first template to follow.
- `packages/tech/src/llm-model-comparison/` — reference instrument (registry, matrix, run, domain graders).
- `packages/tech/TEMPLATE.md` — how a new topic subfolder is shaped.
- `packages/tech/src/vendors/llm/types.ts` — the CompletionClient-style port to mirror where applicable.
- The mission file: `.workaholic/missions/active/periodic-research-target-compare-agent-vm-solutions-lambda-microvms-etc/mission.md`.

## Implementation Steps

1. Read `docs/research-development-guideline.md`.
2. Survey candidate subjects for this topic (see below) and confirm current offerings.
3. Draft the proposal: cadence, subject list, metrics, cost/trial-count range, accumulated-history shape.
4. Get developer approval (proposal-first gate — do not spend before approval).
5. Fill the mission Goal / Scope / Acceptance, each acceptance item naming the ticket that will satisfy it.
6. Scaffold the code skeleton behind an anti-corruption `vendors/` layer with a registry + keyless fixture path.

**Subjects to consider**
- AWS Lambda / Firecracker microVMs
- Fly.io Machines
- E2B, Modal, Daytona
- Cloudflare Containers / Sandbox SDK
- Vercel Sandbox, Northflank

**Candidate metrics:** cold-start / boot latency, cost per hour & per invocation, isolation model, filesystem/network capability, max runtime, snapshotting

## Considerations

Reuse the existing instrument patterns; do not fork a parallel design. Keep external SDKs behind `vendors/`. Ensure keyless CI stays green via a fixture path. Honour the proposal-first gate before any real (paid) runs.

## Progress (2026-07-14, night /drive)

Steps 1–3 and 5 are **done**; steps 4 (approval) and 6 (scaffold) are **blocked
on the proposal-first gate** and left for a post-approval `/drive`.

- Read the guideline and surveyed the current subject landscape (8 providers;
  AWS Lambda microVMs GA ~2026-06; cold starts ~80ms E2B → ~2.8s Fly; published
  rates ~$0.017–0.13/vCPU-hr).
- Drafted the five-element proposal (cadence, subjects, metrics, cost/trial
  range, accumulated history) and filled the mission Goal / Scope / Acceptance /
  Changelog in
  `.workaholic/missions/active/periodic-research-target-compare-agent-vm-solutions-lambda-microvms-etc/mission.md`.
- **Did not scaffold code** — the guideline states no scaffolding before
  approval, and this autonomous night run cannot clear the developer-approval
  gate. On approval, resume at step 4→6: create the acceptance-list tickets and
  scaffold `packages/tech/src/agent-vm/` behind `vendors/sandbox/` with a keyless
  fixture path, then wire it into `publishedResearchTopics`.
