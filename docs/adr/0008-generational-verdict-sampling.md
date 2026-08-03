# 0008. Generational verdicts stay per-effort at three trials, and state their sample

Status: accepted (2026-08-01)

## Context

The generational-comparison section renders a per-metric delta and a mechanical
net verdict for each **effort level** of each paired model. During the Gemini
refresh round an identical 12-config scoped sweep was run **twice** within a few
hours, which accidentally produced a direct measurement of run-to-run noise on
the same configs, same instrument, same day:

| config | run 1 | run 2 | swing |
| --- | --- | --- | --- |
| Gemini 3.6 Flash `[high]` | 599 tok/s | 422 tok/s | −30% |
| Gemini 3.5 Flash `[high]` | 363 tok/s | 683 tok/s | +88% |
| Gemini 3.1 Flash-Lite `[high]` | 743 tok/s | 1290 tok/s | +74% |
| Gemini 3.1 Flash-Lite `[medium]` | 1564 tok/s | 1754 tok/s | +12% |
| Gemini 3.6 Flash `[low]` | 504 tok/s | 509 tok/s | +1% |

A dispersion gate was added first (commit `32d5165`): a measured metric earns a
direction only when the gap between the two means clears the two models'
combined run-to-run spread (`sd_former + sd_new`); changes inside it read as
`indistinguishable`. On the Gemini data that withheld five of six throughput
directions while keeping every TTFT and total-latency direction.

That closed the *reporting* question. Two questions remained: should paired
generational configurations be sampled more deeply, and should per-effort
verdicts exist at all?

## Decision

### 1. Do not raise `--trials` for paired generational configurations

**More trials would not change what the current gate admits.** The gate tests

```
|mean_new − mean_former|  >  sd_former + sd_new
```

`sd` is the sample standard deviation — an estimate of the population's
dispersion. It does **not** shrink as `n` grows; only its *estimate* stabilises.
So spending on 10 or 30 trials per paired configuration would leave the gate's
threshold essentially where it is, and would not convert today's
`indistinguishable` throughput results into supported directions. It would buy a
better-estimated `sd` and a more stable mean — real but modest — at a
multiplied sweep cost.

The current count (3) is therefore **sufficient given the gate**, which is the
option the driving ticket explicitly allowed.

Note the trade-off this makes explicit: the gate is a **dispersion** test, not a
test of whether the two *means* differ. A test of the means would compare
against the standard error (`sd/√n`), which *does* shrink with `n` — and under
that statistic more trials would buy real discrimination. Adopting it is a
separate change to the threshold rule, filed as its own ticket rather than
folded in here, because it changes which findings the published article asserts.

### 2. Keep verdicts per effort level

Aggregating a pair's verdict across the effort ladder was considered and
rejected. `low`, `medium` and `high` are **different operating points**, not
repeated samples of one quantity: they run different amounts of reasoning and
have genuinely different throughput. Averaging them would report a figure no
configuration was ever measured at, and would hide the finding that the noise is
concentrated at `high` (±30–88%) while `low` reproduced to ±1%.

Per-effort is where the sample is thinnest, which is exactly why the dispersion
gate is applied per effort. Suppressing an unsupportable direction is the
correct outcome there; collapsing the axis to manufacture a supportable one is
not.

### 3. State the trials beside the verdict

The rendered delta table carries a **Trials** column drawn from each metric's own
`n` (the count of contributing successful trials the aggregate already records),
so the sample is read next to the direction rather than inferred. It is per
metric, not per run, because the structural probes execute once while the speed
probe repeats — a single "3 trials" caption would have been wrong for half the
rows.

## Consequences

- Generational rounds cost no more than before.
- Most `high`-effort throughput directions will keep reading `indistinguishable`.
  That is the honest state of the measurement, not a defect to tune away.
- If the project later wants those directions resolved, the lever is the
  threshold statistic (standard error of the difference of means), not the trial
  count alone — and then a higher `n` becomes worth paying for.
- The hardcoded "Each measurement is three trials" sentence is gone from the
  section intro; the count is now derived from the artifact, so it cannot drift
  from what was actually run.
