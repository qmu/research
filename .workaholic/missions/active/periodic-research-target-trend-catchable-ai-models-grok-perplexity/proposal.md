---
title: Proposal — Trend-Catchable AI Models (web-grounded knowledge recency)
description: Proposal-first design (cadence, subjects, metrics, cost, accumulated history) for a new periodic-research topic measuring how well search-augmented models catch up to recent events. AWAITING DEVELOPER APPROVAL.
status: awaiting-approval
author: Claude (night /drive, 2026-07-14)
mission: periodic-research-target-trend-catchable-ai-models-grok-perplexity
---

# Proposal — Trend-Catchable AI Models

> **Gate:** This is the proposal-first artifact required by
> `docs/research-development-guideline.md` and `packages/tech/TEMPLATE.md` step 0.
> **No paid run and no scaffolding has happened.** The night `/drive` stopped at
> the approval gate. Nothing below is built until the developer approves or
> adjusts it.

## Step 1 — investigate (what exists)

Read the current topic set in
`packages/tech/src/research/domain/site.ts` (`publishedResearchTopics`):
`foundation-models`, `speed`, `accuracy`, `availability`, `ocr`, `rag`,
`image-generation`.

None of them measures **knowledge recency** — how correctly a system answers
questions about *recent* real-world events, and whether it grounds those answers
in fresh, valid citations. `speed` and `accuracy` measure the base models'
latency and output structure with **no web/search tool enabled**; `availability`
tracks provider status pages, not model knowledge.

The subjects this mission names — Grok Live Search, Perplexity Sonar, Gemini with
Google Search grounding, GPT with web search, Claude with web search — are
**search-augmented configurations**, and **Perplexity is not wired at all**
(`grep -rli perplexity packages/tech/src` finds only report prose, no vendor).
There is no web-search / grounding surface in `src/vendors/` today.

**Conclusion:** this is a **new topic** (proposed id `trend-recency`), built
after approval per `TEMPLATE.md`, reusing the llm-model-comparison instrument's
patterns (a `models.ts`-style registry, the `vendors/` anti-corruption layer,
the keyless fixture path, `HistoryPoint` series, and the availability topic's
committed accumulate-and-summarize JSON DB for auditable ground truth).

## Step 2 — propose (the five required elements)

### 1. Cadence

**Monthly**, matching the rest of the suite. A month accumulates enough genuinely
new world events to draw a fresh probe set, and bounds how stale the current
article can be. Each trial's probe set is **regenerated from events in the
trailing window** (e.g. the ~30 days before the trial), so the metric stays
comparable across trials *by construction* — always "events from the last N days
relative to this trial" — even though the literal questions differ month to month.

**Off-cadence trigger:** a new or materially changed web-grounded / search
product — a new Grok or Sonar tier, a provider enabling or changing a web-search
tool, or a major base-model release at a covered provider.

### 2. Comparison subjects

Search-augmented configurations, one per provider surface, each **paired with an
ungrounded control** (the same base model with no search tool) so the metric
isolates the contribution of live retrieval versus parametric memory:

| # | Subject | Provider / key | Reached via |
| - | ------- | -------------- | ----------- |
| 1 | Grok 4.3 + Live Search (X + web) | xAI / `XAI_API_KEY` | OpenAI-compat adapter + `search_parameters` |
| 2 | Perplexity Sonar (+ Sonar Pro) | Perplexity / `PERPLEXITY_API_KEY` **(NEW vendor ACL)** | OpenAI-compat endpoint |
| 3 | Gemini 3.1 Pro + Google Search grounding | Google / `GEMINI_API_KEY` | google adapter + `google_search` tool |
| 4 | GPT-5.x + web search | OpenAI / `OPENAI_API_KEY` | Responses API + `web_search` tool |
| 5 | Claude + web search | Anthropic / `ANTHROPIC_API_KEY` | anthropic adapter + `web_search` tool |
| C | Ungrounded controls | same keys | same base models, **no** search tool |

Where the base model already exists in the foundation-models catalog, the subject
derives from it; **Perplexity Sonar is added to the catalog as a new provider
row**. All subjects stay key-gated with a deterministic keyless fixture path so CI
stays green.

### 3. Metrics

Each with unit and the direction that reads as better:

