# Requests after snapshot acquisition fails

The snapshot preparation CLI can emit a remeasurement request when the original
artifact is unreadable, malformed, or no longer matches the pinned identity:

```sh
cd packages/tech
node --import tsx/esm src/entrypoints/prepare-local-inference-remeasurement.ts \
  --request-on-failure \
  snapshot-one 1111111111111111111111111111111111111111 local-inference/2 \
  snapshot.json
```

The identifiers above are synthetic. Supply the run ID, full lowercase commit
SHA, and supported runner version captured by the trusted comparison entry. The
CLI does not discover them from a failed snapshot, `latest`, or the checkout.
Missing/invalid caller identifiers and extra arguments return exit code 1 with
no stdout, even with the option enabled.

| Exit | stdout                                              | Meaning                                                |
| ---- | --------------------------------------------------- | ------------------------------------------------------ |
| 0    | Existing preparation plan                           | Snapshot identity matched; no recovery request         |
| 1    | Empty                                               | Invalid invocation, or failure without the option      |
| 2    | `kind: "remeasurement-request"`, `schemaVersion: 1` | Snapshot acquisition failed; a request can be reviewed |

The request contains a fixed `reason`:

- `SNAPSHOT-READ-FAILED`: the original file could not be read.
- `SNAPSHOT-JSON-INVALID`: its text could not be parsed as JSON.
- `SNAPSHOT-IDENTITY-MISMATCH`: the existing snapshot identity guard rejected it.

`source` contains only the **caller-pinned** `runId`, `targetCommit`, and
`runnerVersion`, unchanged. It is not a claim that the failed artifact's identity
was verified. An artifact carrying a different commit or runner never overrides
these values. Both `requiresNewExecutionId` and `requiresNewArtifact` are `true`.
No saved metrics, paths, raw exceptions, commands or other artifact fields enter
the request. The original file is never written or repaired.

Exit 2 remains a failed snapshot acquisition; consumers must not interpret the
request as a successful download, comparison input, or adoption decision. This
CLI prints JSON only: it does not enqueue an external job, run inference, switch
checkouts, or replace a runner. A downstream executor must independently obtain
the exact pinned checkout and runner, restore the original measurement conditions
from trusted evidence, and save new execution evidence separately. If those
conditions cannot be recovered, leave the request unexecuted. Do not change its
target to a newer commit or runner to make it executable.

The recovery option is opt-in. Existing callers retain their success output and
fail-closed behavior. The comparison website and the independent download CLI are
not automatically connected to this request producer.
