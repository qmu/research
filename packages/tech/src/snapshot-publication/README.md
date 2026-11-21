# Snapshot publication adapter

This boundary converts upstream-verified adoption decisions to public Markdown.
It does not run benchmarks, load raw snapshots, verify their identity or decide
thresholds. The caller must complete those operations before building the input
contract described in [the publication guide](../../../../docs/snapshot-publication.md).
Existing saved-report and comparison APIs are independent of this adapter.

Try the **synthetic, non-measured** example from `packages/tech`:

```sh
node --import tsx/esm src/entrypoints/render-snapshot-publication.ts \
  src/snapshot-publication/examples/verified-results.json
```

To publish actual verifier output without truncating a previous result when
validation fails, render to a temporary file in the destination directory and
rename only on success. For example, from `packages/tech`:

```sh
publication_tmp=$(mktemp ../../outputs/snapshot-publication.XXXXXX.md)
if node --import tsx/esm src/entrypoints/render-snapshot-publication.ts \
  verified-results.json > "$publication_tmp"; then
  mv "$publication_tmp" ../../outputs/snapshot-results.md
else
  rm "$publication_tmp"
  exit 1
fi
```

A run's four reason codes always render as speed, quality, memory, environment,
regardless of JSON key insertion order. `pass` prints “Meets policy”; `fail`
prints “Does not meet policy”; `missing` prints “Evidence missing”;
`unsupported` prints “Measurement unsupported”. Adoption requires all four to
pass. A rejection must have at least one non-pass reason. Run order is preserved.
Duplicate run IDs, missing provenance, unknown reasons and inconsistent decisions
reject the whole publication. Free-form extra properties are never rendered.
