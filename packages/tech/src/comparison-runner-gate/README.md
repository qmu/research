# Comparison runner version gate

Public entry: `decideComparisonRows` from `./index.js`. This pure TypeScript API
checks each row's measurement runner version **before** calling the supplied
adoption logic. It does not read files, start measurements, or expose an HTTP
route. Existing pages and runners are not connected to this entry.

```ts
import { decideComparisonRows } from "./index.js";

const rows = [
  { id: "old", runnerVersion: "local-inference/3", speed: 100 },
  { id: "current", runnerVersion: "local-inference/4", speed: 10 },
];
const decisions = decideComparisonRows(rows, "local-inference/4", (row) =>
  row.speed >= 20 ? "adopt" : "reject",
);
// old: eligible=false, decision=undetermined, reason=RUNNER-VERSION-MISMATCH
// current: eligible=true, decision=reject, reason=null
```

The expected version comes from trusted comparison configuration. Any non-empty,
trimmed version string is allowed: this API checks exact equality, not whether a
runner implementation is supported. An invalid expected version throws a fixed
`TypeError` before adoption logic runs, including for an empty row list.

Rows retain input order and IDs. Only exact version matches reach the adoption
callback; their `adopt`, `reject`, or `undetermined` decision is preserved.
Different versions (including two supported versions), malformed types, and
versions with surrounding whitespace receive `RUNNER-VERSION-MISMATCH`.
Missing, null, empty, and whitespace-only versions receive
`MISSING-RUNNER-VERSION`. Every excluded row is `undetermined`, with
`eligible: false`, regardless of its measured performance or quality.

Each excluded row returns a programmatic remeasurement entry:
`recovery: { action: "remeasure", runnerVersion: expectedRunnerVersion }`.
The caller uses the result's row ID to look up trusted reproduction conditions
and creates a new measurement with that runner version. The entry is data, not
a shell command or an automatically dispatched request. Never relabel an old
measurement to make it eligible. Untrusted observed version values are not
copied into the reason or recovery entry. Matching rows return `recovery: null`.

The caller supplies normalized rows with unique IDs and owns schema validation,
commit/run identity, supported-version checks, units, fixture eligibility,
thresholds, quality and memory checks. A matching version alone does not justify
adoption. The callback should be pure and must return `AdoptionDecision`; errors
propagate without a partial return. Original rows and measurement evidence are
not modified. This module adds no dependency on pending snapshot, report reader,
or UI changes.
