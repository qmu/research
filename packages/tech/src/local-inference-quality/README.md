# Fixed-fixture quality enrichment

This integration layer consumes the schemaVersion 1 `runs` JSON produced by
qmu/research#183. It works on origin/main without importing that unmerged PR:
no HTTP adapter, performance metric, comparison renderer or generic bench-spec
implementation is duplicated. Ollama, llama.cpp, MLX and Strata use the same
judgment path. A subset of engine runs is accepted for retries.

From `packages/tech`:

```sh
node --import tsx/esm src/entrypoints/enrich-local-inference-quality.ts \
  result.json fixtures.json evidence.json new-result.json
```

`fixtures.json` is a nonempty array of fixed fixtures:

```json
[
  {
    "id": "answer-v1",
    "inputSha256": "<64 lowercase hex characters>",
    "expected": "42"
  }
]
```

Use the original measurement's `inputSha256` (SHA-256 of the serialized messages,
not the expected answer). Commit the fixed prompt and expected answer before
collecting outputs. Changing either requires a new fixture id. The persisted
`fixtureSha256` is SHA-256 of `JSON.stringify([id,inputSha256,expected])`, so
changing a reference remains detectable even if an operator reuses an id.

`evidence.json` contains generated output collected by the caller:

```json
{
  "sourceSha256": "<SHA-256 of exact result.json bytes>",
  "outputs": [{ "runIndex": 0, "fixtureId": "answer-v1", "text": "42" }]
}
```

`runIndex` is the zero-based row in the original JSON, including repeated engine
runs. The source digest binds evidence to that exact artifact; stale, duplicate,
unknown fixture and out-of-range evidence is rejected. The caller must collect
the corresponding output faithfully; the digest does not authenticate its origin.
The #183 recorder currently discards generated text. Supply a separately retained
output from the same request; do not infer answers from timing/usage or rerun a
different request and label it as the original measurement.

Each run gains a `quality` array, one row per supplied fixture:

- `fixtureId`, `fixtureSha256`, `evaluatorVersion: "exact-text/v1"`.
- `verdict`: `pass`, `fail`, or `undetermined`; `reason` is null for scored items.
- `MEASURE-FAILED`: run failed; this takes priority even if evidence exists.
- `INPUT-MISMATCH`: the fixture prompt hash differs from the measurement.
- `NO-OUTPUT`: the measured run has no output evidence for this fixture.

`exact-text/v1` compares Unicode strings exactly, with no trimming, case folding,
or JSON canonicalization. Empty completed output is scored normally (it passes
only an empty expected answer). This judge is for exact-answer smoke fixtures;
it does not implement or claim the 40-task code/summarization quality study
proposed in qmu/research#176. No sandbox or LLM judge is run, and no engine
performance is measured here. Use a new evaluator version for changed semantics.

The envelope adds `qualitySchemaVersion: 1` and `qualitySourceSha256`. Original
metrics, statuses and metadata are preserved. Generated and expected text are
not added to the output. The CLI validates before opening the destination,
refuses to overwrite files or existing judgments, returns 1 on invalid input,
and emits no raw paths, exceptions or answers in diagnostics. Undetermined or
failed quality is a valid result and does not change CLI success status.

Tests run through `make test` (tech Vitest includes this folder). The CLI test
uses synthetic data only; it proves persistence, overwrite protection and stale
evidence refusal without network access or inference engine dependencies.

## Reproduce the synthetic fixed fixture

`fixtures/messages.json` pins the prompt; the other three JSON files are synthetic
inputs, not engine observations. From `packages/tech`, run:

```sh
node --import tsx/esm src/entrypoints/enrich-local-inference-quality.ts \
  src/local-inference-quality/fixtures/result.json \
  src/local-inference-quality/fixtures/fixtures.json \
  src/local-inference-quality/fixtures/evidence.json /tmp/quality-result.json
```

Expected verdicts in engine order: Ollama `pass`, llama.cpp `fail`, MLX
`undetermined/NO-OUTPUT`, Strata `undetermined/MEASURE-FAILED`. Choose a new output
path for each execution. These labels illustrate persistence only.
