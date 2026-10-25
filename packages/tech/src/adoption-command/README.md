# Adoption command references

Small persistence/serialization boundary for local-inference adoption rows.
Persist `serializeAdoptionCommandRow(input)` rather than command text. After
reading JSON, call `parseAdoptionCommandRow(JSON.parse(saved))`, then
`resolveAdoptionCommand(row)` when generating output. Both adopted and rejected
rows preserve their public engine/model/fixture/runner conditions.

`local-inference.reproduce.v1` identifies a fixed command template, not an
execution or a digest of conditions. Never change its meaning in place: a changed
template needs a new explicitly supported ID. Missing/unknown IDs fail closed;
legacy command bodies are not interpreted. Unknown fields are discarded before
serialization, and condition validation runs on both save and resolution.
Errors contain fixed codes rather than rejected input values.

This module does not execute commands, read environment variables, or verify
that an arbitrary public identifier contains no secret. Callers must supply
public metadata only. The displayed `npm run local-inference` command follows
the proposed adoption-page contract in qmu/research#264; that runner is not on
main yet. This PR adds no runnable local-inference CLI and changes no published
page. Wiring this boundary into that pending runner/report is a follow-up after
the competing local-inference schemas are integrated. It is independent of the
condition-derived run IDs in qmu/research#268 and qmu/research#269.

`saveAdoptionCommandRow(input, path)` writes the normalized JSON with exclusive
creation (an existing row is never overwritten). `readAdoptionCommand(path)`
reads that artifact and returns the resolved display command; neither API
executes it. Validation failures occur before any file is created. The file
writer is not a replacement for the pending runner's crash-safe atomic store.
