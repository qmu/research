---
type: Feedback
title: Keep up with each provider's newest models and plan the response
kind: instruction
source: slack
subject: person:claude[bot]
created_at: 2026-08-15T05:23:35+00:00
author: noreply@anthropic.com
supersedes: 
---

# Keep up with each provider's newest models and plan the response

# Keep up with each provider's newest models and plan the response

Source: https://github.com/qmu/research/issues/110

The reporter wants to keep up with what each provider ships — Gemini Flash 3.7 and
OpenAI's newest models are named as the immediate examples — and asks for the latest
information per provider (new model releases, performance, pricing) to be picked up
continuously, with a response plan formed from it.

The repository already carries the downstream half of this. The model registry records
a former-to-new pairing (`ModelCard.supersedes` / `supersededBy`) and
`generational-delta.ts` quantifies, per paired tier, how a new generation moved on
speed, accuracy and cost once both sides are measured in the same frame; the standing
direction behind that work is recorded in
`20260723152421-strategy-keep-the-llm-speed-and-accuracy-comparison-current-as-providers-release-new-models.md`,
which states that each new-model release is a fresh mission and that there are no
completion conditions. What has no mechanism today is the upstream half this ask names:
nothing in `packages/tech/src` watches provider announcements, so a new model reaches
the registry as a hand-written edit (for example commit `5a8c391`, "Add newly released
Gemini models with pairing").

The ask states the direction and the two examples, and does not state a cadence, the
sources to watch, the shape of the output, a cost or trial-count range, or a target
date.
