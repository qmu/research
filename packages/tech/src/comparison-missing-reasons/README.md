# Comparison missing-reason boundary

`comparisonMissingReasons` is a side-effect-free TypeScript API for callers
preparing a comparison/adoption response. It returns only missing metrics, in
**speed → quality → memory** order, independent of input property order.
It is intentionally not connected to a runner, UI, HTTP route, or saved report.

```ts
import { comparisonMissingReasons } from "./index.js";

comparisonMissingReasons({
  memory: { value: null, missingReason: "not-recorded" },
  speed: { value: 42 },
  quality: { value: null, missingReason: "failed" },
});
// [{ metric: "quality", reason: "failed" },
//  { metric: "memory", reason: "not-recorded" }]
```

All three metrics must be present as own properties. A measurement is a finite,
nonnegative number (including zero) without a `missingReason` property. Units and
quality scales are chosen by the caller; this API does not compare magnitudes.
A missing measurement must explicitly have `value: null` and one of:

- `unsupported`: the source cannot measure this metric.
- `failed`: the source attempted measurement and failed.
- `not-recorded`: the source did not record a measurement.

An omitted metric or reason is invalid, not automatically `not-recorded`.
Malformed or contradictory evidence throws `TypeError` with a fixed message
containing only a metric name, before returning any partial result. Extra source
metadata is ignored and never copied into the response. Returned arrays and
entries are fresh objects; the input is not modified.

Callers are responsible for normalizing source evidence, verifying provenance,
and preserving measured values separately. An empty list means no metrics are
missing; it is **not** an adoption verdict. This API neither applies thresholds
nor reads saved adoption reports. It complements the separate proposals in
qmu/research#250 (numeric adoption decision) and qmu/research#252 (saved decision
reason reader) without depending on or modifying their unmerged code.
