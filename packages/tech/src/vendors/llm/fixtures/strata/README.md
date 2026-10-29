# Strata measurement import

`normalizeStrataCompletion` in `../../strata.ts` imports **one parsed line of
Strata bench `outputs.jsonl`** into the existing `CompletionClient` result type
(`Completion`). It performs no HTTP requests and adds no dependency or model
registration. It does not accept raw chat responses, SSE chunks, or the benchmark
`results.json` summary.

```ts
import { normalizeStrataCompletion } from "../../strata";

// Supply the model identifier from the same run's provenance/configuration.
const completion = normalizeStrataCompletion(JSON.parse(line), modelId);
const commonJson = JSON.stringify(completion);
```

| Completion field | Source                                                                       |
| ---------------- | ---------------------------------------------------------------------------- |
| `text`           | `final_answer`, verbatim (reasoning is excluded)                             |
| `outputTokens`   | `usage.completion_tokens`, including the engine's reasoning-token accounting |
| `elapsedMs`      | `(end_offset_s - dispatch_offset_s) * 1000`, client wall time to stream end  |
| `model`          | Required caller-supplied provenance; the source line omits the model         |

Missing counts/times are rejected, not imputed as zero; measured zero survives.
Engine `timings.predicted_ms` and `predicted_n` are never fallbacks. HTTP failures,
upstream errors, missing finish reasons, and tool-call results are rejected. Both
`stop` and token-cap `length` finishes are accepted, as with other completion
adapters; this does not certify answer quality. Retain the original record to
audit truncation and provenance. No `StreamedCompletion`/TTFT is synthesized:
Strata's first delta can be reasoning and its first answer can be a tool call,
which differ from this repository's first-content-delta measurement.

## Measured fixture provenance

`measured.json` is a field projection of the first (`warmup`) record in the
upstream published [outputs.jsonl](https://github.com/Niko1221/Strata/blob/7dd5cf18e68c639a8773e096c5c79f971ea2a9f5/bench/results/2026-10-20-0.2.1-bench/p2003-rtx3060/run3-with-fixes/outputs.jsonl).
The retained fields and values are unchanged. Request messages/options, reasoning,
tool calls, case ID and the long event list are omitted. The upstream record has
128 completion tokens, 3.400295 seconds of client duration, and a `length` finish.
The test model name is synthetic because the line contains no model identifier.
This is an upstream measurement replay, **not a new measurement on research-dev
or an Apple Silicon performance claim**.

The format and time semantics were checked against the same pinned commit's
[record writer](https://github.com/Niko1221/Strata/blob/7dd5cf18e68c639a8773e096c5c79f971ea2a9f5/strata_cli/bench_standard.py)
(`record_of`) and
[benchmark protocol](https://github.com/Niko1221/Strata/blob/7dd5cf18e68c639a8773e096c5c79f971ea2a9f5/docs/BENCHMARK_PROTOCOL.md).
Strata is identified as `Niko1221/Strata`, following qmu/research#177.

Run the fixture and malformed-input tests from `packages/tech`:

```sh
npm test -- src/vendors/llm/strata.test.ts
```
