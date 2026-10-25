# Local inference JSON interchange

This is a deterministic report adapter, not a benchmark runner. It makes no network calls and does not choose models, thresholds or a research cadence. The proposed measurement conditions remain in [qmu/research#179](https://github.com/qmu/research/pull/179).

From `packages/tech`:

```sh
npm run local-inference:render -- src/local-inference/fixtures/comparison.json ../../docs/local-inference-comparison.md
```

The [result page](./local-inference-comparison.md) contains **synthetic fixture values**, not performance claims. Regeneration must byte-match the committed page.

The version 1 object has `schemaVersion: 1`, a required `fixture` boolean, and a `runs` array. Each row has a unique `id` and nonempty `backend`, `model`, `quantization`, `hardware`, and `condition` strings. Use separate rows for different conditions, including converted weights, caches and speculative decoding. The condition must record prompt identity, model revision and weight digest, runtime version, sampling settings, cache state and quality rubric; the renderer displays it without inferring comparability.

`speed` is completion tokens divided by client time between first and last token, in tok/s. `quality` is a task score from 0 to 1 using the recorded rubric. Both are `{ "value": number }` for measurements (zero is valid), or `{ "value": null, "reason": code }` for missing data. Runtime timing cross-checks must not silently replace client timings. Other metrics require a future version of this format.

Accepted reasons are `NO-FIELD`, `NOT-STATED`, `NOT-EXPOSED`, `NOT-LOADABLE`, `NOT-COMPARABLE`, and `NOT-RUN`. Null without a reason, negative or nonfinite numbers, quality above 1, duplicate ids, and unsupported schema versions fail before the CLI opens its output file. Empty runs produce a header-only table. Unknown extra fields are ignored for forward-compatible producer metadata.

Rows sort by id using code-unit order, independent of locale or input order. Numbers use JavaScript's canonical string representation without rounding; there are no generated timestamps. HTML and Markdown table delimiters in text are escaped. Input files and objects are never modified.
