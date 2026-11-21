---
description: One safe, read-only next action per speed/quality/memory missing-data reason on a local-inference adoption page.
---

# Local inference: safe next actions for missing metrics

A local-inference adoption page can show a saved comparison row with one or
more of its **speed**, **quality**, or **memory** metrics missing, each for
one of three reasons: `unsupported`, `failed`, or `not-recorded`. This page's
display layer attaches exactly **one safe next action** to each missing
reason — a read-only pointer to where a reader resolves that specific
absence, never a trigger that re-runs or reproduces a measurement.

This is a display-layer addition only. It does not compute which metrics are
missing or why (that boundary is
[qmu/research#253](https://github.com/qmu/research/pull/253)'s
`comparisonMissingReasons`), and it does not render a reproduction command
(that is [#264](https://github.com/qmu/research/pull/264),
[#218](https://github.com/qmu/research/pull/218) and
[#216](https://github.com/qmu/research/pull/216)'s scope). The example below
is a synthetic fixture rendered by
`renderMissingMetricNextActions` ([source](https://github.com/qmu/research/tree/main/packages/tech/src/local-inference-next-action)),
not a measurement of any real engine.

## Example

Given three missing metrics, in scrambled input order —

```ts
renderMissingMetricNextActions([
  { metric: "memory", reason: "not-recorded" },
  { metric: "speed", reason: "failed" },
  { metric: "quality", reason: "unsupported" },
]);
```

— the rendered table is always ordered speed → quality → memory,
independent of the input order:

| Metric | Missing reason | Safe next action |
| --- | --- | --- |
| Speed | failed | [Check the saved failure evidence](#failed) — Measurement was attempted and failed. Read the saved failure evidence (exit code, truncated output) already recorded for this run. |
| Quality | unsupported | [Check engine support](#unsupported) — This engine does not measure this metric. Read its documented capability notes before comparing it on this axis. |
| Memory | not-recorded | [Check the recording backlog](#not-recorded) — No measurement was recorded yet. Check whether this metric is scheduled for this engine before treating its absence as a result. |

## Unsupported

The engine does not implement measurement for this metric at all. Remeasuring
will not produce a value. Read the engine's own documented capability notes
(for example, a backend that does not report peak memory) before comparing it
to an engine that does measure this axis.

## Failed

The engine attempted this measurement and it failed. Before requesting a
remeasurement, read the failure evidence already saved for that run — exit
code and truncated output — to see whether the cause (for example, an
out-of-memory kill) would also affect a rerun.

## Not recorded

No measurement was attempted or saved for this metric yet. This is not a
failure: check whether this metric is on the recording backlog for this
engine before treating its absence as a negative result.
