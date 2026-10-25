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

The first requested stop wins. On POSIX, each measurement starts in its own
process group. A deadline or abort sends SIGTERM to the whole group, allows
250 ms for graceful exit/reaping, then sends SIGKILL if the group still exists.
The runner checks the group for another 250 ms and waits for the direct child's
close event before saving. A leader exiting early does not cancel group cleanup.
A graceful exit with code 0 after the deadline still records `TIMEOUT`.

The additive `cleanup` field is null when no stop was requested. Otherwise it
records `scope`, `term_sent`, `kill_sent`, `child_reaped` and `group_state`.
`gone` means the OS reports no process in the owned group; `remaining` means
members still exist (including orphan zombies); `unknown` means the probe could
not establish the state. Signal delivery alone never proves successful cleanup.
Descendants are reaped by their parent or the OS reaper, not by Node's wait on
its direct child. Containers need a functioning init/reaper to remove orphan
zombies; the bounded probe records leftovers instead of hanging indefinitely.
Descendants that create a new session/process group escape this POSIX boundary.
Windows uses direct-child termination and explicitly records scope `child` and
state `unsupported`, without claiming process-tree cleanup.

Stdout/stderr are ignored, and commands, arguments, environment, PIDs and raw
errors are never saved.
The wrapper deliberately does not infer diagnostic failure codes from exit
numbers. The diagnostic normalizer proposed in qmu/research#202 and HTTP
measurement schema proposed in qmu/research#183 remain independent; this
process artifact supplies actual termination evidence without duplicating them.

`saveProcessMeasurement` creates a new file exclusively, including on measurement
failure; it never overwrites existing evidence. The CLI exits 0 on success, 1
on measured failure, and 2 on invalid invocation or inability to save. The CLI
exit code is distinct from the measured child's exit code. Use the exported
`measureProcess`/`saveProcessMeasurement` functions to embed the same record in
future runner integration; AbortSignal cancellation is available through that API.
