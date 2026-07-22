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

The subjects are the 10 configurations in the curated registry (`packages/tech/src/trend-recency/models.ts`): one search-augmented surface per provider (Grok with the Agent Tools web-search tool, Perplexity Sonar and Sonar Pro, Gemini with Google Search grounding, GPT with the web-search tool, Claude with the web-search tool), each — where the base model exists ungrounded — paired with a no-search control of the same model. Every row carries a cited source and last-verified date.

### Target Metrics

Measured metrics are recency accuracy (fraction of trailing-window event probes answered with every expected keyword — the mechanical proxy for the semantic judge, higher is better), abstention rate (honest declines, descriptive), citation validity (fraction of returned citations with a well-formed http(s) URL — live resolution is a later instrument version, higher is better), citation freshness (median age in days of dated citations relative to the event, lower is better; a citation counts as dated when the provider returns a date or the cited URL embeds one, and rows whose citations carry neither are reported as not measured rather than as age zero), and answer latency (ms, lower is better). Search billing per 1000 requests is a curated reference column, refined by real trials.

## 3. Scope and Constraints

- **Mechanical, not semantic (yet).** Scores read only the answer text and its citations; the LLM-judge recency grade and the hallucination-rate metric are a later instrument version, exactly as the SVG topic deferred its vision-judge metric.
- **Probe manifest version `trend-recency-v2-20260717`** (3 probes, 30-day window). Each real trial draws a fresh probe set from events in the trailing window before it and commits that set — with its ground truth and the dated sources backing it — under `docs/research-reports/trend-recency-history/`, so the metric stays "events from the last 30 days relative to this trial" by construction and every trial is auditable. History/trend series connect same-instrument-version points only.
- **Paired controls.** Every grounded chat subject has an ungrounded control of the same base model; Perplexity Sonar is search-native and has no ungrounded twin.
- **Grounded tool wiring follows current provider documentation** (xAI Agent Tools `web_search`, Gemini `googleSearch`, OpenAI Responses `web_search`, Anthropic `web_search`). The 2026-07-17 first real trial verified the Gemini, OpenAI, and Anthropic wiring live and retired the xAI Live Search surface, which answered `410 "Live search is deprecated"`; that adapter was migrated to the Agent Tools `web_search` (Responses) surface and verified live on 2026-07-18, turning the Grok grounded row into a measured row. Perplexity Sonar and Sonar Pro remain error rows until `PERPLEXITY_API_KEY` is provisioned; no row is ever an assumed-working one.
- The fixture path is keyless and deterministic; real numbers appear only after an owner runs the real path within the approved ceiling ($30/trial — run `--estimate` first; search surcharges dominate).
- Point-in-time: measured behavior reflects the models, search products, and the web itself at `2026-07-17T01:34:36.857Z`.

## 4. Verification Results

This run has **8 measured** of 10 subject rows (non-measured rows are `fixtured` harness checks or `error` rows, never faked numbers).

| Metric | Best (subject) | Median | Worst |
| ------ | -------------- | ------ | ----- |
| Recency accuracy | 100.0% — Grok 4.3 + Agent Tools web search | 50.0% | 0.0% |
| Citation validity | 100.0% — Grok 4.3 + Agent Tools web search | 50.0% | 0.0% |
| Citation freshness | 0.0 d — Grok 4.3 + Agent Tools web search | 0.0 d | 0.0 d |
| Answer latency | 3211 ms — Claude Opus 4.8 (no search) | 6231 ms | 9753 ms |

"Best"/"Worst" follow each metric's own direction (higher recency accuracy and citation validity are better; lower citation age and latency are better). The grounded-vs-control contrast — how much live retrieval adds over parametric memory — is read by comparing each grounded subject with its same-base-model ungrounded control in the section 7 table.

**推移 / Trend across surveys**

The measured metrics across the dated surveys in this series (same-instrument runs only):

