---
title: Local inference on Apple Silicon — Strata, Ollama, llama.cpp server, MLX (official sources)
description: Apple Silicon requirements, model format, quantization, server/API and measurable metrics of Strata, Ollama, llama.cpp server and MLX, each taken from the engine's own pinned official sources.
---

# Local inference on Apple Silicon — Strata, Ollama, llama.cpp server, MLX (official sources)

Scope: this page records what each project states about itself. Strata
statements come from the official repository
[Niko1221/Strata](https://github.com/Niko1221/Strata) (MIT license) at commit
`7dd5cf18e68c639a8773e096c5c79f971ea2a9f5`. Ollama, llama.cpp server and MLX
statements come from the upstream repositories at the commits pinned in the
[Sources](#sources) section, read on 2026-10-24. No number here was measured by
this repository; figures are each project's own reports and are marked as such.
Documentation paths below are relative to the named commit.

**Side-by-side comparison** is the first table. The Strata-only sections after
it keep their original detail.

**Open items.**

- The Ollama, llama.cpp server and MLX columns are filled from their own
  official material only. No benchmark was run for any engine, so none of their
  figures is reproduced here.
- The requirements for llama.cpp server are not given in the sources read
  (its build docs confirm Metal is on by default on macOS, but name no minimum
  macOS or chip). The cell says so.
- "Strata" was identified as `Niko1221/Strata` (the only LLM inference engine
  of that name found by repository search; its README links the `strataengine`
  support page). Other repositories named Strata or PolyStrata were not used.
  Confirm this is the intended project.

## Side-by-side comparison

Each cell is what that project's own pinned source states. Link labels point
to the [Sources](#sources) list.

| Dimension | Strata | Ollama | llama.cpp server | MLX (mlx-lm) |
| --- | --- | --- | --- | --- |
| Apple Silicon requirement | M1 or newer; macOS 15 or newer; Intel Macs cannot run it [S-mac] | Apple M-series for GPU; x86 Macs run CPU-only; macOS Sonoma (14) or newer [O-mac] | Metal is on by default on macOS [L-build]; no minimum macOS or chip stated in the sources read | Apple silicon; native arm64 Python ≥ 3.10; macOS ≥ 14.0 [MLX-install]. mlx-lm's wired-memory speed-up needs macOS 15 or higher [MLXLM-readme] |
| GPU / backend | Strata's own engine on Metal [S-mac] | Metal GPU on Apple M-series [O-mac] | Metal backend, GPU offload via `--n-gpu-layers` [L-build] | MLX arrays in unified memory on Apple silicon [MLX-core-readme] |
| Model format | GGUF weights [S-mac] | Imports Safetensors directories (`FROM <dir>`) or GGUF files (`FROM <file>.gguf`, split shards by wildcard); Ollama does not quantize GGUF on import [O-import] | GGUF, loaded with `-m <file>` or `-hf <user>/<model>[:quant]` [L-server] | Safetensors weights (`model*.safetensors`) with `config.json`, loaded from a local or Hugging Face path [MLX-utils] |
| Quantization | Packs Q2_0, IQ3_XXS, IQ3_S, Unsloth UD-Q4_K_XL / UD-Q5_K_XL / UD-Q6_K_XL, agentionai Gyro-S / Gyro-M [S-mac] | Safetensors import with `--quantize`: `int4`, `int8`, `nvfp4`, `mxfp4`, `mxfp8` [O-quant-src]. GGUF must be quantized beforehand with an external tool [O-import] | `llama-quantize` from an F32/BF16 GGUF; types include Q2_K through Q8_0 and IQ1_S through IQ4_NL [L-quant] | `mlx_lm.convert -q` converts and quantizes; the README example yields 4-bit weights [MLXLM-readme] |
| API | OpenAI-compatible `/v1` at `127.0.0.1:8080`; Anthropic `/v1/messages`; OpenAI Responses `/v1/responses` [S-readme] | Native `/api/generate`, `/api/chat` at `localhost:11434`; OpenAI-compatible `/v1/chat/completions`, `/v1/completions`, `/v1/responses`, `/v1/models` [O-api], [O-openai] | Native `/completion` (not OpenAI-compatible); OpenAI-compatible `/v1/chat/completions`, `/v1/completions`, `/v1/responses`; Anthropic-compatible `/v1/messages`; default `127.0.0.1:9931` [L-server] | `mlx_lm.server`: OpenAI-style `/v1/chat/completions` and `/v1/models` on port 8080 [MLX-server] |
| Measurable metrics | Response `timings` with `prompt_n`, `prompt_ms`, `predicted_n`, `predicted_ms`; client-side TTFT (see protocol below) [S-bench] | Durations in nanoseconds: `total_duration`, `load_duration`, `prompt_eval_count`, `prompt_eval_duration`, `eval_count`, `eval_duration`. Decode tok/s = `eval_count` / `eval_duration` × 10⁹ [O-api] | Response `timings`: `prompt_n`, `prompt_ms`, `predicted_n`, `predicted_ms`, `predicted_per_second`; `timings_per_token` option; Prometheus `/metrics` [L-server] | Server `usage`: `prompt_tokens`, `completion_tokens` (no timing fields in SERVER.md). `mlx_lm.benchmark -p 2048 -g 128` reports prompt tok/sec, generation tok/sec and memory GB [MLX-bench] |

## Apple Silicon support

| Item | Statement | Source |
| --- | --- | --- |
| Chips | Apple Silicon, M1 or newer. Intel Macs cannot run it. | `docs/MAC.md` |
| OS | macOS 15 or newer (the engine uses a Metal residency set, introduced in macOS 15). | `docs/MAC.md` |
| Backend | Strata's own engine on Metal (`metal/`); host code and server are the same as on PC. | `docs/MAC.md` |
| Install | `.dmg` app, `strata launch` in a terminal, or `./setup.sh` (source build, 1–15 min, needs Command Line Tools). | `README.md`, `docs/MAC.md` |
| Maturity | "new". Measured on three Macs only: M5 Max 128 GB, M4 Mac mini 32 GB, M1 Max 34 GB. Other chips untested. | `docs/MAC.md` |
| Disk | About 80 GB free; downloads 66–84 GB plus ~7 GB for the pack. | `README.md`, `docs/MAC.md` |

## Model format

- Weights are GGUF files (for example Unsloth and agentionai GGUF repositories
  on Hugging Face). Strata builds against llama.cpp's ggml at a pinned commit
  (`docs/MAC.md`, install step 4).
- The main supported model is Qwen3.8-Flash-Next (125 B parameters, mixture of
  experts: 512 experts per layer, 10 used per token, 48 layers —
  `docs/QUANTS.md`). DeepSeek V4.1-Flash is terminal-only and listed for
  NVIDIA and AMD cards, not for Mac (`README.md`).
- Setup rewrites the experts into a "pack" and can add an MTP draft layer;
  on a Mac that streams from SSD it writes a second copy `<model>.experts`
  (`docs/MAC.md`).

## Quantization

Packs offered on Mac (`docs/MAC.md`): Q2_0, IQ3_XXS, IQ3_S, Unsloth
UD-Q4_K_XL / UD-Q5_K_XL / UD-Q6_K_XL, and agentionai Gyro-S / Gyro-M.
The app and `strata launch` offer Q2_0, IQ3_XXS and IQ3_S; the Unsloth
many-shard files need `./setup.sh` for now.

Quality against Q8_0 is reported for two packs on the M5 Max
(`docs/MAC.md`): IQ3_S 87.9 % top-1 / KL 0.142, UD-Q4_K_XL 92.8 % / KL 0.055.
The others are "not measured".

## Required memory (Apple Silicon)

Metal lets one program keep about 3/4 of memory resident (107.5 of 128 GB,
measured on M5 Max).

| Pack | File the GPU maps | Needs about | Recommended from |
| --- | ---: | ---: | ---: |
| Q2_0 | 37.6 GB | 46 GB | 64 GB |
| IQ3_XXS | 47.0 GB | 55 GB | 74 GB |
| IQ3_S | 54.8 GB | 63 GB | 96 GB |
| UD-Q4_K_XL | 82.6 GB | 91 GB | 128 GB |
| UD-Q5_K_XL / Q6_K_XL | 103.9 / 114.8 GB | streamed from SSD on 128 GB | 128 GB, streamed |
| Gyro-S | 29.7 GB | 38 GB | 48 GB |
| Gyro-M | 63.2 GB | 71 GB | 96 GB (not measured on Mac) |

Below the "needs about" figure (32–48 GB Macs) the engine streams experts from
the SSD through a cache arena; a Mac under 16 GB is told the model does not
fit. Each pack also has a 28.8 GB n-gram table read from the SSD, not counted
against memory. On Macs with 64 GB or more the engine footprint is capped at
60 % of RAM for streamed packs (resident packs: 70 %).

## Server and API

Source: `README.md`, `docs/MAC.md`, `docs/TERMINAL.md`.

| Interface | Address |
| --- | --- |
| OpenAI-compatible API | `http://127.0.0.1:8080/v1` (any API key, any model name locally) |
| Anthropic API | `http://127.0.0.1:8080/v1/messages` |
| OpenAI Responses API | `http://127.0.0.1:8080/v1/responses` |
| Chat page | `http://127.0.0.1:8080/` |
| MCP server | install/start/stop Strata (`docs/MCP_SERVER.md`) |

Control: `strata launch [--model NAME --yes --no-tui]`, `--status`, `--stop`,
`strata monitor`, `strata doctor`, `strata connect`. Remote access:
`strata launch --access lan` (generates an API key). Default concurrency is one
request at a time; `--parallel N` raises it (`docs/BATCHING.md`). Streaming
chat answers end with a chunk carrying `usage` and `timings`, using
llama.cpp's field names (`docs/BENCHMARK_PROTOCOL.md`).

## Measurable metrics

Defined by the project's draft benchmark protocol
(`docs/BENCHMARK_PROTOCOL.md`, `strata bench run`, protocol ID
`strata-qwen38-thinking-v1-draft.1`; status: draft, pilot validation pending).

| Metric | Definition | Source field |
| --- | --- | --- |
| Prompt tokens/s | freshly processed tokens / engine prompt time (cached tokens excluded) | `timings.prompt_n`, `prompt_ms` |
| Decode tokens/s | engine decode tokens / decode time (rejected speculative drafts excluded) | `timings.predicted_n`, `predicted_ms` |
| TTFT | client time from dispatch to first non-empty reasoning/answer/tool-call delta | client clock |
| First-answer latency | dispatch to first final-answer text or tool call | client clock |
| Total duration | dispatch to stream end | client clock |
| Concurrent aggregate tokens/s | output tokens in a round / wall time of the round (optional stage) | client clock |
| Quality | top-1 agreement and KL against Q8_0 | `docs/MAC.md` |
| Memory | bytes; on Apple Silicon one shared-memory GPU entry | protocol |

On Apple Silicon the protocol records the GPU as shared memory sized to
installed RAM, with the macOS version as the `metal` runtime version.

## Project-reported numbers (not reproduced here)

All from `docs/MAC.md`; greedy decoding, 200 generated tokens unless noted.

| Machine | Pack | Decode tok/s | Prompt tok/s | llama.cpp (same Mac, as reported by Strata) |
| --- | --- | ---: | ---: | --- |
| M5 Max 128 GB (resident) | Q2_0 | 119.5 / 108.2 (MTP, two prompts) | ~1,430 (4K) | 56.6 decode; 887 (4K) |
| M5 Max 128 GB | IQ3_S | 98.2 / 94.1 (MTP) | ~1,320 (4K) | 51.1 / 44.1 decode; 791 (4K) |
| M4 Mac mini 32 GB (SSD-streamed, no MTP) | Q2_0 | 14.1 / 13.5 | 93.6 (4K) | CPU only: 6.3 decode; 21.2 |
| M1 Max 34 GB (streamed) | Q2_0 | 7.9 | 186 (9,940-token prompt) | — |

These comparisons are the vendor's own and were not independently reproduced;
treat them as claims to verify with the same protocol on the same hardware.

## Sources

Every link is pinned to a commit, so a later change upstream does not move the
statement. Paths follow the pinned commit.

Strata (`Niko1221/Strata` @ `7dd5cf18e68c639a8773e096c5c79f971ea2a9f5`):

- [S-readme] `README.md`
- [S-mac] `docs/MAC.md`
- [S-bench] `docs/BENCHMARK_PROTOCOL.md`

Ollama (`ollama/ollama` @ `d44c2581904a98430e348d89cc2af1529b1808a0`):

- [O-mac] `docs/macos.mdx`
- [O-api] `docs/api.md`
- [O-openai] `docs/api/openai-compatibility.mdx`
- [O-import] `docs/import.mdx`
- [O-quant-src] `cmd/create_safetensors.go`: source code, not a doc page; it lists the accepted `--quantize` values

llama.cpp (`ggml-org/llama.cpp` @ `d327bf1f0780f87b8c01b367b61853b0c291d7c4`):

- [L-server] `tools/server/README.md`
- [L-build] `docs/build.md`
- [L-quant] `tools/quantize/README.md`

MLX (`ml-explore/mlx` @ `56c2bf9236d929097f61e2c6e55be4e4bb6da249`):

- [MLX-install] `docs/src/install.rst`
- [MLX-core-readme] `README.md`

mlx-lm (`ml-explore/mlx-lm` @ `4cfc6478473b0668ede3eb0cc93f2a9181a15052`):

- [MLXLM-readme] `README.md`
- [MLX-server] `mlx_lm/SERVER.md`
- [MLX-bench] `mlx_lm/BENCHMARKS.md`
- [MLX-utils] `mlx_lm/utils.py`

[S-readme]: https://github.com/Niko1221/Strata/blob/7dd5cf18e68c639a8773e096c5c79f971ea2a9f5/README.md
[S-mac]: https://github.com/Niko1221/Strata/blob/7dd5cf18e68c639a8773e096c5c79f971ea2a9f5/docs/MAC.md
[S-bench]: https://github.com/Niko1221/Strata/blob/7dd5cf18e68c639a8773e096c5c79f971ea2a9f5/docs/BENCHMARK_PROTOCOL.md
[O-mac]: https://github.com/ollama/ollama/blob/d44c2581904a98430e348d89cc2af1529b1808a0/docs/macos.mdx
[O-api]: https://github.com/ollama/ollama/blob/d44c2581904a98430e348d89cc2af1529b1808a0/docs/api.md
[O-openai]: https://github.com/ollama/ollama/blob/d44c2581904a98430e348d89cc2af1529b1808a0/docs/api/openai-compatibility.mdx
[O-import]: https://github.com/ollama/ollama/blob/d44c2581904a98430e348d89cc2af1529b1808a0/docs/import.mdx
[O-quant-src]: https://github.com/ollama/ollama/blob/d44c2581904a98430e348d89cc2af1529b1808a0/cmd/create_safetensors.go
[L-server]: https://github.com/ggml-org/llama.cpp/blob/d327bf1f0780f87b8c01b367b61853b0c291d7c4/tools/server/README.md
[L-build]: https://github.com/ggml-org/llama.cpp/blob/d327bf1f0780f87b8c01b367b61853b0c291d7c4/docs/build.md
[L-quant]: https://github.com/ggml-org/llama.cpp/blob/d327bf1f0780f87b8c01b367b61853b0c291d7c4/tools/quantize/README.md
[MLX-install]: https://github.com/ml-explore/mlx/blob/56c2bf9236d929097f61e2c6e55be4e4bb6da249/docs/src/install.rst
[MLX-core-readme]: https://github.com/ml-explore/mlx/blob/56c2bf9236d929097f61e2c6e55be4e4bb6da249/README.md
[MLXLM-readme]: https://github.com/ml-explore/mlx-lm/blob/4cfc6478473b0668ede3eb0cc93f2a9181a15052/README.md
[MLX-server]: https://github.com/ml-explore/mlx-lm/blob/4cfc6478473b0668ede3eb0cc93f2a9181a15052/mlx_lm/SERVER.md
[MLX-bench]: https://github.com/ml-explore/mlx-lm/blob/4cfc6478473b0668ede3eb0cc93f2a9181a15052/mlx_lm/BENCHMARKS.md
[MLX-utils]: https://github.com/ml-explore/mlx-lm/blob/4cfc6478473b0668ede3eb0cc93f2a9181a15052/mlx_lm/utils.py
