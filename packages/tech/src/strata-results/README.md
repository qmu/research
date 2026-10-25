# Saved Strata execution results

This persistence boundary saves one supplied Strata execution's speed, quality,
whole-machine peak memory and fixed-tier headroom together. It does not execute
Strata or collect measurements. All values in the example below are synthetic.

```ts
import {
  saveStrataResult,
  loadStrataResult,
} from "../vendors/strata-results/json-file.js";

await saveStrataResult("new-result.json", {
  model: "fixture-model",
  fixedTier: { id: "fixture-16GiB", capacityMiB: 16384 },
  speed: { value: 20, unit: "tokens/s", tierId: "fixture-16GiB" },
  quality: { value: 0.8, unit: "fraction", tierId: "fixture-16GiB" },
  peakMemory: { value: 12288, unit: "MiB", tierId: "fixture-16GiB" },
  adoption: "adopt",
});
const result = await loadStrataResult("new-result.json");
// result.memoryHeadroom.value === 4096 (MiB)
```

The caller declares the fixed tier, using capacity in MiB; this API does not
infer a commercial tier from OS memory totals. Every reading must identify that
same tier. The caller is responsible for measuring all three axes on that tier
and for providing a whole-machine peak, rather than substituting process RSS.
The API checks declared identities, not the physical measurement environment.

Headroom is capacity minus peak, retaining negative results. A caller-requested
`adopt` survives only with finite, nonnegative speed, quality in [0, 1], and
known nonnegative headroom. Missing, invalid or mismatched-tier readings become
null with `NO-FIELD` or `MEASURE-FAILED`; explicit `NO-FIELD`, `MEASURE-FAILED`,
and `NOT-RUN` reasons are preserved. Unknown readings produce `undetermined`
before either adoption or rejection; known insufficient capacity produces
`reject`. A complete caller rejection is retained. Zero headroom satisfies this
capacity-only gate; no operational safety reserve or speed/quality threshold is
implied. Other adoption criteria remain the caller's responsibility.

The JSON format has `schemaVersion: 1` and `engine: "strata"`. Saves normalize
inputs and create new files exclusively. Loads validate version/engine and
recompute headroom/adoption, so stored derived fields cannot override missing
readings. Only the declared fields are persisted; stdout, generated text,
endpoints and arbitrary extra fields are omitted. I/O and JSON errors propagate.

Main currently has no Strata execution runner. This API is an integration point
for its caller, not a new CLI or a real benchmark run. It adds only persistence
and the capacity gate: PR #271 owns tier bucketing and Markdown rendering;
#219 owns common-JSON adoption tables; #209 and #183 own execution runners;
#273 owns required provenance. No unmerged implementation is copied here.
