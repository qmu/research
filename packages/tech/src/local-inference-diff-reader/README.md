# Read saved comparison diffs with runner evidence

From `packages/tech`, read a saved **diff JSON** (the output format proposed in
[qmu/research#201](https://github.com/qmu/research/pull/201)):

```sh
node --import tsx/esm src/entrypoints/read-local-inference-diff.ts saved-diff.json
# Keyless four-engine regression fixture (expected exit code 2):
node --import tsx/esm src/entrypoints/read-local-inference-diff.ts src/local-inference-diff-reader/fixtures/missing-runner.json
```

This is an independent import boundary on `main`; it does not require that PR's
code to run. It consumes `schemaVersion: 1`, `environment.execution.before/after`
and comparison `runs` with `speed`/`memory` deltas. It does **not** consume raw
measurement artifacts or the table interchange format. Existing generators and
renderers are not redirected automatically: consumers of saved diff JSON must
explicitly invoke this reader (or `readComparisonDiff`) before using its rows.
No package scripts or files owned by the pending generator, saved-measurement
preflight, or adoption PRs are changed.

Each row receives `runnerFailure` and `runnerRecovery`. Missing execution objects,
missing/null runner versions, and empty/whitespace strings produce
`MISSING-RUNNER-VERSION`. Unsupported strings and invalid version types produce
`UNKNOWN-RUNNER-VERSION`; differing supported versions produce
`RUNNER-VERSION-MISMATCH`. Missing takes precedence over unknown, then mismatch.
Only exact `local-inference/2`, `/3`, and `/4` contracts are recognized; trimming,
coercion, runtime-version substitution and future-version guesses are forbidden.
This contract list matches the versions reviewed for qmu/research#244, applied
here to the **saved diff import**, not the adoption join.

Any runner failure sets every row's `comparable` to false and all speed/memory
`delta` fields to null with that fixed reason. Raw before/after measurements,
quality evidence and environment metadata are retained without modifying the
input file. An already incomparable or added/removed row never becomes comparable;
even if it contains a stale numeric delta, that delta is suppressed. Equal known
runner versions alone do not establish adoptability, matching commits, valid
quality judgments or trusted measurements. All upstream comparison gates still
apply. This reader is a runner-provenance gate, not a full measurement validator.

- Exit **0**: no runner-version failure. Inspect each row's `comparable` and
  existing quality/condition evidence; this is not an adoption approval.
- Exit **2**: structured JSON containing runner failures. Treat it as an
  unsuccessful import; it remains useful for displaying reasons and recovery.
- Exit **1**: invalid arguments, unreadable file, malformed JSON, wrong diff
  shape or duplicate row identity. Stdout is empty; stderr contains only
  `INVALID-COMPARISON-JSON`, with no input path or parser excerpt.

Serialization completes before stdout is written. This CLI never opens an output
file or runs an engine, shell command or network request. Stdout retains the
operator-supplied evidence: keep source JSON free of secrets before sharing it.
Recovery codes and URLs are constants; saved runner strings, paths and arbitrary
recovery metadata are never interpolated into a command or recovery link.

## Remeasure

1. Keep the original diff and its two source artifacts unchanged. Do not fill in
   a version label, copy it from the other side, or relabel old measurements.
2. Choose a trusted checkout with a supported runner that records
   `execution.runnerVersion`. Review the local measurement configuration,
   endpoints, model conditions and target commit yourself; do not execute a
   command or follow an endpoint embedded in the rejected JSON.
3. Rerun **both** measurement inputs and their quality evaluation under the
   intended comparable conditions. Use new output filenames and retain commit,
   execution identity and runner evidence. Measurement may use compute or paid
   services; this reader does not initiate it.
4. Generate a fresh diff from those new artifacts using the saved-diff generator,
   then pass it through the command above. Require exit 0 and the existing
   per-row comparison/quality gates before using numeric differences.

Until a trusted version-recording runner and diff generator are available, keep
these rows ineligible. The fixture is synthetic and is not a replacement for
remeasurement. The recovery URL targets this section on `main` after merge; use
this branch's README when reviewing the PR.
