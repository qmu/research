# Local inference adoption and comparability

Adoption pass means the recorded fixtures passed under complete recorded conditions; it is not a general model recommendation. Only rows with the same condition group share all recorded comparison dimensions. Missing metadata is undetermined. Groups do not establish statistical significance or verify provenance. Engine and runtime are exact identity dimensions; no cross-engine equivalence is inferred.

Synthetic entries test joining and are not measured engine performance.

## Evaluator version mismatch

EVALUATOR-VERSION-MISMATCH: Evaluator versions differ; direct comparison is blocked. Adoption is local to each recorded evaluator; no cross-version winner or quality delta is computed.

| Source / run A | Evaluator A (fixture: version) | Source / run B | Evaluator B (fixture: version) | Reason | Next step |
| --- | --- | --- | --- | --- | --- |
| 1 / 1 | exact-answer: exact-text/v1 | 3 / 1 | exact-answer: exact-text/v2 | EVALUATOR-VERSION-MISMATCH | [Remeasure](./local-inference-adoption-format.md#remeasure) |
| 1 / 2 | exact-answer: exact-text/v1 | 3 / 1 | exact-answer: exact-text/v2 | EVALUATOR-VERSION-MISMATCH | [Remeasure](./local-inference-adoption-format.md#remeasure) |

## First-token latency eligibility

Only saved TTFT from the selected run ID, runner version and target commit is adopted here. Quality verdicts below are separate: adopting a latency value is not an engine recommendation. Missing selection or evidence never becomes zero.

Selected run: synthetic-run-1; runner: local-inference/4; commit: 1111111111111111111111111111111111111111.

| Source / run | Engine / model | Adopted TTFT (s) | Reason / next step |
| --- | --- | --- | --- |
| 1 / 1 | ollama / synthetic-model | 0.25 | same execution; measured |
| 1 / 2 | ollama / synthetic-model | not adopted | RUN-ID-MISMATCH — [Remeasure](./local-inference-adoption-format.md#first-token-latency) |
| 2 / 1 | ollama / synthetic-model | not adopted | RUN-ID-MISMATCH — [Remeasure](./local-inference-adoption-format.md#first-token-latency) |
| 3 / 1 | ollama / synthetic-model | 0.25 | same execution; measured |
| 4 / 1 | ollama / synthetic-model | not adopted | MISSING-RUN-ID, MISSING-RUNNER-VERSION, MISSING-COMMIT — [Remeasure](./local-inference-adoption-format.md#first-token-latency) |
| 5 / 1 | ollama / synthetic-model | not adopted | COMMIT-MISMATCH — [Remeasure](./local-inference-adoption-format.md#first-token-latency) |
| 6 / 1 | ollama / synthetic-model | not adopted | RUNNER-VERSION-MISMATCH — [Remeasure](./local-inference-adoption-format.md#first-token-latency) |
| 6 / 2 | ollama / synthetic-model | not adopted | RUN-ID-MISMATCH, RUNNER-VERSION-MISMATCH — [Remeasure](./local-inference-adoption-format.md#first-token-latency) |
| 7 / 1 | ollama / synthetic-model | not adopted | MISSING-RUNNER-VERSION — [Remeasure](./local-inference-adoption-format.md#first-token-latency) |
| 7 / 2 | ollama / synthetic-model | not adopted | RUN-ID-MISMATCH, MISSING-RUNNER-VERSION — [Remeasure](./local-inference-adoption-format.md#first-token-latency) |

## Commit eligibility

Current comparison commit: 1111111111111111111111111111111111111111

COMMIT-MISMATCH: Saved measurement commit differs from the current comparison commit. MISSING-COMMIT: No saved commit was recorded. These rows are excluded from adoption and condition groups; recorded evidence remains available below. [Remeasure](./local-inference-adoption-format.md#commit-eligibility).

| Source / run | Saved commit | Eligibility | Reason |
| --- | --- | --- | --- |
| 1 / 1 | 1111111111111111111111111111111111111111 | eligible | none |
| 1 / 2 | 1111111111111111111111111111111111111111 | eligible | none |
| 2 / 1 | 1111111111111111111111111111111111111111 | eligible | none |
| 3 / 1 | 1111111111111111111111111111111111111111 | eligible | none |
| 4 / 1 | not recorded | excluded (cannot adopt) | MISSING-COMMIT: Target commit SHA was not recorded. [Remeasure missing commit](./local-inference-adoption-format.md#missing-commit) |
| 5 / 1 | 2222222222222222222222222222222222222222 | excluded | COMMIT-MISMATCH |
| 6 / 1 | 1111111111111111111111111111111111111111 | eligible | none |
| 6 / 2 | 1111111111111111111111111111111111111111 | eligible | none |
| 7 / 1 | 1111111111111111111111111111111111111111 | eligible | none |
| 7 / 2 | 1111111111111111111111111111111111111111 | eligible | none |

## Runner version eligibility

Only explicitly supported runner versions clear this gate. Commit eligibility alone does not permit adoption. Unknown or missing versions are excluded from adoption, condition groups and evaluator differences; original metrics and quality remain evidence. A supported version still requires all other checks.

| Source / run | Runner version | Eligibility | Reason / next step |
| --- | --- | --- | --- |
| 1 / 1 | local-inference/4 | supported | none |
| 1 / 2 | local-inference/4 | supported | none |
| 2 / 1 | local-inference/4 | supported | none |
| 3 / 1 | local-inference/4 | supported | none |
| 4 / 1 | unavailable | excluded (cannot adopt) | MISSING-RUNNER-VERSION: Runner version was not recorded. [Remeasure runner](./local-inference-adoption-format.md#runner-version) |
| 5 / 1 | local-inference/4 | supported | none |
| 6 / 1 | unavailable | excluded (cannot adopt) | UNKNOWN-RUNNER-VERSION: Runner version is not supported by this reader. [Remeasure runner](./local-inference-adoption-format.md#runner-version) |
| 6 / 2 | unavailable | excluded (cannot adopt) | UNKNOWN-RUNNER-VERSION: Runner version is not supported by this reader. [Remeasure runner](./local-inference-adoption-format.md#runner-version) |
| 7 / 1 | unavailable | excluded (cannot adopt) | MISSING-RUNNER-VERSION: Runner version was not recorded. [Remeasure runner](./local-inference-adoption-format.md#runner-version) |
| 7 / 2 | unavailable | excluded (cannot adopt) | MISSING-RUNNER-VERSION: Runner version was not recorded. [Remeasure runner](./local-inference-adoption-format.md#runner-version) |

<details>
<summary>Excluded evidence: source / run 4 / 1</summary>

<pre>&#123;
  "metrics": &#123;
    "ttft": &#123;
      "value": 0.25,
      "unit": "s",
      "source": "client"
    &#125;
  &#125;,
  "quality": &#91;
    &#123;
      "fixtureId": "exact-answer",
      "fixtureSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "evaluatorVersion": "exact-text/v1",
      "verdict": "pass",
      "reason": null
    &#125;
  &#93;
&#125;</pre>

</details>

<details>
<summary>Excluded evidence: source / run 5 / 1</summary>

<pre>&#123;
  "metrics": &#123;
    "ttft": &#123;
      "value": 0.25,
      "unit": "s",
      "source": "client"
    &#125;
  &#125;,
  "quality": &#91;
    &#123;
      "fixtureId": "exact-answer",
      "fixtureSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "evaluatorVersion": "exact-text/v2",
      "verdict": "pass",
      "reason": null
    &#125;
  &#93;
&#125;</pre>

</details>

<details>
<summary>Excluded evidence: source / run 6 / 1</summary>

<pre>&#123;
  "metrics": &#123;
    "ttft": &#123;
      "value": 0.25,
      "unit": "s",
      "source": "client"
    &#125;
  &#125;,
  "quality": &#91;
    &#123;
      "fixtureId": "exact-answer",
      "fixtureSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "evaluatorVersion": "exact-text/v1",
      "verdict": "pass",
      "reason": null
    &#125;
  &#93;
&#125;</pre>

</details>

<details>
<summary>Excluded evidence: source / run 6 / 2</summary>

<pre>&#123;
  "metrics": &#123;
    "ttft": &#123;
      "value": 0.25,
      "unit": "s",
      "source": "client"
    &#125;
  &#125;,
  "quality": &#91;
    &#123;
      "fixtureId": "exact-answer",
      "fixtureSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "evaluatorVersion": "exact-text/v1",
      "verdict": "fail",
      "reason": null
    &#125;
  &#93;
&#125;</pre>

</details>

<details>
<summary>Excluded evidence: source / run 7 / 1</summary>

<pre>&#123;
  "metrics": &#123;
    "ttft": &#123;
      "value": 0.25,
      "unit": "s",
      "source": "client"
    &#125;
  &#125;,
  "quality": &#91;
    &#123;
      "fixtureId": "exact-answer",
      "fixtureSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "evaluatorVersion": "exact-text/v1",
      "verdict": "pass",
      "reason": null
    &#125;
  &#93;
&#125;</pre>

</details>

<details>
<summary>Excluded evidence: source / run 7 / 2</summary>

<pre>&#123;
  "metrics": &#123;
    "ttft": &#123;
      "value": 0.25,
      "unit": "s",
      "source": "client"
    &#125;
  &#125;,
  "quality": &#91;
    &#123;
      "fixtureId": "exact-answer",
      "fixtureSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "evaluatorVersion": "exact-text/v1",
      "verdict": "fail",
      "reason": null
    &#125;
  &#93;
&#125;</pre>

</details>

## condition-1

Rows in this group share every recorded comparison dimension.

| Source / run | Engine / model | Status | Adoption | Reasons |
| --- | --- | --- | --- | --- |
| 1 / 1 | ollama / synthetic-model | measured | pass | none |
| 1 / 2 | ollama / synthetic-model | measured | fail | QUALITY-FAIL |

<details>
<summary>Recorded evidence</summary>

### Source / run 1 / 1

<pre>&#123;
  "metrics": &#123;
    "ttft": &#123;
      "value": 0.25,
      "unit": "s",
      "source": "client"
    &#125;
  &#125;,
  "quality": &#91;
    &#123;
      "fixtureId": "exact-answer",
      "fixtureSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "evaluatorVersion": "exact-text/v1",
      "verdict": "pass",
      "reason": null
    &#125;
  &#93;
&#125;</pre>

### Source / run 1 / 2

<pre>&#123;
  "metrics": &#123;
    "ttft": &#123;
      "value": 0.25,
      "unit": "s",
      "source": "client"
    &#125;
  &#125;,
  "quality": &#91;
    &#123;
      "fixtureId": "exact-answer",
      "fixtureSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "evaluatorVersion": "exact-text/v1",
      "verdict": "fail",
      "reason": null
    &#125;
  &#93;
&#125;</pre>

</details>

<details>
<summary>Exact group conditions</summary>

<pre>&#123;
  "condition": &#123;
    "context": 4096,
    "quantization": "Q4"
  &#125;,
  "engine": "ollama",
  "fingerprint": &#123;
    "arch": "arm64",
    "engineVersion": "v22.0.0",
    "os": "fixture-os-1",
    "totalMemoryMiB": 16384
  &#125;,
  "inputSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "model": "synthetic-model",
  "procedure": "synthetic-demo-not-measured",
  "quality": &#91;
    &#123;
      "evaluatorVersion": "exact-text/v1",
      "fixtureId": "exact-answer",
      "fixtureSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
    &#125;
  &#93;,
  "runnerVersion": "local-inference/4",
  "runtimeVersion": "fixture-runtime-1",
  "sampling": &#123;
    "max&#95;tokens": 1024,
    "seed": 42,
    "temperature": 0,
    "top&#95;p": 1
  &#125;
&#125;</pre>

</details>

## condition-2

Rows in this group share every recorded comparison dimension.

| Source / run | Engine / model | Status | Adoption | Reasons |
| --- | --- | --- | --- | --- |
| 3 / 1 | ollama / synthetic-model | measured | pass | none |

<details>
<summary>Recorded evidence</summary>

### Source / run 3 / 1

<pre>&#123;
  "metrics": &#123;
    "ttft": &#123;
      "value": 0.25,
      "unit": "s",
      "source": "client"
    &#125;
  &#125;,
  "quality": &#91;
    &#123;
      "fixtureId": "exact-answer",
      "fixtureSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "evaluatorVersion": "exact-text/v2",
      "verdict": "pass",
      "reason": null
    &#125;
  &#93;
&#125;</pre>

</details>

<details>
<summary>Exact group conditions</summary>

<pre>&#123;
  "condition": &#123;
    "context": 4096,
    "quantization": "Q4"
  &#125;,
  "engine": "ollama",
  "fingerprint": &#123;
    "arch": "arm64",
    "engineVersion": "v22.0.0",
    "os": "fixture-os-1",
    "totalMemoryMiB": 16384
  &#125;,
  "inputSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "model": "synthetic-model",
  "procedure": "synthetic-demo-not-measured",
  "quality": &#91;
    &#123;
      "evaluatorVersion": "exact-text/v2",
      "fixtureId": "exact-answer",
      "fixtureSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
    &#125;
  &#93;,
  "runnerVersion": "local-inference/4",
  "runtimeVersion": "fixture-runtime-1",
  "sampling": &#123;
    "max&#95;tokens": 1024,
    "seed": 42,
    "temperature": 0,
    "top&#95;p": 1
  &#125;
&#125;</pre>

</details>

## condition-3

Rows in this group share every recorded comparison dimension.

| Source / run | Engine / model | Status | Adoption | Reasons |
| --- | --- | --- | --- | --- |
| 2 / 1 | ollama / synthetic-model | measured | pass | none |

<details>
<summary>Recorded evidence</summary>

### Source / run 2 / 1

<pre>&#123;
  "metrics": &#123;
    "ttft": &#123;
      "value": 0.25,
      "unit": "s",
      "source": "client"
    &#125;
  &#125;,
  "quality": &#91;
    &#123;
      "fixtureId": "exact-answer",
      "fixtureSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      "evaluatorVersion": "exact-text/v1",
      "verdict": "pass",
      "reason": null
    &#125;
  &#93;
&#125;</pre>

</details>

<details>
<summary>Exact group conditions</summary>

<pre>&#123;
  "condition": &#123;
    "context": 4096,
    "quantization": "Q4"
  &#125;,
  "engine": "ollama",
  "fingerprint": &#123;
    "arch": "arm64",
    "engineVersion": "v22.0.0",
    "os": "fixture-os-1",
    "totalMemoryMiB": 32768
  &#125;,
  "inputSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "model": "synthetic-model",
  "procedure": "synthetic-demo-not-measured",
  "quality": &#91;
    &#123;
      "evaluatorVersion": "exact-text/v1",
      "fixtureId": "exact-answer",
      "fixtureSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
    &#125;
  &#93;,
  "runnerVersion": "local-inference/4",
  "runtimeVersion": "fixture-runtime-1",
  "sampling": &#123;
    "max&#95;tokens": 1024,
    "seed": 42,
    "temperature": 0,
    "top&#95;p": 1
  &#125;
&#125;</pre>

</details>

[Input contract and interpretation](./local-inference-adoption-format.md)
