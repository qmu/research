# Stable reproduction conditions

`saveReproductionRun(directory, conditions)` generates a versioned SHA-256 ID
from `engine`, `model`, `fixture`, `runnerVersion`, and `targetCommit`, and saves
those fields with `runId` to `<directory>/<runId>.json`. The write publishes a
complete JSON file by atomic rename in the same filesystem. Concurrent or repeated
saves of identical conditions produce identical bytes and the same filename.

The ID identifies reproduction conditions, not an individual measurement attempt.
No timestamp, host, result, credential, or extra input field is included. The five
fields must be nonblank strings; `targetCommit` must be a full 40-character Git
SHA-1 and is normalized to lowercase. Other strings are preserved exactly. Use
immutable model/fixture identifiers when their contents can change.

From `packages/tech`, save an input JSON object containing those five fields:

```sh
node --import tsx/esm src/entrypoints/save-reproduction-run.ts conditions.json /tmp/reproduction-runs
```

The CLI prints the saved ID and path. Invalid input fails before creating output.
This is a standalone API; pending local-inference runner PRs can call it without
changing their measurement attempt IDs or result format.
