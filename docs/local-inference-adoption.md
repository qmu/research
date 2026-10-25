# Local inference adoption

This page is generated from a saved comparison snapshot by `npm run local-inference:adoption` in `packages/tech`. Each row's **採否** (adopted / rejected) column records that snapshot's comparison verdict; a "不採用" row carries the fixed reason the comparison refused to adopt it. The **safe reproduction command** below each row is built only from the row's own public engine version, model, fixture version, and runner version — the same values already shown in the table — and rendering is refused if any of those four values looks secret-like (matching `/key|token|secret|password|credential|profile/i`).

| ID | Engine version | Model | Fixture version | Runner version | 採否 | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| llama-cpp-8b-q4 | llama.cpp b3985 | llama-3.1-8b-instruct-q4_k_m | fixture-2026-08-01 | runner-1.4.0 | 採用 | — |
| ollama-8b-q4 | ollama 0.4.7 | llama3.1:8b-instruct-q4_K_M | fixture-2026-08-01 | runner-1.3.2 | 不採用 | runner-version-mismatch |
| vllm-8b-fp16 | vllm 0.6.3 | llama-3.1-8b-instruct | fixture-2026-08-01 | runner-1.4.0 | 採用 | — |

## Safe reproduction commands

### llama-cpp-8b-q4

```sh
npm run local-inference -- --engine-version 'llama.cpp b3985' --model 'llama-3.1-8b-instruct-q4_k_m' --fixture-version 'fixture-2026-08-01' --runner-version 'runner-1.4.0'
```

### ollama-8b-q4

```sh
npm run local-inference -- --engine-version 'ollama 0.4.7' --model 'llama3.1:8b-instruct-q4_K_M' --fixture-version 'fixture-2026-08-01' --runner-version 'runner-1.3.2'
```

### vllm-8b-fp16

```sh
npm run local-inference -- --engine-version 'vllm 0.6.3' --model 'llama-3.1-8b-instruct' --fixture-version 'fixture-2026-08-01' --runner-version 'runner-1.4.0'
```
