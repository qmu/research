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

## Expiration and recreation

New saves persist `createdAt` and `expiresAt` as Unix milliseconds in the same
atomic record as the source and failure reason. The default lifetime is 24 hours.
The optional third argument `{ now, ttlMs }` selects a trusted clock and positive
safe-integer lifetime. Exact retries return the original timestamps, even after
expiration; submitting the same generation never renews it. Clock and TTL policy
belong to the caller, not to untrusted request JSON.

Before dispatch, call `inspectSnapshotRecoveryRequest(directory, expected, now)`.
`expected` is the original normalized save input, pinned by the caller (including
source run ID, commit, runner version, fixtures, execution version and reason).
A different generation fails with `RECOVERY-STORE-STALE`; mixed identity fails
closed. A different commit/runner/fixture scope is an independent lookup and may
return `RECOVERY-STORE-NOT-FOUND`. Inspection never substitutes a matching-looking
request from another scope.

The returned `status` is `active` only before `expiresAt`; equality is expired.
`reason` is `null` for active requests, `RECOVERY-TTL-EXPIRED` at or after the
deadline, or `RECOVERY-EXPIRY-UNKNOWN` for legacy records without timestamps.
These are lifecycle reasons, separate from the original snapshot failure
`request.reason`. Legacy records are not silently granted a new lifetime.
Malformed or partial timestamps are corrupt records and fail closed.

An expired request exposes `recreation.expected` and
`recreation.minimumExecutionVersion`. Pass those values to
`recreateSnapshotRecoveryRequest(directory, expected, nextExecutionVersion,
{ now, ttlMs })`. This API rechecks the predecessor and expiration under the same
per-scope lock, preserves source and failure reason, and atomically replaces the
expired request with one higher generation. Repeating the same predecessor and
next generation returns `changed: false` and the persisted deadline. Competing
calls can return `RECOVERY-STORE-BUSY`; retry the same arguments. Once another
generation wins, stale descriptors cannot replace it. There is no recreation
descriptor when the safe-integer generation limit is reached.

```ts
import {
  inspectSnapshotRecoveryRequest,
  recreateSnapshotRecoveryRequest,
} from "./recovery-store.js";

const state = await inspectSnapshotRecoveryRequest(directory, expected);
if (state.recreation) {
  const { expected: predecessor, minimumExecutionVersion } = state.recreation;
  await recreateSnapshotRecoveryRequest(
    directory,
    predecessor,
    minimumExecutionVersion,
  );
}
```

This is a library entry point, not an HTTP link or automatic job dispatch.
The existing save CLI creates timed requests; inspection and recreation are
explicit API calls. A new failed snapshot can still use the existing higher-version
save operation. Dispatchers must inspect immediately before use and provide their
own scheduling/claim protocol: inspection alone does not reserve a request or
prevent it expiring while a worker runs. Recreation keeps the failed source run ID
as evidence; the eventual measurement must allocate a new run ID and artifact.
