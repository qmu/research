# Local inference failure JSON

`domain/failure.ts` is a failure-only adapter for Ollama, llama.cpp, MLX and
Strata. It accepts captured process stderr, exit status/signal, HTTP status, or
a caught exception (including native JSON error envelopes and fetch causes).
It performs no inference requests and does not wrap or modify successful paths.

Call `normalizeFailure({ engine, error, ... })` only in an existing failure
branch. The returned fragment can be spread into that engine's common JSON row;
retain the caller's model/condition identity. This standalone boundary targets
the measurement shape proposed in qmu/research#183, which is not on main yet.
It does not integrate or duplicate the pending successful adapters in
qmu/research#182, qmu/research#186, qmu/research#188 or qmu/research#191.

## Fixed classification

| Code            | Evidence                                                |
| --------------- | ------------------------------------------------------- |
| TIMEOUT         | Explicit deadline flag or known timeout exception/code  |
| CANCELLED       | Explicit cancellation, SIGINT, or AbortError            |
| OUT-OF-MEMORY   | Allocation or memory diagnostic                         |
| MODEL-NOT-FOUND | Explicit missing-model/file/repository diagnostic       |
| NOT-LOADABLE    | Model/weight/pack format or load diagnostic             |
| UNSUPPORTED     | HTTP 501 or explicit unsupported operation              |
| UNREACHABLE     | Known DNS/connectivity error code                       |
| MEASURE-FAILED  | All remaining failures, including unknown nonzero exits |

Explicit deadlines win over cancellation. Memory diagnostics win over generic
load errors. SIGKILL/137 alone does not establish OOM; HTTP 404 alone does not
establish a missing model. Generic 5xx and malformed streams remain
MEASURE-FAILED. These are deterministic diagnostic rules, not claims that every
version of an engine emits identical wording. Unknown diagnostics retain a
failure row instead of inventing a cause.

Request metrics are null with MEASURE-FAILED, never zero or partial successful
measurements. Startup and RSS remain NOT-RUN because this adapter does not
measure processes. Output contains only the engine, failed status, allowlisted
code and fixed metric gaps: no exception messages, stderr, response bodies,
URLs, paths, exit text or credentials. Do not log the input diagnostics.

Run the synthetic regression cases (no installed engines or credentials needed):

```sh
cd packages/tech
npx vitest run src/local-inference/domain/failure.test.ts
```
