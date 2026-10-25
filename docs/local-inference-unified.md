# Local inference: speed, quality, memory and failure reasons

Generated 2026-10-25T00:00:00.000Z from input 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08. Procedure: synthetic-fixture-only (no engine measured).

欠測理由: 未対応 (`UNSUPPORTED`), 失敗 (`MEASURE-FAILED`), 記録なし (`NO-FIELD`: field absent; `NOT-RUN`: measurement not run). Reasons belong to each metric; a run failure never overwrites them. A recorded zero remains a measured value.

## All engines

Every engine is one row, in the fixed order Ollama, llama.cpp, MLX, Strata. A missing metric (欠測) keeps its gap reason instead of a blank cell or a zero. A run that was not adopted into the comparison (不採用) carries one of eight fixed failure codes in the last column; a measured run shows `—` there because nothing was rejected.

| Engine | Model | Runtime | Status | TTFT | TPS | Startup | Quality | Peak RSS | 不採用理由 (failure code) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ollama | fixture-model-7b | fixture-0.0.0 | measured | 0.42 s | 31.7 tokens/s | 欠測 (NOT-RUN) — 記録なし | 0.86 score | 欠測 (NOT-RUN) — 記録なし | — |
| llama.cpp | fixture-model-7b | fixture-0.0.0 | measured | 0.39 s | 欠測 (NO-FIELD) — 記録なし | 欠測 (NOT-RUN) — 記録なし | 0.83 score | 5123 MiB | — |
| MLX | fixture-model-7b | fixture-0.0.0 | failed | 欠測 (MEASURE-FAILED) — 失敗 | 欠測 (MEASURE-FAILED) — 失敗 | 欠測 (NOT-RUN) — 記録なし | 欠測 (MEASURE-FAILED) — 失敗 | 欠測 (NOT-RUN) — 記録なし | NOT-LOADABLE |
| Strata | fixture-model-7b | fixture-0.0.0 | measured | 欠測 (UNSUPPORTED) — 未対応 | 27.4 tokens/s | 1.1 s | 欠測 (UNSUPPORTED) — 未対応 | 欠測 (NO-FIELD) — 記録なし | — |

## Speed

| Engine | Model | Condition | TTFT | TPS | Startup |
| --- | --- | --- | --- | --- | --- |
| Ollama | fixture-model-7b | context_length=4096; quantization=Q4_K_M | 0.42 s | 31.7 tokens/s | 欠測 (NOT-RUN) — 記録なし |
| llama.cpp | fixture-model-7b | context_length=4096; quantization=Q4_K_M | 0.39 s | 欠測 (NO-FIELD) — 記録なし | 欠測 (NOT-RUN) — 記録なし |
| MLX | fixture-model-7b | context_length=4096; quantization=nominal 4-bit | 欠測 (MEASURE-FAILED) — 失敗 | 欠測 (MEASURE-FAILED) — 失敗 | 欠測 (NOT-RUN) — 記録なし |
| Strata | fixture-model-7b | context_length=4096; quantization=nominal 4-bit | 欠測 (UNSUPPORTED) — 未対応 | 27.4 tokens/s | 1.1 s |

## Quality

| Engine | Model | Condition | Quality |
| --- | --- | --- | --- |
| Ollama | fixture-model-7b | context_length=4096; quantization=Q4_K_M | 0.86 score |
| llama.cpp | fixture-model-7b | context_length=4096; quantization=Q4_K_M | 0.83 score |
| MLX | fixture-model-7b | context_length=4096; quantization=nominal 4-bit | 欠測 (MEASURE-FAILED) — 失敗 |
| Strata | fixture-model-7b | context_length=4096; quantization=nominal 4-bit | 欠測 (UNSUPPORTED) — 未対応 |

## Memory

| Engine | Model | Condition | Peak RSS |
| --- | --- | --- | --- |
| Ollama | fixture-model-7b | context_length=4096; quantization=Q4_K_M | 欠測 (NOT-RUN) — 記録なし |
| llama.cpp | fixture-model-7b | context_length=4096; quantization=Q4_K_M | 5123 MiB |
| MLX | fixture-model-7b | context_length=4096; quantization=nominal 4-bit | 欠測 (NOT-RUN) — 記録なし |
| Strata | fixture-model-7b | context_length=4096; quantization=nominal 4-bit | 欠測 (NO-FIELD) — 記録なし |

## Failure reasons

| Engine | Model | 不採用理由 (failure code) |
| --- | --- | --- |
| MLX | fixture-model-7b | NOT-LOADABLE |
