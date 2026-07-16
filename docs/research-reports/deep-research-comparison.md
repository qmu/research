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

- **Judged, but rubric-constrained.** A fixed LLM judge (`fixture-judge`) answers deterministic yes/no questions and checks citations; it never scores prose style. Swapping the judge is an instrument change, not a routine update.
- Question manifest version `2026-07`: 4 domain-neutral, well-documented research questions chosen for checkable, reproducible answers. History connects same-manifest-version points only.
- **Report text is not committed.** The artifact records report length, timing, cost, citation domains, judge answers, and scores — enough to regenerate this page — never the full report bodies.
- The fixture path is keyless and deterministic; real numbers appear only after an owner runs the real path within the approved cost ceiling (run `--estimate` first).
- Point-in-time: measured behavior reflects the endpoints and APIs at `2026-01-01T00:00:00.000Z`; reference per-query prices are as of each row's last-verified date.

## 4. Verification Results

This run has **0 measured** of 5 subject rows (non-measured rows are `fixtured` harness checks or `error` rows, never faked numbers).

There are no measured values to summarize; the committed fixture page proves the harness end to end. The per-subject table is in section 7, Verification Data.

## 5. Analysis

This run has no measured rows; every subject was fixtured or errored, so no cross-subject claim is made. The committed fixture page exists to prove the pipeline, not to compare subjects.

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
| OpenAI o3 Deep Research | openai | fixtured | 100.0% ± 0.0% (n=4) | 100.0% ± 0.0% (n=4) | 3.8 ± 1.0 (n=4) | 1.4 s ± 0.2 s (n=4) | $0.00 ± $0.00 (n=4) |  |
| Perplexity Sonar Deep Research | perplexity | fixtured | 100.0% ± 0.0% (n=4) | 100.0% ± 0.0% (n=4) | 3.8 ± 1.0 (n=4) | 1.4 s ± 0.2 s (n=4) | $0.00 ± $0.00 (n=4) |  |
| Gemini Deep Research | google | fixtured | 100.0% ± 0.0% (n=4) | 100.0% ± 0.0% (n=4) | 3.8 ± 1.0 (n=4) | 1.4 s ± 0.2 s (n=4) | $0.00 ± $0.00 (n=4) |  |
| Grok DeepSearch | xai | fixtured | 100.0% ± 0.0% (n=4) | 100.0% ± 0.0% (n=4) | 3.8 ± 1.0 (n=4) | 1.4 s ± 0.2 s (n=4) | $0.00 ± $0.00 (n=4) |  |
| Anthropic build-your-own (Claude + web_search) _(baseline)_ | anthropic | fixtured | 100.0% ± 0.0% (n=4) | 100.0% ± 0.0% (n=4) | 3.8 ± 1.0 (n=4) | 1.4 s ± 0.2 s (n=4) | $0.00 ± $0.00 (n=4) |  |

**Question manifest (version 2026-07)**

| Question id | Rubric size | Prompt |
| ----------- | ----------- | ------ |
| http3-quic | 4 | What are the main technical differences between HTTP/2 and HTTP/3, and why was the QUIC transport protocol introduced? |
| grid-batteries | 4 | Compare lithium-ion and sodium-ion batteries for grid-scale energy storage, covering energy density, cost/material availability, and commercialization status. |
| svb-collapse | 4 | What were the principal causes of the March 2023 collapse of Silicon Valley Bank? |
| intermittent-fasting | 4 | Summarize the current scientific evidence on the health effects of intermittent fasting, distinguishing well-supported findings from uncertain ones. |

**Judge provenance.** Every report was graded by `fixture-judge`; each call's rubric answers, citation checks, and citation domains are preserved verbatim in the artifact.

The complete run record is committed as [`deep-research-comparison.data.json`](./deep-research-comparison.data.json): per-call latencies, costs, citation domains, judge answers, and scores.

Generated: 2026-01-01T00:00:00.000Z
