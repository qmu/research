---
type: Strategy
title: Periodically benchmark deep-research / autonomous-research APIs
slug: periodically-benchmark-deep-research-autonomous-research-apis
status: active
created_at: 2026-07-22T12:20:17+09:00
author: a@qmu.jp
---

# Periodically benchmark deep-research / autonomous-research APIs

## Direction

Deep-research / autonomous-research endpoints — where a client asks one question
and the provider autonomously plans, runs dozens of web searches, reads sources,
and returns a **cited report** — are the fastest-growing agentic product surface
across the frontier labs, and they turn over on a weeks-to-months rhythm. This
strategy's direction is to keep a **current, trustworthy, cost-bounded public
benchmark** of that surface for qmu.co.jp: recurringly measure the turnkey
deep-research offerings (OpenAI `o3-deep-research`, Perplexity
`sonar-deep-research`, Gemini Deep Research, Grok DeepSearch, …) against a
transparent Anthropic build-your-own baseline, and publish the result as a dated
survey series like the other foundational-research topics.

Every survey scores each subject on the same actionable axes — **answer quality
vs. a per-question rubric (LLM judge), citation count, citation validity, source
diversity, latency, and cost per query** — recorded in full in a `.data.json`
artifact, with honest error/unreachable rows where a subject is not reachable and
a keyless fixture path that keeps CI green without credentials. Each run is
**proposal-first and cost-bounded** (an `--estimate` gate within an approved tier
before any paid run), and a `HistoryPoint` trend series accumulates rubric/cost/
latency per subject across surveys so the published article shows whether a turnkey
endpoint is getting better/cheaper faster than the DIY baseline.

The buying question this benchmark answers is a single axis: *which endpoint
returns the most trustworthy, best-cited answer per dollar and per minute — and is
any turnkey product actually better than an agentic loop qmu can build itself?*
This direction has no completion condition — the surface keeps moving, so the
benchmark keeps running. Missions are its execution plans; the mission→strategy
link lives on each mission.

## Changelog

<!-- Append-only, dated timeline. One line per event ("- YYYY-MM-DD — event — filename");
     never rewrite past lines. Retirement (rare) is a recorded transition, not a deletion. -->
- 2026-07-22 — Strategy created (per-topic; developer-approved granularity); first execution plan is the deep-research-alike APIs periodic-research mission, approved at Floor tier — strategy.md
