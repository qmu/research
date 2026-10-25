# Saved inference uniqueness preflight

Run from `packages/tech` before comparison rendering:

```sh
node --import tsx/esm src/entrypoints/preflight-unique-local-inference.ts saved-a.json saved-b.json && your-comparison-command
```

The CLI reads all explicitly supplied files without modifying them. Success prints
`UNIQUE-INFERENCE-ROWS` (exit 0). A repeated tuple of `execution.runId`, row
`engine`, and `execution.version` rejects the entire batch with
`DUPLICATE-INFERENCE-ROW` (exit 1, no stdout). Duplicate rows are rejected both
within one artifact and across files, including repeated input paths. Different
model names, measurements, statuses or condition contents cannot hide a repeated
identity. Distinct run IDs, engines or versions remain separate observations.

The version is the positive integer execution reservation version proposed in
qmu/research#225; it is not `schemaVersion`, `runnerVersion`, or a version inferred
from metric values. Only schemaVersion 1 artifacts with explicit execution identity
are supported. Missing identities, malformed JSON and unreadable files fail closed
with `INVALID-INFERENCE-IDENTITY`; paths and raw data are never included in errors.
This checks identity only; full metric/schema and adoption checks remain required.

For in-process callers, `compareUniqueInference(saved, render)` checks the entire
batch before invoking the callback once. It does not mutate, deduplicate, rank or
select rows. Callers must finish rendering before opening output destinations.

This independent boundary avoids modifying the pending table preflight in
qmu/research#195, comparison renderer in qmu/research#185, diff in
qmu/research#201, or provenance gate in qmu/research#240. Those implementations
are not on origin/main; their entrypoints are not wired here. Integrators must
wrap their renderer with this boundary or gate its invocation using the CLI.
No published page or inference engine is changed or invoked.
