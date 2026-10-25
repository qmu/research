# Local inference observations

This is the measurement/persistence slice of qmu/research#179. It uses one
OpenAI-compatible streaming request per engine (plus one warm-up request for
Strata; see below) and writes all four engines' observations to a single
versioned JSON file. It does not implement the full 40-item benchmark or claim
first-after-launch / steady-state results from qmu/research#176.

From `packages/tech`, run:

```sh
npm run local-inference -- /path/to/config.json /path/to/new-result.json
```

The output parent directory must exist. A completed run atomically replaces the
previous result at that path; use a different path to retain each trial.
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
timeouts produce `MEASURE-FAILED`. Startup is `NOT-RUN`; server RSS requires the optional PID described below.
Runtime-specific `timings` are deliberately not substituted for the client clock.

Tests use a local HTTP server and synthetic SSE streams; their numbers are not
performance measurements of any installed inference engine. Real hardware runs,
quality judging and steady-state aggregation remain separate work.

### Per-request server RSS

Each target may specify `memoryPid` (positive local server PID). It is accepted
only with a loopback endpoint (`localhost`, `127.0.0.1`, `[::1]`). The operator
must supply the actual server PID; no process discovery or client-PID fallback
is performed. On macOS arm64 the runner polls `/bin/ps -o rss= -p PID` at
50 ms intervals while the HTTP request runs. Reads are serialized and bounded
by a 1 s timeout. RSS is converted from KiB to MiB. Sampling stops and pending
reads finish for successful, failed and timed-out requests alike.

Every saved run has `peakMemory`: value or null, unit `MiB`, source
`ps-rss-sampled`, scope `single-server-process`, samples, intervalMs and reason:
`SAMPLED`, `NO-PID`, `UNSUPPORTED-HOST`, or `SAMPLE-FAILED`. Any failed read makes
the run's memory unavailable rather than reporting an incomplete peak. Raw OS
errors and PIDs are not saved. `metrics.peak_rss` contains the same valid value
or the compatible `NOT-RUN`/`MEASURE-FAILED` reason. Old configs without a PID
still run and explicitly save `NO-PID`.

`peakRssReading(run.peakMemory)` returns the `MemoryReading` input accepted by
`computeMemoryMargin(reading, tier)` in `local-inference-memory-margin`.
Missing readings propagate as undetermined, never zero. This computes only a
**process RSS margin**. Do not publish it as whole-machine unified-memory
headroom: it excludes other processes, child workers and GPU allocations not
represented in server RSS. The sampled maximum can miss peaks between reads;
it is not an OS lifetime high-water mark. Server identity, PID reuse and model
isolation are operator responsibilities. No Apple Silicon hardware measurement
is claimed by the synthetic tests. Runner version and reproduction identity
remain separate concerns.

### Request identity and TTFT evidence

Every request receives a fresh UUID `runId`, including failures and repeat trials.
The row binds `metrics` (speed and peak RSS), `peakMemory`, `ttft` and `quality`
to that one request. Do not join measurements from other requests by engine alone.
Existing `metrics.ttft` remains compatible; `ttft` repeats its value/unit/source
and adds an explicit acquisition reason: `FIRST-CONTENT` for the first nonempty
content delta, `NO-CONTENT` for a completed stream without content, or
a fixed failure reason from the table below. Failed streams discard partial timings.

| TTFT reason         | Meaning                                                   |
| ------------------- | --------------------------------------------------------- |
| `HTTP-ERROR`        | Endpoint returned a non-success HTTP status.              |
| `NO-BODY`           | Successful response has no readable body.                 |
| `INVALID-STREAM`    | An SSE data frame is not a JSON object.                   |
| `STREAM-ERROR`      | A JSON frame reports a server error.                      |
| `INCOMPLETE-STREAM` | The stream ends without the `[DONE]` event.               |
| `TIMEOUT`           | The request deadline expires, including during streaming. |
| `REQUEST-FAILED`    | Other transport/read failure; no raw error is saved.      |

HTTP status bodies, server error messages and exception text are never saved.
Role, empty-content and usage frames cannot start TTFT.
The time begins immediately before fetch, so it includes connection and request
latency; it is not model-only prefill time or server startup time.

`quality: { value: null, reason: "NOT-RUN" }` explicitly records that this runner
has no quality evaluator. It is not a zero or a passing judgment. Real quality
scores require a separately specified evaluator; none are fabricated here.

The HTTP TTFT reader incrementally decodes UTF-8 and buffers incomplete lines.
It accepts SSE events and, when explicitly advertised as `application/x-ndjson`
or `application/jsonl`, JSON log lines using the same OpenAI content/usage
fields and `[DONE]` terminator. Blank JSON log lines are ignored; a final
`[DONE]` line need not have a newline. Arbitrary console prose and other vendor
JSON schemas are not interpreted as token measurements. Malformed records use
`INVALID-STREAM`; EOF before `[DONE]` uses `INCOMPLETE-STREAM`. Both paths
discard partial TTFT through the existing fixed-reason failure handling.

