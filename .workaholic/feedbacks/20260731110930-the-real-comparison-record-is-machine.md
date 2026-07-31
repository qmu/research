---
type: Feedback
title: The real comparison record is machine-local, so a scoped sweep can silently shrink the published table
kind: concern
source: development
created_at: 2026-07-31T11:09:30+09:00
author: a@qmu.jp
supersedes:
severity: urgent
concern_id: the-real-comparison-record-is-machine
owner: a@qmu.jp
mission: [support-newly-released-gemini-models-in-the-llm-comparison]
tickets: [20260723153001-gemini-comparison-registry-add-new-models.md, 20260723153002-gemini-generational-delta-insight.md, 20260723153003-gemini-headtohead-real-sweep.md]
origin_pr: 65
origin_pr_url: https://github.com/qmu/research/pull/65
origin_branch: work-20260723-152406
origin_commit: c28eb01
last_seen: 2026-07-31T11:09:30+09:00
---

# The real comparison record is machine-local, so a scoped sweep can silently shrink the published table

## Description

The runner merges a scoped run into the previous record — `previous ? mergeConfigs(previous.configs, fresh) : fresh` — but `previous` is read from `llm-model-comparison.real.data.json`, which is gitignored. A fresh worktree has no `previous`, so the scoped run's output becomes the entire record. On this branch that produced a 12-configuration record where the published pages carry 47; projecting it would have deleted 35 rows from the published speed and accuracy tables, and nothing would have flagged it. Worse, the record cannot be rebuilt from the repository: committed frames are themselves scoped snapshots (the newest holds 6 configurations), so `--render-latest` cannot reconstruct the published article and the only artifact that can is one untracked file on one checkout.

## How to Fix

Distinguish "first full run" from "scoped run with no merge base" — they are the same code path today — and refuse to write a narrowed record without an explicit flag; make the projection step refuse an implausible narrowing with both counts reported; and make the record reproducible from committed state. Filed as `.workaholic/tickets/todo/a-qmu-jp/20260727103000-real-comparison-record-is-unreproducible-from-the-repo.md`
