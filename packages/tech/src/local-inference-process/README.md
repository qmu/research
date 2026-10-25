# Apple Silicon local inference process RSS

Run a **local one-shot inference executable** and save a new JSON artifact:

```sh
make local-inference-process \
  ARGS='mlx /tmp/mlx-run-1.json -- /path/to/local-mlx-inference --model /path/to/model'
```

The example paths are placeholders, not a verified engine command. The engine
label must be `ollama`, `llama.cpp`, `mlx` or `strata`. The executable must load
and run inference in the timed process. An HTTP client (including `ollama run`
against an already running daemon) measures the client, **not the model server**;
do not use that number for engine adoption. This runner neither starts a remote
server nor infers process identity from an engine label.

On Darwin arm64, `/usr/bin/time -l` records maximum resident set size in bytes;
the runner converts it to MiB. Other hosts save `NOT-RUN` / `UNSUPPORTED-HOST`
without executing the command. Each invocation reserves its output path before
running and refuses to overwrite it. The JSON contains the engine, process
status/exit/signal, `metrics.peak_rss` and measurement method/scope/reason. No argv,
environment, stdout or raw stderr is saved. The engine's stdout and stderr are
discarded, keeping time diagnostics separate. Default timeout is 60 seconds;
the programmatic API accepts `timeoutMs` and kills the process group on timeout.
The CLI exits nonzero for failed or unsupported executions.

Acquisition reasons are `RECORDED`, `NO-FIELD`, `MEASURE-FAILED` (invalid time
output), `PROCESS-FAILED`, `TIMEOUT` or `UNSUPPORTED-HOST`. Missing readings use
`{ value: null, unit: "MiB", reason: "NO-FIELD" | "MEASURE-FAILED" | "NOT-RUN" }`.
A process failure discards partial readings rather than publishing them as a
successful measurement. A completed inference can have missing memory data;
check the reading/reason as well as process status.

## Fixed-tier input and existing proposals

`result.metrics.peak_rss` has the structural `MemoryReading` contract of
qmu/research#271: `{ value, unit: "MiB" }` or `{ value: null, unit: "MiB", reason }`.
It can be passed to `computeMemoryMargin(reading, tier)` for a **process RSS**
margin. A synthetic 12,288 MiB RSS against 16,384 MiB capacity means 4,096 MiB
remaining before accounting for other processes/OS/GPU allocations. This is not
whole-machine free memory, total unified-memory usage, or an adoption verdict.
Keep `memoryMeasurement.scope` with the input; do not relabel process RSS as the
whole-machine peak that #271's current report expects.

`origin/main` has no merged local-inference runner or tier calculator. This
small command runner is independently callable without copying unmerged code.
It does not change qmu/research#183's HTTP runner, #198's runner-version fields,
#268/#269/#272's reproduction IDs, #211's whole-machine readings, or #271/#275's
capacity calculations. Integration into those branches remains a separate step.
Tests use synthetic Darwin timing output and actual short local child processes;
Linux CI does not claim an Apple Silicon hardware measurement.
