# Reproduction identity

`createReproductionRecord` derives a versioned SHA-256 ID from the ordered tuple
`engine, model, fixture, runnerVersion, targetCommit`. Supply immutable model and
fixture identifiers (for example artifact digests), the runner's version, and a
full Git SHA. A mutable model tag alone does not identify model bytes. Git SHA
letter case is normalized; other values are exact and must be nonempty without
leading/trailing whitespace. This ID identifies conditions, not individual runs.

`saveReproductionRecord(directory, conditions)` saves those five conditions and
`reproductionId` as `<directory>/<reproductionId>.json`, returning the record.
It drops extra metadata, accepts an identical existing record, and refuses to
overwrite different or corrupt contents. Callers must supply non-secret condition
identifiers; hashing is not secret redaction. Measurement runners can save this
record and attach the returned ID to each execution. No unmerged runner PR is
required, and existing report artifacts are unchanged.
