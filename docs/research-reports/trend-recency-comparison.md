---
title: Trend recency
description: A reproducible comparison of search-augmented AI systems on web-grounded knowledge recency — how correctly each answers questions about recent real-world events, with citation validity, citation freshness, latency, and search-billing cost, against paired ungrounded controls.
---

# Trend recency

This report compares how well **search-augmented systems catch up to the present**: each subject answers the same recent-event probes, and every grounded subject is paired with an **ungrounded control** of the same base model, so the numbers isolate what live retrieval adds over parametric memory. All scores on this page are computed **mechanically** from the answer text and its citations — keyword-proxy recency, abstention, citation URL validity, and cited-source age; the semantic LLM-judge grade and the hallucination-rate metric arrive with a later instrument version.

## 1. Research Purpose

The purpose is to record which AI systems actually know what is happening right now — not what a model memorized at training time, but what it retrieves and correctly reports about events from the trailing window — and what that freshness costs in latency and search billing. The monthly series answers who is keeping up as the world moves, a question none of the other topics (speed, accuracy, availability, OCR, RAG) measures.

## 2. Measurement Targets

### Target Models

The subjects are the 10 configurations in the curated registry (`packages/tech/src/trend-recency/models.ts`): one search-augmented surface per provider (Grok Live Search, Perplexity Sonar and Sonar Pro, Gemini with Google Search grounding, GPT with the web-search tool, Claude with the web-search tool), each — where the base model exists ungrounded — paired with a no-search control of the same model. Every row carries a cited source and last-verified date.

### Target Metrics

Measured metrics are recency accuracy (fraction of trailing-window event probes answered with every expected keyword — the mechanical proxy for the semantic judge, higher is better), abstention rate (honest declines, descriptive), citation validity (fraction of returned citations with a well-formed http(s) URL — live resolution is a later instrument version, higher is better), citation freshness (median age in days of dated citations relative to the event, lower is better), and answer latency (ms, lower is better). Search billing per 1000 requests is a curated reference column, refined by real trials.

## 3. Scope and Constraints

- **Mechanical, not semantic (yet).** Scores read only the answer text and its citations; the LLM-judge recency grade and the hallucination-rate metric are a later instrument version, exactly as the SVG topic deferred its vision-judge metric.
- **Probe manifest version `trend-recency-v2-20260717`** (3 probes, 30-day window). Each real trial draws a fresh probe set from events in the trailing window before it and commits that set — with its ground truth and the dated sources backing it — under `docs/research-reports/trend-recency-history/`, so the metric stays "events from the last 30 days relative to this trial" by construction and every trial is auditable. History/trend series connect same-instrument-version points only.
- **Paired controls.** Every grounded chat subject has an ungrounded control of the same base model; Perplexity Sonar is search-native and has no ungrounded twin.
- **Grounded tool wiring follows current provider documentation** (xAI Live Search, Gemini `googleSearch`, OpenAI Responses `web_search`, Anthropic `web_search`); the first real trial is the live verification of those parameters.
- The fixture path is keyless and deterministic; real numbers appear only after an owner runs the real path within the approved ceiling ($30/trial — run `--estimate` first; search surcharges dominate).
- Point-in-time: measured behavior reflects the models, search products, and the web itself at `2026-01-01T00:00:00.000Z`.

## 4. Verification Results

This run has **0 measured** of 10 subject rows (non-measured rows are `fixtured` harness checks or `error` rows, never faked numbers).

There are no measured values to summarize; the committed fixture page proves the harness end to end. The per-subject table is in section 7, Verification Data.

## 5. Analysis

This run has no measured rows; every configuration was fixtured or errored, so no cross-system claim is made. The committed fixture page exists to prove the pipeline — including the grounded-vs-control separation the fixture client simulates — not to compare systems.

## 6. Reproduction

### Reproduction Steps

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (deterministic fixture client):
npm run research -- trend-recency --fixture