### Atomic TTFT publication

`local-inference/5` connects incremental SSE/JSON-line TTFT evidence to the
versioned atomic writer from qmu/research#238. Before any request, it captures
checkout HEAD as `targetCommit`, runner version and a redacted argv fingerprint,
and reserves `execution.runId` / `execution.version`. Each request keeps its own
fresh `runs[].runId` and repeats the captured `runnerVersion` / `targetCommit`
next to its TTFT value and fixed acquisition reason. The execution ID identifies
the four-request batch; the row ID identifies one measured request.

All rows and execution metadata are serialized together, written to a private
temporary file, fsynced and closed before a single rename publishes the JSON.
Write or rename failure leaves the previous result intact. The existing
reservation lock rejects a superseded execution before requests and again at
publication, so a late old result cannot overwrite a newer one. The sidecar
`<output>.execution.json` coordinates writers; it is not a measurement artifact.
The result and sidecar are not a multi-file transaction and the parent directory
is not fsynced, so this does not promise recovery from power loss. An interrupted
process can leave a lock requiring operator recovery after writers have stopped.

Missing Git provenance fails before measurement. HEAD does not describe dirty
working-tree edits: use a clean committed checkout for reproducible trials.
Tests use synthetic HTTP streams and injected filesystem failures, not Apple
Silicon hardware performance results.

### Bound missing-metric remeasurement requests

Runner `local-inference/6` accepts an optional top-level configuration field:

```json
"fixedTier": { "label": "16-GiB", "totalMiB": 16384 }
```

The tier is an operator-declared fixed process-RSS comparison capacity, not a
hardware probe or a claim about whole-machine free memory. Its label must be
nonblank and its MiB capacity a positive safe integer. Old configs still run,
but cannot create a tier-bound request without this field.

With a fixed tier, the runner saves `fixtureSha256`, `fixedTier`, and
`remeasurementRequest` in the same atomic JSON publication as the measurements.
The fixture digest covers messages, sampling, and the ordered targets' engine,
model, runtime version and condition metadata; endpoints and PIDs are excluded.
Changing any covered value changes the fixture identity. Use the saved digest,
not a hand-built prompt hash, when calling the recovery API.

One request aggregates every row with `metrics.ttft.value === null` or
`metrics.peak_rss.value === null`. A row missing both contributes both metric
names to that one request. Measured zero is retained as a measurement; invalid
numbers are rejected. Complete results save `remeasurementRequest: null`.
The request binds the batch execution ID/version, captured Git commit, runner
version, fixture digest and fixed tier, and identifies affected rows by their
individual run IDs and engines. It schedules no network calls or automatic retry.

For a completed artifact carrying this provenance but no request yet, callers
can import `saveRemeasurementRequest(output, binding)` from
`local-inference/vendors/remeasurement-request.ts`. Supply the artifact's
`execution.runId` / `execution.version`, `execution.targetCommit`,
`execution.runnerVersion`, `fixtureSha256` and `fixedTier` as the binding.
Repeated or concurrent calls against the same artifact return the existing
request ID without rewriting it. A changed commit, runner, fixture, tier or
execution is rejected; an existing inconsistent request is also rejected.
Artifacts without the required provenance must be measured again rather than
having their missing identity inferred.

The recovery operation holds the same cross-process execution lock while
reading, validating and atomically replacing the result. Starting a newer run
invalidates recovery for the old execution. The atomic-file and interrupted-lock
limitations described above still apply. Separate output paths are separate
artifacts, not a distributed queue or a cross-file deduplication service.

### Strata's warm-up run is separated on the manifest

Runner `local-inference/7` sends Strata (and only Strata) an extra request
before its measured one: community packs pay a cold-start load/compile cost on
their first request, and without a warm-up that cost would land inside the one
engine's speed, not its runtime. Every row in `runs[]` — for every engine, not
only Strata — now carries `purpose: "warmup" | "adoption-target"`. Strata
contributes two rows with the same `engine` but different `runId`: a `warmup`
row first, then its `adoption-target` row; the other three engines keep their
single row, always `adoption-target`.

The warm-up row is measured and persisted like any other row — its own TTFT,
token speed and peak RSS are saved for operator visibility — but it is not an
adoption input. `adoptionTargetRuns` (`domain/result.ts`) is the one selector
that keeps it out: it filters `runs[]` down to exactly one `adoption-target`
row per engine, and every reader that turns a run into a speed, quality or
memory adoption decision (including the `remeasurementRequest` built here)
must read through it rather than `runs[]` directly. `remeasurementRequest`
(`domain/remeasurement.ts`) still checks a `warmup` row's provenance (commit,
runner version, run ID uniqueness) against the batch, so a mismatched warm-up
row still fails the same binding check as any other row — it just never
contributes a missing-metric target, so a warm-up's own `NO-FIELD` /
`MEASURE-FAILED` TTFT or RSS can never trigger or join a remeasurement
request for the engine's real measurement.
