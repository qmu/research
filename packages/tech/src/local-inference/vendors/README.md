# Recorded Strata phase speeds

`normalizeStrataSpeed` accepts one **parsed `outputs.jsonl` record** from
Niko1221/Strata bench. It returns JSON-safe `prompt_tps` and `generation_tps`
measurements (`value`, `unit`, and `source` or `reason`), suitable for attaching
to a common inference result's metrics. It performs no network or model calls.

```ts
import { normalizeStrataSpeed } from "./strata-speed";

const phaseMetrics = normalizeStrataSpeed(JSON.parse(line));
const json = JSON.stringify({ engine: "strata", metrics: phaseMetrics });
```

| JSON metric      | Strata final-chunk timing field |
| ---------------- | ------------------------------- |
| `prompt_tps`     | `timings.prompt_per_second`     |
| `generation_tps` | `timings.predicted_per_second`  |

Both have unit `tokens/s` and source `engine`. The engine's reported rate is
retained without rounding or recomputation from API usage: cached input, reasoning
and speculative decoding can make those counts differ. This adapter does not
manufacture client `tps` or TTFT and does not use total wall time as a phase time.
The `engine` source extends the `client` / `usage` measurement convention proposed
in qmu/research#183; this standalone addition does not import that unmerged PR.
Consumers that only accept client measurements must keep these in separate fields.

Missing phase rates become `{ value: null, unit: "tokens/s", reason: "NO-FIELD" }`.
Negative, nonfinite or nonnumeric rates become `MEASURE-FAILED`; actual zero is
preserved. A record must explicitly have `error: null`, a successful integer HTTP
status and `stop`, `length` or `tool_calls` as finish reason; otherwise both rates
are `MEASURE-FAILED`. A valid rate in one phase survives missing/invalid data in
the other. Malformed timing containers contain no usable fields.

`length` and `tool_calls` retain timing evidence, without claiming answer quality.
Keep the original record's phase, finish reason, model and hardware provenance
alongside this metric projection; warmup and steady runs must not be combined.
See [fixture provenance](./fixtures/README.md) for the pinned measured source.

Run from `packages/tech`:

```sh
npm test -- src/local-inference/vendors/strata-speed.test.ts
```

This complements qmu/research#188's `Completion` conversion (total client time
and output count); it does not replace or duplicate that adapter. No CLI, model
registration, comparison report, or Web page changes are included here.
