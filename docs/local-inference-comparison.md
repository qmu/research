# Local inference comparison

This page is generated from the common local-inference JSON record by
`npm run local-inference:render` in `packages/tech`. Each row shows only
the non-secret reproduction conditions for that run: the model condition
(model, quantization, and run condition), the runner name and version, and a
versioned SHA-256 fingerprint of the run's command. The fingerprint is
computed after secrets, filesystem paths, and URLs are redacted from the
command's arguments, and the original command is never stored — see
[Local inference JSON](./local-inference-format) for the record format and
exactly what is redacted before hashing.

| Backend | Model condition | Runner | Command fingerprint |
| --- | --- | --- | --- |
| llama.cpp | llama-3.1-8b-instruct (Q4_K_M) — ctx=4096, temp=0.2, seed=7, single GPU layer offload | llama.cpp server b3985 | `sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` |
| mlx | llama-3.1-8b-instruct (4-bit) — ctx=4096, temp=0.2, seed=7 | mlx-lm 0.19.3 | `sha256:123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0` |
| ollama | llama-3.1-8b-instruct (Q4_K_M) — ctx=4096, temp=0.2, seed=7, keepalive=5m | ollama 0.4.7 | `sha256:23456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01` |