<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="trend-recency-recencyAccuracy-trend-title trend-recency-recencyAccuracy-trend-desc" viewBox="0 0 640 320"><title id="trend-recency-recencyAccuracy-trend-title">recencyAccuracy over surveys</title><desc id="trend-recency-recencyAccuracy-trend-desc">recencyAccuracy (ratio) per subject across the survey series.</desc><rect x="0" y="0" width="640" height="320" fill="#ffffff"/><line x1="64.00" y1="256.00" x2="616.00" y2="256.00" stroke="#333333" stroke-width="1"/><line x1="64.00" y1="32.00" x2="64.00" y2="256.00" stroke="#333333" stroke-width="1"/><text x="64.00" y="276.00" font-size="10">2026-07-17</text><text x="616.00" y="276.00" text-anchor="end" font-size="10">2026-07-18</text><text x="320.00" y="306.00" text-anchor="middle" font-size="12">Survey date</text><text x="14.00" y="160.00" transform="rotate(-90 14.00 160.00)" text-anchor="middle" font-size="12">recencyAccuracy (ratio)</text><text x="56.00" y="36.00" text-anchor="end" font-size="10">1.0</text><text x="56.00" y="256.00" text-anchor="end" font-size="10">0.0</text><g><circle cx="616.00" cy="32.00" r="3.5" fill="#1f77b4"><title>Grok 4.3 + Agent Tools web search 2026-07-18 1.0</title></circle></g><g><circle cx="64.00" cy="32.00" r="3.5" fill="#d62728"><title>Gemini 3.1 Pro + Google Search grounding 2026-07-17 1.0</title></circle></g><g><circle cx="64.00" cy="32.00" r="3.5" fill="#2ca02c"><title>GPT-5.5 + web search 2026-07-17 1.0</title></circle></g><g><circle cx="64.00" cy="32.00" r="3.5" fill="#9467bd"><title>Claude Opus 4.8 + web search 2026-07-17 1.0</title></circle></g><g><circle cx="64.00" cy="256.00" r="3.5" fill="#8c564b"><title>Grok 4.3 (no search) 2026-07-17 0.0</title></circle></g><g><circle cx="64.00" cy="256.00" r="3.5" fill="#e377c2"><title>Gemini 3.1 Pro (no grounding) 2026-07-17 0.0</title></circle></g><g><circle cx="64.00" cy="256.00" r="3.5" fill="#7f7f7f"><title>GPT-5.5 (no search) 2026-07-17 0.0</title></circle></g><g><circle cx="64.00" cy="256.00" r="3.5" fill="#bcbd22"><title>Claude Opus 4.8 (no search) 2026-07-17 0.0</title></circle></g><g><line x1="484.00" y1="18.00" x2="504.00" y2="18.00" stroke="#1f77b4" stroke-width="2"/><text x="508.00" y="22.00" font-size="10">Grok 4.3 + Agent Tools web search</text></g><g><line x1="484.00" y1="33.00" x2="504.00" y2="33.00" stroke="#d62728" stroke-width="2" stroke-dasharray="5 3"/><text x="508.00" y="37.00" font-size="10">Gemini 3.1 Pro + Google Search grounding</text></g><g><line x1="484.00" y1="48.00" x2="504.00" y2="48.00" stroke="#2ca02c" stroke-width="2" stroke-dasharray="2 3"/><text x="508.00" y="52.00" font-size="10">GPT-5.5 + web search</text></g><g><line x1="484.00" y1="63.00" x2="504.00" y2="63.00" stroke="#9467bd" stroke-width="2" stroke-dasharray="8 3 2 3"/><text x="508.00" y="67.00" font-size="10">Claude Opus 4.8 + web search</text></g><g><line x1="484.00" y1="78.00" x2="504.00" y2="78.00" stroke="#8c564b" stroke-width="2" stroke-dasharray="1 3"/><text x="508.00" y="82.00" font-size="10">Grok 4.3 (no search)</text></g><g><line x1="484.00" y1="93.00" x2="504.00" y2="93.00" stroke="#e377c2" stroke-width="2"/><text x="508.00" y="97.00" font-size="10">Gemini 3.1 Pro (no grounding)</text></g><g><line x1="484.00" y1="108.00" x2="504.00" y2="108.00" stroke="#7f7f7f" stroke-width="2" stroke-dasharray="5 3"/><text x="508.00" y="112.00" font-size="10">GPT-5.5 (no search)</text></g><g><line x1="484.00" y1="123.00" x2="504.00" y2="123.00" stroke="#bcbd22" stroke-width="2" stroke-dasharray="2 3"/><text x="508.00" y="127.00" font-size="10">Claude Opus 4.8 (no search)</text></g></svg>

