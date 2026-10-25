# Local inference observations

This is the measurement/persistence slice of qmu/research#179. It uses one
OpenAI-compatible streaming request per engine and writes all four observations
to a single versioned JSON file. It does not implement the full 40-item benchmark
or claim first-after-launch / steady-state results from qmu/research#176.

From `packages/tech`, run:

```sh
npm run local-inference -- /path/to/config.json /path/to/new-result.json
```

The output parent directory must exist. Results replace an existing output atomically:
a temporary file on the same filesystem is written, fsynced and closed before
rename. A failure before rename leaves the previous bytes intact and removes
the temporary file. Each run reserves an `execution.runId` (UUID) and monotonically
increasing `execution.version` before sending requests. These fields are saved in
the result and printed by the CLI; `schemaVersion` remains the data format version.
For the same output path, only the latest reservation may publish. An older run
finishing later exits nonzero with `STALE-EXECUTION` and leaves the result intact,
even when the newer run has not completed. Failed newer runs do not revive old
reservations; the last published result remains until a current run publishes.

A persistent `<output>.execution.json` sidecar tracks reservations. A kernel lock on
`<output>.publication.running.lock` serializes reservation and compare-and-publish
across local processes. Measurement runs outside the lock. Parent-directory
symlinks and relative paths resolve to the same lock. Different hard-link names
are separate destinations. All writers must use this protocol on a local filesystem;
older runners or direct edits bypass it. Legacy result JSON without execution
metadata is accepted and replaced only by a successful current publication.
Do not delete or edit the sidecar while runners may be active. Corrupt state fails
closed. Lock acquisition times out after five seconds; locks are never stolen.
Process exit releases the lock automatically; keep the lock file and sidecar
to preserve exclusion and version ordering. This does not guarantee directory-entry durability across
power loss, nor a transaction between result and sidecar: a crash after result
rename can publish the complete result before marking the reservation completed.
The command exits nonzero if a request fails, but saves every engine's row.
Each request has a 60-second timeout. Start the servers separately, using their
explicit model, context, cache, thread and GPU settings. No server is launched
and no model or credentials are downloaded by this command.

Configuration (include each of `ollama`, `llama.cpp`, `mlx`, `strata` exactly once):

```json
{
  "messages": [{ "role": "user", "content": "Say hello" }],
  "targets": [
    {
      "engine": "ollama",
      "baseUrl": "http://127.0.0.1:11434/v1",
      "model": "your-installed-model",
      "runtimeVersion": "your-pinned-version",
      "condition": {
        "modelRevision": "record-the-revision",
        "weightSha256": "record-the-file-hash",
        "quantization": "Q4_K_M",
        "contextLength": 4096,
        "threads": 8,
        "gpuLayers": 32,
        "hardware": "record-chip-memory-os-power-state",
        "cache": false,
        "speculativeDecoding": false
      }
    }
  ]
}
```

The snippet shows one target; add the other three with their own endpoint,
model, runtime version and actual weight identity. `condition` holds
operator-supplied metadata, not settings applied or verified by the harness.
Do not include credentials or private host identifiers in metadata: it is saved
verbatim. Endpoints, prompts, generated text, response bodies and exception text
are not saved. The input SHA-256 identifies the identical messages sent to each
engine; sampling is saved explicitly. Runtime version and weight conversion
provenance matter: MLX Safetensors and Strata packs are not identical GGUF bytes.

`ttft` is client elapsed seconds to the first nonempty content delta. `tps` is
runtime `usage.completion_tokens` divided by client seconds from first to last
content delta, following the proposed ADR. Role, finish and usage-only frames do
not extend that interval. A single content delta cannot establish that interval.
Missing counts or an unmeasurable interval produce `value: null` / `NO-FIELD`,
never estimated tokens or a zero. HTTP errors, malformed/truncated streams and
timeouts produce `MEASURE-FAILED`. Startup and process RSS are `NOT-RUN`: measuring
the runner's RSS or request duration would not measure the engine's process.
Runtime-specific `timings` are deliberately not substituted for the client clock.

Tests use a local HTTP server and synthetic SSE streams; their numbers are not
performance measurements of any installed inference engine. Real hardware runs,
quality judging and steady-state aggregation remain separate work.

### Completion notices from external workers

