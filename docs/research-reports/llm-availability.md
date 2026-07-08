---
title: LLM availability manual health-probe observations
description: Manual on-demand health-probe observations for LLM provider APIs. Sparse manual samples are not an availability ranking or downtime trend.
---

# LLM availability manual health-probe observations

This report records **manual health-probe observations**. The runner does not run
on a schedule, so these points are not an availability ranking and do not support
assertive downtime-frequency or downtime-duration comparisons.

Fixture: yes (keyless deterministic self-test)

## Sampling spec

| Field | Value |
| ----- | ----- |
| Version | manual-health-probe-v1 |
| Cadence | manual-on-demand |
| Interval | 60000 ms |
| Timeout | 10000 ms |
| Samples per provider | 3 |
| Observation origin | Manual operator environment running packages/tech. Record the concrete region/network with --origin or AVAILABILITY_REQUEST_ORIGIN for every real run. |
| Rate-limit classification | HTTP 429 / provider quota errors are recorded as rate_limit and excluded from service-outage down runs. |
| Censoring | Unknown gaps before the first sample, after the last sample, and between separate manual runs are censored; no uptime or downtime is inferred across those gaps. |
| Down definition | A provider is counted as down only after at least two consecutive non-rate-limit outage-eligible failures (timeout, 5xx/server_error, or network_error) within one defined observation window. Client errors and rate limits are not service downtime. |

## Current run observations

| Provider | Probe target | n | Observation window | Success rate | Mean response | Failure breakdown | Rate limits | Down runs | Observed down duration |
| -------- | ------------ | - | ------------------ | ------------ | ------------- | ----------------- | ----------- | --------- | ---------------------- |
| anthropic | Claude Haiku 4.5 | 3 | 120100 ms | 100% | 95 ms | none | 0 | 0 | 0 ms |
| google | Gemini 3.1 Flash-Lite | 3 | 120117 ms | 100% | 112 ms | none | 0 | 0 | 0 ms |
| openai | GPT-5.4 nano | 3 | 120134 ms | 100% | 129 ms | none | 0 | 0 | 0 ms |
| xai | Grok Build 0.1 | 3 | 120151 ms | 100% | 146 ms | none | 0 | 0 | 0 ms |

## History chart

No committed measured availability history points yet.

## Artifact

Complete observations and the sampling spec are stored in
[`llm-availability.data.json`](./llm-availability.data.json).
