# Local-inference peak-memory adoption table

This connects three things that existed only separately before this change —
a peak-memory reading's **unit**, its **missing-reason code**, and a
use-case **adoption ceiling** — into one comparison table, so a reader can
see at a glance not just "how much memory" but "does that memory footprint
rule this engine in or out for a given use case".

## Why this, and not a duplicate of an open PR

- qmu/research#211 normalizes a Strata community benchmark's whole-machine
  peak memory (`host_ram_peak` / `gpu_vram_peak`, unit `MiB`, with
  `NO-FIELD` / `MEASURE-FAILED` reason codes for a missing or invalid
  reading) and renders it as a comparison table — but that table has no
  adoption column; it only shows the reading itself.
- qmu/research#205 proposes per-use-case adoption thresholds
  (`interactive-coding-assistant`, `batch-document-summarization`,
  `edge-offline-device`) for speed, quality and a `peakRss` memory metric —
  but `peakRss` is explicitly **per-process** resident memory, its evaluator
  renders a separate text report, and it is not wired to any comparison
  table.
- Neither PR imports the other's unmerged code, and this one does not either
  (both are still open as of this writing). The gap neither closes is the
  **connection**: a table that shows a peak-memory reading's value, unit and
  missing reason, next to what that reading means for each use case.
  `domain/table.ts` here is that connection, built as its own small,
  independent module so it does not depend on either PR landing first.
- The ceiling values are **not** copied from #205's `peakRss` numbers,
  because the metric is different: #211's readings are **whole-machine**
  peaks from an external OS-level sampler (`/proc/meminfo`, `nvidia-smi`),
  not a single process's RSS, so they are structurally larger for the same
  hardware. `use-cases.json` here defines its own, wider ceilings for that
  reason, with its own stated rationale per use case, and is marked
  `"status": "proposed"` for the same reason #205's is: no real four-engine
  trial exists yet.

## What this module is (and is not)

- **Is**: a pure evaluator (`domain/evaluate.ts`) that checks an
  already-normalized peak-memory reading — present value + unit, or a
  missing value + reason, matching the common-JSON measurement shape used
  elsewhere in this topic — against a use case's host-RAM and GPU-VRAM
  ceilings (`use-cases.json`, loaded and validated by `domain/catalog.ts`),
  and a renderer (`domain/table.ts`) that joins a row of readings per engine
  with its per-use-case verdict into one deterministic Markdown table.
- A missing reading is never treated as a pass: it makes every use case's
  verdict `undetermined` unless the _other_ metric on that row already
  rejects it outright (one failing metric cannot be rescued by the other
  being missing). Only clearing every ceiling adopts.
- **Is not**: a measurement harness, a normalizer for any particular
  engine's output (that is #211's concern), or a general per-process memory
  policy (that is #205's `peakRss` concern). No CLI, model registration, or
  Web page change is included here.

## Files

- `use-cases.json` — hand-authored, reviewable ceilings per use case, with a
  `status`/`note` pair stating the proposal is not yet calibrated against a
  real trial.
- `domain/types.ts` — `PeakMemoryReading`, `MemoryUseCase`,
  `MemoryAdoptionVerdict`.
- `domain/catalog.ts` — loads and type-checks `use-cases.json`.
- `domain/evaluate.ts` — `evaluateMemoryAdoption`,
  `evaluateMemoryAdoptionForAllUseCases`: pure functions, no I/O.
- `domain/table.ts` — `renderMemoryAdoptionTable`: joins engine rows with
  their per-use-case verdict into one Markdown table.
- `fixtures/example-readings.json` — synthetic readings for three unmeasured
  engines plus qmu/research#211's fixture-derived Strata numbers, used by
  `domain/table.fixture.test.ts` as a worked example — not a measurement of
  any installed engine.

## Worked example (fixture data, not a measurement)

```ts
import fixture from "./fixtures/example-readings.json";
import { memoryUseCases } from "./domain/catalog";
import { renderMemoryAdoptionTable } from "./domain/table";

console.log(renderMemoryAdoptionTable(fixture.readings, memoryUseCases));
```

Over the committed fixture: `ollama`, `llama.cpp` and `mlx` show `(NOT-RUN)`
for both memory readings and `undetermined` for every use case, because
no four-engine trial has produced a reading yet. `strata`'s whole-machine
reading (46637.9 MiB host RAM, 31785.0 MiB GPU VRAM, replayed from
qmu/research#211's fixture) adopts for `batch-document-summarization`
(65536 / 49152 MiB ceilings) but rejects for both
`interactive-coding-assistant` and `edge-offline-device`, whose ceilings are
far tighter. Run `npm test -- src/local-inference-memory-adoption` to
reproduce this.

## Common inference JSON entrypoint

This continuation reuses qmu/research#215's policy and evaluator, adding the
previously missing `schemaVersion: 1` / `runs[].metrics` connection. It reads
`host_ram_peak` and `gpu_vram_peak`, validates finite nonnegative MiB values
and missing reasons, and never substitutes process `peak_rss`. Absent peaks
remain `NO-FIELD`. The table headers include each proposed ceiling.

From `packages/tech`:

```sh
node --import tsx/esm src/entrypoints/render-memory-adoption.ts common-result.json
```

The command reads the saved artifact and writes Markdown to stdout without
overwriting the measurement. Other envelope fields are left untouched; this
is a memory projection, not a full common-result schema validator.