An external worker may return a completion envelope to the saving process:

```json
{
  "execution": { "runId": "<reservation runId>", "version": 1 },
  "result": { "schemaVersion": 1, "runs": [] }
}
```

The coordinator must first call `beginExecution(output)` from
`vendors/versioned-result.ts` and pass that reservation to the worker. The
worker returns it unchanged. From `packages/tech`, ingest its notice with:

```sh
node --import tsx/esm src/entrypoints/complete-local-inference.ts notice.json result.json
```

This entrypoint never creates a reservation. It reuses the locked compare and
publish boundary: either an ID mismatch or a version mismatch, a superseded
reservation, or a duplicate completion returns exit 1 and exactly
`{"status":"failed","code":"STALE-EXECUTION"}` on stderr, without replacing the
result. Invalid envelopes and I/O failures return exit 1 with the fixed code
`COMPLETION-FAILED`; raw errors and notice payloads are not logged. Success
returns exit 0 with `status: saved` and the execution identity on stdout.
`result.execution` is forbidden so there is only one identity in the notice.
The result body is otherwise opaque: workers remain responsible for producing
valid, sanitized measurement JSON. This is a trusted local worker transport,
not an authentication boundary. The same lock, crash and recovery limitations
as the in-process runner apply.

### Running-owner lock

The runner holds `<output>.running.lock` from before reservation through final
publication. A second runner targeting the same canonical output fails with
`OUTPUT-RUNNING` before reserving a version or sending HTTP requests. Different
outputs remain independent. Existing execution ID/version validation still
rejects stale external completion notices.

This path requires util-linux `flock` on Linux or `python3` (standard-library
`fcntl.flock`) on macOS. A missing or incompatible backend fails closed before
measurement. The runner owns an open file descriptor;
`flock` acquires its shared open-file-description lock and exits. Normal completion,
exceptions, and process death close that descriptor and release ownership. An old
lock file is safe to reuse immediately: no timestamp expiry or PID reuse can steal
an active owner's lock. Never delete the lock file while writers may run, because
that creates a different inode and defeats exclusion. Use local filesystems with
working flock semantics; network filesystems and writers bypassing this protocol
are outside this guarantee. Reservation/publication uses the same kernel locking mechanism with a five-second
wait on `<output>.publication.running.lock`, so crashes inside that critical
section also recover automatically. Stop all older runners before upgrading;
older mkdir-based writers use a different locking protocol.

### Abandoned-owner recovery evidence

Before requests, the runner reserves a deadline equal to the four sequential
request timeouts. This wall-clock deadline is diagnostic: even an expired live
owner is never evicted. Only acquisition of the full-lifetime kernel lock permits
recovery of an unfinished reservation. An exited owner can be recovered before
its deadline; a legacy reservation with no deadline has an unknown decision.
External coordinators using `beginExecution(output)` do not opt into recovery.
Only callers holding the full-lifetime running lock may pass `{ timeoutMs }`.

Recovery atomically replaces the common result JSON before the next reservation
or HTTP request. Existing measurement rows and execution identity are retained;
if no result exists yet, the recovery-only document is `{ schemaVersion: 1,
runs: [], lockRecovery: ... }` and contains no claimed measurements. The latest
recovery is carried into subsequent completions, including external notices:

```json
{
  "ownerRunId": "00000000-0000-4000-8000-000000000000",
  "deadlineAt": 1790000000000,
  "checkedAt": 1790000000001,
  "deadlineDecision": "expired",
  "reason": "owner-lock-released"
}
```

These are the only `lockRecovery` fields. Times are integer Unix milliseconds;
`deadlineAt` and `ownerRunId` may be null for missing/invalid legacy metadata.
Only generated UUID-v4 owner IDs are copied. Deadline decisions are exactly
`expired` (including equality), `not-expired`, or `unknown`. Reasons are the fixed
code `owner-lock-released`, never exception text, endpoints, commands, PIDs or
host names. Completed reservations do not create recovery events. A malformed
existing result or failed atomic write aborts recovery before replacing its
reservation. Atomic replacement reuses the fsync-and-rename writer; result and
execution sidecar still are not a single crash-atomic transaction. A crash
between their writes can repeat recovery of the same owner; this is a latest
event, not an exactly-once audit history. Power-loss durability is unchanged.
