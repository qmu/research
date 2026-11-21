# Legacy information-accuracy metrics

The July 9, 2026 v1 comparison JSON predates the information-accuracy probe.
`domain/read-legacy-metrics.ts` reads its omitted trial metric as `null` and
builds an empty aggregate (`n: 0`), so absence cannot become a measured zero.
The source JSON, other metrics, call captures and extra metadata are preserved.
Existing scores, including zero, remain measurements; failed trials do not enter
the aggregate. Reading an already normalized configuration is a no-op.

`recomputeThroughput` applies this compatibility step for both retired and
current throughput definitions, so existing comparison and split-topic readers
receive the current metric shape without rewriting archived files. This also
composes with the proposed shared reader in qmu/research#192; it does not add a
second artifact reader or change the local-inference contracts in
qmu/research#183–qmu/research#190.

From `packages/tech`, run:

```sh
npm test -- src/llm-model-comparison/domain/read-legacy-metrics.test.ts
```

The test reads the committed archive under
`docs/research-reports/history/speed/2026-07-09T11-52-54-627Z/` directly.
