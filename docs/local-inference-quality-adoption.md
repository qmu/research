# Strata fixture quality adoption

Synthetic demonstration only. Not measured performance or an adoption recommendation.

The metric-only evaluator accepts this example: TTFT is 0.1 s, throughput is
100 tokens/s, peak RSS is 1024 MiB and the quality pass ratio is 0.75.
The fixture gate rejects it because **answer regressed from pass to fail**.
Speed and the aggregate pass ratio cannot override that failure.

Proposed thresholds; saved fixture evidence only, not a deployment recommendation.

## Interactive coding assistant

| Engine / model | Adoption | Metric thresholds | Fixture quality gate | Fixture differences |
| --- | --- | --- | --- | --- |
| strata / synthetic-not-measured | reject | ttft: pass (0.1 s); tps: pass (100 tokens/s); quality: pass (0.75 ratio); peakRss: pass (1024 MiB) | reject | answer: regressed (pass → fail); format: unchanged (pass → pass); language: unchanged (pass → pass); schema: unchanged (pass → pass) |


::: details Reproduce the decision
Run from `packages/tech` (no credentials or inference server required):

```sh
npm run local-inference-quality-adoption -- \
  src/local-inference-use-case-thresholds/fixtures/quality-baseline.json \
  src/local-inference-use-case-thresholds/fixtures/quality-current.json \
  interactive-coding-assistant
```

The command reads both files without modifying them and emits the table above.
:::

## How evidence controls adoption

- **reject**: a fixture regresses or currently fails, or a metric threshold fails.
- **undetermined**: no known failure, but a fixture is added, removed, missing,
  undetermined, or uses a changed input hash, fixture hash or evaluator version;
  missing measurements also withhold adoption.
- **adopt**: every metric threshold passes and every fixture is comparable and
  currently passes. This is a proposed policy result, not approval to deploy.

Engine and model identify the run; speed from another model cannot supply the
missing quality evidence. Hardware equivalence and broader model provenance
still need separate review. The supplied inputs are synthetic test fixtures.
