# Local inference adoption and comparability

Adoption pass means the recorded fixtures passed under complete recorded conditions; it is not a general model recommendation. Only rows with the same condition group share all recorded comparison dimensions. Missing metadata is undetermined. Groups do not establish statistical significance or verify provenance. Engine and runtime are exact identity dimensions; no cross-engine equivalence is inferred.

Synthetic entries test joining and are not measured engine performance.

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
  "runtimeVersion": "fixture-runtime-1",
  "sampling": &#123;
    "max&#95;tokens": 1024,
    "seed": 42,
    "temperature": 0,
    "top&#95;p": 1
  &#125;
&#125;</pre>

</details>

## Undetermined conditions

These rows lack comparison metadata. They are not mutually comparable and do not form a condition group.

| Source / run | Engine / model | Status | Adoption | Reasons |
| --- | --- | --- | --- | --- |
| 4 / 1 | ollama / synthetic-model | measured | undetermined | MISSING-FINGERPRINT |

<details>
<summary>Recorded evidence</summary>

### Source / run 4 / 1

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

[Input contract and interpretation](./local-inference-adoption-format.md)
