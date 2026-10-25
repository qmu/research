# Condition-scoped adoption JSON

[Open the synthetic comparison](./local-inference-adoption.md). The examples test
the join; they are not engine measurements or product recommendations.

## Reproduce

From `packages/tech`, run:

```sh
npm run local-inference:adoption -- /tmp/adoption.md \
  src/local-inference-adoption/fixtures/baseline.json \
  src/local-inference-adoption/fixtures/other-host.json \
  src/local-inference-adoption/fixtures/other-evaluator.json \
  src/local-inference-adoption/fixtures/legacy.json
```

The output must be a new file. Every input is validated before writing; input
files and previous reports are never overwritten. No credentials or model calls
are needed. The same command accepts one or more saved common inference results.

## Join contract

Inputs use `schemaVersion: 1` with `runs`, as proposed in
[qmu/research#183](https://github.com/qmu/research/pull/183). The join consumes the
top-level `fingerprint` from
[qmu/research#197](https://github.com/qmu/research/pull/197) and each run's `quality`
array from [qmu/research#189](https://github.com/qmu/research/pull/189). This adapter
is independent of those unmerged implementations; it does not collect host data
or reevaluate generated output.

Rows join by their enclosing source and run index, never by model name alone.
The exact comparison key includes:

- Environment: `os`, `arch`, `totalMemoryMiB`, `engineVersion`.
- Model execution: engine, model, runtime version, and every field of `condition`.
- Input: prompt SHA-256, all sampling settings, and procedure.
- Evaluation: the sorted fixture ID, fixture SHA-256, and evaluator version for
  every quality judgment.

Object key order does not matter; values and types do. Different keys get separate
tables with expandable condition details. No global ranking or average combines
the tables. Missing metadata is explicitly ungrouped, even when two legacy rows
have the same omissions. Malformed metadata is rejected. Failed measurements
cannot become an adoption pass.

An adoption verdict describes only the recorded fixed-fixture quality result;
it does not establish production readiness. No equivalence between engine
versions, model aliases, different quantizations, or different evaluators is
inferred. `engineVersion` in the fingerprint identifies the Node.js harness;
`runtimeVersion` identifies the inference runtime. This four-field fingerprint
does not prove GPU/CPU equivalence: relevant hardware details must also be
recorded in `condition`. Missing hardware information cannot be reconstructed.

The quality source hash is provenance metadata, not a signature. This consumer
cannot reconstruct the pre-enrichment source bytes to authenticate it. Callers
must supply trustworthy artifacts and preserve their provenance. The adapter
does not print raw generated output or OS/parser error contents; condition fields
are displayed, so supply only non-secret reproducibility metadata.
