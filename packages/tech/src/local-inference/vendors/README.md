# Recorded Strata peak memory

`normalizeStrataMemory` accepts one parsed **`memory-summary.json`** record,
produced by a Niko1221/Strata community benchmark run's external host sampler
(`/proc/meminfo` and `nvidia-smi`, polled about once per second for the whole
run). It returns JSON-safe `host_ram_peak` and `gpu_vram_peak` measurements
(`value`, `unit`, and `source` or `reason`), suitable for attaching to a
common inference result's metrics. It performs no network or model calls, and
does not read the engine's own API responses or per-request timing data.

```ts
import { normalizeStrataMemory } from "./strata-memory";

const peaks = normalizeStrataMemory(JSON.parse(summaryText));
const json = JSON.stringify({ engine: "strata", metrics: peaks });
```

- `host_ram_peak` comes from `ram_peak_GiB`, converted to MiB (`x 1024`).
- `gpu_vram_peak` comes from `gpu_peak_MiB` unchanged.

Both have unit `MiB` and source `host-sampler`, distinct from the `engine` /
`client` / `usage` sources used elsewhere in this directory: these two
readings are **whole-machine peaks from an external OS-level sampler**, not a
value the inference engine reported about itself. `host_ram_peak` is
`MemTotal - MemAvailable` at its highest sample — it includes every other
process on the machine and is explicitly not a single process's RSS.
`gpu_vram_peak` is the highest system-wide VRAM reading on the sampled GPU,
not an engine-attributed allocation. See
[fixture provenance](./fixtures/README.md) for the pinned measured source.

Missing fields become `{ value: null, unit: "MiB", reason: "NO-FIELD" }`.
Negative, nonfinite or nonnumeric readings become `MEASURE-FAILED`; a measured
zero is preserved. The two readings are independent: an invalid or missing
value in one does not affect the other. `swap_peak_MiB` and the sampler's own
`samples` / `sample_duration_s` / `sampling_method` metadata are intentionally
not normalized here; they describe the sampling run, not a memory peak, and
are out of scope for this adapter.

`memory-comparison-table.ts` renders normalized readings — from this adapter
or any other source using the same `StrataMemoryMeasurement` shape — as a
deterministic Markdown table, one row per engine, so a peak-memory reading
has somewhere to be compared once more engines are measured:

```ts
import { renderMemoryComparisonTable } from "./memory-comparison-table";

renderMemoryComparisonTable([
  { engine: "strata", hostRamPeak: peaks.host_ram_peak, gpuVramPeak: peaks.gpu_vram_peak },
]);
```

A missing or failed reading renders its reason code instead of a number (e.g.
`(NO-FIELD)`); a measured zero renders as `0.0 MiB`. Row order is the
caller's; cell text is escaped so an engine name cannot break the table.

Run from `packages/tech`:

```sh
npm test -- src/local-inference/vendors/strata-memory.test.ts src/local-inference/vendors/memory-comparison-table.test.ts
```

These existing PRs were checked before writing this change: qmu/research#206
normalizes the same bench's **speed** fields (`prompt_tps` / `generation_tps`)
from a different, per-request file (`outputs.jsonl`); it does not cover
memory, and this addition does not import it. qmu/research#183's
`local-inference` measurement harness and qmu/research#205's
`local-inference-use-case-thresholds` (which names a `peakRss` metric,
currently `NOT-RUN` for all four engines) describe the common-JSON shape this
adapter's output is meant to slot into, but neither is merged, so this
addition stays standalone and does not import either. qmu/research#185's
comparison-table renderer works from a different, already-assembled common
JSON file and is also unmerged; `memory-comparison-table.ts` here is a
narrower, independent renderer scoped to this adapter's two readings, not a
replacement for it. No CLI, model registration, or Web page changes are
included here.
