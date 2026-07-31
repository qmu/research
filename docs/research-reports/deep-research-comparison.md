---
title: Deep research APIs
description: A reproducible comparison of autonomous deep-research API endpoints — rubric answer quality, citation validity, source diversity, latency, and per-query cost — held against a transparent Anthropic build-your-own baseline.
---

# Deep research APIs

This report compares autonomous **deep-research** endpoints — where one question triggers a multi-minute plan-search-read-synthesize loop that returns a cited report — by **mechanically verifiable** behavior only: a fixed LLM judge answers a deterministic yes/no rubric per report and checks sampled citations; no aesthetic opinion enters the scores.

## 1. Research Purpose

The purpose is to record which deep-research endpoints exist, how trustworthy and well-cited their reports are, how long they take, and what one query costs — and whether any turnkey product beats an agentic loop we can build ourselves (the Anthropic baseline).

## 2. Measurement Targets

### Target Models

The subjects are the 5 deep-research endpoints in the curated registry (`packages/tech/src/deep-research/models.ts`), each with a cited source and last-verified date. One subject, the Anthropic build-your-own loop (Claude + `web_search`), is the transparent in-house **baseline** the turnkey products are measured against.

### Target Metrics

Measured metrics are answer quality against a per-question rubric (satisfied items / total, higher is better), citation validity (resolving, claim-supporting citations / checked, higher is better), source diversity (distinct cited domains, higher is better), latency (seconds end-to-end, lower is better), and cost per query (USD, lower is better).

## 3. Scope and Constraints

- **Judged, but rubric-constrained.** A fixed LLM judge (`claude-sonnet-5`) answers deterministic yes/no questions and checks citations; it never scores prose style. Swapping the judge is an instrument change, not a routine update.
- Question manifest version `2026-07`: 4 domain-neutral, well-documented research questions chosen for checkable, reproducible answers. History connects same-manifest-version points only.
- **Report text is not committed.** The artifact records report length, timing, cost, citation domains, judge answers, and scores — enough to regenerate this page — never the full report bodies.
- The fixture path is keyless and deterministic; real numbers appear only after an owner runs the real path within the approved cost ceiling (run `--estimate` first).
- Point-in-time: measured behavior reflects the endpoints and APIs at `2026-07-19T02:12:52.868Z`; reference per-query prices are as of each row's last-verified date.

## 4. Verification Results

This run has **2 measured** of 5 subject rows (non-measured rows are `fixtured` harness checks or `error` rows, never faked numbers).

| Metric | Best (subject) | Median | Worst |
| ------ | -------------- | ------ | ----- |
| Answer quality (rubric) | 75.0% — Grok DeepSearch | 71.9% | 68.8% |
| Citation validity | 70.8% — Anthropic build-your-own (Claude + web_search) | 47.9% | 25.0% |
| Source diversity | 14.0 — Anthropic build-your-own (Claude + web_search) | 10.9 | 7.8 |
| Latency | 20.9 s — Grok DeepSearch | 38.9 s | 57.0 s |
| Cost per query | $0.04 — Grok DeepSearch | $0.16 | $0.29 |

"Best"/"Worst" follow each metric's own direction (higher quality/validity/diversity is better; lower latency and cost are better). The full per-subject and per-question records are in section 7, Verification Data.

**推移 / Trend across surveys**

This is the first comparable survey in the series, so there is no multi-survey trend to chart yet. A trend chart appears here once a second same-instrument survey is archived; earlier surveys are linked under Verification Data.

## 5. Analysis

Rows with `measured` provenance can be compared on quality, citation integrity, diversity, latency, and cost. Reading answer quality against citation validity localizes the failure mode that most distinguishes deep-research products — a fluent report with unsupported citations scores high on quality but low on validity. The Anthropic baseline row anchors whether a turnkey endpoint's premium buys better research than a loop we can run ourselves.

## 6. Reproduction

### Reproduction Steps

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (deterministic fixture clients):
npm run research -- deep-research --fixture

# Cost preview, then the owner-gated real run:
npm run research -- deep-research --estimate
npm run research -- deep-research --real
```

### Reproduction Cost (Estimate)

The fixture path is keyless and costless. A real trial bills each provider per deep-research query (see the per-subject reference prices) plus the LLM-judge reads; deep-research queries are far costlier and slower than single completions, so `--estimate` must run first and an estimate above the agreed ceiling stops for re-approval.

### Cleanup

No external resources are created. Reports are held in memory for judging and discarded; the run writes only the local Markdown/JSON artifacts — review them before committing.

## 7. Verification Data

**Per-subject results**

| Subject | Provider | Provenance | Quality (mean±sd) | Citation validity | Source diversity | Latency | Cost/query | Note |
| ------- | -------- | ---------- | ----------------- | ----------------- | ---------------- | ------- | ---------- | ---- |
| OpenAI o3 Deep Research | openai | error | not measured | not measured | not measured | not measured | not measured | Error: 520 status code (no body) |
| Perplexity Sonar Deep Research | perplexity | error | not measured | not measured | not measured | not measured | not measured | Error: PERPLEXITY_API_KEY is required for a real perplexity run. |
| Gemini Deep Research | google | error | not measured | not measured | not measured | not measured | not measured | Error: 400 {"error":{"message":"The 'system_instruction' parameter is not supported for the deep-research-preview-04-2026 agent. Please include any specific instructions in the 'input' prompt instead.","code":"invalid_request"}} |
| Grok DeepSearch | xai | measured | 75.0% ± 50.0% (n=4) | 25.0% ± 50.0% (n=4) | 7.8 ± 5.4 (n=4) | 20.9 s ± 6.0 s (n=4) | $0.04 ± $0.02 (n=4) |  |
| Anthropic build-your-own (Claude + web_search) _(baseline)_ | anthropic | measured | 68.8% ± 47.3% (n=4) | 70.8% ± 37.0% (n=4) | 14.0 ± 5.2 (n=4) | 57.0 s ± 7.6 s (n=4) | $0.29 ± $0.12 (n=4) |  |

**Question manifest (version 2026-07)**

| Question id | Rubric size | Prompt |
| ----------- | ----------- | ------ |
| http3-quic | 4 | What are the main technical differences between HTTP/2 and HTTP/3, and why was the QUIC transport protocol introduced? |
| grid-batteries | 4 | Compare lithium-ion and sodium-ion batteries for grid-scale energy storage, covering energy density, cost/material availability, and commercialization status. |
| svb-collapse | 4 | What were the principal causes of the March 2023 collapse of Silicon Valley Bank? |
| intermittent-fasting | 4 | Summarize the current scientific evidence on the health effects of intermittent fasting, distinguishing well-supported findings from uncertain ones. |

**Judge provenance.** Every report was graded by `claude-sonnet-5`; each call's rubric answers, citation checks, and citation domains are preserved verbatim in the artifact.

The complete run record is committed as [`deep-research-comparison.data.json`](./deep-research-comparison.data.json): per-call latencies, costs, citation domains, judge answers, and scores.

Generated: 2026-07-19T02:12:52.868Z

**過去の調査 / Past surveys in this series**

Earlier dated surveys of this topic, newest first — each a complete article for its run.

- [2026-07-19T02:12:52.868Z](./history/deep-research/2026-07-19T02-12-52-868Z/deep-research-comparison)
