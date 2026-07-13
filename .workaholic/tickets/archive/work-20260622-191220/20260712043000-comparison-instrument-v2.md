---
created_at: 2026-07-12T04:30:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Config]
effort: 4h
commit_hash: 86753f9
category: Added
depends_on: [20260712031500-snapshot-structure-site-tooling.md]
mission: living-research-development-guideline
---

# Comparison instrument v2: efficiency-first probes for the recurring sweep

## Overview

The developer set efficiency as the priority for the recurring `npm run
compare` sweep and released the instrument from backward-compatibility with
prior frames. Current cost: 59 configs × 36 calls ≈ 2,124 calls ≈ $31
estimated per 1-trial run. Approved v2 design (developer, 2026-07-12):

1. **Unified speed probe** — one streaming call ("write about the topic in
   exactly 200 words") yields ttftMs, throughputTokensPerSec, totalLatencyMs,
   and lengthAccuracy together (replaces 3 separate calls).
2. **Schema limits by bisection + warm start** — pure binary search over
   [1, cap] when no prior boundary is known (~7 calls depth / ~9 breadth);
   with a prior boundary from the last real artifact, confirm prior →
   probe prior+1 → done (2 calls typical). Axis separation stays (failure
   attribution).
3. **Batched information accuracy** — the 6 TruthfulQA questions in one call
   plus one judge call (replaces 6+1). Redefined as batched exact-match.
4. **Per-probe trial counts** — speed probe repeats ×3 (records stdDev for
   the noisiest metrics); schema and information probes run once.
5. **Subject set: 47 configs** — per model at most 3 efforts (lowest,
   middle, highest); models with ≤3 declared efforts keep all.
6. **`instrumentVersion: 2`** recorded in the artifact; snapshot tendency
   charts connect only points measured by the same instrument version as the
   newest frame. Prior frames stay archived (append-only), they just stop
   being charted alongside v2 points.

Expected cost: ~650 calls ≈ $9–10 estimated cold, ~$6 warm; well under the
$60 ceiling with speed-metric stdDev included every run.

Metric NAMES stay unchanged (ttftMs, throughputTokensPerSec, totalLatencyMs,
lengthAccuracy, maxSchemaDepth, maxSchemaBreadth, informationAccuracy) so
downstream projections, renderers, and the snapshot extractor keep working;
their definitions change and that is recorded via instrumentVersion.

## Key Files

- `packages/tech/src/llm-model-comparison/run.ts` — probe orchestration.
- `packages/tech/src/llm-model-comparison/domain/json-schema.ts` — axis probe
  state machine; add bisection/warm-start machine with boundary tests.
- `packages/tech/src/llm-model-comparison/domain/information-accuracy.ts` —
  batched prompt + per-question grading of a batched answer.
- `packages/tech/src/entrypoints/run-llm-model-comparison.ts` — PROBE params,
  default matrix (47-config effort rule), estimate math (per-probe trials,
  warm/cold schema counts).
- `packages/tech/src/vendors/llm/fixture.ts` — deterministic responses for
  the new unified/batched prompts (keyless fixture stays byte-stable).
- `packages/tech/src/research/domain/snapshot.ts` — instrument-version-aware
  point filtering.
- `packages/tech/src/research/domain/site.ts` — speed/accuracy `design`
  metadata updated (subjects 47-config rule, per-probe trials premises, cost
  premises).

## Quality Gate

- [ ] Unit tests: warm/cold axis search (stable, improved, regressed, cap
      cases), batched info grading, unified speed metric extraction,
      instrument-version filtering.
- [ ] `--estimate` reflects v2 call counts (cold and warm) and per-probe
      trials.
- [ ] Keyless fixture run byte-stable across two consecutive runs; CI green
      (`make lint`, `env -C packages/tech npm test`, docs build).
- [ ] Real 47-config run estimate ≤ $15 cold; actual recorded in the ticket
      final report.
- [ ] Snapshot charts contain only same-instrument-version points after the
      v2 real run; prior frames untouched (append-only verified by git diff).

## Considerations

- The v1→v2 definition change is disclosed via instrumentVersion, the design
  metadata premises, and the trial reports themselves — never silently.
- Supersedes the paid-run step of ticket 20260712031600 (the migration
  ticket): the end-to-end loop proof runs on instrument v2.
