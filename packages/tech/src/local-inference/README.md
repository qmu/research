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

A persistent `<output>.execution.json` sidecar tracks reservations. A short-lived
`<output>.execution.lock` directory serializes reservation and compare-and-publish
across local processes. Measurement runs outside the lock. Parent-directory
symlinks and relative paths resolve to the same lock. Different hard-link names
are separate destinations. All writers must use this protocol on a local filesystem;
older runners or direct edits bypass it. Legacy result JSON without execution
metadata is accepted and replaced only by a successful current publication.
Do not delete or edit the sidecar while runners may be active. Corrupt state fails
closed. Lock acquisition times out after five seconds; locks are never stolen.
After a process crash inside the critical section, stop all writers and remove
only the abandoned lock directory before retrying. Keep the sidecar to preserve
version ordering. This does not guarantee directory-entry durability across
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

Runner preflight: before each engine request, the runner checks that its
reservation is still current. A superseded run stops with `STALE-EXECUTION`
instead of issuing requests to the remaining engines, including when its last
response failed or the newer reservation has not completed. An in-flight request
is allowed to finish or time out. A newer reservation can race the preflight;
the locked comparison at publication remains the authority for saving results.

### Commit and runner provenance

The in-process runner captures its own checkout's full Git `HEAD` once, before
reserving an execution or sending requests. It adds `execution.commitSha`,
`execution.runnerVersion` (`local-inference/3`) and the sanitized argv fingerprint
`execution.commandSha256` to the same JSON as `runId`, `version` and all four
measurement rows. Successful and failed measurements use the same locked,
fsynced temporary-file / atomic-rename publication. A publication failure keeps
the previous result's metrics and provenance together; no metadata-only result
is published. This does not add directory fsync or make the reservation sidecar
and result file a single filesystem transaction.

Commit resolution is anchored to the runner module, not the shell's current
directory. Git environment overrides are excluded. Missing Git, a checkout with
no commit, or an exported tree without Git metadata fails before measurement;
there is no fabricated `unknown` commit. Git diagnostics, paths, remotes and
credentials are not included in the result. SHA-1 and SHA-256 repositories and
detached HEADs are supported. `commitSha` identifies HEAD at execution start,
not uncommitted file contents; use a clean, stable checkout for reproducibility.
`runnerVersion` identifies measurement/persistence semantics and is separate
from engine `runtimeVersion` and the monotonically increasing execution `version`.

These are additive schema-v1 fields. Older artifacts and external-worker notices
may omit them; do not infer the current checkout's commit for old measurements.
The external-worker notice protocol is unchanged. The command fingerprint reuses
allowlist normalization: it hashes JSON argv after redacting unknown tokens,
paths, URLs, credentials and values, so it cannot distinguish redacted settings.
