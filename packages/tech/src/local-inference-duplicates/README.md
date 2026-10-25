# Validated comparison command handoff

This CLI builds on qmu/research#241's `preflightUniqueInference`. It reads all
saved JSON inputs and validates the entire batch before starting a renderer.
Duplicate `(execution.runId, runs[].engine, execution.version)` tuples exit 1
with exactly `DUPLICATE-INFERENCE-ROW` on stderr. No renderer is started, so its
output files are neither created nor overwritten. Inputs are never written.
`execution.version` means the saved execution generation; it is not inferred
from schema version, runner version, or condition metadata.

From `packages/tech`:

```sh
node --import tsx/esm src/entrypoints/preflight-local-inference.ts \
  saved-a.json saved-b.json -- node render-from-stdin.cjs comparison.md
```

The command after `--` receives one JSON array of the validated artifacts over
stdin. Its arguments are passed directly, without a shell. The renderer must
consume this snapshot rather than reopen the original paths, and still perform
its full schema, provenance, condition and metric checks before writing a page.
Only the child renderer owns output paths. This command does not adapt existing
path-based comparison CLIs automatically; those need a stdin adapter first.

Missing/invalid identities preserve `INVALID-INFERENCE-IDENTITY`. Read, JSON,
argument and renderer startup failures return `INFERENCE-PREFLIGHT-FAILED`
without input values or paths. A started renderer inherits stdout/stderr and
its nonzero exit status is preserved; it must sanitize its own diagnostics and
handle output atomicity. There is no rollback of files written by a renderer.

Tests use synthetic JSON and a local child command; no inference engine is run.
They verify that duplicate or unreadable inputs never start the renderer, output
files survive rejection, valid snapshots arrive intact, and renderer failures
propagate. This is the command integration layer, not another duplicate checker.
