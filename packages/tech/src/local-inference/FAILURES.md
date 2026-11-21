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
measure processes. Output contains the validated engine, failed status, allowlisted code, fixed
metric gaps and sanitized reproduction metadata described below. Exception
messages, stderr, response bodies, URLs, paths, exit text and credentials are
never returned. Do not log the input diagnostics.

Run the synthetic regression cases (no installed engines or credentials needed):

```sh
cd packages/tech
npx vitest run src/local-inference/domain/failure.test.ts src/local-inference/domain/reproduction.test.ts
```

## Public reproduction conditions

Pass optional `reproduction` metadata to the same failure boundary:

```ts
normalizeFailure({
  engine: "ollama",
  timedOut: true,
  reproduction: {
    modelAlias: "model-1",
    quantization: "Q4_K_M",
    inputFixture: "fixture-2",
    rerunArgv: ["ollama", "run", "private-model-name"],
  },
});
```

The JSON adds `reproduction: { fingerprintVersion, modelAlias, quantization,
inputFixture, commandSha256 }`. Existing callers need not supply metadata;
missing/invalid fields become `null` (unknown), never invented defaults.
Engine names are runtime-validated against the four supported engines. Invalid
engines throw a fixed error without echoing the input.

Model aliases and input fixtures are **public manifest slots**, `model-1` through
`model-999` and `fixture-1` through `fixture-999`. Maintain their immutable mapping
to public model conditions and fixed fixture versions in the calling benchmark's
manifest; allocate a new slot when the model or fixture changes. They are not
native model IDs, paths, URLs, prompts, or hashes of private content. The narrow
slot vocabulary deliberately prevents arbitrary token-shaped credentials from
passing as a "safe" alias. Arbitrary human-readable model names are not accepted.
This adapter does not create or verify the caller's manifest mapping.

Quantization is an exact, case-sensitive allowlist: `none`, `fp32`, `fp16`,
`bf16`, `int8`, `int4`, `Q4_0`, `Q4_1`, `Q4_K_S`, `Q4_K_M`, `Q5_0`,
`Q5_1`, `Q5_K_S`, `Q5_K_M`, `Q6_K`, `Q8_0`, `IQ4_XS`, `IQ4_NL`.
Unknown formats remain null until explicitly supported; `none` is an explicit
condition, distinct from missing metadata.

Supply the actual rerun command as **argv tokens**, not shell text. The adapter
reads no environment variables. Only fixed public command tokens survive;
unknown tokens, assignments, URLs, paths and model/config/fixture/output/quantization
option values are replaced with `[REDACTED]` **before** hashing. Known executable
basenames are normalized across install paths, with `nodejs` mapped to `node`.
Raw and normalized argv are never persisted. The digest is lowercase SHA-256 of
UTF-8 `JSON.stringify(["failure-command/1", normalizedArgv])`; the version is
stored separately as `fingerprintVersion`. Empty or invalid argv yields null.

This fingerprint compares sanitized command structure, not secret values or an
exact execution. Redaction intentionally permits collisions; changing a private
model ID or a secret leaves the digest unchanged. Compare engine, public model
alias, quantization and fixture alongside it, and use the public manifest to
reproduce a run. It cannot reconstruct commands or prove identical runtimes.
No live inference or runner integration is added: the common runner and adapters
remain pending in the PRs listed above. The failure classifier itself is inherited
from qmu/research#202; this extension adds the public reproduction contract.