<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="trend-recency-citationValidity-trend-title trend-recency-citationValidity-trend-desc" viewBox="0 0 640 320"><title id="trend-recency-citationValidity-trend-title">citationValidity over surveys</title><desc id="trend-recency-citationValidity-trend-desc">citationValidity (ratio) per subject across the survey series.</desc><rect x="0" y="0" width="640" height="320" fill="#ffffff"/><line x1="64.00" y1="256.00" x2="616.00" y2="256.00" stroke="#333333" stroke-width="1"/><line x1="64.00" y1="32.00" x2="64.00" y2="256.00" stroke="#333333" stroke-width="1"/><text x="64.00" y="276.00" font-size="10">2026-07-17</text><text x="616.00" y="276.00" text-anchor="end" font-size="10">2026-07-18</text><text x="320.00" y="306.00" text-anchor="middle" font-size="12">Survey date</text><text x="14.00" y="160.00" transform="rotate(-90 14.00 160.00)" text-anchor="middle" font-size="12">citationValidity (ratio)</text><text x="56.00" y="36.00" text-anchor="end" font-size="10">1.0</text><text x="56.00" y="256.00" text-anchor="end" font-size="10">0.0</text><g><circle cx="616.00" cy="32.00" r="3.5" fill="#1f77b4"><title>Grok 4.3 + Agent Tools web search 2026-07-18 1.0</title></circle></g><g><circle cx="64.00" cy="32.00" r="3.5" fill="#d62728"><title>Gemini 3.1 Pro + Google Search grounding 2026-07-17 1.0</title></circle></g><g><circle cx="64.00" cy="32.00" r="3.5" fill="#2ca02c"><title>GPT-5.5 + web search 2026-07-17 1.0</title></circle></g><g><circle cx="64.00" cy="32.00" r="3.5" fill="#9467bd"><title>Claude Opus 4.8 + web search 2026-07-17 1.0</title></circle></g><g><circle cx="64.00" cy="256.00" r="3.5" fill="#8c564b"><title>Grok 4.3 (no search) 2026-07-17 0.0</title></circle></g><g><circle cx="64.00" cy="256.00" r="3.5" fill="#e377c2"><title>Gemini 3.1 Pro (no grounding) 2026-07-17 0.0</title></circle></g><g><circle cx="64.00" cy="256.00" r="3.5" fill="#7f7f7f"><title>GPT-5.5 (no search) 2026-07-17 0.0</title></circle></g><g><circle cx="64.00" cy="256.00" r="3.5" fill="#bcbd22"><title>Claude Opus 4.8 (no search) 2026-07-17 0.0</title></circle></g><g><line x1="484.00" y1="18.00" x2="504.00" y2="18.00" stroke="#1f77b4" stroke-width="2"/><text x="508.00" y="22.00" font-size="10">Grok 4.3 + Agent Tools web search</text></g><g><line x1="484.00" y1="33.00" x2="504.00" y2="33.00" stroke="#d62728" stroke-width="2" stroke-dasharray="5 3"/><text x="508.00" y="37.00" font-size="10">Gemini 3.1 Pro + Google Search grounding</text></g><g><line x1="484.00" y1="48.00" x2="504.00" y2="48.00" stroke="#2ca02c" stroke-width="2" stroke-dasharray="2 3"/><text x="508.00" y="52.00" font-size="10">GPT-5.5 + web search</text></g><g><line x1="484.00" y1="63.00" x2="504.00" y2="63.00" stroke="#9467bd" stroke-width="2" stroke-dasharray="8 3 2 3"/><text x="508.00" y="67.00" font-size="10">Claude Opus 4.8 + web search</text></g><g><line x1="484.00" y1="78.00" x2="504.00" y2="78.00" stroke="#8c564b" stroke-width="2" stroke-dasharray="1 3"/><text x="508.00" y="82.00" font-size="10">Grok 4.3 (no search)</text></g><g><line x1="484.00" y1="93.00" x2="504.00" y2="93.00" stroke="#e377c2" stroke-width="2"/><text x="508.00" y="97.00" font-size="10">Gemini 3.1 Pro (no grounding)</text></g><g><line x1="484.00" y1="108.00" x2="504.00" y2="108.00" stroke="#7f7f7f" stroke-width="2" stroke-dasharray="5 3"/><text x="508.00" y="112.00" font-size="10">GPT-5.5 (no search)</text></g><g><line x1="484.00" y1="123.00" x2="504.00" y2="123.00" stroke="#bcbd22" stroke-width="2" stroke-dasharray="2 3"/><text x="508.00" y="127.00" font-size="10">Claude Opus 4.8 (no search)</text></g></svg>

