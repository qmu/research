# Quality judgment diff

From packages/tech:

```sh
npm run --silent local-inference:quality-diff -- \
  src/local-inference-quality-diff/fixtures/before.json \
  src/local-inference-quality-diff/fixtures/after.json
```

Reads two saved common inference schemaVersion 1 files. No engines, API keys,
or generated response text are needed. Output is JSON, sorted by engine/model
and fixture ID; inputs are never modified. Exit 0 means the diff was produced
(even with regressions), exit 1 means invalid input or arguments.

This complements the whole-array quality change in qmu/research#201's general
diff CLI. It uses qmu/research#189's per-fixture judgment contract without
copying either pending implementation. Speed and memory fields are ignored.

Each fixture is classified as added, removed, unchanged, improved (fail to pass),
regressed (pass to fail), undetermined, or incomparable. Improvement/regression
requires equal input SHA-256, fixture SHA-256, and evaluator version. An
undetermined verdict is never counted as a failure. Before/after judgments retain
their reasons. These are changes in saved judgments, not statistical claims or
proof of model causality; model conditions and hardware are not attributed.

Missing legacy quality is an empty set, so newly recorded judgments are added.
Present judgments must have a fixture hash, evaluator version, valid verdict and
consistent reason; incomplete legacy judgments are rejected rather than guessed.
Duplicate engine/model or fixture IDs are rejected as ambiguous.

Only run identity and the five judgment fields are emitted. Arbitrary metadata,
metrics, prompts and generated text are omitted; validation errors never echo
input values or file paths. Identity/version/reason fields are assumed to be
sanitized by the producer; do not put secrets in these contract fields.
