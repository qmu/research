---
title: Strata — Apple Silicon local inference (official sources)
description: Apple Silicon support, model format, quantization, memory, server/API and measurable metrics of the Strata inference engine, taken only from the official repository and its documentation.
---

# Strata — Apple Silicon local inference (official sources)

Scope: this page records what the Strata project states about itself. Every
statement is taken from the official repository
[Niko1221/Strata](https://github.com/Niko1221/Strata) (MIT license) at commit
`7dd5cf18e68c639a8773e096c5c79f971ea2a9f5` (`main`, read 2026-10-25). No
number here was measured by this repository; figures are the project's own
reports and are marked as such. Documentation paths below are relative to that
commit.

**Open items.**

- The repository has no existing Ollama / llama.cpp / MLX comparison page, so
  this page is a standalone entry. The columns for those three engines are not
  filled here, because the request limited sources to Strata's official
  material.
- "Strata" was identified as `Niko1221/Strata` (the only LLM inference engine
  of that name found by repository search; its README links the `strataengine`
  support page). Other repositories named Strata or PolyStrata were not used.
  Confirm this is the intended project.

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
