# Local inference JSON

This is a deterministic report adapter, not a benchmark runner: it makes no
network calls and runs no model. It reads a common local-inference JSON
record and renders the [comparison page](./local-inference-comparison) from
it.

From `packages/tech`:

```sh
npm run local-inference:render -- src/local-inference/fixtures/comparison.json ../../docs/local-inference-comparison.md
```

## Record shape

A version 1 file has `schemaVersion: 1`, a required `fixture` boolean, and a
`runs` array. Each run has a unique `id` and:

- `backend` — nonempty string, e.g. `"ollama"`.
- `modelCondition` — `{ model, quantization, condition }`, each a nonempty
  string. `condition` records whatever else fixes the run's identity (context
  size, sampling settings, GPU offload, cache state, etc.) — the renderer
  displays it without inferring comparability across rows.
- `runner` — `{ name, version }`, each a nonempty string: the engine that
  executed the run and the version string it reports.
- `commandFingerprint` — `"sha256:" + 64` lowercase hex characters: a digest
  of the run's command, computed **after** redacting anything that looks like
  a secret flag's value, a filesystem path, or a URL. The redaction and the
  format's version tag are folded into the hash input, so two commands that
  differ only in a redacted value produce the same fingerprint, and a future
  redaction-rule change produces a different one rather than colliding with
  the old digest.

## What is never stored or displayed

The raw command, its unredacted arguments, environment variables, API keys,
hostnames, and filesystem paths are not part of this record and are not
written by the fingerprint step. Parsing only copies through the fields
listed above — any other key an input file happens to carry (a leftover raw
command, a credential) is read by nobody and never reaches the rendered page.

## Validation

Parsing fails, before the renderer runs, on: a missing or non-1
`schemaVersion`, a non-boolean `fixture`, a missing/empty required string
field, a duplicate run `id`, or a `commandFingerprint` that does not match
`sha256:<64 hex characters>`. An empty `runs` array renders a header-only
table. Rows sort by `id` in code-unit order, independent of input order or
locale. Markdown table delimiters (`|`) and newlines in text fields are
escaped before they reach the page.
