# Strata executor → shared local-inference JSON

Connects a real `strata bench run` process (see
`docs/strata-local-inference.md` and, upstream,
[Niko1221/Strata](https://github.com/Niko1221/Strata)'s
`docs/BENCHMARK_PROTOCOL.md`) to a shared local-inference measurement JSON, so
one attempt's exit status, timeout and measured numbers all land in the same
place other engines' executors are expected to write to.

## Why Strata is a process executor, not an HTTP client

Strata also serves an OpenAI-compatible HTTP API (`strata launch`), but
`strata bench run` — the fixed-protocol benchmark this executor drives —
is a CLI run: it exits, and only then has it finished writing its
`outputs.jsonl` record. That is a different shape from an HTTP engine a runner
can `fetch` mid-stream, so Strata gets its own executor
(`strata-executor.ts`) instead of sharing a streaming HTTP path with
Ollama/llama.cpp/MLX.

## What gets saved, and what does not

`runStrataExecutor` always returns a `StrataRun` — one of four `status`
values:

- `measured` — `exitCode` is `0`; the process exited cleanly and its
  outputs.jsonl line validated.
- `timeout` — `exitCode` is `null`; the process ran past `timeoutMs` and was
  `SIGKILL`ed. The outputs file is never read in this case, since a killed
  run can leave it partially written.
- `exit-failed` — `exitCode` is the real exit code, or `-1` if the process
  could not even be spawned; the process exited nonzero.
- `invalid-output` — `exitCode` is `0`, but the process's last outputs.jsonl
  line was missing, unparsable, or failed validation (error present,
  non-200 `http_status`, unfinished `finish_reason`, missing/invalid
  `usage.completion_tokens`, or `end_offset_s` before `dispatch_offset_s`).

Only numbers and the status/exit code are saved. The generated answer text,
the raw outputs.jsonl record, and anything the process wrote to stdout/stderr
are never captured or persisted — an error envelope can carry a local hostname
or filesystem path, and the answer text can be arbitrarily long or sensitive.

`saveStrataRun` reads back any existing JSON at the output path, keeps every
row whose `engine` is not `"strata"` untouched, and replaces (not
duplicates) a prior `strata` row — so pointing two different engines'
executors at the same output path, or re-running this one, converges rather
than accumulates stale rows.

## Running it

```jsonc
// config.json
{
  "command": "strata",
  "args": [
    "bench",
    "run",
    "--protocol",
    "strata-qwen38-thinking-v1-draft.1",
    "--output",
    "/tmp/strata-outputs.jsonl"
  ],
  "outputsPath": "/tmp/strata-outputs.jsonl",
  "timeoutMs": 300000,
  "model": "qwen3.8-flash-next-iq3_s",
  "runtimeVersion": "strata-0.0.0",
  "condition": { "pack": "IQ3_S" }
}
```

```sh
npm run local-inference:strata -- config.json common-inference.json
```

The exact `strata bench run` flags (protocol id, output path, model
selection) are the upstream project's own CLI surface and are not reproduced
here beyond what `docs/strata-local-inference.md` already cites — `command`
and `args` are the caller's to fill in for whatever `strata` binary/version is
actually installed on the measuring machine. The CLI entrypoint exits `1`
when the saved run's `status` is anything other than `measured`, so a CI step
or a shell script chaining engines can detect a failed/timed-out attempt from
the exit code alone, without parsing the JSON.
