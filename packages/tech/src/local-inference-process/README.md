# Apple Silicon local inference process-tree RSS

Run a **local one-shot inference executable** and save a new JSON artifact:

```sh
make local-inference-process \
  ARGS='mlx /tmp/mlx-run-1.json -- /path/to/local-mlx-inference --model /path/to/model'
```

The example paths are placeholders, not a verified engine command. The engine
label must be `ollama`, `llama.cpp`, `mlx` or `strata`. The executable must load
and run inference locally, in itself or its descendants. An HTTP client
(including `ollama run` against an already running daemon) measures the client;
its existing server is outside this execution. This runner neither starts a
remote server nor infers process identity from an engine label.

On Darwin arm64, the command runs in a new process group/session. `/bin/ps`
reports RSS in KiB. Each sample sums the root and its live descendants; the
maximum sampled sum, converted to MiB, becomes `metrics.peak_rss`. This is a
**sampled process-tree RSS peak**, not an exact kernel high-water mark and not
the sum of each process's individual peak. A ps sweep is not an atomic snapshot:
its rows are collected over time. Sampling waits 50 ms after each completed
sweep, so actual gaps include ps execution/scheduling time. Short-lived
processes and between-sample spikes can be missed. Shared resident pages may be
counted in multiple processes; RSS excludes some GPU/device allocations.

Membership includes the execution's original process group plus recursive
parent/child links in each snapshot, regardless of row order. Observed
descendants retain membership after changing group or being reparented, while
their PID and start time still match. Sampling continues after the root exits
until the observed tree is empty or the execution times out. Zombies are
excluded. Unrelated processes and already running model servers are excluded.
A child that escapes the group and loses its ancestry before it is observed
cannot be attributed. PID/start-time identities use ps's second precision;
very rapid PID reuse and process changes during a sweep remain limitations.
This is process observation, not an OS containment boundary.

Other hosts save `NOT-RUN` / `UNSUPPORTED-HOST` without executing the command.
Each invocation reserves its output path before running and refuses to overwrite
it. Schema version 2 saves a unique UUID `runId`, engine, root process status,
exit/signal, `metrics.peak_rss`, and measurement metadata together. Metadata
includes method `ps-sampled-simultaneous-rss`, scope
`local-inference-process-tree`, aggregation `maximum-sampled-sum`, configured
sampling delay, snapshot timeout, nonempty sample count, and acquisition reason.
No argv, environment, stdout, raw stderr, PIDs, or process table is saved. Engine
stdout/stderr are discarded. The CLI exits nonzero for missing measurements,
failed executions, and unsupported hosts.

The default execution timeout is 60 seconds; the programmatic API accepts
`timeoutMs`. Each ps subprocess is limited to 1 second and 4 MiB of output;
samples never overlap. On timeout, process failure, or sampling failure, the
runner kills the original process group and signals any escaped descendants
whose identities can be confirmed in a current snapshot. Sampling failure
allows one bounded cleanup snapshot. If ps remains unavailable, escaped
processes cannot safely be identified for cleanup. Unobserved escaped processes
also cannot be cleaned up. The runner waits for its root and active ps calls;
cleanup can extend beyond the execution timeout by the bounded snapshot work.

Acquisition reasons are `RECORDED`, `NO-FIELD` (no nonempty tree sample),
`PS-TIMEOUT`, `PS-FAILED` (including output overflow), `INVALID-SAMPLE`,
`PROCESS-FAILED`, `TIMEOUT`, or `UNSUPPORTED-HOST`. Missing readings use
`{ value: null, unit: "MiB", reason: "NO-FIELD" | "MEASURE-FAILED" | "NOT-RUN" }`.
Process and sampling failures discard partial readings. A sampling failure's
reason survives any signal caused by its cleanup; an execution timeout takes
precedence. Only the root's exit status is observable: a child failure that its
parent ignores cannot be inferred from RSS sampling.

## Fixed-tier input and existing proposals

`result.metrics.peak_rss` has the structural `MemoryReading` contract of
qmu/research#271: `{ value, unit: "MiB" }` or `{ value: null, unit: "MiB", reason }`.
It can be passed to `computeMemoryMargin(reading, tier)` for a **sampled process
tree RSS** margin. A synthetic 12,288 MiB RSS against 16,384 MiB capacity means
4,096 MiB remaining before accounting for other processes/OS/GPU allocations.
This is not whole-machine free memory, total unified-memory usage, or an adoption
verdict. Preserve the method/scope metadata; do not relabel this as the
whole-machine peak that #271's current report expects.

`origin/main` has no merged local-inference runner or tier calculator. This
small command runner is independently callable without copying unmerged code.
It does not change qmu/research#183's HTTP runner, #198's runner-version fields,
#268/#269/#272's reproduction IDs, #211's whole-machine readings, or #271/#275's
capacity calculations. Integration into those branches remains a separate step.
Tests use synthetic ps snapshots and real local child/grandchild processes;
Linux CI verifies executor behavior without claiming an Apple Silicon hardware
measurement.
