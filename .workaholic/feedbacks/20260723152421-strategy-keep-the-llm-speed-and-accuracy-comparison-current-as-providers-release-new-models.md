---
type: Feedback
title: Strategy (retired): Keep the LLM speed and accuracy comparison current as providers release new models
kind: insight
source: discussion
created_at: 2026-07-23T15:24:21+09:00
author: a@qmu.jp
supersedes:
---


# Keep the LLM speed and accuracy comparison current as providers release new models

## Direction

qmu.co.jp publishes an evidence-based LLM speed and accuracy comparison (the
shared `npm run compare` instrument-v2 sweep, feeding the llm-speed-comparison
and llm-accuracy-comparison articles and the model reference catalog). Its value
to clients decays the moment a provider ships a newer model the table doesn't
show. This strategy keeps that comparison current: as OpenAI, Anthropic, Google
(Gemini), xAI (Grok), and the OSS/local tiers release new models, the registry is
refreshed and the sweep re-run so the published table always reflects what a
client could actually choose today.

The direction is not just "add the newest ids" but to **make model-to-model
improvement legible**. Each refresh round is run under identical conditions —
same prompts, same instrument-v2 configs, same judge — with the previous-
generation model held alongside its successor, so the head-to-head is
apples-to-apples and the report can state, with real numbers, how the new
generation improved (or regressed) on speed, accuracy, and cost. Dated trial
frames preserve every generation, so the history reads as a moving frontier
rather than a snapshot. Provenance stays honest (measured only for real runs) and
every price/api-id is web-verified at refresh time. There are no completion
conditions: each new-model release is a fresh mission executing this strategy.

## Changelog

- 2026-07-23 — strategy created; first mission: support newly released Gemini models (3.6 Flash, 3.5 Flash-Lite) — strategy.md

<!-- Append-only, dated timeline. One line per event ("- YYYY-MM-DD — event — filename");
     never rewrite past lines. Retirement (rare) is a recorded transition, not a deletion. -->
