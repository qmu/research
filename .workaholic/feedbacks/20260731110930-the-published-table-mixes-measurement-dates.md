---
type: Feedback
title: The published table mixes measurement dates by construction
kind: concern
source: development
created_at: 2026-07-31T11:09:30+09:00
author: a@qmu.jp
supersedes:
severity: low
concern_id: the-published-table-mixes-measurement-dates
owner: a@qmu.jp
mission: [support-newly-released-gemini-models-in-the-llm-comparison]
tickets: [20260723153001-gemini-comparison-registry-add-new-models.md, 20260723153002-gemini-generational-delta-insight.md, 20260723153003-gemini-headtohead-real-sweep.md]
origin_pr: 65
origin_pr_url: https://github.com/qmu/research/pull/65
origin_branch: work-20260723-152406
origin_commit: c28eb01
last_seen: 2026-07-31T11:09:30+09:00
---

# The published table mixes measurement dates by construction

## Description

A scoped sweep re-measures only the rows it names, so this frame holds 12 configurations measured on 2026-07-27, 1 on 2026-07-20, and 41 on 2026-07-12. The article now discloses this rather than presenting a single date, and the generational comparison is unaffected because it uses only pairs measured in the same frame — but cross-model comparisons between rows of different dates remain not like-for-like.

## How to Fix

Either run the full sweep when cross-model claims matter, or render per-row measurement dates in the comparison table itself so the reader sees the vintage per row rather than in a scope note
