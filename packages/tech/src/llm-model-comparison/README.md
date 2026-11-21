# Stored comparison compatibility reader

`domain/read-artifact.ts` is the in-memory read entrance for the shared LLM
comparison JSON. The comparison CLI uses it for incremental records and each
archive frame before folding; the speed/accuracy CLI uses the same entrance.
It does not change measurement, reporting, provider adapters or archived files.

```ts
import { readComparisonArtifact } from "./domain/read-artifact";

// stored is an existing, trusted comparison artifact after JSON parsing.
const { record, missingTtftTrials } = readComparisonArtifact(stored);
```

The reader preserves extra metadata and raw call captures. It fills absent
`instrumentVersion` with **1**, preserving the original instrument rather than
claiming its probes became v2, and fills missing per-config `measuredAt` from
`generatedAt`. Existing dates and instrument tags remain intact.

It reuses the existing throughput and TTFT compatibility functions, in that
order: throughput is recomputed/rescaled under ADR 0009, then a stored TTFT
sentinel of zero becomes null and aggregates are refreshed. After conversion,
`throughputDefinition: "end-to-end"` prevents a second read from rescaling the
rate again. Reading the result again produces the same record.

Unknown throughput definitions and legacy non-null rates without the timing
inputs needed for conversion throw. Previously the archive loader warned and
carried such rates forward before labelling the merged record end-to-end; the
compatibility entrance now refuses that mixed-definition result. It neither
invents missing measurements nor upgrades an incomplete record silently.

This is a typed compatibility reader for existing comparison artifacts, not a
full validator for untrusted JSON. In particular, it does not reinterpret the
separate `local-inference` measurement/interchange contracts in qmu/research#183
and qmu/research#185. Those contracts both use `schemaVersion: 1` but have
different row shapes, so the version alone cannot identify them.

Tests read the existing v1 speed fixture at
`docs/research-reports/history/speed/2026-07-09T11-12-01-332Z/llm-speed-comparison.data.json`
and the v2 combined fixture, without copying or rewriting either file:

```sh
# From the repository root:
make test
# Focused check, from packages/tech:
npm test -- src/llm-model-comparison/domain/read-artifact.test.ts
```
