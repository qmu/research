---
type: Strategy
title: Periodic foundational research comparing LLM and agentic API surfaces
slug: periodic-foundational-research-comparing-llm-and-agentic-api-surfaces
status: active
created_at: 2026-07-22T11:31:55+09:00
author: a@qmu.jp
---

# Periodic foundational research comparing LLM and agentic API surfaces

## Direction

This repository publishes **public, reproducible foundational research for
qmu.co.jp**: each research topic is runnable code under `packages/` that measures a
current LLM or agentic API surface, and ships as a dated survey series — English
source reports plus Japanese articles — to the corporate site. The long-lived
direction is to keep that survey coverage **current and trustworthy** as the
frontier surface turns over on a weeks-to-months rhythm: stand up a new topic when
a materially new API surface appears (deep-research endpoints, agent VMs, computer
use, speech, RAG, availability, OCR, image generation, …), and re-run each existing
topic on its cadence so the published comparison never goes stale.

Every topic follows the same shape: **proposal-first** (cadence, subjects, metrics,
cost/trial range, accumulated history approved before any paid run), a keyless
fixture path that keeps CI green without credentials, a full-record `.data.json`
artifact, honest error/unreachable rows where a subject is not reachable, and a
`HistoryPoint` trend series that accumulates across surveys. The buying question
each topic answers is a single actionable axis (best answer/result per dollar and
per minute, and whether a turnkey product beats a loop qmu could build itself).

This direction has no completion condition — the surface keeps moving, so the survey
keeps running. Missions are its execution plans (one per topic or per topic change);
the mission→strategy link lives on each mission.

## Changelog

<!-- Append-only, dated timeline. One line per event ("- YYYY-MM-DD — event — filename");
     never rewrite past lines. Retirement (rare) is a recorded transition, not a deletion. -->
- 2026-07-22 — Strategy created to satisfy the drive-authorization strategy-link guard; first linked mission is the deep-research-alike APIs periodic-research topic (approved at Floor tier) — strategy.md
