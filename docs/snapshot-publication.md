---
sidebar: false
---

# Verified snapshot publication

The publication formatter lists adoption and rejection reasons in a fixed order:
**Speed → Quality → Memory → Environment**. It preserves the upstream decision
and run provenance. Missing or unsupported evidence prevents adoption.

## Example results

**Demonstration only:** these synthetic decisions exercise formatting. They are
not measured engine results or performance claims.


[Engine names](#publication-engine-names) · [Metric names](#publication-metric-names) · [Reason codes](#publication-reason-codes)

### Run demo-adopt: Adopt

Commit: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`; runner: `1.0.0`.

| Aspect | Reason |
| --- | --- |
| Speed | Meets policy |
| Quality | Meets policy |
| Memory | Meets policy |
| Environment | Meets policy |

### Run demo-reject: Reject

Commit: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`; runner: `1.0.0`.

| Aspect | Reason |
| --- | --- |
| Speed | Meets policy |
| Quality | Does not meet policy |
| Memory | Evidence missing |
| Environment | Measurement unsupported |

<a id="publication-engine-names"></a>

## Engine names

Engine identity is supplied by upstream context, not inferred from a run ID.
This input contract does not carry engine names or establish engine rankings.

<a id="publication-metric-names"></a>

## Metric names

These are decision axes, not numerical measurements or threshold definitions.

| Key | Aspect |
| --- | --- |
| speed | Speed |
| quality | Quality |
| memory | Memory |
| environment | Environment |

<a id="publication-reason-codes"></a>

## Reason codes

| Code | Reason |
| --- | --- |
| pass | Meets policy |
| fail | Does not meet policy |
| missing | Evidence missing |
| unsupported | Measurement unsupported |


## Publish verifier output

Run from `packages/tech` after the upstream verifier has matched the snapshot's
run ID, commit and runner version and evaluated its measurement policy:

```sh
node --import tsx/esm src/entrypoints/render-snapshot-publication.ts verified-results.json > results.md
```

The JSON input is an array of records. Each record supplies `verification`:
`"verified"`, a unique `runId`, a full 40-character `commit`, `runnerVersion`,
`decision` (`"adopt"` or `"reject"`) and `reasons`. The four reason keys are
`speed`, `quality`, `memory`, `environment`; each value is `"pass"`, `"fail"`,
`"missing"` or `"unsupported"`. All four must pass for adoption. Invalid records
cause exit code 1 with no Markdown on stdout, including when a later row fails.
Shell redirection can still truncate an existing file; publish to a temporary
file and replace the destination only after the command succeeds.

This is an output adapter, not a snapshot verifier. The `verification` marker
records the upstream contract; it does not authenticate an arbitrary JSON file.
Do not pass raw runner JSON or mark unverified measurements as verified. No
existing runner, saved-report schema, threshold calculator or download API is
changed. Integrations must explicitly map their verified decisions to this
contract. Only the fixed reason vocabulary is printed; raw error messages and
extra fields are not copied into the public result. Provenance identifiers must
also be suitable for public release.

The TypeScript API is `renderVerifiedSnapshotResults` in
`packages/tech/src/snapshot-publication/domain/markdown.ts`.
