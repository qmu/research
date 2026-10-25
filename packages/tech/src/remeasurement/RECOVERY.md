# Snapshot recovery persistence

`saveSnapshotRecoveryRequest(directory, input)` in `recovery-store.ts` saves the
latest recovery request for one target commit, runner version and normalized
fixture set. It builds on the identity validation of `request-store.ts`, but uses
separate `recovery-*.json` files. The general immutable request store remains
unchanged. Consumers of this API must read only those recovery files; do not
submit the same recovery through both stores or treat historical general requests
as the current recovery generation.

From `packages/tech`, submit JSON on stdin:

```sh
node --import tsx/esm src/entrypoints/save-snapshot-recovery-request.ts --store /tmp/recovery-requests <<'JSON'
{
  "targetCommit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "runnerVersion": "local-inference/4",
  "fixtureIds": ["sample@1"],
  "executionVersion": 2,
  "source": {
    "runId": "failed-run",
    "targetCommit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "runnerVersion": "local-inference/4"
  },
  "reason": "SNAPSHOT-JSON-INVALID"
}
JSON
```

The example identifiers are synthetic. Supply `source` from the trusted expected
identity of the original failed snapshot, not from a corrupt artifact or the
current checkout. Supply `reason` from the snapshot read failure. Allowed codes
match the producer in qmu/research#248: `SNAPSHOT-READ-FAILED`,
`SNAPSHOT-JSON-INVALID`, `SNAPSHOT-IDENTITY-MISMATCH`. The store requires all source
fields and the reason, validates commit/runner consistency, and strips extra
fields. It does not independently prove that the reported failure occurred.
The producer is not automatically connected to this CLI: a caller must provide
its pinned fixture set and execution version alongside the recovery payload.

`executionVersion` is a positive safe integer assigned monotonically by the
caller for this commit/runner/fixture scope. Keep it unchanged for retries.
Changing commit, runner or fixtures creates an independent scope, not a newer
version of another scope. Run ID and failure reason are not scope keys:

- Lower versions fail with `RECOVERY-STORE-STALE`, including retries of a request
  that was once current.
- Equal versions return `changed: false` only for the identical normalized
  request. Replacing the source run or fixed reason fails with
  `RECOVERY-STORE-CONFLICT`.
- Higher versions replace the whole request, including source and reason, in one
  atomic rename after writing and syncing a temporary file. Readers see either
  the complete old request or the complete new request. The directory is synced
  before acknowledging a changed write. No history or separate pointer is saved.

A per-scope directory lock serializes the read/check/replace transaction across
processes sharing a local filesystem. Contention returns `RECOVERY-STORE-BUSY`;
retry the same input after the current writer finishes. There is no automatic
lock stealing. After a crash, an operator must first establish that no writer is
running, inspect the published record, then remove the abandoned `.lock`
directory and its pending file. Corrupt/noncanonical records fail closed with
`RECOVERY-STORE-CORRUPT`; the store never repairs or overwrites them. A failure
after rename can leave the new record visible without a success acknowledgment;
retry with the same version and payload to resolve that ambiguity.

The CLI emits only `RECOVERY-SAVE-FAILED`, empty stdout and exit code 1 on error;
it does not expose paths or raw input. The API exposes the fixed errors above.
Storage is a trusted, operator-controlled directory. Distributed filesystems,
untrusted directory mutation and dispatch/worker exactly-once execution are not
covered. Consumers must still allocate a new measurement run ID and artifact:
`requiresNewExecutionId` and `requiresNewArtifact` are persisted as true, not
permission to reuse the failed snapshot or adopt its metrics.
