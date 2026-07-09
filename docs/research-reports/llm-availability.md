---
title: LLM provider status-page observation
description: A passive snapshot of each LLM provider's own public status page — reported component states and incidents, with provenance. Not an availability ranking or SLA.
---

# LLM provider status-page observation

This report **records what each provider reports on its own public status page** —
component states, active incidents, and recent incident history — at a single
fetch time. It makes **no API calls** to the providers' model endpoints and needs
no API keys. These are the providers' own reports, not our measurements.

> **This is not an availability ranking or SLA.** A status-page snapshot at one
> moment does not support assertive "which provider is more reliable" claims. It
> is presented as an observation, with the source and fetch time recorded.

Fixture: yes (keyless deterministic self-test over committed status responses)

Fetched at: `2026-01-01T00:00:00.000Z`

## 1. Reported status by provider

Providers are listed alphabetically; the order implies no ranking.

| Provider | Reported status | Components | Active incidents | Recent incidents | Page updated |
| -------- | --------------- | ---------- | ---------------- | ---------------- | ------------ |
| Anthropic | All Systems Operational | 4/4 operational | 0 | 0 | 2025-12-31T23:40:00.000Z |
| Google Cloud | active incident(s) reported | not exposed by source | 1 | 1 | — |
| OpenAI | Partially Degraded Service | 2/3 operational | 1 | 1 | 2025-12-31T23:52:00.000Z |
| xAI | Scheduled Maintenance In Progress | 2/3 operational | 1 | 0 | 2025-12-31T20:00:00.000Z |

## 2. Component states

- **Anthropic**: all 4 reported components operational.
- **Google Cloud**: this source does not expose a per-component list (incidents only).
- **OpenAI**: 2/3 operational; not operational: API → degraded_performance.
- **xAI**: 2/3 operational; not operational: Grok → under_maintenance.

## 3. Active incidents and maintenance

- **Google Cloud** — Vertex AI: elevated error rates for online prediction in us-central1 [impact: major, status: SERVICE_DISRUPTION] (2025-12-31T21:30:00.000Z → ongoing) [details](https://status.cloud.google.com/incidents/gc-active)
- **OpenAI** — Elevated latency on the Chat Completions API [impact: minor, status: monitoring] (2025-12-31T22:05:00.000Z → ongoing) [details](https://status.openai.com/incidents/inc-active)
- **xAI** — Grok inference capacity upgrade [impact: maintenance, status: in_progress] (2025-12-31T19:00:00.000Z → 2025-12-31T21:00:00.000Z) [details](https://status.x.ai/incidents/maint-active)

## 4. Recent incident history

Recent incidents as exposed by each source at fetch time (Statuspage `summary.json`
carries only currently-listed incidents; a full history would need each page's
incident feed).

- **Google Cloud** — Gemini API: increased 503 responses in multiple regions [impact: critical, status: AVAILABLE] (2025-12-28T14:00:00.000Z → 2025-12-28T16:20:00.000Z) [details](https://status.cloud.google.com/incidents/gc-resolved)
- **OpenAI** — Errors creating fine-tuning jobs [impact: major, status: resolved] (2025-12-30T08:50:00.000Z → 2025-12-30T10:30:00.000Z) [details](https://status.openai.com/incidents/inc-recent)

## 5. Provenance

Each observation records its source URL, our fetch time, and the page's own last
update time, so a reader can trace it to the provider's report.

| Provider | Source | Fetched at | Page updated | Fetch |
| -------- | ------ | ---------- | ------------ | ----- |
| Anthropic | [`https://status.anthropic.com/api/v2/summary.json`](https://status.anthropic.com/api/v2/summary.json) | 2026-01-01T00:00:00.000Z | 2025-12-31T23:40:00.000Z | ok |
| Google Cloud | [`https://status.cloud.google.com/incidents.json`](https://status.cloud.google.com/incidents.json) | 2026-01-01T00:00:00.000Z | — | ok |
| OpenAI | [`https://status.openai.com/api/v2/summary.json`](https://status.openai.com/api/v2/summary.json) | 2026-01-01T00:00:00.000Z | 2025-12-31T23:52:00.000Z | ok |
| xAI | [`https://status.x.ai/api/v2/summary.json`](https://status.x.ai/api/v2/summary.json) | 2026-01-01T00:00:00.000Z | 2025-12-31T20:00:00.000Z | ok |

## Artifact

The complete normalized observations are stored in
[`llm-availability.data.json`](./llm-availability.data.json).
