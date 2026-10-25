# Save-time run row uniqueness boundary

`saveUniqueRunRows(rows, save)` validates the **entire batch** before calling
the storage sink. The JSON CLI is the executable save boundary:

```sh
cd packages/tech
node --import tsx/esm src/entrypoints/save-unique-local-inference-run.ts run.json
```

The input is a JSON array. Each row must contain nonempty, unpadded string
`engine`, `model`, `fixture`, `runnerVersion`, and `targetCommit` identifiers.
Other fields (decision, reasons, measurements, run ID, etc.) are preserved. For
example:

```json
[
  {
    "engine": "strata",
    "model": "model-a",
    "fixture": "quality-v1",
    "runnerVersion": "runner-v1",
    "targetCommit": "a1b2c3d",
    "decision": "adopt"
  }
]
```

The identity is the exact, case-sensitive five-element tuple. A changed run ID,
decision or measurement does not make a repeated tuple unique. A change to any
of the five identifiers does. Tuple encoding avoids separator collisions.

Duplicates reject the whole artifact with `DUPLICATE-SAVE-ROW`. Malformed JSON,
a non-array batch or an invalid identity rejects with `INVALID-SAVE-IDENTITY`;
invalid identity takes precedence over duplicates. The CLI exits 1, emits only
that fixed reason on stderr and emits **zero stdout bytes**. It never includes
input data, paths or parser error details in failures. On success it emits the
complete array as JSON and exits 0. It does not modify input files.

For an in-process save path, call `saveUniqueRunRows` immediately before the
write, passing the writer as `save`. Do not write or append rows before that
call. The API preserves row order and does not mutate the input. Storage
failures are the sink's responsibility; this guard is not a file transaction or
a full run-identity/schema/provenance validator — only the five-key
duplicate-before-save check.

Because the function only ever calls `save` once, with the whole batch, after
every row has been checked, it never partially saves and never touches an
existing saved artifact on its own: wiring it in front of an existing save path
cannot alter or remove a comparison a prior save already wrote, only refuse a
new batch that would collide with it under the five-key identity.

The existing main branch has no local-inference run save path yet — this module
and CLI supply its explicit save-time boundary ahead of one landing, and connect
to no other unmerged PR. It is distinct from the open PRs closest to this
identity concern: qmu/research#241 (preflight before _comparison_, keyed on
`execution.runId` + `engine` + `execution.version`, no `model`/`fixture`/
`targetCommit`), qmu/research#263 (guard before _publication_, keyed on
`engine`/`model`/`fixture`/`runnerVersion`, no `targetCommit`), qmu/research#239
(excludes mismatched-`targetCommit` rows at _read/render_ time, not a save-time
reject), and qmu/research#237/#238 (atomicity and provenance of the save write
itself, not duplicate-identity rejection). Connecting a future save path
requires mapping its row shape into the five fields above and batching every
row destined for the same artifact before calling this guard.
