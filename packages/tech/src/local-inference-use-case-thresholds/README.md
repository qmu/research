# Local-inference use-case adoption thresholds

This is a design/policy slice for the local-inference comparison work
(qmu/research#176, #179, #183), not a measurement harness and not a published
research topic. It answers a question none of the harness PRs answer yet: once
the four engines (`ollama`, `llama.cpp`, `mlx`, `strata`) have comparable
speed, quality and memory numbers, how should a reader decide which engine to
adopt for a given use case?

## Why per use case, not one ranking

A single global ranking of the four engines hides the actual decision a reader
faces: an engine that is best for an unattended overnight batch job (favor
quality, memory is cheap) can be the wrong choice for an interactive coding
assistant (favor latency, quality only needs to clear a floor), and both can be
wrong for a memory-constrained edge device. `use-cases.json` encodes three such
use cases, each with its own pass/fail boundary per metric — adoption is
decided per (use case, engine) pair, never once for all of them.

## Status: proposed, not calibrated

**No real measured common-result trial of the four engines exists yet** — as
of this writing, `packages/tech/src/local-inference` itself has not merged to
`main` (qmu/research#183 is still open), and even once it has, `peak_rss` is
explicitly `NOT-RUN` in its measurement contract (process memory of an
external engine is a separate instrumentation problem from one streamed HTTP
request). The numeric thresholds in `use-cases.json` are therefore a **design
proposal for review**, written to the best current judgment of what each use
case needs — not a conclusion drawn from data. `use-cases.json`'s own
`status`/`note` fields say this in the machine-readable artifact itself, so a
consumer cannot mistake the thresholds for a measured verdict. Recalibrate
every threshold against a real trial's common JSON before publishing any
adoption claim, and bump `schemaVersion` if the rule shape changes.

## What this module is (and is not)

- **Is**: a pure evaluator (`domain/evaluate.ts`) that reads a per-engine
  metric reading — already shaped as `{ value, unit }` or `{ value: null,
  reason }`, mirroring the common-JSON measurement contract so it can consume
  that JSON once a real trial exists — and checks it against a use case's
  threshold rules (`domain/types.ts`, `domain/catalog.ts`). A missing reading
  is never treated as a pass: one `fail` rejects outright, and absent a fail,
  any `undetermined` reading keeps the whole verdict `undetermined`. Only
  all-rules-pass adopts.
- **Is not**: a measurement harness (that is #183's `local-inference`), a
  fingerprint/consistency check binding a quality judgment to its exact
  environment and model condition (that is #199's `local-inference-adoption`),
  or a general-purpose bench-spec evaluator (that is #171/#174/#175's
  `bench-spec`, which this intentionally does not import, to stay mergeable
  to `main` independently of that unmerged stack).

## Files

- `use-cases.json` — the hand-authored, reviewable source of truth: three use
  cases, each with one rule per metric (`ttft`, `tps`, `quality`, `peakRss`),
  stating the metric's direction, unit, threshold, optional tolerance and the
  rationale for that boundary.
- `domain/types.ts` — the shared vocabulary (`Engine`, `MetricId`,
  `MetricReading`, `ThresholdRule`, `UseCase`, `AdoptionVerdict`, ...).
- `domain/catalog.ts` — loads and type-checks `use-cases.json`.
- `domain/evaluate.ts` — `evaluateRule`, `evaluateAdoption`,
  `evaluateAllEngines`: pure functions, no I/O.
- `domain/readings.ts` — parses an untrusted `{ readings: { <engine>: {
  <metric>: MetricReading, ... }, ... } }` document (the shape a real
  common-JSON trial would produce) into the typed input the evaluator takes.
- `domain/report.ts` — renders a use case's per-engine verdicts as plain text.
- `fixtures/example-metrics.json` — synthetic readings for all four engines,
  clearly marked `"fixture": true`; not a measurement of any installed engine.

## Running it

```sh
cd packages/tech
npm run local-inference-thresholds
```

With no arguments this evaluates the committed fixture against all three use
cases and prints a verdict table per use case. Pass a real common-JSON
readings file (once one exists) and, optionally, a use case id to narrow the
output:

```sh
npm run local-inference-thresholds -- /path/to/readings.json edge-offline-device
```

## Worked example (fixture data, not a measurement)

Over the committed fixture, the three use cases pick three different winners —
the point of deciding per use case rather than by one ranking:

- `interactive-coding-assistant`: `ollama`, `llama.cpp` and `mlx` adopt;
  `strata`'s 3.2s time-to-first-token rejects it.
- `batch-document-summarization`: only `mlx` clears the 0.9 quality floor.
- `edge-offline-device`: only `strata` fits the 4 GiB memory ceiling.

Run `npm run local-inference-thresholds` to reproduce this table locally.
