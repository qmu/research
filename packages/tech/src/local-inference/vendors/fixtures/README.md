# Strata measured fixture

`strata-warmup.json` projects the first (warmup) line of the upstream
[outputs.jsonl](https://github.com/Niko1221/Strata/blob/7dd5cf18e68c639a8773e096c5c79f971ea2a9f5/bench/results/2026-10-20-0.2.1-bench/p2003-rtx3060/run3-with-fixes/outputs.jsonl)
at commit `7dd5cf18e68c639a8773e096c5c79f971ea2a9f5`. Retained fields are
unchanged; text, reasoning, requests and event lists are omitted.

The upstream [record writer](https://github.com/Niko1221/Strata/blob/7dd5cf18e68c639a8773e096c5c79f971ea2a9f5/strata_cli/bench_standard.py)
retains engine timings from the final stream chunk. The fixture reports
112.0 prompt tokens/s and 50.3 predicted tokens/s, rounded by the engine.
These are engine phase rates, not client-observed throughput. The `length`
finish indicates truncation; this fixture does not establish answer quality.
It replays a published measurement, not a new research-dev or Apple Silicon run.
