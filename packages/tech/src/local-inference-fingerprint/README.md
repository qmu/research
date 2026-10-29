# Local-inference host fingerprint

This integration layer attaches a host fingerprint to the schemaVersion 1
`runs` JSON produced by qmu/research#183 (the shared recorder for Ollama,
llama.cpp server, MLX and Strata). It works on `origin/main` without
importing that unmerged PR: it does not duplicate the HTTP adapter, a
performance metric or a comparison renderer, and treats the JSON only as the
versioned contract #183 defines.

From `packages/tech`:

```sh
npm run local-inference:fingerprint -- result.json new-result.json
```

The CLI reads `result.json`, adds one top-level `fingerprint` object, and
writes `new-result.json` (refuses to overwrite an existing file). The
original `runs`, metrics and metadata are preserved unchanged.

```json
{
  "os": "linux 6.1.0",
  "arch": "x64",
  "totalMemoryMiB": 16384,
  "engineVersion": "v22.10.0"
}
```

- `os` — `os.platform()` and `os.release()`.
- `arch` — `os.arch()` (for example `x64`, `arm64`).
- `totalMemoryMiB` — `os.totalmem()`, rounded to whole MiB.
- `engineVersion` — `process.version`, the Node.js engine running this
  harness. This is the measuring host's own runtime, distinct from the
  `runtimeVersion` already recorded per engine row in the #183 schema.

**No secret or machine identity is collected.** The fingerprint carries
exactly these four fields — no hostname, username, MAC/IP address,
filesystem path, or environment-variable value, and the CLI validates the
fingerprint shape before writing (unexpected keys are rejected). Running the
CLI twice against the same `result.json` on different machines lets a reader
tell the measuring hosts apart without identifying either of them.

The CLI validates `schemaVersion === 1` and a nonempty `runs` array before
opening the destination, refuses to overwrite an existing fingerprint or
output file, returns exit code 1 on invalid input, and emits no input paths
or parser errors in diagnostics.

Tests run through `make test` (tech Vitest includes this folder). The CLI
test uses synthetic data only; it proves persistence and overwrite
protection without any inference engine or network dependency.

## Reproduce against the committed fixture

From `packages/tech`:

```sh
npm run local-inference:fingerprint -- \
  src/local-inference-fingerprint/fixtures/result.json /tmp/fingerprint-result.json
```

Choose a new output path for each execution; the committed fixture is a
synthetic four-engine result, not an engine observation.
