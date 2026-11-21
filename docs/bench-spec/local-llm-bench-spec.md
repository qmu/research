# bench-spec: local LLM task and runtime measurement conditions

Status: proposed (for developer approval per `docs/research-development-guideline.md`).

This document fixes the inputs, quality judgment, and runtime measurements for a
bench of local LLM runs across four tasks. It defines **conditions only**. The
declarative schema is tracked separately (qmu/research#171; tolerance in #174;
metric semantics in #175), and the tables below are written to map onto its
fields (`FixedInput`, `ModelCondition`, `ExpectedMetric`).

## 1. Tasks and fixed inputs

Each task has a fixed input set. Inputs are committed verbatim and identified by
SHA-256; a change to any input is a new `inputSetVersion`, never an in-place
edit. Every item uses the same prompt template for every model.

| Task id | Task | Items | Input (fixed) | Reference |
| --- | --- | --- | --- | --- |
| `implement` | Implementation | 10 | Function specs (signature, docstring, 3 examples), language TypeScript | Hidden unit tests per item |
| `test` | Test writing | 10 | Existing function source with no tests | 5 seeded faulty variants per function |
| `summarize` | Summarization | 10 | Public-domain articles, 800-1,200 words each | 3 human-written key points per article |
| `gather` | Information gathering | 10 | Questions answerable only from a supplied 20-document corpus (inlined, or fixed BM25 top-5 retrieval) | Gold answer + gold supporting document ids |

Common conditions:

- Decoding: `temperature=0`, `top_p=1`, `seed=42`, `max_output_tokens=1024`
  (`summarize`: 512). Context window set explicitly and recorded.
- Batch size 1, one request at a time. No prompt cache reuse between items unless
  the run is labelled `cache=on`.
- The model's own chat template; one fixed system prompt per task.

## 2. Model conditions

Recorded for every run. Two runs are comparable only if every field matches
except the model under test.

| Field | Requirement |
| --- | --- |
| Model | Name, revision/commit, file SHA-256 |
| Quantization | Exact scheme (for example Q4_K_M, 8-bit, fp16) |
| Runtime | Name and version (llama.cpp build hash, MLX version, Ollama version) |
| Hardware | CPU/chip, GPU, RAM, OS version, power state (plugged in, no low-power mode) |
| Context length | Tokens, identical across compared models |
| Threads / GPU layers | Explicit values, not "auto" |

## 3. Quality judgment

Scored per item (0-1); the task score is the mean over its 10 items.

| Task | Judge | Item score |
| --- | --- | --- |
| `implement` | Run hidden tests in a sandbox, 10 s timeout | pass@1: 1 if all tests pass, else 0 |
| `test` | Run generated tests against the correct function and the 5 faulty variants | 0 if any test fails on the correct function; else detected variants / 5 |
| `summarize` | Key-point coverage by a pinned LLM judge (`temperature=0`, rubric committed) | covered key points / 3, minus 0.25 if over 150 words (floor 0) |
| `gather` | Normalized match to the gold answer, plus supporting-id recall | 0.7 x answer correct + 0.3 x supporting-id recall |

Rules: the judge model and rubric are pinned and recorded; each `summarize`
judgment is repeated 3 times and the median taken; empty output, or output cut
off at `max_output_tokens` before an answer, scores 0. The whole set is run 3
times (section 5); quality is reported as mean and min-max.

## 4. Runtime metrics

| Metric id | Unit | Direction | Definition |
| --- | --- | --- | --- |
| `startup_time` | s | lower | Wall time from process launch until a 1-token probe returns its first token. Cold = model file not in page cache; warm = cached. Reported separately |
| `ttft_first` | s | lower | Time to first token of the first request after startup (includes warmup and graph compilation) |
| `tps_first` | tokens/s | higher | Output tokens divided by generation time (after first token) for the first request after startup |
| `tps_steady` | tokens/s | higher | Median generation speed over requests 6-30 of a run (first 5 discarded as warmup) |
| `ttft_steady` | s | lower | Median time to first token over the same requests |
| `peak_rss` | MiB | lower | Peak resident set size of the runtime process tree, sampled every 100 ms from launch to end of run (`/usr/bin/time -l` max RSS on macOS; `VmHWM` in `/proc/<pid>/status` on Linux). On unified-memory GPUs also report peak GPU/wired memory where the OS exposes it |

Token counts come from the runtime's own usage fields, not whitespace splitting.
Streaming timestamps use a client-side monotonic clock. First-request and steady
numbers are never merged into one figure.

## 5. Procedure and validity

1. Quiesce the machine (no other heavy processes, idle thermal baseline).
2. Cold run: drop the file cache where permitted, launch, record cold
   `startup_time` and the first-request metrics.
3. Run the 40 items in a fixed order; repeat the whole set 3 times with a
   restart between repetitions (warm `startup_time`).
4. Report median and min-max across repetitions. A measurement the platform
   cannot provide (for example peak GPU memory) is reported as `n/a`, never 0.
5. A run is invalid if the OS records sustained throttling or any item errors for
   runtime reasons. Invalid runs are discarded and rerun, and the discard is noted.

## 6. Mapping onto the bench-spec schema

- `FixedInput`: one entry per task id in section 1; `itemCount` = Items.
- `ModelCondition`: one entry per model x quantization x runtime in section 2.
- `ExpectedMetric`: one entry per metric id in section 4, plus `quality_<task>`
  for each task in section 3 (unit `score`, direction `higher`).

Thresholds are deliberately unset; they are chosen after a first calibration run,
per the proposal-first protocol.
