---
created_at: 2026-07-21T02:10:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on:
mission:
---

# Add an "OSS Foundational Research" section (a per-dependency assessment type)

## Overview

Introduce a second foundational-research section, **OSS Foundational Research** (OSS基盤調査), living alongside the existing `docs/llm-foundation/` section but representing a **distinct research type**.

The existing LLM-foundation work is **comparison research**: a small set of subjects (e.g. Agent SDKs, OCR engines, vector DBs) read across many axes, published as 7-section articles per `docs/research-development-guideline.md`. OSS-foundation is the opposite shape — **wide-and-shallow per-dependency assessment**: for each open-source component the organization already depends on, produce a compact standing assessment of two things:

- **Sustainability** — maintenance status, release cadence, maintainer count / bus-factor, license, governance and funding signals.
- **Security** — known-vulnerability (CVE/advisory) history, disclosure responsiveness, and supply-chain posture.

These are the targets for the organization's background checks on sustainability and security. The catalog is **large** — hundreds of items spanning package-manager libraries (npm / crates.io / Go modules / pip / Composer), container base images and middleware (databases, proxies, object stores, auth), and server/OS development tooling. Because the subject count is this large, the governing design constraint is: **the per-software article must be lean.** A fixed, minimal section set per software (not the 7-section comparison template) is what lets coverage scale toward the whole catalog. Proposed per-software sections (kept small on purpose): (1) 概要 / where-used + pinned version, (2) 持続可能性 (sustainability), (3) セキュリティ (security), (4) 判定と推移 (assessment + trend across surveys) with a 過去の調査 links block. No more.

This keeps the repository's contract — public, reproducible, objective, proposal-first — while adding a research type it does not currently express.

## Policies

The standard engineering policies that govern this ticket. The implementing session MUST read each linked policy hard copy before writing code and keep every change defensible against that policy's Goal (目標), Responsibility (責務), and Practices (実践).

- `workaholic:planning` / `policies/*` — this initiates a new research line; ground its business/legal purpose (license-compliance and security due-diligence) before building
- `workaholic:implementation` / `policies/directory-structure.md` — a new topic is a subfolder under `packages/tech/src/`, not a new package (repo convention)
- `workaholic:implementation` / `policies/coding-standards.md` — layered `src/` (domain / entrypoints / vendors, external SDK access behind anti-corruption layers)
- `workaholic:operation` / `policies/ci-cd.md` — the topic runs through `make`; CI invokes the same targets; no build logic inline in workflow YAML

## Key Files

- `docs/llm-foundation/` — the existing foundational-research section to mirror structurally (index + per-topic pages, JA); `docs/oss-foundation/` is the new sibling
- `docs/research-development-guideline.md` — proposal-first protocol and the dated-survey-series article model; OSS-foundation needs a lean-article variant of this recorded (or an ADR) since its article shape differs from the 7-section comparison article
- `docs/adr/` — ADR 0006 (dated survey article series) is the precedent; a new ADR should record the wide-shallow per-dependency article type and why its section set is intentionally smaller
- `packages/tech/TEMPLATE.md` — the per-topic build recipe the new topic follows
- `packages/tech/src/research/domain/site.ts` — `publishedResearchTopics`; the new section/topic registers here
- `docs/research-reports/` — English handwritten counterpart pages; `Makefile` — the single runner the topic plugs into

## Implementation Steps

1. **Proposal-first (do this before scaffolding).** Follow `docs/research-development-guideline.md` Step 2 and present the five elements for approval: **cadence** (security signals argue for a shorter interval than the comparison topics — propose the interval + the off-cadence trigger, e.g. a new advisory); **comparison subjects** (here: the dependency catalog itself — see step 2); **metrics** (the sustainability + security indicators, each with unit and better-direction); **cost and trial count** (this topic is low/near-free — it reads public data, not paid model sweeps — state the range and premises, run the `--estimate` path); **accumulated history** (which per-software indicator becomes a `HistoryPoint` series so a software's health/security trend is visible over surveys).
2. **Catalog sourcing.** The subject set is derived by scanning dependency manifests across the organization's **dependency surface** (package-manager manifests, container image references, and declared server tooling). Keep the collector reproducible and vendor-neutral; the catalog is an input artifact, deduplicated to a canonical OSS list.
3. **Signal sources (public, reproducible, low-cost).** Behind anti-corruption layers in `vendors/`: OpenSSF Scorecard, OSV / GitHub Security Advisories, deps.dev, SPDX/registry license metadata, endoflife.date, and registry release history. Every value carries a provenance label the way the LLM-foundation pages do (measured vs 未測定 vs 要確認).
4. **Lean article template.** Define the fixed 3–4-section per-software article and generate the section under `docs/oss-foundation/` (JA) with its handwritten English counterpart, plus an index/catalog page. Enforce the section cap so articles stay uniform and scalable.
5. **Dated survey series.** Reuse the uniform-trial-report frame (`docs/research-reports/history/<topic-id>/<timestamp>/`) so each survey is a dated snapshot and the current article shows the tendency window + past-surveys links.
6. **Wire the runner** (`make` targets, `publishedResearchTopics`) and update `docs/` navigation and the guideline/ADR in the same change.

## Quality Gate

**Acceptance criteria**

- A new `docs/oss-foundation/` section exists with an index and at least one per-software article rendered from the **fixed lean template** (section count capped; no 7-section sprawl).
- The topic is a subfolder under `packages/tech/src/` with layered `src/` (domain/entrypoints/vendors) and registers in `publishedResearchTopics`.
- Every published value carries a provenance label; unmeasured items read 未測定 / 要確認, never a guessed number.
- The proposal's five elements were approved before scaffolding (recorded), and the article-type decision is captured in an ADR or the guideline.
- JA and EN pages are both present and handwritten-consistent; docs updated in the same change.

**Verification method**

- `make build`, `make test`, `make lint`, and `make docs` are green via the single runner (CI invokes the same targets); the topic's `--estimate` path returns a cost figure.
- A dry (non-paid) trial produces a uniform trial report under `docs/research-reports/history/<topic-id>/<timestamp>/` and the current article embeds its trend + past-surveys links.
- VitePress builds the new section without broken links.

**Gate**

- Proposal approved, suite/docs green, the lean per-software template demonstrated on a real dependency, and the section-count cap verified before approval.

## Considerations

- **Coverage vs. depth is the core tension**, and it is decided in favor of coverage: hundreds of subjects mean each article must stay small. Resist adding sections per software — richness belongs in the catalog breadth and the trend series, not in per-item section sprawl (`docs/oss-foundation/`).
- **This is a new research *type*, not a new topic under the old model** — the wide-shallow article differs enough from the 7-section comparison article that it warrants its own ADR so future topics pick the right shape (`docs/adr/`).
- **Catalog provenance must stay generic.** The subject list is the organization's dependency surface; the published research must name only the public OSS, never how or where the catalog was gathered.
- **Cadence likely differs from comparison topics** — security advisories move faster than design comparisons, so the sustainability half and the security half may warrant different refresh intervals; surface that in the proposal rather than assuming one cadence.
- **Automation ceiling**: sustainability/security signals are largely machine-fetchable (Scorecard/OSV/deps.dev), which is what makes whole-catalog coverage feasible at low cost; keep human judgment for the 判定, not the data pull.
