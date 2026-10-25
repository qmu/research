# Local inference adoption and comparability

Adoption pass means the recorded fixtures passed under complete recorded conditions; it is not a general model recommendation. Only rows with the same condition group share all recorded comparison dimensions. Missing metadata is undetermined. Groups do not establish statistical significance or verify provenance. Engine and runtime are exact identity dimensions; no cross-engine equivalence is inferred.

## First-token latency eligibility

Only saved TTFT from the selected run ID, runner version and target commit is adopted here. Quality verdicts below are separate: adopting a latency value is not an engine recommendation. Missing selection or evidence never becomes zero.

[Synthetic acquisition failure example](./local-inference-ttft-failure.md#first-token-latency-eligibility). No Apple Silicon performance measurement is claimed.

Selected run: synthetic-timeout-request; runner: local-inference/4; commit: 1111111111111111111111111111111111111111.

| Source / run | Engine / model | Adopted TTFT (s) | Reason / next step | Acquisition | Saved execution (request / runner / commit) |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | mlx / synthetic-model | not adopted | TIMEOUT — [Remeasure](./local-inference-adoption-format.md#first-token-latency) | unavailable | synthetic-timeout-request / local-inference/4 / 1111111111111111111111111111111111111111 |

## Commit eligibility

Current comparison commit: 1111111111111111111111111111111111111111

COMMIT-MISMATCH: Saved measurement commit differs from the current comparison commit. MISSING-COMMIT: No saved commit was recorded. These rows are excluded from adoption and condition groups; recorded evidence remains available below. [Remeasure](./local-inference-adoption-format.md#commit-eligibility).

| Source / run | Saved commit | Eligibility | Reason |
| --- | --- | --- | --- |
| 1 / 1 | 1111111111111111111111111111111111111111 | eligible | none |

## Runner version eligibility

Only explicitly supported runner versions clear this gate. Commit eligibility alone does not permit adoption. Unknown or missing versions are excluded from adoption, condition groups and evaluator differences; original metrics and quality remain evidence. A supported version still requires all other checks.

| Source / run | Runner version | Eligibility | Reason / next step |
| --- | --- | --- | --- |
| 1 / 1 | local-inference/4 | supported | none |

## Undetermined conditions

These rows lack comparison metadata. They are not mutually comparable and do not form a condition group.

| Source / run | Engine / model | Status | Adoption | Reasons |
| --- | --- | --- | --- | --- |
| 1 / 1 | mlx / synthetic-model | failed | undetermined | MISSING-FINGERPRINT, MISSING-QUALITY, MEASURE-FAILED |

<details>
<summary>Recorded evidence</summary>

### Source / run 1 / 1

<pre>&#123;
  "metrics": &#123;
    "ttft": &#123;
      "value": null,
      "unit": "s",
      "reason": "MEASURE-FAILED"
    &#125;
  &#125;,
  "quality": &#91;&#93;
&#125;</pre>

</details>

[Input contract and interpretation](./local-inference-adoption-format.md)
