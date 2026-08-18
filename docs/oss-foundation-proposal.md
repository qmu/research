---
title: OSS foundational research — proposal
description: The proposal-first Step 2 submission for a second foundational-research section, OSS基盤調査 — a wide-shallow sustainability and security assessment per depended-on open-source component.
---

# OSS foundational research — proposal

**Status: awaiting developer approval.** This is the Step 2 submission required
by [the research development guideline](./research-development-guideline)
before any scaffolding happens; `packages/tech/TEMPLATE.md` Step 0 states the
same gate. No package, topic folder, `publishedResearchTopics` entry, docs
section, or paid run exists yet, and none is created until this proposal is
approved or adjusted. The article-type decision this proposal depends on is
recorded, also as proposed, in
[ADR 0010](./adr/0010-wide-shallow-per-dependency-assessment-articles).

**Terse idea (from the ticket).** Stand up a second foundational-research
section covering the open-source components the organization already depends on,
assessing each for sustainability and security — the background checks the
organization needs for license compliance and security due diligence.

## Step 1 — investigate: this is a new topic, and a new type

`publishedResearchTopics` (`packages/tech/src/research/domain/site.ts`) holds
comparison topics only: models, agent SDKs, OCR engines, vector DBs, speech,
image generation, computer use, deep research, agent VMs. Every one is a small
enumerated candidate set read across many axes and published as the standard
7-section article.

The idea maps to none of them, and it does not extend one. It is also not a
comparison: the components are already chosen, and the question is whether each
remains safe to keep depending on. It therefore starts a new topic **and** a new
research type — hence ADR 0010 alongside this proposal.

## Step 2 — the proposal

### 1. Cadence

**Monthly for the security half; quarterly for the sustainability half; one
monthly survey run that refreshes both, with the sustainability values carried
forward between quarters and labelled with their measurement date.**

The reason for the split is that the two halves change on different clocks. A
new advisory against a pinned version is actionable the day it publishes;
maintainer count, release cadence, and governance move over quarters, and
re-deriving them monthly produces churn in the trend series without new
information.

A single monthly run is proposed rather than two schedules because both halves
read the same catalog and the same registries, and one run is one dated frame —
two interleaved cadences would fork the survey series that ADR 0006 keeps
uniform.

**Off-cadence trigger:** a new advisory rated High or Critical affecting a
version the organization has pinned. That is the event the section exists to
catch, and waiting up to a month for it would defeat the purpose.

### 2. Comparison subjects

The subject set is the organization's **dependency surface**, deduplicated to a
canonical OSS list. Three strata, in the order coverage is proposed to grow:

| Stratum | Source of truth | Scope |
| ------- | --------------- | ----- |
| A — direct package-manager dependencies | `package.json` / `Cargo.toml` / `go.mod` / `requirements.txt` / `composer.json` | what the organization declares |
| B — transitive package-manager dependencies | the committed lockfiles | what it actually ships |
| C — container base images, middleware, and server/OS tooling | image references and declared tooling | what it runs on |

Scale, measured from this repository's three committed lockfiles alone:

```sh
node -e '
const fs=require("fs");
const files=["packages/tech/package-lock.json","packages/industry/package-lock.json","docs/package-lock.json"];
const names=new Set();
for(const f of files){
  const d=JSON.parse(fs.readFileSync(f,"utf8"));
  for(const p of Object.keys(d.packages??{})){
    const i=p.lastIndexOf("node_modules/");
    if(i>=0) names.add(p.slice(i+"node_modules/".length));
  }
}
console.log(names.size);
'
# 666
```

666 distinct npm packages, of which 19 are direct, in one repository, before
strata C and before the rest of the organization's repositories. This number is
the whole argument for the capped article in ADR 0010, and it is why the
proposed rollout is **stratum A first, complete, then B by dependency depth,
then C** — a covered stratum is worth more than a sampled catalog.

The catalog collector is reproducible and vendor-neutral, and its output is an
input artifact. **Published articles name only the public OSS components** —
never how or where the catalog was gathered (ADR 0010, decision 5).

### 3. Metrics

Each indicator carries a unit and a better-direction, and each published value
carries a provenance label (measured / 未測定 / 要確認).

**Sustainability**

| Indicator | Unit | Better | Source |
| --------- | ---- | ------ | ------ |
| Days since last release | days | lower | registry release history |
| Releases in the last 12 months | count | higher | registry release history |
| Distinct committers in the last 12 months | count | higher | deps.dev / repository metadata |
| Bus factor (committers covering 80% of commits) | count | higher | repository metadata |
| OpenSSF Scorecard aggregate | 0–10 | higher | OpenSSF Scorecard |
| Licence | SPDX id | reference | SPDX / registry metadata |
| End-of-life status of the pinned major | date or `none` | reference | endoflife.date |

**Security**

| Indicator | Unit | Better | Source |
| --------- | ---- | ------ | ------ |
| Open known vulnerabilities affecting the pinned version | count | lower | OSV / GitHub Security Advisories |
| Highest open severity | CVSS 0–10 | lower | OSV / GHSA |
| Advisories published in the last 24 months | count | reference | OSV / GHSA |
| Median days from advisory to fixed release | days | lower | OSV + registry release history |
| Scorecard security sub-checks (Maintained, Dangerous-Workflow, Pinned-Dependencies, Signed-Releases) | 0–10 each | higher | OpenSSF Scorecard |

