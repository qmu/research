---
type: Strategy
title: Periodically benchmark computer-use / browser-agent capabilities
slug: periodically-benchmark-computer-use-browser-agent-capabilities
status: active
created_at: 2026-07-22T12:19:12+09:00
author: a@qmu.jp
---

# Periodically benchmark computer-use / browser-agent capabilities

## Direction

qmu.co.jp's foundational research keeps a standing, public measurement of how well
frontier models **use a computer** — driving a real browser to complete
multi-step web tasks as an agent, not just answering text. As providers ship and
revise computer-use / browser-agent tools (Anthropic's `computer_*` tool, OpenAI's
Responses `computer` tool, Google's `computer_use`, and successor DOM-first
harnesses such as `browser-use`), this research repeatedly asks the client's
question — *which provider's agent actually gets the task done, at what cost, and
how reliably* — and answers it with reproducible, evidence-based benchmarks rather
than vendor claims.

The direction is recurring and cost-bounded: every cycle drives the subjects
through **one fixed harness** against **committed, deterministic task suites** so
the only variable is the model/tool, records honest per-cell provenance
(measured vs. keyless fixture), keeps each real trial inside an approved
per-trial cost ceiling, and publishes dated EN/JP result frames that re-render
without re-spending. Coverage widens over time — new provider tools as they
appear, additional harnesses to isolate the harness variable, and richer task
suites (v1 browser-only; desktop-OS and mobile are later expansions) — but the
throughline is constant: a trustworthy, longitudinal public read on computer-use
capability that keeps pace with a fast-moving preview-stage field.

## Changelog

- 2026-07-22 — strategy created — strategy.md
