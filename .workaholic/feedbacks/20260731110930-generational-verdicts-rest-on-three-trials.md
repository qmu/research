---
type: Feedback
title: Generational verdicts rest on three trials, which the sampling cannot fully support
kind: concern
source: development
created_at: 2026-07-31T11:09:30+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: generational-verdicts-rest-on-three-trials
owner: a@qmu.jp
mission: [support-newly-released-gemini-models-in-the-llm-comparison]
tickets: [20260723153001-gemini-comparison-registry-add-new-models.md, 20260723153002-gemini-generational-delta-insight.md, 20260723153003-gemini-headtohead-real-sweep.md]
origin_pr: 65
origin_pr_url: https://github.com/qmu/research/pull/65
origin_branch: work-20260723-152406
origin_commit: c28eb01
last_seen: 2026-07-31T11:09:30+09:00
---

# Generational verdicts rest on three trials, which the sampling cannot fully support

## Description

The dispersion gate added in [32d5165](https://github.com/qmu/research/commit/32d5165) stops unsupportable directions from being published, but it does not improve the measurement. Running the identical 12 configurations twice hours apart moved sustained throughput by up to 88% on the same configuration, and per-effort verdicts are where the sample is thinnest — the gate now suppresses most throughput directions rather than the design being reconsidered.

## How to Fix

State the trial count where verdicts are stated, sample paired generational configurations more deeply than the rest of the matrix, and decide whether per-effort verdicts should exist at all or aggregate across effort levels. Filed as `.workaholic/tickets/todo/a-qmu-jp/20260727110000-generational-verdicts-exceed-what-3-trials-support.md`
