---
created_at: 2026-07-18T20:31:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 1h
commit_hash:
category: Changed
mission: periodic-research-target-compare-deep-research-alike-apis
depends_on: [20260714013000-scaffold-deep-research-instrument.md]
---

# Verify and refresh the deep-research proposal against current (2026-07) offerings

## Overview

Mission acceptance item #1 requires the proposal-first design to be *"drafted with
cited current offerings and developer-approved"*. The `proposal.md` was first
drafted 2026-07-14; before it goes to the developer for the approval gate, its
five subjects' access shapes and prices must be re-verified against current vendor
documentation and pricing trackers, because the deep-research API surface re-prices
on a weeks rhythm. This ticket does the keyless web-research refresh and updates
`proposal.md` in place — it does **not** seek or record approval (that is the
developer's gate) and touches no code and no paid endpoint.

## Key Files

- `.workaholic/missions/active/periodic-research-target-compare-deep-research-alike-apis/proposal.md`
  — the proposal-first artifact to refresh (cadence, subjects, metrics, cost/trial
  range, accumulated history + Sources).
- `docs/research-development-guideline.md` — the five required proposal elements
  (§ "Proposal-first protocol", Step 2) the refresh must keep complete.

## Implementation Steps

1. Web-research (WebSearch/WebFetch only — keyless) the current API access shape
   and price of each of the five subjects: OpenAI `o3`/`o4-mini-deep-research`,
   Perplexity `sonar-deep-research`, Gemini Deep Research (Interactions API),
   xAI Grok DeepSearch (Grok 4.5 + agent tools), and the Anthropic
   build-your-own baseline (`web_search` tool). Confirm each is actually
   API-accessible as of 2026-07.
2. Update the subjects table, cadence note, and cost/trial-count figures in
   `proposal.md` with the verified numbers; keep all five guideline elements
   present.
3. Replace the Sources block with the 2026-07-18 citations (vendor docs first),
   and stamp `refreshed_at: 2026-07-18` in the frontmatter with a refresh note.
4. Leave the mission Acceptance item #1 **unchecked** — drafting/refresh ≠
   developer-approved — and escalate that the proposal now awaits owner approval.

## Policies

- **Proposal-first (CLAUDE.md, research-development-guideline.md).** No paid run
  and no scaffolding beyond what is already committed; this ticket is documentation
  only. The approval gate is the developer's, so the ticket cannot self-approve the
  design — it can only make the proposal decision-ready.
- **Objective docs (CLAUDE.md).** Every price/access claim in `proposal.md` must
  carry a verifiable citation to a current source; no figure without a source.
- **Money gate: keyless.** WebSearch/WebFetch only; no paid API of any kind.

## Quality Gate

- All five subjects in `proposal.md` carry a 2026-07-verified access shape and
  price, each backed by a citation in the Sources block.
- The five required proposal elements (cadence, subjects, metrics, cost/trial
  range, accumulated history) remain present and internally consistent.
- No file under `packages/` and no `site.ts` entry changed; no paid endpoint
  called. (Docs-only change — `npm test`/`build`/`lint` unaffected, not required.)
- Mission Acceptance item #1 stays unchecked; the escalation records that the
  refreshed proposal awaits developer approval before clients/judge/trial are built.

## Final Report

Keyless web research (WebSearch/WebFetch only — no paid API) re-verified all five
subjects as of 2026-07-18; every one is API-accessible today:

- **OpenAI Deep Research** — `o3-deep-research` $10/$40 per M in/out and
  `o4-mini-deep-research` $2/$8 (~$0.41/typical query), Responses API, web search
  always-on (~10–30 searches/query, +$0.10–0.30 at $10/1k).
- **Perplexity `sonar-deep-research`** — $2/$8 base + citation $2/M + reasoning
  $3/M + search $5/1k queries; ~$0.40–$1+/query; OpenAI-compatible chat endpoint.
- **Gemini Deep Research** — `deep-research-preview-04-2026` (+ `-max-`) on
  Gemini 3.1 Pro ($2/$12); runs only via the now-GA **Interactions API**
  (stateful background), ~80 grounded searches/task at $14/1k (~$1.12/task),
  ~$1–3/task, 5–20 min (60 min max). Agent itself still preview.
- **xAI Grok DeepSearch** — API path = Grok 4.5 ($2/$6) + server-side Web/X
  search tools at $5/1k calls each; consumer "DeepSearch" is the SuperGrok UI.
- **Anthropic build-your-own baseline** — still no single deep-research
  endpoint; Claude (current catalog model) + `web_search` tool ($10/1k) +
  extended thinking + advanced tool use (dynamic filtering) is the DIY reference.

`proposal.md` updated in place: subjects table, cadence note, cost figures
(blended ~$1–4/query; Floor 20-query trial ~$25–60 holds), and a fresh
2026-07-18 Sources block with vendor-doc-first citations. `refreshed_at:
2026-07-18` stamped. Docs-only — no `packages/` file, no `site.ts`, no paid call;
`npm test`/`build`/`lint` untouched and not required for this change.

**Quality Gate: PASS** — five cited/verified subjects, five guideline elements
intact and consistent, no code touched.

**Acceptance #1 stays UNCHECKED.** The guideline's approval gate is the
developer's; a refresh makes the proposal decision-ready but is not approval.
Escalation: *deep-research proposal drafted (and 2026-07-18 refreshed) — needs
owner approval before clients/judge/trial are built.*
