---
type: Feedback
title: Cloud [Implement] cannot claim personally-assigned tickets
kind: concern
source: development
created_at: 2026-08-13T11:24:32+09:00
author: a@qmu.jp
supersedes:
severity: moderate
concern_id: cloud-implement-cannot-claim-personally-assigned
owner: 
mission: []
tickets: [20260813054427-web-bootstrap-for-cloud-routines.md]
origin_pr: 102
origin_pr_url: https://github.com/qmu/research/pull/102
origin_branch: work-20260813-054427
origin_commit: a8f4758
last_seen: 2026-08-13T11:24:32+09:00
---

# Cloud [Implement] cannot claim personally-assigned tickets

## Description

`.claude/git-identities` was deliberately not committed (developer instruction, 2026-08-13: resolve identity on demand, not from a file), so a cloud session keeps the container's default git identity and the developer's own `[Implement]` routine skips tickets assigned to them (see [44ecb7e](https://github.com/qmu/research/commit/44ecb7e) in `.claude/hooks/session-start.sh`)

## How to Fix

Propose on-demand identity resolution (e.g. map the `gh api user` login at session start without a committed file) to qmu/workaholic via `/fb`
