# Strata adoption provenance

`domain/adoption-row.ts` is an independent API for recording a proposed adoption
decision with the engine, model, fixture, runner version, and target commit used
for reproduction. It does not run an evaluator or infer provenance from the
current checkout.

```ts
const row = createAdoptionRow("adopt", {
  engine: "strata",
  model: "model-a",
  fixture: "fixture-a",
  runnerVersion: "1.0.0",
  targetCommit: "0123456789abcdef",
});
```

Each field must be an explicit, nonblank string. Missing or malformed provenance
produces `decision: "undetermined"` and `reason: "missing-required-provenance"`;
it cannot retain an adoption decision. Valid supplied values are copied verbatim.
The API checks presence, not whether a referenced model, fixture, version, or
commit actually exists. A complete row preserves the caller's decision; it does
not establish that a quality threshold was met.

`vendors/strata-adoption/json-file.ts` exports `saveAdoptionRow(path, decision,
provenance)` and `loadAdoptionRow(path)`. Saving validates the row, then writes
UTF-8 JSON to a new file; the parent directory must exist. An existing path is
rejected without overwriting its artifact. Loading revalidates provenance, so an
incomplete saved `adopt` row becomes `undetermined`. Invalid JSON, unknown
decisions, and filesystem errors reject the operation. The returned promise
resolves only after the file write completes.

```ts
const saved = await saveAdoptionRow("adoption.json", "adopt", provenance);
const restored = await loadAdoptionRow("adoption.json");
```

This API is independent of adoption adapters, quality strata, reproduction IDs,
and command IDs. Callers supply their evaluation decision and explicit provenance;
there is no CLI or UI integration.
