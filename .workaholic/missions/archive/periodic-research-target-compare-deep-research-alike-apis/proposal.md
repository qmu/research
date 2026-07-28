---
title: "Proposal: Deep Research-alike APIs periodic-research instrument"
description: Proposal-first design (cadence, subjects, metrics, cost, accumulated history) for a new recurring research topic comparing autonomous deep-research API endpoints. Awaits developer approval before scaffolding or any paid run.
status: awaiting-approval
mission: periodic-research-target-compare-deep-research-alike-apis
drafted_at: 2026-07-14
refreshed_at: 2026-07-18
---

# Proposal: Deep Research-alike APIs periodic-research instrument

This is the **proposal-first** artifact required by `CLAUDE.md` and
`docs/research-development-guideline.md` (§ "Proposal-first protocol") before a
new research topic is built. It presents the five required elements — cadence,
comparison subjects, metrics, cost/trial-count range, and accumulated history —
for developer approval.

> **Refresh note (2026-07-18).** The five offerings' access shapes and prices
> below were re-verified against current vendor/pricing sources as of 2026-07-18
> (see [Sources](#sources-verified-2026-07-18)). All five remain API-accessible;
> the material change since the 2026-07-14 draft is firmer per-query pricing and
> confirmation that Gemini Deep Research runs only on the now-GA **Interactions
> API** (the agent itself stays in preview). This refresh is still **drafting
> only** — the proposal-first approval gate is unchanged and no code or paid run
> has been added.

> **Gate.** Per the guideline: *"No paid run and no scaffolding happens before
> approval."* Nothing in `packages/tech/src/` has been created and no API has
> been called for money. This document, plus the mission's Goal/Scope/Acceptance,
> is the whole night-mode deliverable. Approve or adjust below; the follow-on
> scaffold + first-trial tickets are named in the mission's Acceptance list and
> are not started until this is approved.

## Step 1 — Investigation (is this a new topic?)

`publishedResearchTopics` in `packages/tech/src/research/domain/site.ts` holds:
`foundation-models`, `speed`, `accuracy`, `availability`, `ocr`, `rag`,
`image-generation` (plus the retired `llm-benchmark` / `llm-model-comparison`
runnables). **None measures autonomous deep-research agents.** The idea does not
extend an existing topic's subjects or metrics — a deep-research endpoint is a
different unit of work (a multi-minute, multi-search agentic task returning a
cited report) than a single-shot completion. Therefore this is a **new topic**,
built after this protocol per `packages/tech/TEMPLATE.md`.

Proposed names (for approval): topic id `deep-research`, report slug
`deep-research-comparison`, runner `npm run research -- deep-research --real`,
qmuSlug `deep-research-apis`. These mirror the existing `id`/`qmuSlug`/`npmScript`
shape in `site.ts`.

**Why qmu cares (business grounding).** "Deep research" endpoints are the fastest-
growing agentic product surface: a client asks one question and the provider
autonomously plans, runs dozens of web searches, reads sources, and returns a
cited report. For a firm that builds research/analysis tooling on top of these
APIs, the buying decision is exactly the axis this topic measures — *which
endpoint returns the most trustworthy, well-cited answer per dollar and per
minute* — and it is not answerable from the single-shot `speed`/`accuracy`
topics, because those never trigger the search-and-synthesize loop.

## Step 2 — Proposal

### 1. Cadence

**Monthly**, matching the sibling model topics (`speed`, `accuracy`,
`availability`). This landscape moves on a weeks-to-months rhythm — over the
survey window the deep-research surface has already turned over materially
(the Gemini Interactions API reached GA in 2026 while its Deep Research agent —
`deep-research-preview-04-2026` plus the heavier `deep-research-max-preview-04-2026`
— stays in preview; xAI's Grok model tier advanced to Grok 4.5 with server-side
agent tools; OpenAI's `o3-deep-research` / `o4-mini-deep-research` and Perplexity's
`sonar-deep-research` continue to re-price). Monthly bounds how stale the current
article can be.

**Off-cadence trigger:** any subject provider ships a new deep-research endpoint,
retires one, or changes its search/tool pricing materially — that event fires an
extra trial rather than waiting for the month tick.

The first trial is a **disposable validation** (guideline Step 3): after it runs
we confirm the metrics discriminate between subjects and that cost matched the
estimate, then confirm or revise this cadence. Only from the second trial is the
topic recurring.

### 2. Comparison subjects

The five deep-research offerings enumerated in the kickoff ticket, each reached
through its documented programmatic entry point behind a `vendors/` anti-
corruption layer:

| # | Subject | Endpoint / model id (verified 2026-07-18) | Access shape | Notes |
|---|---------|-----------------------------------|--------------|-------|
| 1 | **OpenAI Deep Research** | `o3-deep-research` ($10/$40 per M in/out); cheaper `o4-mini-deep-research` ($2/$8, ~$0.41/typical query) | **Responses API**, web search always-on | ~10–30 web searches/query at $10/1k adds ~$0.10–0.30/query |
| 2 | **Perplexity Sonar Deep Research** | `sonar-deep-research` ($2/$8 per M in/out) | OpenAI-compatible chat endpoint | billed on input/output **+ citation ($2/M) + reasoning ($3/M) + search queries ($5/1k)** |
| 3 | **Google Gemini Deep Research** | `deep-research-preview-04-2026` (+ heavier `deep-research-max-preview-04-2026`) on Gemini 3.1 Pro ($2/$12 per M in/out) | **Interactions API (GA)**, stateful background execution only | ~80 grounded searches/standard task ($14/1k → ~$1.12/task); 5–20 min, 60 min max; returns cited report + native charts. Agent still preview |
| 4 | **xAI Grok DeepSearch** | Grok 4.5 ($2/$6 per M in/out) + server-side Agent Tools (Web/X Search) | chat + built-in tool calls | web/X search tools billed $5/1k calls each; agent chooses tool count, so cost scales with query. Consumer "DeepSearch" is the SuperGrok UI feature; the API path is model + agent tools |
| 5 | **Anthropic build-your-own baseline** | Claude (current catalog model) + `web_search` tool ($10/1k searches) + extended thinking + advanced tool use, agentic loop | Messages API, self-orchestrated | the reproducible in-house reference; Anthropic ships **no single "deep research" endpoint** — the report-writing loop is built by the caller |

Subject 5 is deliberately the **DIY reference**: Anthropic ships no single
"deep-research" endpoint, so the comparison holds the four turnkey products
against a transparent, self-built agentic loop qmu could run itself. That framing
makes the topic's conclusion actionable ("is a turnkey endpoint worth it over the
loop we can build?"), not just a vendor beauty contest.

Where a subject exposes cheaper/heavier tiers (OpenAI `o4-mini-deep-research`,
Gemini Deep Research **Max**), the trial fixes **one tier per subject** for
comparability and records the tier in the artifact; adding a second tier is a
future scope change, not a silent variance.

### 3. Metrics

Each research question is scored on the indicators below. Rubric and citation
metrics are graded by an LLM judge (the pattern the `accuracy`/`ocr` topics
already use), against a fixed reference rubric per question so grading is
reproducible.

| Metric | Unit | Better | How measured |
|--------|------|--------|--------------|
| Answer quality vs. rubric | 0–100 score | higher | LLM judge grades the report against a per-question reference rubric (coverage, correctness, synthesis) |
| Citation count | count | context (reported, not ranked) | citations returned with the report |
| Citation validity | % of cited URLs that resolve and support the claim | higher | fetch + LLM-judge check of a sampled subset |
| Source diversity | distinct domains | higher | count of unique registrable domains among citations |
| Latency | seconds (wall-clock end-to-end) | lower | request start → final report |
| Cost per query | USD | lower | summed from the provider's billed token/tool usage for that query |

Primary decision metric is **answer quality vs. rubric**, read against **cost per
query** and **latency**. Citation validity guards against fluent-but-fabricated
reports — the failure mode that most distinguishes deep-research products.

### 4. Cost and trial count

Per the guideline this is a **range with premises, decided by the topic's
`--estimate` path before each real run** — never a single figure; an estimate
outside the agreed range stops for re-approval.

**Premises.** One trial exercises all 5 subjects over a **fixed set of 4–6
research questions**, with **1–3 in-trial repetitions** per (subject, question).
One repetition detects only large movements; three bound the run-to-run variance
the artifact reports as standard deviation — but deep-research queries are ~10–100×
the cost and latency of a single completion, so the tension is sharper here than
in the sibling topics.

Per-query cost varies widely by provider and question complexity (verified
2026-07-18): OpenAI `o3-deep-research` ≈ **$1.5–8/query** (the cheaper
`o4-mini-deep-research` runs a typical query ≈ **$0.41**), Perplexity
`sonar-deep-research` ≈ **$0.40–$1+/query**, Gemini Deep Research ≈ **$1–3/task**
(≈ $2 typical, dominated by ~$1.12 of grounded-search fees), Grok DeepSearch =
Grok 4.5 tokens + Web/X-search tool fees at $5/1k calls, Anthropic loop = Claude
tokens + web-search tool fees at $10/1k. Blended working figure ≈ **$1–4/query**;
the two OpenAI/Perplexity mini tiers pull the floor lower.

| Configuration | Queries | Indicative cost |
|---------------|---------|-----------------|
| Floor — 5 subjects × 4 questions × 1 rep | 20 | **~$25–60** |
| Mid — 5 subjects × 5 questions × 2 reps | 50 | **~$60–150** |
| Ceiling — 5 subjects × 6 questions × 3 reps | 90 | **~$120–360** |

**Recommended for the first (validation) trial: the Floor** (20 queries, ~$25–60)
— cheapest design that still exercises every subject once per question and proves
the metrics discriminate. Judge/citation-check LLM reads add a small fixed
overhead on top. The precedent for scale is the `llm-model-comparison` real sweep
(3 repetitions ≈ $46); deep-research's higher per-query cost is why the recurring
cadence should favour a small, fixed question set over many repetitions.
`npm run research -- deep-research --estimate` will produce the binding figure
once the instrument exists.

### 5. Accumulated history

Each monthly trial appends one `HistoryPoint` per subject to these series (the
`HistoryPoint`/trend-chart machinery the guideline describes — `current-article.ts`
§4 推移 block, `renderTimeSeriesChart`):

- **Primary:** answer-quality rubric score, per subject, one point per survey.
- **Secondary:** cost per query (USD) and latency (seconds), per subject.

After three or more surveys, the current article's 推移 (trend) block shows each
subject's quality trajectory against its cost and latency across the 3–5-month
tendency window — i.e. whether a turnkey endpoint is getting better/cheaper faster
than the Anthropic DIY baseline. Until two same-instrument surveys exist the block
is a plain note, per the guideline.

## Open questions for the developer

1. **Cadence** — monthly (proposed) vs. quarterly, given the high per-trial cost?
2. **First-trial budget** — approve the **Floor** (~$25–60) design for the
   disposable validation trial?
3. **Question set** — should the 4–6 fixed research questions be domain-neutral
   (general knowledge, reproducible) or drawn from qmu's actual research
   workload? Neutral is proposed for reproducibility.
4. **Subject 5 framing** — keep the Anthropic build-your-own loop as an explicit
   subject/baseline (proposed), or measure only the four turnkey products?
5. **Tiers** — one tier per subject for the first trial (proposed), deferring
   `o4-mini` / Gemini **Max** to a later scope change?

## Sources (verified 2026-07-18)

The 2026-07-14 draft's figures were re-checked against current vendor docs and
pricing trackers on 2026-07-18; all five subjects remain API-accessible and the
prices below are the ones carried into the tables above.

- **OpenAI Deep Research** — `o3-deep-research` $10/$40, `o4-mini-deep-research` $2/$8 (~$0.41/typical query), Responses API, web search always-on (~10–30 searches/query at $10/1k): [OpenAI model docs](https://developers.openai.com/api/docs/models/o3-deep-research), [TokenCost](https://tokencost.app/blog/openai-deep-research-api-pricing), [pricepertoken](https://pricepertoken.com/pricing-page/model/openai-o3-deep-research)
- **Perplexity `sonar-deep-research`** — $2/$8 base + citation $2/M + reasoning $3/M + search $5/1k queries, ~$0.40–$1+/query: [Perplexity pricing docs](https://docs.perplexity.ai/docs/getting-started/pricing), [pricepertoken](https://pricepertoken.com/pricing-page/model/perplexity-sonar-deep-research)
- **Gemini Deep Research** — `deep-research-preview-04-2026` (+ `deep-research-max-preview-04-2026`) on Gemini 3.1 Pro ($2/$12), Interactions API (GA) background-only, ~80 grounded searches/task at $14/1k (~$1.12/task), ~$1–3/task, 5–20 min (60 min max): [Gemini Deep Research agent docs](https://ai.google.dev/gemini-api/docs/interactions/deep-research), [model card](https://ai.google.dev/gemini-api/docs/models/deep-research-preview-04-2026), [TokenCost](https://tokencost.app/blog/gemini-deep-research-agent-cost)
- **xAI Grok DeepSearch** — API path = Grok 4.5 ($2/$6) + server-side agent tools (Web/X search $5/1k calls each); consumer DeepSearch is the SuperGrok feature: [xAI pricing docs](https://docs.x.ai/developers/pricing), [AI Pricing Guru](https://www.aipricing.guru/xai-pricing/)
- **Anthropic build-your-own baseline** — no single deep-research endpoint; Claude (current catalog model) + `web_search` tool at $10/1k searches + extended thinking + advanced tool use (dynamic filtering): [Anthropic web-search tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool), [web-search launch](https://claude.com/blog/web-search-api), [advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use)
