# Saved measurement read boundary

This independent, currently unconnected read entrypoint consumes the additive
`execution.targetCommit`, `execution.runnerVersion`, and `execution.runId`
contract used by the local inference runner PRs. It does not modify the adoption
renderer in qmu/research#239 or import its pending implementation.

From `packages/tech`:

```sh
node --import tsx/esm src/entrypoints/read-saved-local-inference.ts \
  <40-character-lowercase-commit> <runner-version> <run-id> saved.json
```

The output contains `eligible` artifacts and `excluded` evidence with source
indexes and fixed reasons. A mismatch or missing field excludes the entire
artifact, including all its runs. Feed only `eligible` into adoption rows,
condition groups, and evaluator differences when connecting this boundary.
Matching identity is a prerequisite only; existing schema, condition and quality
checks must still run. Original metrics and quality remain unchanged in evidence.
The current identity must come from the intended adoption conditions, rather than
being inferred from the saved artifact. All three fields are required; invalid
current conditions fail before files are read or output is emitted.

This entrypoint reads explicit files only, writes no saved JSON, and performs no
measurement, network request, or website generation. CLI output includes the
original evidence; use sanitized measurement artifacts when sharing it.
