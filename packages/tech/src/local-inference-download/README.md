# Comparison snapshot download boundary

From `packages/tech`, download one explicitly selected saved inference artifact:

```sh
node --import tsx/esm src/entrypoints/download-local-inference.ts \
  saved.json run-123 aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa local-inference/4
```

The three expected identifiers must come from the trusted comparison snapshot
that offered the download. Do not derive them from the file being downloaded,
`latest`, the current checkout, or unvalidated request parameters. All are required:

- `execution.runId`: 1–128 ASCII letters, digits, dots, underscores or hyphens,
  starting with a letter or digit.
- `execution.targetCommit`: the exact full 40-character lowercase commit SHA.
- `execution.runnerVersion`: exactly `local-inference/2`, `local-inference/3`,
  or `local-inference/4`. New contracts require explicit review and tests.

The CLI validates the expected identity before opening the file, reads the source
once, and compares all three identifiers without trimming or substitution. Success
is exit 0 with the original validated UTF-8 JSON text as stdout, including its
formatting and newline. A file changed after that read cannot change this response:
there is no second open, redirect to the original path, or subsequent streaming
from the path. The source file is never written by this command.

Missing identifiers, mismatch, unknown runner, malformed JSON, invalid envelope
(object with an object execution and an array of runs), read errors, or invalid
arguments return exit 1, empty stdout and only `DOWNLOAD-SNAPSHOT-REJECTED` on
stderr. Diagnostics contain no source path, identifier value, input body or stack.
Legacy records must be remeasured; do not relabel their provenance to pass.

`verifiedDownloadSnapshot(text, expected)` exposes the same pure boundary to a
future HTTP adapter. Validate fully before sending response headers/body and send
its returned text; never reopen the original file after checking it. Success
preserves the artifact contents, so only publish artifacts intended for the
recipient. Identity matching is not cryptographic authenticity, a complete metrics
schema check, a duplicate-row check, or a quality/adoption decision.

This is an independent download CLI, not a new Web route or an automatic change
to existing report commands. qmu/research#240 handles adoption reads,
qmu/research#243 hands snapshots to comparison commands, qmu/research#245 reads
comparison diffs, and qmu/research#246 pins remeasurement links. This module
changes none of those pending files and imports none of their implementations.
