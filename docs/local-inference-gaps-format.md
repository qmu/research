# Local inference comparison JSON

This is a deterministic report adapter, not a benchmark runner. It makes no
network calls and claims no measurement of its own; it only renders a common
inference JSON file that another tool already wrote.

From `packages/tech`:

```sh
npm run local-inference:gaps -- src/local-inference/fixtures/comparison-sample.json ../../docs/local-inference-gaps.md
```

The [result page](./local-inference-gaps.md) is generated from the committed
fixture. It contains **synthetic values**, not performance claims; no engine
was measured to produce it. Regeneration must byte-match the committed page.

## Shape

The version 1 object has `schemaVersion: 1`, an ISO `generatedAt` timestamp, a
64-character hex `inputSha256`, a `procedure` string, and a `runs` array. Each
run names one of the four fixed engines — `ollama`, `llama.cpp`, `mlx`,
`strata` — exactly once; a second run for the same engine fails parsing.

Each run has a nonempty `model` and `runtimeVersion`, a `condition` object of
string/number/boolean fields, a `status` of `measured` or `failed`, and a
`metrics` object with exactly five entries: `ttft`, `completion_tokens`,
`tps`, `startup_time`, `peak_rss`.

Each metric is either a measurement — `{ "value": number, "unit": string,
"source": "client" | "usage" }`, where zero is a valid measured value — or a
gap — `{ "value": null, "unit": string, "reason": code }` using one of three
fixed reason codes: `NO-FIELD`, `NOT-RUN`, `MEASURE-FAILED`. No other reason is
accepted.

A `failed` run must additionally carry `failure: { "code": code }` naming why
that run was **not adopted** into the comparison, using one of eight fixed
failure codes: `TIMEOUT`, `OUT-OF-MEMORY`, `MODEL-NOT-FOUND`, `NOT-LOADABLE`,
`UNSUPPORTED`, `UNREACHABLE`, `CANCELLED`, `MEASURE-FAILED`. A `measured` run
must not carry a `failure` field.

## Rendering

Rows render in the fixed order Ollama, llama.cpp, MLX, Strata regardless of
the order in the JSON file; an engine with no recorded run is named in a note
instead of an empty row. A missing metric keeps its gap-reason code in the
cell text (欠測, "missing") instead of a blank or a zero. The last column
shows a failed run's fixed failure code (不採用理由, "reason not adopted") or
`—` for a measured run, so a reader never has to guess whether a gap meant
"not measured" or "rejected."

Invalid data — an unknown engine, a duplicate engine, an unrecognised gap
reason or failure code, a failure code on a measured run, or a missing
failure code on a failed run — fails before the CLI opens its output file.
Operator-supplied text (model name, runtime version, condition values) is
escaped so it cannot break the Markdown table or inject HTML. Numbers use
JavaScript's canonical string representation without rounding; there are no
generated timestamps besides the one carried in the input file.
