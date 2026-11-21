# Offline snapshot decision API

`domain/decision.ts` exports `decideSnapshot(snapshot, policy)`. This is an
unconnected, pure TypeScript API; it does not change the RAG report, local
inference adoption tables, runners, stored artifacts, or HTTP routes.

Callers provide normalized latency in milliseconds, quality on their chosen
non-negative scale, peak memory in bytes, and explicit thresholds using the
same units. Reasons always contain exactly four entries in this order:

1. `speed`: latency <= maximum
2. `quality`: score >= minimum
3. `peak-memory`: memory <= maximum
4. `missing-evidence`: measured evidence with every metric present and valid

Each entry has a stable factor and code (`pass`, `threshold-failed`, `missing`,
`invalid`, or `fixture`). Adoption requires all four entries to pass. Missing
memory is blocking in this API. There are no implicit product thresholds.
Negative and non-finite numbers are invalid. Invalid thresholds throw
`RangeError`. Zero and equality are valid. The final evidence entry gives
fixture status precedence over invalid metrics, then missing metrics; individual
metric entries retain their own reasons. Threshold failure alone is not missing
evidence. Inputs are not mutated and repeated calls return equal results.

```ts
import { decideSnapshot } from "./domain/decision.js";

const result = decideSnapshot(
  {
    source: "measured",
    latencyMs: 1500,
    qualityScore: 0.9,
    peakMemoryBytes: 1024,
  },
  { maxLatencyMs: 2000, minQualityScore: 0.8, maxPeakMemoryBytes: 2048 },
);
// result.adopted === true; reasons: speed, quality, peak-memory, missing-evidence
```

The typed boundary expects trusted normalized data. This function does not parse
untrusted JSON, verify run IDs/commits/runner provenance, collect measurements,
or establish comparability. A future adapter must do those checks before calling
it and must deliberately select its policy. No network or model credentials are
needed to test this module.