"Advisories in the last 24 months" is deliberately `reference`, not
`lower-is-better`: a widely-audited component reports more advisories than an
unexamined one, and reading that as a defect would rank obscurity above scrutiny.

The **判定** in §4 of each article is a human-held summary over these
indicators. It is not computed, and the data pull never writes it (ADR 0010,
decision 4).

### 4. Cost and trial count

**Trials per run: 1.** There are no repetitions to average. Every indicator is a
lookup against a public registry, not a sampled measurement, so the variance the
comparison topics manage with repetitions does not exist here. Re-running a
lookup returns the same answer or a changed upstream fact — never a different
sample of the same fact. This is the same shape the `foundation-models` catalog
topic already records (`trialsPerRun: {minimum: 0, maximum: 0}`).

**API cost: $0.** All five sources are free and keyless or free with an
unauthenticated rate limit (OpenSSF Scorecard, OSV, deps.dev, endoflife.date,
package registries). The binding constraint is rate limit, not price:
per-request-limited sources over a stratum-A catalog complete in minutes;
whole-catalog stratum-B coverage needs request batching and caching, which is
why the rollout is staged.

**LLM cost: the Japanese translation only, and it is the one real cost.**

| Premise | Range |
| ------- | ----- |
| Stratum A only (~20 components), first survey, full translation | **$0.20 – $0.60** |
| Stratum A + B by depth (~200 components), full translation | **$2 – $6** |
| Any later survey, translating only changed articles | **under $1** |

The premises: a capped 4-section article is roughly a tenth of a 7-section
comparison article; the range spans the difference between per-article calls and
batched calls; and the figures are token-cost extrapolations, **not** a measured
`--estimate`. The guideline requires the estimate come from the topic's
`--estimate` path (`npm run research:translate-report -- <topic> --estimate`),
which cannot run before the topic exists — so **the first action after approval
is to scaffold the topic and run `--estimate`, and to bring back a measured
figure before the first full-catalog translation.** The precedent the guideline
cites for comparison topics, ~$46 for a 3-repetition real sweep, does not apply:
that cost is model inference, and this topic performs none.

**The tension**, stated as the guideline requires: here it is not repetitions
against variance but **catalog breadth against translation cost and rate-limit
wall-clock**. Breadth is the value of the section, and it is the axis proposed to
grow; the article cap is what keeps its marginal cost near-flat.

### 5. Accumulated history

Per software, these become `HistoryPoint` series so a component's trajectory is
visible across surveys:

- `openOpenVulnerabilities` — open advisories affecting the pinned version
- `highestOpenSeverity` — CVSS
- `scorecardAggregate` — 0–10
- `daysSinceLastRelease` — days
- `committers12mo` — count

After several surveys the §4 推移 block shows what a single reading cannot: a
component whose release cadence is decaying, a Scorecard score drifting down, or
an advisory that has stayed open across three surveys. **The trend is the point
of the section** — a one-off audit answers "is this safe today", and the series
answers "is this getting worse", which is the question that decides whether to
migrate off a dependency.

A catalog-level series also accumulates — components covered, components with an
open High/Critical advisory, components whose pinned major is past end-of-life —
so the index reports coverage honestly rather than implying the whole catalog is
assessed.

## Recorded shape, if approved

The approved values land as the topic's `design` in
`packages/tech/src/research/domain/site.ts`, which is where the proposal-first
protocol's agreed design is recorded (`ResearchDesign`), so the article, the
pre-run cost gate, and the accumulated history all read the same numbers.

```ts
design: {
  cadence: "monthly (security); quarterly (sustainability)",
  offCadenceTrigger: "a new High/Critical advisory against a pinned version",
  subjects: "the organization's OSS dependency surface, stratum A first",
  metrics: [
    { name: "openVulnerabilities", unit: "count", direction: "lower-is-better" },
    { name: "highestOpenSeverity", unit: "CVSS", direction: "lower-is-better" },
    { name: "scorecardAggregate", unit: "0-10", direction: "higher-is-better" },
    { name: "daysSinceLastRelease", unit: "days", direction: "lower-is-better" },
    { name: "committers12mo", unit: "count", direction: "higher-is-better" },
  ],
  trialsPerRun: {
    minimum: 1,
    maximum: 1,
    premises: "registry lookups, not sampled measurements; no variance to average",
  },
  costPerRun: {
    ceilingUsd: 6,
    premises: "free data sources; cost is the Japanese translation of new and changed articles",
  },
  accumulates: "per-software vulnerability, Scorecard and release-cadence series, plus catalog coverage",
},
```

## What approval decides

Four questions, each answerable independently:

1. **The split cadence** (§1) — monthly security, quarterly sustainability, one
   run. Or one uniform interval, if the carried-forward sustainability values
   read as stale rather than stable.
2. **The rollout order** (§2) — stratum A complete before B, versus breadth-first
   sampling across all three strata.
3. **The indicator set** (§3) — in particular whether "advisories in the last 24
   months" stays `reference` rather than counting against a component.
4. **The cost ceiling** (§4) — the `$6` ceiling above is a bound on translation,
   pending the measured `--estimate` that can only run after scaffolding.
