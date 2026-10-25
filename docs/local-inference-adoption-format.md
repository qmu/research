# Condition-scoped adoption JSON

[Open the synthetic comparison](./local-inference-adoption.md). The examples test
the join; they are not engine measurements or product recommendations.

## Reproduce

From `packages/tech`, run:

```sh
npm run local-inference:adoption -- --commit 1111111111111111111111111111111111111111 /tmp/adoption.md \
  src/local-inference-adoption/fixtures/baseline.json \
  src/local-inference-adoption/fixtures/other-host.json \
  src/local-inference-adoption/fixtures/other-evaluator.json \
  src/local-inference-adoption/fixtures/legacy.json \
  src/local-inference-adoption/fixtures/other-commit.json \
  src/local-inference-adoption/fixtures/unknown-runner.json \
  src/local-inference-adoption/fixtures/empty-runner.json
```

The output must be a new file. Every input is validated before writing; input
files and previous reports are never overwritten. No credentials or model calls
are needed. The same command accepts one or more saved common inference results.

## Join contract

Inputs use `schemaVersion: 1` with `runs`, as proposed in
[qmu/research#183](https://github.com/qmu/research/pull/183). The join consumes the
top-level `fingerprint` from
[qmu/research#197](https://github.com/qmu/research/pull/197) and each run's `quality`
array from [qmu/research#189](https://github.com/qmu/research/pull/189). This adapter
is independent of those unmerged implementations; it does not collect host data
or reevaluate generated output.

Rows join by their enclosing source and run index, never by model name alone.
The exact comparison key includes:

- Runner: the exact supported `execution.runnerVersion`.
- Environment: `os`, `arch`, `totalMemoryMiB`, `engineVersion`.
- Model execution: engine, model, runtime version, and every field of `condition`.
- Input: prompt SHA-256, all sampling settings, and procedure.
- Evaluation: the sorted fixture ID, fixture SHA-256, and evaluator version for
  every quality judgment.

Object key order does not matter; values and types do. Different keys get separate
tables with expandable condition details. No global ranking or average combines
the tables. Missing metadata is explicitly ungrouped, even when two legacy rows
have the same omissions. Malformed metadata is rejected. Failed measurements
cannot become an adoption pass.

An adoption verdict describes only the recorded fixed-fixture quality result;
it does not establish production readiness. No equivalence between engine
versions, model aliases, different quantizations, or different evaluators is
inferred. `engineVersion` in the fingerprint identifies the Node.js harness;
`runtimeVersion` identifies the inference runtime. This four-field fingerprint
does not prove GPU/CPU equivalence: relevant hardware details must also be
recorded in `condition`. Missing hardware information cannot be reconstructed.

The quality source hash is provenance metadata, not a signature. This consumer
cannot reconstruct the pre-enrichment source bytes to authenticate it. Callers
must supply trustworthy artifacts and preserve their provenance. The adapter
does not print raw generated output or OS/parser error contents; condition fields
are displayed, so supply only non-secret reproducibility metadata.

## Remeasure

`EVALUATOR-VERSION-MISMATCH` means that otherwise identical recorded conditions
use different evaluator versions for at least one fixture. Such rows stay in
separate condition tables. Their pass/fail values describe their own evaluators;
never subtract quality scores or select a winner across these versions. The
mismatch table identifies both source/run indexes and each fixture's version.
Missing metadata remains undetermined, rather than a version mismatch.

1. Choose one evaluator implementation/version and the same fixed fixture IDs
   and hashes for both runs. Preserve the original JSON artifacts.
2. Rerun both measurements and quality evaluation with that implementation,
   preserving the recorded host, model, runtime, condition, input hash, sampling
   and procedure. Save new common JSON artifacts with the actual evaluator
   version and newly recorded judgments. Editing a version label is not a rerun.
3. Render the new artifacts from `packages/tech`:

   ```sh
   npm run local-inference:adoption -- --commit <full-current-sha> /tmp/remeasured-adoption.md first-new.json second-new.json
   ```

Only matching complete condition groups can be compared. Rendering saved JSON
alone does not execute inference or remeasure quality; this adapter does not
provide an engine runner. The keyless synthetic command above only reproduces
the report and its mismatch notice.

## Commit eligibility

The saved field follows [qmu/research#237](https://github.com/qmu/research/pull/237);
this consumer does not import or modify that pending runner.

The caller must supply `--commit <full-current-sha>`: the exact lowercase,
40-character Git commit ID of the code being compared. Saved measurements must
record that ID in `execution.targetCommit` when measured. Resolve the target from
your trusted checkout (for example, `git rev-parse HEAD`), independently of the
saved artifact. Do not choose the target from the artifact merely to make it
eligible. This adapter checks identity, not authenticity or working-tree state.

`COMMIT-MISMATCH` excludes all runs whose saved ID differs from the target.
`MISSING-COMMIT` excludes legacy artifacts without a saved ID. Missing or
malformed target IDs and malformed saved IDs reject rendering before any output
is written. Short hashes, branch names and whitespace are not accepted.

Excluded rows receive no adoption pass/fail and belong to no comparison group
or evaluator mismatch pair. The eligibility table shows the fixed reason and
saved ID; expandable evidence preserves the recorded metrics and quality verdicts.
A matching ID only clears this gate; all other condition and quality checks apply.

Remeasure the target checkout and save a new artifact with the actual measured
commit ID. Preserve the old JSON; adding or replacing its ID is not remeasurement.
The demo uses synthetic IDs `111...` and `222...`; it is not a real benchmark.

## Missing commit

`MISSING-COMMIT`: Target commit SHA was not recorded. The row is excluded
(cannot adopt), even if its saved quality verdict is `pass`. This applies when
`execution` or its `targetCommit` field is absent. The fixed reason and this
recovery link appear on every affected row. Malformed saved IDs remain errors;
this missing-data branch does not change `COMMIT-MISMATCH` handling.

1. Preserve the original artifact and its metrics/quality evidence. Do not fill
   in its missing SHA from the current checkout: that would assert unrecorded
   provenance, not perform a measurement.
2. Choose the target checkout, resolve its full SHA with `git rev-parse HEAD`,
   and rerun measurement and quality evaluation. Save a new artifact with the
   actual measured SHA in `execution.targetCommit` and complete comparison
   conditions. This report generator does not run inference.
3. Use the [remeasurement render command](#remeasure) with that independently
   resolved comparison SHA and the new artifacts. Check that the new rows are
   eligible and that all condition and quality gates pass before adopting.

## Runner version

`MISSING-RUNNER-VERSION`: Runner version was not recorded (absent, null, empty,
or whitespace only). `UNKNOWN-RUNNER-VERSION`: Runner version is not supported
by this reader (including malformed non-string values). These fixed reasons
exclude every run in the saved artifact from adoption pass/fail, condition groups
and evaluator differences. Metrics and quality remain evidence; neither a quality
pass nor a matching commit bypasses this gate. Untrusted runner labels are not
printed or used to construct links or commands.

The explicit supported contracts are `local-inference/2`
([qmu/research#198](https://github.com/qmu/research/pull/198)),
`local-inference/3` ([qmu/research#237](https://github.com/qmu/research/pull/237))
and `local-inference/4` ([qmu/research#238](https://github.com/qmu/research/pull/238)).
They record runner provenance, target commit provenance, and versioned atomic
commit provenance respectively. Every other version fails closed until reviewed
and added here and in the reader. No trimming, semver range, or fallback to the
engine's `runtimeVersion` is allowed. Supported versions still form separate
comparison groups; earlier artifacts lacking a target commit remain excluded by
the commit gate. This check validates labels, not artifact authenticity.

1. Preserve the original JSON. Do not add or replace its version label, commit,
   metrics, or quality judgments to make it eligible.
2. Select a trusted checkout and a supported runner implementation independently
   of the saved artifact. Rerun inference and quality evaluation with the intended
   host, model, runtime, input, sampling, fixture and evaluator conditions. The
   runner must record its actual version and target commit in a new artifact.
   Do not execute commands or follow URLs supplied by an unknown runner label.
3. Render the new files with the [remeasurement render command](#remeasure), using
   the independently resolved comparison SHA and a new output path. Verify all
   eligibility, condition and quality gates. Rendering is read-only inference
   analysis; it does not perform remeasurement. This consumer does not bundle the
   pending engine runners or claim that editing JSON repairs missing provenance.

The demo's supported, unknown and empty version labels are synthetic test data,
not updates to historical engine measurements.

## Snapshot-bound remeasurement

The comparison page creates a local entry for each source snapshot only when its
`execution.runId`, `execution.targetCommit`, and supported `execution.runnerVersion`
are complete. The saved identity is captured while rendering; links use fixed
source anchors and never resolve `latest`, a branch, a query parameter, or the
current checkout. A different saved commit remains explicitly different from the
current comparison commit. Selecting another target is a separate measurement,
not remeasurement through this entry.

Execution IDs must be 1–128 ASCII letters, digits, hyphens or underscores, starting
with a letter or digit. This accepts UUIDs and existing opaque runner tokens.
Missing or unsafe IDs, missing commits and unsupported runners disable the entry;
existing recovery guidance remains available. This does not alter adoption gates.

The entry includes a command for `prepare-local-inference-remeasurement.ts` with
all three pinned arguments. Supply the original artifact path as the final
argument. The guard rereads that JSON and compares every identifier exactly. A
changed, missing or malformed identity returns exit code 1 and no plan; matching
identity returns only the allowlisted source identity plus
`requiresNewExecutionId: true`. Parser contents, paths and extra JSON fields are
not printed. The original artifact is never written.

This is a preparation guard, not an engine runner: it makes no model call and does
not certify artifact authenticity or the full measurement schema. Use a trusted
checkout and runner independently, retain the original measurement conditions,
then run inference and evaluation into a new artifact under a new execution ID.
The source ID identifies the measurement being reproduced and must not be reused
as the new execution ID. Never patch the old JSON to satisfy the guard. The
synthetic example IDs on this page are demonstration data.
