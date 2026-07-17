---
created_at: 2026-07-14T02:40:03+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 2h
commit_hash:
category: Added
mission: periodic-research-target-compare-agent-vm-solutions-lambda-microvms-etc
depends_on: [20260714024002-agent-vm-wire-into-published-topics.md]
---

# Accumulate per-provider agent-vm history and compose the trend / past-survey blocks

## Overview

Give `agent-vm` the same accumulated-history shape as the other topics:
per-provider `HistoryPoint` series for `coldStartMsP50` and
`publishedVcpuHourUsd`, one point per dated trial, so the current article's 推移
(trend) block renders each provider's cold-start and price movement over the
tendency window and the 過去の調査 block links prior surveys. Charts connect
same-instrument-version points only.

## Key Files

- `packages/tech/src/llm-model-comparison/domain/history.ts` — the HistoryPoint
  pattern to reuse.
- `packages/tech/src/research/domain/current-article.ts` — trend / past-survey
  composition.
- `packages/tech/src/agent-vm/domain/` — add the history projection.

## Implementation Steps

1. Project each archived `agent-vm` frame into per-provider HistoryPoint series.
2. Feed the series into the trend chart via the shared current-article composer.
3. Unit-test the projection over ≥2 fixture frames; keep CI green.

## Considerations

A single instrument version tag gates chart continuity — bump it when the fixed
task or metric set changes. Needs ≥2 archived trials to draw a line (a plain note
until then).

## Progress (2026-07-14)

The **pure projection core is done** (keyless, unit-tested):
`packages/tech/src/agent-vm/domain/history.ts` — `toHistoryPoint`,
`buildHistoryEntry`, `appendHistory`, and `providerTrends` (per-provider,
same-instrument-version series for `coldStartMsP50` and `publishedVcpuHourUsd`),
with `AGENT_VM_INSTRUMENT_VERSION` in `models.ts` and 6 tests in
`domain/history.test.ts`. **Remaining** (publish-coupled, so it rides with
#20260714024002): feed `providerTrends` into the shared current-article composer
(`research/domain/current-article.ts`) so the 推移 block renders, and archive
real frames to accumulate the series.

## Progress (2026-07-17)

Done — the publish-coupled remainder landed with #024002's site registration:

- `research/domain/snapshot.ts`: `agentVmSnapshotPoints` extractor registered
  for `agent-vm`, emitting exactly the two agreed trend metrics — measured
  `coldStartMsP50` (provenance `measured` rows only, ADR 0004) and the
  reference `publishedVcpuHourUsd` (every provider row). The shared
  current-article composer (`composeTopicCurrentArticle` on a real run) now
  renders the agent-vm 推移 block from archived frames through
  `snapshotPointsFor`; the 過去の調査 block comes from the generic frame
  machinery, no topic code needed.
- `AgentVmResult` now writes `instrumentVersion` (numeric mirror of
  `AGENT_VM_INSTRUMENT_VERSION`) into `agent-vm-comparison.data.json`, so
  `instrumentVersionOf` gates chart continuity when the fixed task or metric
  set changes; the fixture EN page stayed byte-stable.
- Unit tests: extractor over a mixed-provenance artifact, a two-frame
  (two-date) projection, registration + malformed-artifact tolerance
  (`snapshot.test.ts`); 477 tests + lint green (raw exit codes 0).
- Real frames still accumulate only after real trials (#024004, gated on
  credentials + spend); until ≥2 same-instrument dated surveys exist the block
  renders the first-survey note by design.
