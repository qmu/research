# Runner engine membership before publication

`publishKnownEngineRows(rows, runnerDefinition, publish)` validates an entire
adoption comparison batch before invoking its publication callback once. An
engine absent from the separately supplied runner definition rejects the entire
batch with `UNKNOWN-ADOPTION-ENGINE`, including when the unknown row is not adopted
or follows valid rows. No partial batch reaches the callback. Input objects and
row order are preserved; asynchronous sink failures propagate to the caller.

The runner definition is `{ "engines": ["ollama", "llama.cpp", "mlx", "strata"] }`.
The caller must obtain it from the trusted runner configuration for the relevant
execution, **not derive it from artifact rows**. This module does not authenticate
the definition or maintain a second hard-coded engine registry. Identifiers use
case-sensitive exact matching; aliases and whitespace are not normalized.

Reason precedence is independent of row order:

1. `INVALID-RUNNER-DEFINITION`: missing/non-array/empty engine list, duplicate
   definitions, non-string/empty/padded identifiers.
2. `INVALID-ADOPTION-ENGINE`: non-array artifact, non-object row, or
   missing/non-string/empty/padded `engine`.
3. `UNKNOWN-ADOPTION-ENGINE`: a well-formed identifier absent from the definition.

Empty batches, subsets, and repeated known engines are allowed. Other identity,
provenance, duplicate-row and quality checks are separate responsibilities.
Validation reasons contain no input identifiers, paths, or underlying errors.

## JSON CLI

From `packages/tech`:

```sh
node --import tsx/esm src/entrypoints/publish-known-engine-adoption.ts runner.json adoption.json
```

`runner.json` contains the definition above; `adoption.json` is an array such as
`[{"engine":"mlx","adopted":true}]`. Success writes the full array as JSON to
stdout and exits 0. Rejection writes only a fixed reason to stderr, writes zero
bytes to stdout, and exits 1. Invalid argument counts use
`INVALID-ENGINE-GUARD-ARGUMENTS`. Unreadable or malformed JSON maps to the relevant
runner/artifact reason. Files are read only; the CLI never launches a runner.

Do not redirect stdout directly over an existing published artifact: the shell
truncates it before validation. Stage output in a temporary file, then replace
the published artifact only after exit 0, or use the API to gate your own sink.
The callback's atomicity and the safety of fields other than `engine` remain the
caller's responsibility.

## Integration boundary

Main has no local-inference adoption publication pipeline yet. This is an
independently executable boundary; existing production publication is not
implicitly protected. Future callers must pass the complete comparison batch
and its trusted runner engine list immediately before their publication sink.

This change does not depend on unmerged qmu/research#183 (runner),
qmu/research#263 (duplicate adoption identities), or qmu/research#265 (duplicate
save identities). When those APIs are integrated, apply all required guards
before any write. `validateAdoptionEngines` is also available as a pure check.
