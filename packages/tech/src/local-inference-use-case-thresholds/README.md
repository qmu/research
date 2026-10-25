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
assistant (favor latency, quality only needs to clear a floor), and both can
be wrong for a memory-constrained edge device. `use-cases.json` encodes three
such use cases, each with its own pass/fail boundary per metric — adoption is
decided per (use case, engine) pair, never once for all of them.

## Status: proposed, not calibrated

**No real measured common-result trial of the four engines exists yet.** As of
this writing, `packages/tech/src/local-inference` itself has not merged to
`main` (qmu/research#183 is still open), and even once it has, `peak_rss` is
explicitly `NOT-RUN` in its measurement contract (process memory of an
external engine is a separate instrumentation problem from one streamed HTTP
request). The numeric thresholds in `use-cases.json` are a design proposal for
review, written to the best current judgment of what each use case needs, not
a conclusion drawn from data. `use-cases.json`'s own `status` and `note`
fields say this in the machine-readable artifact itself, so a consumer cannot
mistake the thresholds for a measured verdict. Recalibrate every threshold
against a real trial's common JSON before publishing any adoption claim, and
bump `schemaVersion` if the rule shape changes.

## What this module is (and is not)

- Is: a pure evaluator (`domain/evaluate.ts`) that reads a per-engine metric
  reading, already shaped per the common-JSON measurement contract as either
  a present value with a unit, or a missing value with a stated reason, and
  checks it against a use case's threshold rules (`domain/types.ts`,
  `domain/catalog.ts`). A missing reading is never treated as a pass: one
  rule failure rejects outright, and absent a failure, any undetermined
  reading keeps the whole verdict undetermined. Only all-rules-pass adopts.
- Is not: a measurement harness (that is #183's `local-inference`), a
  fingerprint/consistency check binding a quality judgment to its exact
  environment and model condition (that is #199's
  `local-inference-adoption`), or a general-purpose bench-spec evaluator
  (that is #171/#174/#175's `bench-spec`, which this intentionally does not
  import, to stay mergeable to `main` independently of that unmerged stack).

## Files

- `use-cases.json` — the hand-authored, reviewable source of truth: three use
  cases, each with one rule per metric (`ttft`, `tps`, `quality`,
  `peakRss`), stating the metric's direction, unit, threshold, optional
  tolerance and the rationale for that boundary.
- `domain/types.ts` — the shared vocabulary: `Engine`, `MetricId`,
  `MetricReading`, `ThresholdRule`, `UseCase`, `AdoptionVerdict`, and more.
- `domain/catalog.ts` — loads and type-checks `use-cases.json`.
- `domain/evaluate.ts` — `evaluateRule`, `evaluateAdoption` and
  `evaluateAllEngines`: pure functions, no I/O.
- `domain/readings.ts` — parses an untrusted readings document (the shape a
  real common-JSON trial would produce) into the typed input the evaluator
  takes.
- `domain/report.ts` — renders a use case's per-engine verdicts as plain text.
- `fixtures/example-metrics.json` — synthetic readings for all four engines,
  explicitly marked as a fixture; not a measurement of any installed engine.

## Running it

```sh
cd packages/tech
npm run local-inference-thresholds
```

With no arguments this evaluates the committed fixture against all three use
cases and prints a verdict table per use case. Pass a real common-JSON
readings file, once one exists, and optionally a use case id to narrow the
output:

```sh
npm run local-inference-thresholds -- /path/to/readings.json edge-offline-device
```

## Worked example (fixture data, not a measurement)

Over the committed fixture, the three use cases pick three different winners,
which is the point of deciding per use case rather than by one ranking:

- `interactive-coding-assistant`: `ollama`, `llama.cpp` and `mlx` adopt;
  `strata`'s 3.2s time-to-first-token rejects it.
- `batch-document-summarization`: only `mlx` clears the 0.9 quality floor.
- `edge-offline-device`: only `strata` fits the 4 GiB memory ceiling.

Run `npm run local-inference-thresholds` to reproduce this table locally.

## Fixture quality gate from saved common JSON

`npm run local-inference-quality-adoption -- --commit <full-target-sha> baseline.json current.json [use-case-id]`
reads two schemaVersion 1 common inference JSON files. It uses the existing
quality diff's engine/model identity, input hash, fixture hash and evaluator
version checks. Metrics (`ttft`, `tps`, `peak_rss`) come from the same current
run; quality ratio is the fraction of current fixed judgments that pass.
Missing or undetermined judgments do not become zero or a pass.

Every current row, including Strata, first requires saved
`execution.runnerVersion` and `execution.targetCommit`. The caller supplies an
independently resolved lowercase 40-character target SHA. Missing commit metadata
produces `MISSING-COMMIT`; a different saved SHA produces `COMMIT-MISMATCH`.
Malformed saved or requested SHAs reject the whole command before output.

The runner checker is reused unchanged from qmu/research#244 at
`local-inference-adoption/domain/runner-version.ts`. Only `local-inference/2`,
`local-inference/3` and `local-inference/4` are recognized. Missing, null, empty or
whitespace-only values produce `MISSING-RUNNER-VERSION`; unsupported strings and
non-string values produce `UNKNOWN-RUNNER-VERSION`. Runtime versions, per-run
labels and baseline metadata cannot substitute for this current saved field.
This consumer uses the checker's reason and version, not its recovery link.

Excluded rows have `decision: undetermined` even when their recorded metrics or
quality fail. Fixed reasons appear in commit-then-runner order on every row;
metric rules and fixture differences remain evidence. The baseline is historical
and is not required to match the target commit. Its execution provenance is not
validated by this gate; existing fixture/input/evaluator comparison checks still
apply. Eligibility does not attest authenticity or hardware equivalence.

Rerun measurement and quality evaluation in the intended checkout and save a new
artifact to recover. Preserve old artifacts; editing their SHA or runner label
does not remeasure them. The fixture SHAs below are synthetic IDs, not real commits.

The proposed conservative fixture gate requires every current fixture to pass
and the fixture set to remain comparable. A regression or current failure in an eligible row
rejects even if the aggregate ratio and speed thresholds pass. Added/removed
fixtures, changed inputs/hash/evaluator, and absent judgments withhold adoption.
Metric failures still reject; otherwise any missing metric or quality evidence
makes the row undetermined. No cross-model or cross-engine quality borrowing is
allowed. This checks recorded evidence, not hardware/model provenance beyond
these identifiers; it is not a deployment recommendation.

Reproduce the synthetic regression example without external services:

```sh
npm run local-inference-quality-adoption -- \
  --commit 1111111111111111111111111111111111111111 \
  src/local-inference-use-case-thresholds/fixtures/quality-baseline.json \
  src/local-inference-use-case-thresholds/fixtures/quality-current.json \
  interactive-coding-assistant
```

The legacy `local-inference-thresholds` command is a metric-only policy example;
use `local-inference-quality-adoption` for decisions that include saved fixture
evidence. Both inputs stay unchanged and output goes only to stdout.
