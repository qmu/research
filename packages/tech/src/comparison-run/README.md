# Atomic comparison runs

`saveComparisonRun(directory, conditions, command, measurements)` stores the
engine, model, fixture, runnerVersion, targetCommit, literal executable/argv, and
measurement object in **one JSON artifact**. The reproduction ID is the unchanged
`reproductionIdentity` implementation from qmu/research#269 (not yet on main).
The five conditions retain the same `repro-v1-…` hash; command/results do not
change that configuration ID. The identity source is reused verbatim.

A same-directory exclusive temporary file is written, fsynced and closed before
rename publishes `<runId>.json`; the directory is then fsynced. Publication is
atomic on a local filesystem supporting atomic rename and fsync. The old pair
remains visible until replacement. Concurrent saves use separate temporary files;
the last completed rename wins for a configuration. This is a latest-result
store, not a trial-history database. A directory-fsync error can occur after
publication and is reported to the caller; retrying is safe. Abrupt process
termination may leave `.tmp` files, which are never admitted.

`loadAdoptionRuns(directory)` is the admission boundary for downstream adoption
calculations. It ignores temporary names, truncated JSON, legacy bare measurements,
incomplete status, wrong schema, changed conditions/ID, mismatched filenames, and
manifest/results checksum mismatch. It returns only validated complete pairs.
A checksum detects inconsistency, not malicious modification. Missing directories
and unexpected I/O errors throw. Metric thresholds and engine-specific metric
validation belong to the caller; no adoption verdict is inferred from missing
metrics. This API does not wire unmerged runner/adoption PRs into the site.

Supply nonempty JSON measurements (missing metrics can be explicit `null`) and
credential-free argv/conditions: this API persists arguments literally, does not
read environment variables, and never executes commands. Non-finite numbers and
non-JSON measurement values are rejected rather than silently lost.

From `packages/tech`, save an existing measurement input:

```sh
node --import tsx/esm src/entrypoints/save-comparison-run.ts input.json output/runs
```

`input.json`:

```json
{
  "conditions": {
    "engine": "ollama",
    "model": "model@v1",
    "fixture": "fixture@v1",
    "runnerVersion": "1.0.0",
    "targetCommit": "0123456789abcdef0123456789abcdef01234567"
  },
  "command": ["node", "runner.js", "--fixture", "fixture@v1"],
  "measurements": { "tokensPerSecond": 23, "peakRssBytes": null }
}
```

Consumers must import `loadAdoptionRuns` instead of reading arbitrary JSON files:

```ts
import { loadAdoptionRuns } from "./store";
const eligible = await loadAdoptionRuns("output/runs");
// Apply metric validation and adoption thresholds to eligible records only.
```
