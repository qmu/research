---
created_at: 2026-07-19T11:00:40+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 2h
commit_hash:
category: Added
mission: periodic-research-target-compare-deep-research-alike-apis
depends_on: [publish-deep-research-topic.md]
---

# Wire the HistoryPoint series for the deep-research 推移 block

## Overview

Accumulate one HistoryPoint per subject per survey (rubric quality primary; cost
and latency secondary) so the trend block builds across dated frames, connecting
same-manifest-version points only.

## Implementation Steps

1. Emit per-subject HistoryPoints from the archived frames.
2. Wire the 推移 block per `current-article.ts`.

## Considerations

Until two same-instrument surveys exist the block is a plain note, per guideline.
