# Local inference: unified comparison view

Renders the single public page that integrates all four comparison
dimensions — speed, quality, memory and failure reasons — for the four
fixed local-inference engines (Ollama, llama.cpp, MLX, Strata) from one
saved common JSON file. See
[docs/local-inference-unified-format.md](../../../../docs/local-inference-unified-format.md)
for the JSON shape and
[docs/local-inference-unified.md](../../../../docs/local-inference-unified.md)
for the generated page.

This module only renders; it does not measure anything or make network
calls. Regenerate the committed page from the committed fixture with:

```sh
node --import tsx/esm src/entrypoints/render-local-inference-unified.ts src/local-inference-unified/fixtures/sample.json ../../docs/local-inference-unified.md
```

`domain/page-drift.test.ts` fails if the committed page and the committed
fixture fall out of sync.
