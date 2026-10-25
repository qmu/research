# Local inference JSON preflight

Run from `packages/tech` (Node 22, npm 10.9):

```sh
npm run local-inference:validate -- src/local-inference/fixtures/comparison.json
npm run local-inference:render -- src/local-inference/fixtures/comparison.json /tmp/comparison.md
# Omit the output path to print Markdown to stdout.
```

Both commands read the entire JSON through `readInferenceReport` and the same
`parseInferenceReport` validator before rendering or opening an output file.
Validation succeeds silently with exit code 0. Invalid JSON, an unreadable input,
an unsupported schema version, invalid metrics or duplicate run IDs cause a
nonzero exit and a diagnostic on stderr. Rendering rejects these inputs without
printing a table, creating a comparison file or changing an existing comparison.
An existing file is preserved, so callers must check the exit code rather than
interpret a previous comparison as the result of a failed run.

The output must refer to a different file from the input JSON. Rendering rejects
the same path, relative aliases, symbolic links and hard links to the input before
opening the output, preserving the JSON for subsequent validation and rendering.
This guard checks file identity at invocation time; it does not protect against
another process replacing paths concurrently.

The version 1 table format contains `schemaVersion: 1`, a `fixture` boolean and a
`runs` array. Each run requires nonblank `id`, `backend`, `model`, `quantization`,
`hardware` and `condition` strings, plus `speed` and `quality` metrics. IDs are
unique. Speed is nonnegative and finite; quality is in [0, 1]. A metric is either
`{ "value": 0 }` (or another valid number) or `{ "value": null, "reason": "NOT-RUN" }`.
The allowed gap reasons are `NO-FIELD`, `NOT-STATED`, `NOT-EXPOSED`, `NOT-LOADABLE`,
`NOT-COMPARABLE` and `NOT-RUN`. A numeric metric must not carry a gap reason.

This is the table interchange format from qmu/research#185. The renderer, parser
and synthetic fixture are reused from that PR; the validator is extracted into a
shared domain module, and both CLI entrypoints share the read/validation step.
It is distinct from the measurement artifact proposed in qmu/research#183 and the
legacy model-comparison artifacts in qmu/research#192; a matching version number
alone does not make those formats interchangeable. No engines or paid APIs are
called, and no published report pages are changed.
