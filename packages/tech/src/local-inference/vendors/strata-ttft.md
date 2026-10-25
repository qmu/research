# Recorded Strata time-to-first-token

`normalizeStrataTtft` accepts one **parsed `outputs.jsonl` record** from
Niko1221/Strata bench. It returns a JSON-safe TTFT measurement (`value`,
`unit`, and `source` or `reason`), suitable for attaching to a common
inference result's metrics under the `ttft` key alongside live-measured
engines. It performs no network or model calls.

```ts
import { normalizeStrataTtft } from "./strata-ttft";

const ttft = normalizeStrataTtft(JSON.parse(line));
const json = JSON.stringify({ engine: "strata", metrics: { ttft } });
```

`value` (seconds) is `first_answer_offset_s - dispatch_offset_s`. Unit is `s`,
source `client` — the same `ttft` semantics
[local-inference/domain/result.ts](https://github.com/qmu/research/pull/183)
proposes for live-measured engines (first content delta minus request start).
This standalone addition does not import that unmerged PR; it defines its own
narrower measurement type instead.

`first_answer_offset_s` is used deliberately instead of `first_delta.offset_s`:
Strata's first streamed delta can be a reasoning token, which would understate
or misdescribe TTFT for the answer a caller actually wants. `first_answer_offset_s`
marks the first delta of the answer itself, so this adapter reports latency to
real answer content, not to the first token of any kind.

Missing `dispatch_offset_s` or `first_answer_offset_s` becomes
`{ value: null, unit: "s", reason: "NO-FIELD" }`. A negative, nonfinite or
nonnumeric offset, or an offset ordering that would make TTFT negative, becomes
`MEASURE-FAILED`; a measured zero is preserved. A record must explicitly have
`error: null`, a successful integer HTTP status, and `stop` or `length` as
finish reason — unlike `strata-speed.ts`, `tool_calls` is also rejected here,
because when the "first answer" is itself a tool call the offset does not mark
text onset.

Keep the original record's phase, finish reason, model and hardware provenance
alongside this metric projection; warmup and steady runs must not be combined.
See [fixture provenance](./fixtures/strata-ttft-readme.md) for the pinned
measured source.

Run from `packages/tech`:

```sh
npm test -- src/local-inference/vendors/strata-ttft.test.ts
```

This complements qmu/research#188's `Completion` conversion and
qmu/research#206's `prompt_tps`/`generation_tps` phase speeds; it adds the one
field both explicitly left unconnected (their READMEs each state they do not
synthesize TTFT) and does not duplicate either. No model registration,
comparison report, or Web page changes are included here.

## Persist into common inference JSON

From `packages/tech`, select the zero-based Strata run index explicitly:

```sh
node --import tsx/esm src/entrypoints/import-strata-ttft.ts common.json record.json new.json 3
```

`record.json` is one parsed `outputs.jsonl` row saved as a JSON object. The
importer accepts schema version 1 with `runs[].metrics`, as proposed by
qmu/research#183. It replaces only the selected Strata run's `metrics.ttft`,
retains all other metrics and provenance, and refuses to overwrite existing
files. Choose a row belonging to that run, including its phase and conditions;
the projected offsets alone cannot verify model or hardware identity. It does
not perform new inference or aggregate warmup with steady measurements.
