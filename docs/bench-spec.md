# Bench spec: metric semantics

A bench spec (`packages/tech/src/bench-spec/`) declares what a benchmark holds
fixed, which conditions it compares, and which metrics decide the comparison.
This page fixes the meaning of each metric field. It elaborates the "Metrics"
element of `research-development-guideline.md` (Step 2).

Reference fixture: `packages/tech/src/bench-spec/fixtures/llm-benchmark.spec.json`.

## Metric fields

| Field       | Required | Meaning                                                         |
| ----------- | -------- | --------------------------------------------------------------- |
| `name`      | yes      | Unique within the spec.                                         |
| `unit`      | yes      | One of the closed set below.                                    |
| `direction` | yes      | `higher-is-better` or `lower-is-better`.                        |
| `threshold` | no       | Pass/fail bound in `unit`. Absent: the metric is observational. |
| `tolerance` | no       | Slack around `threshold`. Requires `threshold`.                 |
| `onMissing` | no       | `fail` (default) or `exclude`.                                  |

## Direction

`higher-is-better` passes when `value >= threshold - margin`.
`lower-is-better` passes when `value <= threshold + margin`.
A value on the better side of the threshold always passes.

## Units

Closed set: `ratio` (0..1), `percent` (0..100), `ms`, `s`, `tokens`,
`tokens-per-second`, `usd`, `count`. `ratio` and `percent` are distinct units;
a spec must not mix them for one quantity. Add a unit by extending
`METRIC_UNITS` in `domain/types.ts` and this list in the same change.

## Tolerance

`{ "kind": "absolute", "value": n }` is `n` in the metric's unit.
`{ "kind": "relative", "value": f }` is `f × |threshold|` (0.1 = 10%).
`value` must be a finite number >= 0. Tolerance only widens the pass side; it
never turns a better-than-threshold value into a failure. No tolerance means
the threshold is exact.

## Missing values

A value is missing when it is `undefined`, `null`, or not finite (NaN,
±Infinity), for example a failed call or an absent field.

- `fail` (default): verdict `missing-fail`; counts as a failed metric.
- `exclude`: verdict `missing-excluded`; left out of the pass/fail verdict and
  reported as missing.

A missing value is never imputed as `0`. Zero is a valid measurement and is
judged against the threshold like any other. This applies to observational
metrics as well: a missing value reports `missing-fail` or `missing-excluded`
by `onMissing`, not `observed`.

`evaluateMetric` in `domain/evaluate.ts` implements these rules.