<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="trend-recency-latencyMs-trend-title trend-recency-latencyMs-trend-desc" viewBox="0 0 640 320"><title id="trend-recency-latencyMs-trend-title">latencyMs over surveys</title><desc id="trend-recency-latencyMs-trend-desc">latencyMs (ms) per subject across the survey series.</desc><rect x="0" y="0" width="640" height="320" fill="#ffffff"/><line x1="64.00" y1="256.00" x2="616.00" y2="256.00" stroke="#333333" stroke-width="1"/><line x1="64.00" y1="32.00" x2="64.00" y2="256.00" stroke="#333333" stroke-width="1"/><text x="64.00" y="276.00" font-size="10">2026-07-17</text><text x="616.00" y="276.00" text-anchor="end" font-size="10">2026-07-18</text><text x="320.00" y="306.00" text-anchor="middle" font-size="12">Survey date</text><text x="14.00" y="160.00" transform="rotate(-90 14.00 160.00)" text-anchor="middle" font-size="12">latencyMs (ms)</text><text x="56.00" y="36.00" text-anchor="end" font-size="10">9753.3</text><text x="56.00" y="256.00" text-anchor="end" font-size="10">3211.0</text><g><circle cx="64.00" cy="256.00" r="3.5" fill="#1f77b4"><title>Claude Opus 4.8 (no search) 2026-07-17 3211.0</title></circle></g><g><circle cx="64.00" cy="213.00" r="3.5" fill="#d62728"><title>GPT-5.5 + web search 2026-07-17 4467.0</title></circle></g><g><circle cx="64.00" cy="197.78" r="3.5" fill="#2ca02c"><title>Grok 4.3 (no search) 2026-07-17 4911.3</title></circle></g><g><circle cx="64.00" cy="164.02" r="3.5" fill="#9467bd"><title>Gemini 3.1 Pro (no grounding) 2026-07-17 5897.3</title></circle></g><g><circle cx="64.00" cy="141.18" r="3.5" fill="#8c564b"><title>GPT-5.5 (no search) 2026-07-17 6564.7</title></circle></g><g><circle cx="64.00" cy="129.87" r="3.5" fill="#e377c2"><title>Claude Opus 4.8 + web search 2026-07-17 6895.0</title></circle></g><g><circle cx="616.00" cy="119.61" r="3.5" fill="#7f7f7f"><title>Grok 4.3 + Agent Tools web search 2026-07-18 7194.7</title></circle></g><g><circle cx="64.00" cy="32.00" r="3.5" fill="#bcbd22"><title>Gemini 3.1 Pro + Google Search grounding 2026-07-17 9753.3</title></circle></g><g><line x1="484.00" y1="18.00" x2="504.00" y2="18.00" stroke="#1f77b4" stroke-width="2"/><text x="508.00" y="22.00" font-size="10">Claude Opus 4.8 (no search)</text></g><g><line x1="484.00" y1="33.00" x2="504.00" y2="33.00" stroke="#d62728" stroke-width="2" stroke-dasharray="5 3"/><text x="508.00" y="37.00" font-size="10">GPT-5.5 + web search</text></g><g><line x1="484.00" y1="48.00" x2="504.00" y2="48.00" stroke="#2ca02c" stroke-width="2" stroke-dasharray="2 3"/><text x="508.00" y="52.00" font-size="10">Grok 4.3 (no search)</text></g><g><line x1="484.00" y1="63.00" x2="504.00" y2="63.00" stroke="#9467bd" stroke-width="2" stroke-dasharray="8 3 2 3"/><text x="508.00" y="67.00" font-size="10">Gemini 3.1 Pro (no grounding)</text></g><g><line x1="484.00" y1="78.00" x2="504.00" y2="78.00" stroke="#8c564b" stroke-width="2" stroke-dasharray="1 3"/><text x="508.00" y="82.00" font-size="10">GPT-5.5 (no search)</text></g><g><line x1="484.00" y1="93.00" x2="504.00" y2="93.00" stroke="#e377c2" stroke-width="2"/><text x="508.00" y="97.00" font-size="10">Claude Opus 4.8 + web search</text></g><g><line x1="484.00" y1="108.00" x2="504.00" y2="108.00" stroke="#7f7f7f" stroke-width="2" stroke-dasharray="5 3"/><text x="508.00" y="112.00" font-size="10">Grok 4.3 + Agent Tools web search</text></g><g><line x1="484.00" y1="123.00" x2="504.00" y2="123.00" stroke="#bcbd22" stroke-width="2" stroke-dasharray="2 3"/><text x="508.00" y="127.00" font-size="10">Gemini 3.1 Pro + Google Search grounding</text></g></svg>

