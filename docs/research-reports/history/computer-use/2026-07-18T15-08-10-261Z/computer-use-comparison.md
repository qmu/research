---
title: Computer use
description: A reproducible comparison of API-native computer-use agents — task success, steps, latency, wall-clock, and per-task cost over a pinned deterministic browser-task suite, every subject driven through one fixed Playwright harness.
---

# Computer use

This report compares computer-use models by **mechanically verifiable** task outcomes only — each subject drives the same fixed browser harness over a pinned task suite, and success is decided by a declarative predicate against the final page state; no aesthetic or trajectory-opinion judgement enters the scores.

## 1. Research Purpose

The purpose is to record which API-native computer-use tools exist, how reliably each completes a fixed set of browser tasks, how many steps and how much wall-clock a solve takes, and what one task costs — the properties that decide whether a provider's agent can be integrated for real web work.

## 2. Measurement Targets

### Target Models

The subjects are the 3 API-native computer-use tools in the curated registry (`packages/tech/src/computer-use/models.ts`), one configuration per provider, each with a cited source and last-verified date. All are driven through the same fixed harness (Playwright (`playwright` npm package, headless Chromium, local fixture server)) so the only variable is the model/tool.

- **xAI (Grok)** is not a subject: it exposes no API-native computer-use tool (verified 2026-07-14).

### Target Metrics

Measured metrics are task success rate (satisfied predicates / attempts, higher is better), steps to complete (actions per successful attempt, lower is better), per-action latency (ms, lower is better), wall-clock per task (s, lower is better), cost per task (USD from token usage, lower is better), and recovery rate (attempts needing a recovery / attempts, lower is better — a secondary robustness signal).

## 3. Scope and Constraints

- **Predicate-decided, never judged.** Each task's success is a declarative check against the final DOM/URL (a URL suffix, present text, an input value, an element count); no LLM-as-judge and no aesthetic score. Changing the suite is a version bump.
- Task suite version `1`: 8 tasks over a pinned, self-contained fixture site (`computer-use-fixture-site@1`). Public suites (OSWorld 2.0, WebArena, WebVoyager) are the reference our metric definitions follow; v1 pins its own deterministic suite because live-site and fragmented-variant suites are not themselves reproducible. History connects same-suite-version, same-harness points only.
- **Browser-only, one config per provider.** Desktop-OS (OSWorld) and mobile (AndroidWorld) tasks are out of scope for v1, as is a second DOM-first harness (browser-use).
- The fixture path is keyless and deterministic and never launches a browser; real, discriminating numbers appear only after an owner runs the real path within the approved cost ceiling (run `--estimate` first).
- Point-in-time: measured behavior reflects the models, tools, and APIs at `2026-07-18T15:08:10.261Z`; catalog token prices are as of each row's last-verified date.

## 4. Verification Results

This run has **2 measured** of 3 subject rows (non-measured rows are `fixtured` harness checks or `error` rows, never faked numbers). Every subject is driven through the same fixed harness (Playwright (`playwright` npm package, headless Chromium, local fixture server)); the only variable is the model/tool.

| Metric | Best (subject) | Median | Worst |
| ------ | -------------- | ------ | ----- |
| Task success rate | 25.0% — Claude Sonnet 5 (Computer Use) | 12.5% | 0.0% |
| Steps to complete | 0.0 — Gemini 2.5 Computer Use | 1.0 | 2.0 |
| Wall-clock per task | 3.8 s — Gemini 2.5 Computer Use | 35.3 s | 66.8 s |
| Cost per task | $0.003 — Gemini 2.5 Computer Use | $0.146 | $0.289 |

"Best"/"Worst" follow each metric's own direction (higher success is better; lower steps, wall-clock, and cost are better). Per-action latency and recovery rate are in the section 7 per-subject table.

## 5. Analysis

Rows with `measured` provenance can be compared on success, steps, latency, wall-clock, and cost. A high success rate with many steps or high wall-clock localizes a model that gets there slowly; a low success rate with low cost is a model that gives up cheaply. Recovery rate separates models that self-correct from those that fail on the first misstep.

## 6. Reproduction

### Reproduction Steps

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# Keyless self-test (deterministic fixture client; no browser, no key):
npm run research -- computer-use --fixture

# Cost preview, then the owner-gated real run:
npm run research -- computer-use --estimate
npm run research -- computer-use --real
```

### Reproduction Cost (Estimate)

The fixture path is keyless and costless. A real trial bills each provider at the underlying model's token rates (no separate per-action fee); screenshots dominate the input side across a multi-turn loop. The agreed ceiling is $40 per trial and `--estimate` must run first.

### Cleanup

No external resources are created. The browser session is ephemeral and screenshots are held in memory for the loop and discarded; the run writes only the local Markdown/JSON artifacts — review them before committing.

## 7. Verification Data

**Per-subject results**

| Subject | Provider | Provenance | Tool | Token price in/out (USD/MTok) | Success | Steps | Latency/action | Wall-clock/task | Cost/task | Recovery | Note |
| ------- | -------- | ---------- | ---- | ----------------------------- | ------- | ----- | -------------- | --------------- | --------- | -------- | ---- |
| Claude Sonnet 5 (Computer Use) | anthropic | measured | `computer_20251124` | 3 / 15 | 25.0% ± 46.3% (n=8) | 2.0 ± 1.4 (n=2) | 2731 ms ± 189 ms (n=8) | 66.8 s ± 36.6 s (n=8) | $0.289 ± $0.156 (n=8) | 0.0% ± 0.0% (n=8) |  |
| OpenAI computer-use-preview | openai | error | `computer` | 3 / 12 | not measured | not measured | not measured | not measured | not measured | not measured | Error: browser.newContext: Target page, context or browser has been closed |
| Gemini 2.5 Computer Use | google | measured | `computer_use` | 1.25 / 10 | 0.0% ± 0.0% (n=8) | not measured | 0 ms ± 0 ms (n=8) | 3.8 s ± 0.3 s (n=8) | $0.003 ± $0.000 (n=8) | 0.0% ± 0.0% (n=8) |  |

**Task suite (version 1, site `computer-use-fixture-site@1`)**

| Task id | Category | Optimal steps | Success predicate |
| ------- | -------- | ------------- | ----------------- |
| open-product-from-catalog | navigation | 2 | url-ends-with: /product/widget.html |
| search-and-open-first-result | search | 4 | url-ends-with: /product/notebook.html |
| add-two-items-to-cart | multi-step | 6 | element-count: #cart-items li=2 |
| submit-contact-form | form | 5 | text-present: Thank you, your message was sent |
| apply-discount-code | form | 3 | input-value: #applied-code=SAVE10 |
| confirm-order-total | extraction | 3 | input-value: #confirm-total=63 |
| filter-catalog-by-category | navigation | 2 | url-ends-with: /catalog.html?category=stationery |
| update-account-nickname | form | 3 | input-value: #nickname=researcher |

**Harness.** Every subject was driven through Playwright (`playwright` npm package, headless Chromium, local fixture server); each attempt's full action trajectory, timings, and token usage are preserved verbatim in the artifact.

The complete run record is committed as [`computer-use-comparison.data.json`](./computer-use-comparison.data.json): per-attempt trajectories, per-action latencies, token counts, and scores.

Generated: 2026-07-18T15:08:10.261Z
