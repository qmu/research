# Strata adoption provenance

`domain/adoption-row.ts` is an independent API for recording a proposed adoption
decision with the engine, model, fixture, runner version, and target commit used
for reproduction. It does not run an evaluator or infer provenance from the
current checkout.

```ts
const row = createAdoptionRow("adopt", {
  engine: "engine-a",
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
