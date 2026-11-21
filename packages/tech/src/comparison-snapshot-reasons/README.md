# Saved comparison rationale API

`index.ts` is the public TypeScript entry point. It reads an already computed,
JSON-serialized `AdoptionReport` and returns its recorded adoption decisions with
canonical reason ordering. It performs no I/O and has no import-time side effects.
This is an independent integration seam: no HTTP route, website, comparison
command, or unmerged implementation is connected by this change.

```ts
import { readSavedComparisonReasons } from "./comparison-snapshot-reasons";

const result = readSavedComparisonReasons(savedJsonText, expectedCommitSha);
if (result.ok) {
  // Rows retain their original indexes and order; reasons use the wire order.
  console.log(result.snapshot.rows);
} else {
  console.error(result.reason);
}
```

The caller supplies JSON text and the exact lowercase 40-character comparison
commit SHA. The input is the saved comparison report, **not** raw measurement
JSON. The reader requires `schemaVersion: 1`, a matching `currentCommit`, nonempty
`rows`, and `evaluatorMismatches`. Each row supplies nonnegative safe-integer
`sourceIndex` / `runIndex`, `adoption` (`pass`, `fail`, or `undetermined`), and
`reasons`. Duplicate source/run identities are rejected. Additional evidence,
model names, raw errors, groups, commands, and links are omitted from the output.

For example, a recorded row with `adoption: "undetermined"` and reasons
`["NO-OUTPUT", "MISSING-COMMIT", "MEASURE-FAILED", "NO-OUTPUT"]` returns
`["MISSING-COMMIT", "MEASURE-FAILED", "NO-OUTPUT"]` without changing its verdict.
Reasons are deduplicated and ordered by the exported, frozen
`ADOPTION_REASON_ORDER`:

1. Provenance: `MISSING-COMMIT`, `COMMIT-MISMATCH`, `MISSING-RUNNER-VERSION`,
   `UNKNOWN-RUNNER-VERSION`.
2. Conditions: `MISSING-FINGERPRINT`, `MISSING-CONDITION`,
   `MISSING-RUNTIME-VERSION`, `MISSING-SAMPLING`, `MISSING-INPUT-SHA256`,
   `MISSING-PROCEDURE`, `MISSING-QUALITY`.
3. Measurement: `MEASURE-FAILED`.
4. Quality: `INPUT-MISMATCH`, `NO-OUTPUT`, `QUALITY-FAIL`.

Evaluator differences remain separate from row adoption, matching the saved
report contract. Each entry must have reason `EVALUATOR-VERSION-MISMATCH` and two
distinct, existing row indexes. Pairs are normalized to `[lower, higher]`,
deduplicated and sorted numerically; they still address the unchanged row order.

A pass must have no reasons, a fail must include `QUALITY-FAIL`, and an
undetermined row must have at least one reason. A provenance-excluded row may
remain undetermined even when it records a quality failure. The API preserves
these decisions; it does not rank engines, evaluate thresholds, inspect raw
quality evidence, validate measurement provenance, or verify snapshot authenticity.
Use a trusted producer and the upstream measurement/commit/runner gates before
saving a report. Matching `currentCommit` alone does not certify individual runs.

Invalid caller SHAs return `INVALID-CURRENT-COMMIT` before parsing. A different
valid snapshot comparison SHA returns `SNAPSHOT-COMMIT-MISMATCH`. Malformed JSON,
unknown schema versions/reason codes, missing fields, invalid pair references,
and contradictory verdicts return `INVALID-SNAPSHOT`. Errors contain no partial
rows, paths or input-derived diagnostics. All returned arrays are fresh; changing
a result cannot affect later reads. TypeScript `readonly` is a compile-time
contract, not a runtime freeze of results.

The wire order and supported reason vocabulary are explicit API contracts.
Extending them requires a deliberate reader update; unknown reasons cannot
silently disappear or become an adopted result. This module follows the saved
report shape examined in qmu/research#239 and qmu/research#244 without importing or
modifying either PR. It does not replace the raw saved-run gate in
qmu/research#240, snapshot handoff in qmu/research#243, difference reader in
qmu/research#245, or download/save boundaries in qmu/research#247 and
qmu/research#249.

Verify through the repository runner: `make test` and `make lint`. The focused
suite is `npm --prefix packages/tech test -- src/comparison-snapshot-reasons`.
Tests cover recorded decisions, complete reason order, duplicate reasons,
evaluator pairs, malformed snapshots, fail-closed errors, public exports, and
independent repeated reads. All inputs in these tests are synthetic.

qmu/research#250 appeared during development. Its `decideSnapshot(snapshot,
policy)` computes a decision from normalized numeric metrics and caller-provided
thresholds. This reader instead consumes serialized, already-decided reports and
canonicalizes their recorded reason codes. It neither imports nor reproduces that
threshold policy, and does not change its files.
