# Comparison pair metric gaps

Public entry: `comparisonPairGapReasons` from `./index`. This pure API is not
connected to a runner, HTTP route, persistence layer, or report renderer.

The caller supplies **baseline** and **candidate** evidence independently. Each
side has optional `speed`, `quality`, and `memory` fields. Each field is either
`{ status: "measured", value: number }` or
`{ status: "unsupported" | "failed" | "not-recorded" }`.
An omitted field means no record was provided; it produces `not-recorded`.
An omitted side is outside the typed contract and is not an empty comparison.

Results contain only `metric`, `side`, and `code`, in **speed → quality → memory**
order, with **baseline → candidate** within each metric. Valid measurements
are omitted. One side never supplies evidence for the other. Zero is valid;
negative or nonfinite measurements produce `invalid-value`. An unknown status
throws a fixed TypeError and returns no partial result. Extra diagnostic fields
are not returned. Inputs are not changed, and every result is a fresh array.

```ts
import { comparisonPairGapReasons } from "./index";

comparisonPairGapReasons({
  baseline: { speed: { status: "unsupported" } },
  candidate: { speed: { status: "measured", value: 20 } },
});
// [
//   { metric: "speed", side: "baseline", code: "unsupported" },
//   { metric: "quality", side: "baseline", code: "not-recorded" },
//   { metric: "quality", side: "candidate", code: "not-recorded" },
//   { metric: "memory", side: "baseline", code: "not-recorded" },
//   { metric: "memory", side: "candidate", code: "not-recorded" },
// ]
```

This is a typed, normalized evidence boundary, not a JSON validator. Adapters
must choose consistent units, validate provenance and run identity, and classify
failure versus unsupported evidence before calling it. The API does not inspect
raw errors, infer failure causes, compare thresholds, or decide adoption. An
empty result means no metric gaps on either side, not an adoption recommendation.
