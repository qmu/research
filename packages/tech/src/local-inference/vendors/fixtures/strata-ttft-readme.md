# Strata TTFT fixture

`strata-ttft-warmup.json` projects the fields `normalizeStrataTtft` reads from
the first (warmup) line of the upstream
[outputs.jsonl](https://github.com/Niko1221/Strata/blob/7dd5cf18e68c639a8773e096c5c79f971ea2a9f5/bench/results/2026-10-20-0.2.1-bench/p2003-rtx3060/run3-with-fixes/outputs.jsonl)
at commit `7dd5cf18e68c639a8773e096c5c79f971ea2a9f5`. Retained field values are
unchanged from that record; `final_answer`, `usage`, `timings` and the event
list are omitted since this projection only exercises TTFT.

The fixture includes `first_delta` (`offset_s: 0.896668`, `kind: "reasoning"`)
purely to document the upstream record's shape: it is never read by
`normalizeStrataTtft`, which uses `first_answer_offset_s` (`2.689731`) instead.
`dispatch_offset_s` is `0.0`, so this replay's TTFT is `2.689731` seconds. It
replays a published measurement, not a new research-dev or Apple Silicon run.
