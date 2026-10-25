# Local inference observations

This is the measurement/persistence slice of qmu/research#179. It uses one
OpenAI-compatible streaming request per engine and writes all four observations
to a single versioned JSON file. It does not implement the full 40-item benchmark
or claim first-after-launch / steady-state results from qmu/research#176.

From `packages/tech`, run:

```sh
npm run local-inference -- /path/to/config.json /path/to/new-result.json
```

The output parent directory must exist; an existing result is never overwritten.
The command exits nonzero if a request fails, but saves every engine's row.
Each request has a 60-second timeout. Start the servers separately, using their
explicit model, context, cache, thread and GPU settings. No server is launched
and no model or credentials are downloaded by this command.

Configuration (include each of `ollama`, `llama.cpp`, `mlx`, `strata` exactly once):

```json
{
  "targetCommit": "0123456789abcdef0123456789abcdef01234567",
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

`targetCommit` is required and must be the full 40-character lowercase commit
SHA of the intended measurement target. It is validated before requests and saved
as `execution.targetCommit` alongside `execution.runnerVersion: "local-inference/4"`.
Supply the actual target commit explicitly; the runner does not infer it from the
output or current checkout.

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
is claimed by the synthetic tests. Runner provenance is saved separately in `execution`.

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
