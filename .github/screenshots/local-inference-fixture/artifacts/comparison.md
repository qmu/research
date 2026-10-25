# Local inference comparison

Fixture only — synthetic values; no engines were measured.

Speed: completion tokens / client first-to-last-token seconds (tok/s). Quality: task score in [0, 1], higher is better. Condition identifies the prompt, model revision/weight digest, runtime version, sampling, cache and quality rubric; compare only matching conditions. Missing metrics retain their reason; zero is a measured value.

| Run | Backend | Model | Quantization | Hardware | Condition | Speed (tok/s) | Quality (0–1) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Ollama | fixture-model | Q4&#95;K&#95;M | Synthetic CPU / 16 GiB | fixture-v1; synthetic prompt, weights and rubric; not comparable to real runs | 12.5 | 0 |
| 2 | llama.cpp server | fixture-model | Q4&#95;K&#95;M | Synthetic CPU / 16 GiB | fixture-v1; synthetic prompt, weights and rubric; not comparable to real runs | 13.5 | n/a (NOT-RUN) |
| 3 | MLX | fixture-model | nominal 4-bit | Synthetic CPU / 16 GiB | fixture-v1; synthetic prompt, weights and rubric; not comparable to real runs | n/a (NO-FIELD) | n/a (NOT-RUN) |
| 4 | Strata | fixture-model | nominal 4-bit | Synthetic CPU / 16 GiB | fixture-v1; synthetic prompt, weights and rubric; not comparable to real runs | n/a (NOT-RUN) | n/a (NOT-RUN) |
