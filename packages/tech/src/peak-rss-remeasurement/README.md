# Peak RSS remeasurement requests

`domain/request.ts` is a pure boundary for converting the fixed missing reasons
`NOT-RUN`, `NO-FIELD`, and `MEASURE-FAILED` into a request bound to the original
commit, runner version and fixture. It also preserves engine, model and source
run ID. A request is not a successful measurement or an adoption decision.

## CLI

Run from the repository root (paths in `ARGS` are relative to `packages/tech`):

```sh
make peak-rss-remeasurement ARGS='/tmp/expected.json /tmp/snapshot.json'
```

The direct entrypoint exposes the following exit statuses (`make` reports any
nonzero CLI status as a failed target):

```sh
cd packages/tech
node --import tsx/esm src/entrypoints/prepare-peak-rss-remeasurement.ts \
  /tmp/expected.json /tmp/snapshot.json
```

- `2`: stdout contains a `peak-rss-remeasurement-request` JSON object.
- `0`: stdout is `null`, because a finite, positive RSS is already present.
- `1`: empty stdout and fixed stderr `PEAK-RSS-REQUEST-REJECTED`.

`expected.json` must come from the trusted comparison context, independently of
the saved measurement. Do not populate it by copying untrusted snapshot fields:

```json
{
  "runId": "example-run-1",
  "engine": "mlx",
  "model": "example-model",
  "fixture": "fixture-v1",
  "runnerVersion": "runner-v1",
  "targetCommit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

The synthetic `snapshot.json` wraps the same identity and a memory reading:

```json
{
  "source": {
    "runId": "example-run-1",
    "engine": "mlx",
    "model": "example-model",
    "fixture": "fixture-v1",
    "runnerVersion": "runner-v1",
    "targetCommit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  },
  "metrics": {
    "peak_rss": { "value": null, "unit": "MiB", "reason": "NO-FIELD" }
  }
}
```

All six identity fields must match exactly. A commit must be a full lowercase
40-character SHA; other identifiers must be nonempty bounded tokens. Missing
identity, different fixture/runner/commit, unsupported units, unknown reasons,
invalid numbers and contradictory value/reason pairs are rejected. The boundary
neither guesses identity from HEAD nor converts invalid input into missing data.
Only allowlisted fields are copied; raw diagnostics, commands and paths are not
included in requests. Callers must use public identifiers, not secrets.

The request retains the **source** run ID and sets `requiresNewRunId` and
`requiresNewArtifact`. A consumer must allocate a fresh run ID and artifact,
preserve the pinned measurement conditions, and enforce its own authorization,
runner registry and scheduling rules. This CLI does not execute inference,
submit external jobs, write artifacts or provide deduplication/persistence.

## Integration boundary

At implementation time `origin/main` contains no local inference runner or
snapshot recovery API. This module is therefore independently callable, not
wired into a product page. Its `metrics.peak_rss` shape matches the proposed
process runner in qmu/research#278. That runner's artifact lacks the complete
identity; a trusted integration must supply and verify provenance before using
this wrapper. Acquisition diagnostics such as `TIMEOUT` and `UNSUPPORTED-HOST`
are not accepted as metric reasons. No unmerged runner implementation is copied.

Tests use synthetic inputs only; no Apple Silicon measurement is claimed.
