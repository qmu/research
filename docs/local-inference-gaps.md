# Local inference comparison: gaps and failures

Generated 2026-10-25T02:00:00.000Z from input 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08. Procedure: single-request-per-engine.

Every engine is one row, in the fixed order Ollama, llama.cpp, MLX, Strata. A missing metric (欠測) keeps its gap reason — `NO-FIELD`, `NOT-RUN` or `MEASURE-FAILED` — instead of a blank cell or a zero. A run that was not adopted into the comparison (不採用) carries one of eight fixed failure codes in the last column; a measured run shows `—` there because nothing was rejected.

| Engine | Model | Runtime | Status | Condition | TTFT | Completion tokens | TPS | Startup | Peak RSS | 不採用理由 (failure code) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ollama | fixture-model-7b | fixture-0.0.0 | measured | context&#95;length=4096; quantization=Q4&#95;K&#95;M | 0.42 s | 128 tokens | 31.7 tokens/s | 欠測 (NOT-RUN) | 欠測 (NOT-RUN) | — |
| llama.cpp | fixture-model-7b | fixture-0.0.0 | measured | context&#95;length=4096; quantization=Q4&#95;K&#95;M | 0.39 s | 128 tokens | 欠測 (NO-FIELD) | 欠測 (NOT-RUN) | 欠測 (NOT-RUN) | — |
| MLX | fixture-model-7b | fixture-0.0.0 | failed | context&#95;length=4096; quantization=nominal 4-bit | 欠測 (MEASURE-FAILED) | 欠測 (MEASURE-FAILED) | 欠測 (MEASURE-FAILED) | 欠測 (NOT-RUN) | 欠測 (NOT-RUN) | NOT-LOADABLE |
| Strata | fixture-model-7b | fixture-0.0.0 | failed | context&#95;length=4096; quantization=nominal 4-bit | 欠測 (MEASURE-FAILED) | 欠測 (MEASURE-FAILED) | 欠測 (MEASURE-FAILED) | 欠測 (NOT-RUN) | 欠測 (NOT-RUN) | UNREACHABLE |
