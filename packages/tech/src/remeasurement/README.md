# Persistent remeasurement requests

This boundary stores requests; it does not execute measurements, schedule workers,
validate snapshots, or authorize adoption of results. It accepts a caller-pinned failed snapshot reference using the `source` shape
produced by qmu/research#248; automatic wiring to that producer is separate.

From `packages/tech`, submit JSON on stdin with an explicit shared store directory:

```sh
node --import tsx/esm src/entrypoints/save-remeasurement-request.ts --store /path/to/requests <<'JSON'
{"targetCommit":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","runnerVersion":"local-inference/4","fixtureIds":["fixture-a@2","fixture-b@1"],"executionVersion":1}
JSON
```

`saveRemeasurementRequest(directory, input)` exposes the same boundary to callers.
A successful call returns `{ created, request }`; first publication sets `created`
to `true`, and retries return `false` with the same canonical request and key.
Both cases exit 0 in the CLI. Invalid input, corrupt existing records, and storage
errors exit 1 with empty stdout and the fixed `REMEASUREMENT-SAVE-FAILED` message.

The SHA-256 key covers the schema namespace plus the full target commit, explicit
runner version, sorted unique fixture IDs, and positive safe-integer execution
version. Supported runner contracts are `local-inference/2`, `/3`, and `/4`, matching
the recovery reader's reviewed versions. Missing/unknown versions are rejected;
no identity is inferred from the checkout or supplied idempotency key. Extra
fields are discarded. Fixture order and repeated IDs do not change the key;
changing any identity dimension creates a separate request.

The caller must pin fixture revisions/content in the IDs and keep
`executionVersion` stable across retries of one requested execution. An intentional
new execution uses a new version. This store does not allocate or authorize those
versions and does not reject an older version: stale worker-result rejection is a
separate execution-result boundary. Do not generate a new version on every click.
An adapter for the recovery request must explicitly supply the desired execution
version and fixture set alongside its trusted `source.targetCommit` and
`source.runnerVersion`. Pass the complete `source` object as well; dropping it would create an ordinary
unbound request. Recovery `runId` and failure reason are not uniqueness dimensions.

Uniqueness spans processes sharing the **same directory on a local filesystem**
with atomic hard links and directory fsync support. A private temporary file is
written, fsynced, closed, then linked exclusively to the key's JSON filename.
The directory is fsynced before acknowledgement. Existing records must exactly
match the canonical bytes; damaged files are never silently replaced. A caller
that loses its response may safely retry. An abrupt process death can leave an
unpublished `.pending-*` file; it cannot block retries and is not a request. Any
maintenance cleanup must avoid files belonging to live writers. Request files
must be retained for the desired deduplication lifetime and the directory must be
writable only by trusted service processes. Separate directories/hosts are not a
distributed uniqueness boundary. Exactly-once downstream execution is not promised;
consumers still need their own claim/completion protocol.

## Bind a failed snapshot

Include `source` in the same stdin JSON / API input to persist the failure's pinned
run ID, commit, and runner version atomically with the request:

```json
{
  "targetCommit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "runnerVersion": "local-inference/4",
  "fixtureIds": ["fixture-a@2"],
  "executionVersion": 1,
  "source": {
    "runId": "failed-snapshot-one",
    "targetCommit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "runnerVersion": "local-inference/4"
  }
}
```

Supply the identity captured by the trusted comparison entry, including when the
snapshot is unreadable. Do not derive it from the broken artifact or current
checkout. This boundary validates the binding, not the existence or contents of
the failed artifact. Source commit and runner must exactly match the requested
commit and runner. The run ID is 1–128 ASCII letters, digits, dots, underscores or
hyphens, starting with a letter or digit. Missing source members, null, blank,
malformed or mismatched values fail before storage with
`INVALID-REMEASUREMENT-SOURCE`. Only these three source fields are persisted;
paths, metrics, exceptions and arbitrary extra fields are discarded.

The source deliberately does **not** change the idempotency key. For the same
requested execution, a different source run is `REMEASUREMENT-STORE-CONFLICT`,
including across concurrent processes. The original record remains unchanged.
An identical reference is an ordinary idempotent retry. A new intended execution
must use a new `executionVersion`, which may bind a different failed run.

Requests without `source` remain supported for ordinary non-recovery callers.
Existing unbound records cannot be silently upgraded, and bound records cannot
be retried without their reference: both are conflicts. No migration or source
inference is performed. Recovery callers must always submit the full reference;
absence alone does not identify a recovery request. The CLI preserves its fixed
error, empty stdout and exit 1 for every rejection. A saved request never implies
snapshot validation, worker execution or adoption approval.
