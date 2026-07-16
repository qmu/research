---
type: Mission
title: "Periodic Research Target: Compare Deep Research-alike APIs"
slug: periodic-research-target-compare-deep-research-alike-apis
status: active
created_at: 2026-07-14T00:40:40+09:00
author: a@qmu.jp
assignee: a@qmu.jp
tickets:
  - 20260714005156-kickoff-propose-periodic-research.md
  - 20260714013000-scaffold-deep-research-instrument.md
stories: []
concerns: []
---

# Periodic Research Target: Compare Deep Research-alike APIs

## Goal

"Deep research" endpoints — where a client asks one question and the provider
autonomously plans, runs dozens of web searches, reads sources, and returns a
**cited report** — are the fastest-growing agentic product surface across the
frontier labs. For a firm that builds research and analysis tooling on top of
these APIs, the buying decision is a single axis: *which endpoint returns the
most trustworthy, best-cited answer per dollar and per minute — and is any
turnkey product actually better than an agentic loop we can build ourselves?*

The existing single-shot topics (`speed`, `accuracy`) cannot answer this, because
they never trigger the multi-minute search-and-synthesize loop that defines a
deep-research query. This mission stands up a **new recurring research topic**
(`deep-research`) that measures the turnkey deep-research endpoints —
OpenAI `o3-deep-research`, Perplexity `sonar-deep-research`, Google Gemini Deep
Research, xAI Grok DeepSearch — against a transparent **Anthropic build-your-own
baseline** (Claude + `web_search` tool + extended thinking), on quality, citation
integrity, source diversity, latency, and cost, and publishes the result as a
dated survey series like the other topics.

## Scope

**In scope**

- **Proposal-first** (`CLAUDE.md` + `docs/research-development-guideline.md`): the
  cadence/subjects/metrics/cost/history design in `proposal.md`, approved by the
  developer before any scaffolding or paid run.
- A new topic `packages/tech/src/deep-research/` following `TEMPLATE.md`: pure
  logic in `domain/`, a thin `entrypoints/run-*.ts` runner, external SDK access
  behind `vendors/`, a subject registry, and a **keyless fixture path** so CI
  stays green without credentials.
- Five subjects behind the `vendors/` anti-corruption layer, reusing the existing
  `CompletionClient`-style port and `models.ts`-style registry patterns; each new
  dependency recorded in `docs/dependency-decisions.md`.
- Metrics + graders: rubric answer-quality (LLM judge), citation count, citation
  validity, source diversity, latency, cost per query — recorded in full in the
  `.data.json` artifact so a report renders at any detail level.
- A `--estimate` cost path, a first disposable **validation trial** within the
  approved budget, archival as a dated survey, the current English article + JP
  translation, `site.ts` registration, and generated indexes.
- `HistoryPoint` series wired so the 推移 (trend) block accumulates across surveys.

**Out of scope**

- New non-deep-research models or single-shot completion measurement (that is the
  `foundation-models` / `speed` / `accuracy` topics).
- A second tier per subject (`o4-mini-deep-research`, Gemini Deep Research **Max**)
  — the first trial fixes one tier per subject; a second tier is a later scope
  change, not a silent variance.
- Editing the corporate `qmu-co-jp` repo directly (that goes through `/ship` →
  publish ticket, per `CLAUDE.md`).

## Acceptance

<!-- One checklist item per criterion, each naming the ticket/story expected to satisfy it.
     Progress is checked/total, computed from this list. Follow-on ticket filenames marked
     (post-approval) are created by /ticket once the proposal is approved. -->

- [ ] Proposal-first design (cadence, subjects, metrics, cost/trial range, accumulated history) drafted with cited current offerings and developer-approved (#20260714005156-kickoff-propose-periodic-research.md + `proposal.md`)
- [x] Topic `deep-research` scaffolded under `packages/tech/src/deep-research/` with layered `domain/ entrypoints/ vendors/`, a subject registry, and a keyless fixture path that keeps CI green (#20260714013000-scaffold-deep-research-instrument.md)
- [ ] All five subjects reachable behind `vendors/` (OpenAI o3-deep-research, Perplexity sonar-deep-research, Gemini Deep Research, Grok DeepSearch, Anthropic build-your-own baseline), dependencies recorded in `docs/dependency-decisions.md` (#deep-research-subject-vendors.md — post-approval)
- [ ] Metrics + graders implemented (rubric quality via LLM judge, citation count, citation validity, source diversity, latency, cost per query) and recorded in full in the `.data.json` artifact (#deep-research-metrics-and-graders.md — post-approval)
- [ ] `npm run research -- deep-research --estimate` prices a trial, and the first disposable validation trial runs `--real` within the approved budget (#deep-research-first-validation-trial.md — post-approval)
- [ ] First trial archived as a dated survey, current English article + JP translation generated, topic registered in `publishedResearchTopics` (`site.ts`), and indexes written (#publish-deep-research-topic.md — post-approval)
- [ ] `HistoryPoint` series wired so the 推移 (trend) block accumulates the rubric/cost/latency time series across surveys (#deep-research-history-series.md — post-approval)

## Changelog

- 2026-07-14 — Mission created (scaffold) — mission.md
- 2026-07-14 — Kickoff drafted the proposal-first design (5 elements, 5 subjects with cited 2026-07 offerings, Floor/Mid/Ceiling cost tiers) and filled Goal/Scope/Acceptance; scaffolding + first paid trial held at the proposal-first approval gate — 20260714005156-kickoff-propose-periodic-research.md, proposal.md
- 2026-07-14 — Built the keyless `deep-research` skeleton (layered domain/vendors, 5-subject registry, 4-question rubric manifest, tested pure scorers, fixture path, `--estimate` ≈ $32 in the Floor range, report page); real subject clients + judge and publishing remain gated on approval. tsc/tests/lint green — 20260714013000-scaffold-deep-research-instrument.md
