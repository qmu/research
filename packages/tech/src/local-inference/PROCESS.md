# Measurement process evidence

Run from `packages/tech` (the command must exit when its measurement finishes):

```sh
node --import tsx/esm src/entrypoints/measure-local-process.ts mlx /tmp/new-process.json 60000 python -m mlx_lm.generate --model local-model --prompt hello
```

The same wrapper accepts `strata`, `ollama`, and `llama.cpp`. Supply the
measurement command and arguments for the installed engine, rather than a
long-running server. No shell is used. This does not install or benchmark engines.

`schema_version: 1` JSON stores `engine`, `status`, `process.exit_code`,
`process.signal`, and `failure.code` (null on success). A missing executable or
other spawn error has a null exit code; signal termination also has a null exit
code. Exit 137 stays 137, rather than becoming evidence of out-of-memory.

Fixed process-level classifications:

| Evidence                     | Code           |
| ---------------------------- | -------------- |
| Deadline expired             | TIMEOUT        |
| Caller abort or SIGINT       | CANCELLED      |
| Process could not start      | UNREACHABLE    |
| Other nonzero exit or signal | MEASURE-FAILED |
| Exit 0 with no signal        | null           |

The first requested stop wins. After a deadline/abort the direct measurement
process is killed with SIGKILL and reaped before saving. Detached descendants
are not managed: use a command that owns its lifecycle. Stdout/stderr are
ignored, and commands, arguments, environment and raw errors are never saved.
The wrapper deliberately does not infer diagnostic failure codes from exit
numbers. The diagnostic normalizer proposed in qmu/research#202 and HTTP
measurement schema proposed in qmu/research#183 remain independent; this
process artifact supplies actual termination evidence without duplicating them.

`saveProcessMeasurement` reserves an `execution.{runId,version}` and publishes
through the same version-fenced atomic save as the common inference JSON
(`run.ts`'s `beginExecution`/`completeExecution`, backed by `writeJsonAtomic`):
a temporary file is written, fsynced and closed before rename, and only the
latest reservation for a given output path may publish — an older measurement
finishing later fails closed with `STALE-EXECUTION` and leaves the newer
evidence intact, including when the failure itself is what's being measured.
The saved JSON carries the same `execution.{runId,version}` field as the
common inference JSON, saved by the identical atomic-save call. The CLI exits
0 on success, 1 on measured failure, and 2 on invalid invocation or inability
to save (including a stale reservation). The CLI exit code is distinct from
the measured child's exit code. Use the exported
`measureProcess`/`saveProcessMeasurement` functions to embed the same record in
future runner integration; AbortSignal cancellation is available through that API.