## 5. Analysis

Rows with `measured` provenance can be compared on recency accuracy, citation validity, freshness, and latency; search billing is reference context. The paired-control design localizes the finding: a grounded subject beating its own control on recency accuracy shows live retrieval working, while a control matching its grounded twin means the events were already in parametric memory and the probe window should tighten.

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
| Grok 4.3 + Agent Tools web search | xai | grounded | measured | 100.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | 100.0% ± 0.0% (n=3) | 0.0 d ± 0.0 d (n=1) | 7195 ± 1313 (n=3) | $5.00 |  |
| Perplexity Sonar | perplexity | grounded | error | not measured | not measured | not measured | not measured | not measured | $5.00 | Error: PERPLEXITY_API_KEY is required for a real perplexity run. |
| Perplexity Sonar Pro | perplexity | grounded | error | not measured | not measured | not measured | not measured | not measured | $8.00 | Error: PERPLEXITY_API_KEY is required for a real perplexity run. |
| Gemini 3.1 Pro + Google Search grounding | google | grounded | measured | 100.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | 100.0% ± 0.0% (n=3) | not measured | 9753 ± 3608 (n=3) | $35.00 |  |
| GPT-5.5 + web search | openai | grounded | measured | 100.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | 100.0% ± 0.0% (n=3) | not measured | 4467 ± 790 (n=3) | $10.00 |  |
| Claude Opus 4.8 + web search | anthropic | grounded | measured | 100.0% ± 0.0% (n=3) | 33.3% ± 57.7% (n=3) | 100.0% ± 0.0% (n=3) | not measured | 6895 ± 612 (n=3) | $10.00 |  |
| Grok 4.3 (no search) | xai | ungrounded | measured | 0.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | not measured | 4911 ± 1803 (n=3) | $0.00 |  |
| Gemini 3.1 Pro (no grounding) | google | ungrounded | measured | 0.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | not measured | 5897 ± 2839 (n=3) | $0.00 |  |
| GPT-5.5 (no search) | openai | ungrounded | measured | 0.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | not measured | 6565 ± 2796 (n=3) | $0.00 |  |
| Claude Opus 4.8 (no search) | anthropic | ungrounded | measured | 0.0% ± 0.0% (n=3) | 100.0% ± 0.0% (n=3) | 0.0% ± 0.0% (n=3) | not measured | 3211 ± 603 (n=3) | $0.00 |  |

**Probe manifest (version trend-recency-v2-20260717, 30-day window)**

| Probe id | Topic | Event date | Expected keywords |
| -------- | ----- | ---------- | ----------------- |
| 20260712-wimbledon-mens-champion | sports | 2026-07-12 | 1 |
| 20260715-world-cup-finalists | sports | 2026-07-15 | 2 |
| 20260709-gpt-5-6-variants | ai-models | 2026-07-09 | 2 |

The complete run record is committed as [`trend-recency-comparison.data.json`](./trend-recency-comparison.data.json): per-call questions, answers, citations, latencies, output-token counts, and every score.

Generated: 2026-07-17T01:34:36.857Z

**過去の調査 / Past surveys in this series**

Earlier dated surveys of this topic, newest first — each a complete article for its run.

- [2026-07-17T01:34:36.857Z](./history/trend-recency/2026-07-17T01-34-36-857Z/trend-recency-comparison)
