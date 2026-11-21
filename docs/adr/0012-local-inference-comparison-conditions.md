# 0012 — One prompt set, one model condition and one metric set for local inference engines

- **Status**: proposed (2026-10-24) — the choice of model, and any publication of a cross-engine figure, is the owner's, because it decides which comparison the article may assert. This record fixes the conditions and the gaps. It measures nothing.
- **Related**: [qmu/research#177](https://github.com/qmu/research/pull/177) (what each engine states about itself, from pinned sources); [qmu/research#176](https://github.com/qmu/research/pull/176) (fixed inputs, quality judgment and runtime metric definitions; conditions only, thresholds unset); [0009](0009-end-to-end-throughput.md) (the throughput definition this follows).

## Context

- #177 records what Strata, Ollama, llama.cpp server and MLX say about themselves, at pinned commits. It runs no benchmark, and its figures are each project's own.
- #176 fixes the inputs, quality judgment and runtime metrics per task. It requires that compared models share their conditions, but does not say how those conditions map onto four different engines.
- Read together, the two leave four things open: which request each engine receives, which weight file each engine loads, which timing numbers are comparable, and what to record where a value cannot be obtained. The sources read on 2026-10-24 show that the engines differ on each of these:
  - **Endpoint.** Strata exposes an OpenAI-compatible `/v1` API; Ollama, llama.cpp server and `mlx_lm.server` expose `/v1/chat/completions`.
  - **Timing fields.** Ollama's OpenAI-compatible responses carry `usage` only (`include_usage`); its durations (`eval_count`, `eval_duration`) are on the native `/api/chat`. The `mlx_lm.server` `usage` object carries token counts only; its SERVER.md lists no timing field. Strata and llama.cpp server return `timings`, with `predicted_n` and `predicted_ms`.
  - **Weight format.** Ollama imports a GGUF file without quantizing it (`--quantize` applies to Safetensors imports only). MLX loads `model*.safetensors` with a `config.json`. Strata's packs are derived from GGUF during setup, so they are not the GGUF bytes.

## Decision (proposed)

### 1. Same prompt

- Each item is sent as the identical `messages` array: the one fixed system message for its task and one user message per item, both from #176 §1. Every engine receives the same text.
- The harness applies no chat template of its own. Each runtime applies the model's template. That step is not under our control, so it is recorded as part of the runtime identity (name and version).
- Sampling is `temperature=0`, `top_p=1`, `seed=42`, `max_tokens=1024` (`summarize`: 512), as #176 §1 sets. The sent `seed` is recorded; whether a runtime honours it is taken from its behaviour, not assumed.
- Every run uses **streaming**, because `ttft_*` needs it. An engine that cannot stream has no TTFT for that run, which is a gap in §4.
- Prompt cache is off unless the run is labelled `cache=on` (#176 §1).
- Every engine is pinned to one request at a time, so that batch size is 1 for all four.

### 2. Same model condition

- One model, one quantization label, one context length and one thread / GPU-layer setting, all explicit, not `auto`. Model name, revision, file SHA-256, runtime name and version, and hardware are recorded per #176 §2.
- **Speculative decoding is off** in the primary condition for every engine (Strata's MTP draft, or any draft model). Strata's MTP figures are reported only as a separate condition row, never mixed with the others.
- The weight file per engine:

| Engine | Weight file loaded | Identity with the other engines |
| --- | --- | --- |
| Ollama | GGUF via `FROM <file>.gguf` | Same bytes (import does not requantize) |
| llama.cpp server | GGUF via `-m <file>` | Same bytes |
| MLX (mlx-lm) | Safetensors, converted from the source checkpoint with `mlx_lm.convert -q` | Same source and nominal bit width; **not** the same bytes |
| Strata | Pack derived from GGUF during setup | Nominal scheme only; bytes differ. The pack's SHA-256 is recorded |

The rule for the table: two runs are comparable only if they share every field of §2 except the engine. Where a row says "not the same bytes", the comparison is labelled with that row's gap and the quantization is compared by its nominal label only.

### 3. Same metrics

Metric ids are those of #176 §4. The **client clock is the primary source for all four engines**, so every engine is measured by the same clock. Runtime timings are cross-checks, recorded when the response carries them. They never stand in for a missing client figure, because the engines count time in different scopes (Ollama counts only eval time in nanoseconds; Strata excludes rejected drafts; MLX reports none).

| Metric | Primary (all engines) | Runtime cross-check, where present |
| --- | --- | --- |
| `startup_time` | Client clock: process launch to the first-token probe | — |
| `ttft_first`, `ttft_steady` | Client clock to the first streamed content delta | — |
| `tps_first`, `tps_steady` | `usage` completion tokens / client time from first to last token | Strata and llama.cpp `timings` (`predicted_n` / `predicted_ms`); Ollama `eval_count` / `eval_duration` from a separate native-API run only |
| `peak_rss` | OS tool, as #176 §4 | — |
| `quality_<task>` | As #176 §3 | — |

Token counts come from the runtime's `usage` field, not from whitespace splitting (#176 §4). A count the runtime does not return is a gap (§4), not an estimate.

### 4. Missing data

A value that cannot be obtained is written as `n/a` with a reason code. It is never written as `0`, left blank, or estimated silently.

| Code | Meaning |
| --- | --- |
| `NO-FIELD` | The engine's documented response has no such field. |
| `NOT-STATED` | The sources read do not state the value. |
| `NOT-EXPOSED` | The OS does not expose the measure. |
| `NOT-LOADABLE` | The engine cannot load the weight file in the chosen condition. |
| `NOT-COMPARABLE` | The value exists only under a different condition, so it goes in its own row. |
| `NOT-RUN` | Not yet run (waiting on the open items in §5). |

Gaps known at this record:

| Engine / scope | Gap | Code | Handling |
| --- | --- | --- | --- |
| llama.cpp server | Minimum macOS version and chip are not stated in the sources read (#177); Metal is on by default on macOS | `NOT-STATED` | The requirements cell says "not stated". No minimum is inferred. |
| MLX (`mlx_lm.server`) | No timing field in the response (SERVER.md lists `usage` only) | `NO-FIELD` | `tps_*` and `ttft_*` from the client clock; no runtime tok/s. `mlx_lm.benchmark` is a different procedure (prompt 2048, generation 128) and is not mixed into this bench. |
| Ollama (OpenAI-compatible endpoint) | Duration fields are not in the OpenAI-compatible response | `NO-FIELD` | Main run uses the same endpoint as the others. Eval timing is a cross-check in a separate native-API run, if run at all. |
| MLX | A GGUF file is not loadable by mlx-lm (`mlx_lm/utils.py` loads `model*.safetensors`) | `NOT-LOADABLE` | Converted from the source checkpoint; not byte-identical (§2). |
| Strata | Packs are derived from GGUF; byte identity with the others is not possible | `NOT-COMPARABLE` | Nominal scheme only, with the pack SHA-256 recorded. |
| Strata | Its benchmark protocol is a draft, with pilot validation pending (#177) | `NOT-RUN` | Not adopted as the procedure. Its `timings` are cross-checks only. |
| Strata | Quality against Q8_0 is measured for two packs only; the rest are "not measured" | `NOT-STATED` | Vendor quality figures are not used as evidence. Quality comes from §3 (#176). |
| All engines | Peak GPU / wired memory where the OS does not expose it | `NOT-EXPOSED` | `n/a`. |
| All engines | Thresholds for every metric | `NOT-RUN` | Unset, to be chosen after a calibration run (#176 §6). |

## Consequences

- No cross-engine speed or quality figure is published unless its row matches §2 in every field except the engine (and, where marked `NOT-COMPARABLE` or `NOT-LOADABLE`, the labelled exception).
- Figures reproduced from #177 stay labelled as vendor-reported, and are not measured here.
- A run with `n/a` cells keeps them in the table, with their codes. A cell is never dropped to make a comparison look complete.

## Open items for the owner

1. **Model.** Choose one model that all four engines can load in one quantization. The sources read do not establish one. Strata's documented main model is a 125 B mixture-of-experts pack (#177), and nothing read shows that the other engines load it.
2. **Hardware.** Strata's own documentation tests three Macs (M5 Max 128 GB, M4 Mac mini 32 GB, M1 Max 34 GB) and says other chips are untested. A bench machine outside that list leaves Strata's run untested on that hardware.
3. **Judge model and rubric** for `summarize` (#176 §3). Not yet chosen; it must be pinned before any run.
4. **Identity of Strata.** #177 resolved "Strata" to `Niko1221/Strata` by search. The owner should confirm it.
5. **MTP as a condition row.** Confirm that Strata's MTP runs are reported only as a separate row (§2).

## Sources

Pinned to the commits that #176 and #177 read.

- #176 bench-spec at [`c6a480b`](https://github.com/qmu/research/blob/c6a480bafe79560f05216bbf9f44f2d8d0ad0e29/docs/bench-spec/local-llm-bench-spec.md)
- #177 comparison at [`8cdeff1`](https://github.com/qmu/research/blob/8cdeff1fd420116de048106b05703a70f8d24ee9/docs/strata-local-inference.md)
- Ollama `docs/api.md` at [`d44c258`](https://github.com/ollama/ollama/blob/d44c2581904a98430e348d89cc2af1529b1808a0/docs/api.md): `eval_count` and `eval_duration` on the native API
- Ollama `docs/api/openai-compatibility.mdx` at `d44c258`: `usage` only (`include_usage`), no duration fields
- mlx-lm `mlx_lm/SERVER.md` at [`4cfc647`](https://github.com/ml-explore/mlx-lm/blob/4cfc6478473b0668ede3eb0cc93f2a9181a15052/mlx_lm/SERVER.md): `usage` only