| Metric | Unit | Better | Meaning |
| ------ | ---- | ------ | ------- |
| `recencyAccuracy` | ratio 0–1 | higher | fraction of trailing-window event probes answered correctly vs. curated ground truth |
| `hallucinationRate` | ratio 0–1 | lower | fraction of probes where the system asserts a specific *false* claim about a recent event (abstention counts as non-hallucination) |
| `citationValidity` | ratio 0–1 | higher | fraction of returned citations that resolve **and** support the claim |
| `citationFreshnessDays` | days | lower | median published-date age of cited sources relative to the event |
| `latencyMs` | ms | lower | end-to-end answer latency (grounded retrieval adds latency) |
| `costPerQueryUsd` | USD | reference | token **plus** search billing per answered probe |

Recency and hallucination are graded by an **LLM judge** against the curated
ground truth (the same LLM-judge pattern the accuracy/OCR topics already use);
citation validity is checked by resolving each returned URL and judging support.

### 4. Cost and trial count (range, with premises)

Expressed as a range, never a single figure.

- **Premises:** ~10 configurations (5 grounded + ~5 ungrounded controls) ×
  ~30 recent-event probes × **1–3 repetitions**, plus one LLM-judge read per
  answered probe (recency + hallucination) and per-citation resolution.
- **Tension (stated explicitly):** more repetitions narrow run-to-run variance in
  latency and cost (recorded as stdDev in the artifact) but **multiply the
  search surcharges**, which are the expensive part here — grounded providers bill
  search separately from tokens (order-of-magnitude: Perplexity request billing,
  Grok per-sources billing, Google grounded-query billing after a free tier).
  Ungrounded controls are token-only and cheap.
- **Estimated range: ~$8 (1 rep) to ~$30 (3 reps) per trial**, dominated by the
  grounded providers' search billing. **Proposed ceiling: $30.**
- Run the topic's `--estimate` path before **every** real run; an estimate above
  the ceiling **stops for re-approval** (same gate the other topics use).
- Precedent for calibration: the llm-model-comparison real sweep measured 3
  repetitions for ~$46 (a larger matrix without search surcharges).

### 5. Accumulated history

- Per-subject `HistoryPoint` series for `recencyAccuracy`, `hallucinationRate`,
  `citationValidity`, and `latencyMs` — one point per monthly survey. Because each
  trial's probes are freshly drawn from that month's events, the series answers
  **"how well does each system keep catching up to the present, month over
  month"**; after ≥2 same-instrument surveys the current article's 推移 / Trend
  block shows whether each system's recency capability is improving, holding, or
  regressing as the world moves.
- The curated probe sets **and their ground truth** accumulate as a committed
  JSON DB under `docs/research-reports/trend-recency-history/` — mirroring the
  availability topic's `availability-history/` accumulate-and-summarize pattern —
  so every trial is reproducible and the ground truth is auditable rather than
  regenerated and lost.

## Step 3 — first trial as validation (after approval)

The first `--real` trial is a disposable proof of the design, not a cadence
commitment: check that the metrics **discriminate** (grounded configs should beat
their ungrounded controls on `recencyAccuracy`, and providers should separate),
that cost matched the `--estimate`, and that citation resolution works against
live URLs. Only from the second trial does the topic become recurring monthly.

## Open questions for the developer

1. **Ground-truth authorship.** Auto-draft probes + answers from trailing-window
   news via an LLM and commit them for human spot-check, or curate a small
   human-authored seed set each month? (Affects trust and cost.)
2. **Ceiling.** Is **$30/trial** acceptable given the grounded search surcharges,
   or cap tighter (e.g. $15) by dropping to 1 rep and/or fewer providers first?
3. **Subject breadth for trial 1.** Start with the two most distinctive surfaces
   (Grok Live Search + Perplexity Sonar) plus controls to prove the instrument
   cheaply, then add Gemini/GPT/Claude grounding once the design holds?
4. **Perplexity key.** Confirm a `PERPLEXITY_API_KEY` will be provisioned (new
   billing relationship) before the scaffold ticket wires the vendor.

## What happens on approval

The mission acceptance (see `mission.md`) is satisfied by three follow-up tickets
already queued in `todo/` (all marked *blocked on approval*):

1. **Scaffold** the `trend-recency` instrument + Perplexity vendor ACL + registry
   + keyless fixture + ground-truth DB shape (CI green, no spend).
2. **First validation trial** (`--real`) within the approved ceiling; review
   discrimination and cost.
3. **Publish**: register the topic in `site.ts`, generate the current article +
   Japanese translation, regenerate indexes.