# Cost preview, then the owner-gated real run:
npm run research -- trend-recency --estimate
npm run research -- trend-recency --real
```

### Reproduction Cost (Estimate)

The fixture path is keyless and costless. A real trial bills each provider for answer tokens PLUS its search surcharge (billed per request or per grounded query — the dominant cost); the agreed ceiling is $30 per trial and `--estimate` must run first. An estimate above the ceiling stops for re-approval.

### Cleanup

No persistent provider resources are created. Answers and citations are scored in memory; the run writes only the local Markdown/JSON artifacts — review them before committing.

## 7. Verification Data

**Per-subject results**

| Subject | Provider | Grounding | Provenance | Recency (mean±sd) | Abstention (mean±sd) | Citation validity (mean±sd) | Citation age (mean±sd) | Latency (mean±sd) | Search $/1k req | Note |
| ------- | -------- | --------- | ---------- | ----------------- | -------------------- | --------------------------- | ---------------------- | ----------------- | --------------- | ---- |
| Grok 4.3 + Live Search | xai | grounded | fixtured | 0.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | 100.0% ± 0.0% (n=3) | 191.0 d ± 3.0 d (n=3) | 23 ± 6 (n=3) | $25.00 |  |
| Perplexity Sonar | perplexity | grounded | fixtured | 0.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | 100.0% ± 0.0% (n=3) | 191.0 d ± 3.0 d (n=3) | 23 ± 6 (n=3) | $5.00 |  |
| Perplexity Sonar Pro | perplexity | grounded | fixtured | 0.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | 100.0% ± 0.0% (n=3) | 191.0 d ± 3.0 d (n=3) | 23 ± 6 (n=3) | $8.00 |  |
| Gemini 3.1 Pro + Google Search grounding | google | grounded | fixtured | 0.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | 100.0% ± 0.0% (n=3) | 191.0 d ± 3.0 d (n=3) | 23 ± 6 (n=3) | $35.00 |  |
| GPT-5.5 + web search | openai | grounded | fixtured | 0.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | 100.0% ± 0.0% (n=3) | 191.0 d ± 3.0 d (n=3) | 23 ± 6 (n=3) | $10.00 |  |
| Claude Opus 4.8 + web search | anthropic | grounded | fixtured | 0.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | 100.0% ± 0.0% (n=3) | 191.0 d ± 3.0 d (n=3) | 23 ± 6 (n=3) | $10.00 |  |
| Grok 4.3 (no search) | xai | ungrounded | fixtured | 0.0% ± 0.0% (n=3) | 100.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | not measured | 23 ± 6 (n=3) | $0.00 |  |
| Gemini 3.1 Pro (no grounding) | google | ungrounded | fixtured | 0.0% ± 0.0% (n=3) | 100.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | not measured | 23 ± 6 (n=3) | $0.00 |  |
| GPT-5.5 (no search) | openai | ungrounded | fixtured | 0.0% ± 0.0% (n=3) | 100.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | not measured | 23 ± 6 (n=3) | $0.00 |  |
| Claude Opus 4.8 (no search) | anthropic | ungrounded | fixtured | 0.0% ± 0.0% (n=3) | 100.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | not measured | 23 ± 6 (n=3) | $0.00 |  |

**Probe manifest (version trend-recency-v2-20260717, 30-day window)**

| Probe id | Topic | Event date | Expected keywords |
| -------- | ----- | ---------- | ----------------- |
| 20260712-wimbledon-mens-champion | sports | 2026-07-12 | 1 |
| 20260715-world-cup-finalists | sports | 2026-07-15 | 2 |
| 20260709-gpt-5-6-variants | ai-models | 2026-07-09 | 2 |

The complete run record is committed as [`trend-recency-comparison.data.json`](./trend-recency-comparison.data.json): per-call questions, answers, citations, latencies, output-token counts, and every score.

Generated: 2026-01-01T00:00:00.000Z
