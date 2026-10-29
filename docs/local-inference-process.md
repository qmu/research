# Local inference process comparison

This is a **synthetic contract example**, not a performance measurement or engine recommendation. It demonstrates the saved JSON contract from [qmu/research#223](https://github.com/qmu/research/pull/223).

The comparison consumes one saved process result per engine. It connects recorded exits and fixed failure codes to adoption rows. Failed measurements are held; successful process exits still need speed, quality and memory evaluation. No engine or external API is invoked when rendering.

## Process evidence and adoption

Saved process evidence only. Exit 0 does not establish speed, quality or memory suitability. Missing evidence is not a successful measurement. Exit 137 is not classified as OOM without additional evidence.

| Engine | Process exit | Signal | Fixed failure code | Adoption |
| --- | --- | --- | --- | --- |
| strata | 0 | none | none | Pending — speed, quality and memory evaluation required |
| ollama | 137 | none | MEASURE-FAILED | Hold — MEASURE-FAILED |
| llama.cpp | not available | SIGKILL | TIMEOUT | Hold — TIMEOUT |
| mlx | not available | none | UNREACHABLE | Hold — UNREACHABLE |

## Render saved results

From `packages/tech`, pass the JSON files saved by the process measurement runner:

```sh
node --import tsx/esm src/entrypoints/render-local-process-comparison.ts \
  /path/to/strata.json /path/to/ollama.json /path/to/llama.cpp.json /path/to/mlx.json \
  > /tmp/process-comparison.md
```

Omit a file to show that engine as `not recorded`. Inputs must use schema version 1 with one result per engine; malformed data, inconsistent success records and duplicate engines fail with exit status 1 before any table is printed. Additional execution metadata is accepted but not displayed. Choose matching executions before rendering; this consumer does not select a newest run or join independent metric files.

The fixed failure codes are `TIMEOUT`, `CANCELLED`, `UNREACHABLE` and `MEASURE-FAILED`. The saved code is authoritative, including a failure whose process exited 0. Null process exits remain `not available`, distinct from a missing record. Raw diagnostics, commands, paths and environment values are never included in the table.

For the exact example above, replace the four paths with `src/local-inference/domain/fixtures/{strata,ollama,llama.cpp,mlx}.json` (Bash brace expansion). The fixtures are synthetic and never imply that those engines were measured.
