# Strata fixture quality adoption

Synthetic demonstration only. Not measured performance or an adoption recommendation.

The metric-only evaluator accepts this example: TTFT is 0.1 s, throughput is
100 tokens/s, peak RSS is 1024 MiB and the quality pass ratio is 0.75.
The fixture gate rejects it because **answer regressed from pass to fail**.
Speed and the aggregate pass ratio cannot override that failure.

Proposed thresholds; saved fixture evidence only, not a deployment recommendation.

## Interactive coding assistant

| Engine / model | Adoption | Runner version | Target commit | Eligibility | Metric thresholds | Fixture quality gate | Fixture differences |
| --- | --- | --- | --- | --- | --- | --- | --- |
| strata / synthetic-not-measured | reject | local-inference/4 | 1111111111111111111111111111111111111111 | eligible | ttft: pass (0.1 s); tps: pass (100 tokens/s); quality: pass (0.75 ratio); peakRss: pass (1024 MiB) | reject | answer: regressed (pass → fail); format: unchanged (pass → pass); language: unchanged (pass → pass); schema: unchanged (pass → pass) |

::: details Reproduce the decision
Run from `packages/tech` (no credentials or inference server required):

```sh
npm run local-inference-quality-adoption -- \
  --commit 1111111111111111111111111111111111111111 \
  src/local-inference-use-case-thresholds/fixtures/quality-baseline.json \
  src/local-inference-use-case-thresholds/fixtures/quality-current.json \
  interactive-coding-assistant
```

The command reads both files without modifying them and emits the table above.
The target SHA is a synthetic fixture ID. For real measurements, resolve the SHA
from the intended checkout independently of the saved JSON.
:::

## Runner and target eligibility

Every current adoption row must record a recognized `execution.runnerVersion`
and the requested `execution.targetCommit`. An excluded row remains
**undetermined**, even when its recorded fixture or metric result fails. Its
metrics and fixture differences remain visible as evidence.

| Current saved evidence | Fixed exclusion reason | Adoption |
| --- | --- | --- |
| Runner absent, null, empty or whitespace only | MISSING-RUNNER-VERSION | undetermined |
| Unknown runner string or non-string value | UNKNOWN-RUNNER-VERSION | undetermined |
| Saved commit differs from the requested target | COMMIT-MISMATCH | undetermined |
| Saved commit absent | MISSING-COMMIT | undetermined |

Only `local-inference/2`, `local-inference/3` and `local-inference/4` are recognized.
Runtime versions and per-run labels cannot replace the saved runner field. If
both gates fail, commit reasons appear before runner reasons. Malformed commit
IDs reject the command before it prints any adoption table.

The baseline is historical: it need not match the target commit, and this gate
does not validate its execution provenance. Existing input, fixture and evaluator
comparison checks still apply. Eligibility checks saved identity, not authenticity
or hardware equivalence.

Preserve excluded artifacts. Rerun measurement and quality evaluation in the
intended checkout and save a new artifact. Editing an old runner label or SHA does
not remeasure it.

## Synthetic excluded rows

These three variants retain the synthetic metrics and failing fixture above.
Only the current saved execution metadata differs: empty runner, unknown runner,
then a different target commit. The final adoption stays undetermined while the
recorded quality gate remains reject. Unknown runner text is not reflected.

| Engine / model | Adoption | Runner version | Target commit | Eligibility | Metric thresholds | Fixture quality gate | Fixture differences |
| --- | --- | --- | --- | --- | --- | --- | --- |
| strata / synthetic-not-measured | undetermined | unavailable | 1111111111111111111111111111111111111111 | excluded: MISSING-RUNNER-VERSION | ttft: pass (0.1 s); tps: pass (100 tokens/s); quality: pass (0.75 ratio); peakRss: pass (1024 MiB) | reject | answer: regressed (pass → fail); format: unchanged (pass → pass); language: unchanged (pass → pass); schema: unchanged (pass → pass) |
| strata / synthetic-not-measured | undetermined | unavailable | 1111111111111111111111111111111111111111 | excluded: UNKNOWN-RUNNER-VERSION | ttft: pass (0.1 s); tps: pass (100 tokens/s); quality: pass (0.75 ratio); peakRss: pass (1024 MiB) | reject | answer: regressed (pass → fail); format: unchanged (pass → pass); language: unchanged (pass → pass); schema: unchanged (pass → pass) |
| strata / synthetic-not-measured | undetermined | local-inference/4 | 2222222222222222222222222222222222222222 | excluded: COMMIT-MISMATCH | ttft: pass (0.1 s); tps: pass (100 tokens/s); quality: pass (0.75 ratio); peakRss: pass (1024 MiB) | reject | answer: regressed (pass → fail); format: unchanged (pass → pass); language: unchanged (pass → pass); schema: unchanged (pass → pass) |

## How evidence controls adoption

- **reject**: an eligible row has a regressed or failing fixture, or a failing metric threshold.
- **undetermined**: no known failure, but a fixture is added, removed, missing,
  undetermined, or uses a changed input hash, fixture hash or evaluator version;
  missing measurements also withhold adoption. Excluded provenance always produces
  undetermined, regardless of recorded failures.
- **adopt**: the current runner and target commit are eligible, every metric threshold passes and every fixture is comparable and
  currently passes. This is a proposed policy result, not approval to deploy.

Engine and model identify the run; speed from another model cannot supply the
missing quality evidence. Hardware equivalence and broader model provenance
still need separate review. The supplied inputs are synthetic test fixtures.
