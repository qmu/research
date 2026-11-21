# Unique adoption publication boundary

`publishUniqueAdoptionRows(rows, publish)` validates the **entire batch** before
calling the output sink. The JSON CLI is the executable publication boundary:

```sh
cd packages/tech
node --import tsx/esm src/entrypoints/publish-unique-adoption.ts adoption.json
```

The input is a JSON array. Each row must contain nonempty, unpadded string
`engine`, `model`, `fixture`, and `runnerVersion` identifiers. Other fields
(decision, reasons, measurements, run ID, commit, etc.) are preserved. For example:

```json
[
  {
    "engine": "strata",
    "model": "model-a",
    "fixture": "quality-v1",
    "runnerVersion": "runner-v1",
    "decision": "adopt"
  }
]
```

The identity is the exact, case-sensitive four-element tuple. A changed run ID,
commit, decision or measurement does not make a repeated tuple unique. A change
to any of the four identifiers does. Tuple encoding avoids separator collisions.
Use stable model/fixture identifiers, including their version when appropriate;
this boundary does not infer aliases or model conditions from display labels.

Duplicates reject the whole artifact with `DUPLICATE-ADOPTION-ROW`. Malformed
JSON, a non-array batch or an invalid identity rejects with
`INVALID-ADOPTION-IDENTITY`; invalid identity takes precedence over duplicates.
The CLI exits 1, emits only that fixed reason on stderr and emits **zero stdout
bytes**. It never includes input data, paths or parser error details in failures.
On success it emits the complete array as JSON and exits 0. It does not modify
input files. Redirect successful stdout through a temporary file and rename it
only on success; ordinary shell redirection can truncate an existing destination
before validation runs.

For Markdown or another output format, call the domain API immediately before
rendering/writing, passing the renderer as `publish`. Do not render or append rows
before that call. The API preserves row order and does not mutate the input.
Output sink failures are the sink's responsibility; this guard is not a file
transaction or a full adoption schema/provenance/quality validator.

The existing main branch has no local-inference adoption publication renderer.
This module and CLI supply its explicit boundary without importing contracts from
unmerged comparison or snapshot-publication PRs. Connecting those future callers
requires mapping their verified identities into these four fields and batching
all rows destined for the same artifact. Passing an identity check alone is not
permission to treat unverified measurements as adoption evidence.
