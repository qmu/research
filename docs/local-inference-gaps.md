# Local inference comparison: gaps and failures

Generated 2026-10-25T02:00:00.000Z from input 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08. Procedure: synthetic-fixture-only (no engine measured).

欠測理由: 未対応 (`UNSUPPORTED`), 失敗 (`MEASURE-FAILED`), 記録なし (`NO-FIELD`: field absent; `NOT-RUN`: measurement not run). Reasons belong to each metric; a run failure never overwrites them. A recorded zero remains a measured value.

## Strata: TTFT・速度・メモリ

| Metric | Value / 欠測理由 |
| --- | --- |
| TTFT | 欠測 (UNSUPPORTED) — 未対応 |
| TPS | 欠測 (MEASURE-FAILED) — 失敗 |
| Peak RSS | 欠測 (NO-FIELD) — 記録なし |

## All engines

Every engine is one row, in the fixed order Ollama, llama.cpp, MLX, Strata. A missing metric (欠測) keeps its gap reason — `NO-FIELD`, `NOT-RUN`, `MEASURE-FAILED` or `UNSUPPORTED` — instead of a blank cell or a zero. A run that was not adopted into the comparison (不採用) carries one of eight fixed failure codes in the last column; a measured run shows `—` there because nothing was rejected.

| Engine | Model | Runtime | Status | Condition | TTFT | Completion tokens | TPS | Startup | Peak RSS | 不採用理由 (failure code) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ollama | fixture-model-7b | fixture-0.0.0 | measured | context&#95;length=4096; quantization=Q4&#95;K&#95;M | 0.42 s | 128 tokens | 31.7 tokens/s | 欠測 (NOT-RUN) — 記録なし | 欠測 (NOT-RUN) — 記録なし | — |
| llama.cpp | fixture-model-7b | fixture-0.0.0 | measured | context&#95;length=4096; quantization=Q4&#95;K&#95;M | 0.39 s | 128 tokens | 欠測 (NO-FIELD) — 記録なし | 欠測 (NOT-RUN) — 記録なし | 欠測 (NOT-RUN) — 記録なし | — |
| MLX | fixture-model-7b | fixture-0.0.0 | failed | context&#95;length=4096; quantization=nominal 4-bit | 欠測 (MEASURE-FAILED) — 失敗 | 欠測 (MEASURE-FAILED) — 失敗 | 欠測 (MEASURE-FAILED) — 失敗 | 欠測 (NOT-RUN) — 記録なし | 欠測 (NOT-RUN) — 記録なし | NOT-LOADABLE |
| Strata | fixture-model-7b | fixture-0.0.0 | failed | context&#95;length=4096; quantization=nominal 4-bit | 欠測 (UNSUPPORTED) — 未対応 | 欠測 (MEASURE-FAILED) — 失敗 | 欠測 (MEASURE-FAILED) — 失敗 | 欠測 (NOT-RUN) — 記録なし | 欠測 (NO-FIELD) — 記録なし | UNREACHABLE |
