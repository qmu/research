# llama.cpp server result import

`normalizeLlamaCpp(response, { elapsedMs, ttftMs })` converts parsed, completed
`/completion` or non-streaming `/v1/chat/completions` JSON into the same
`LocalInferenceResult`. It rejects server errors and ambiguous/malformed results.
It does not issue requests or decode SSE. Pass the final assembled chat response
when importing a stream; a delta alone is not a completed response. Native
responses require `stop: true`; chat responses require a nonempty
`finish_reason`, so partial messages cannot become measured results.

Client measurements are optional and remain `null` when absent. Server
`timings` remain separate runtime cross-checks, in milliseconds and tokens/second.
Token counts come from `usage` (chat) or `tokens_evaluated`/`tokens_predicted`
(native), never whitespace or timing-derived estimates. Missing/invalid numeric
fields become `null`; measured zero stays zero. No hardware, startup, RSS or
quality figure is inferred from a completion response.

`fixtures/chat.json` and `fixtures/completion.json` are synthetic protocol
examples. `fixtures/captured-completion.json` is a real response captured on
2026-10-25 from llama.cpp b11869 (`d327bf1f0`), official Ubuntu ARM64 binary,
CPU, two threads, context 512. The public model was
[stories15M-q4_0.gguf](https://huggingface.co/ggml-org/models/blob/main/tinyllamas/stories15M-q4_0.gguf).
Model SHA-256: `66967fbece6dbe97886593fdbb73589584927e29119ec31f08090732d1861739`.
This tiny model validates import behavior, not cross-engine performance.
Client timings were not captured and remain null. The captured JSON is unchanged
except for formatting.

Server arguments: `-m stories15M-q4_0.gguf --alias stories15M-q4_0 --host 127.0.0.1
--port 8099 -c 512 -t 2 --no-warmup`. Capture with:

```sh
curl http://127.0.0.1:8099/completion -H 'Content-Type: application/json' \
  -d '{"prompt":"Once upon a time","n_predict":8,"temperature":0,"seed":42,"cache_prompt":false}'
```

[Protocol reference at the captured revision](https://github.com/ggml-org/llama.cpp/blob/d327bf1f0/tools/server/README.md).
Do not commit private prompts, model paths or response metadata.

Example (from `packages/tech`, no running server required):

```sh
node --import tsx/esm --input-type=module -e '
import fs from "node:fs";
import { normalizeLlamaCpp } from "./src/vendors/llama-cpp/normalize.ts";
const raw = JSON.parse(fs.readFileSync("./src/vendors/llama-cpp/fixtures/chat.json", "utf8"));
console.log(JSON.stringify(normalizeLlamaCpp(raw), null, 2));'
```
