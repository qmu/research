# Snapshot publication adapter

This boundary converts upstream-verified adoption decisions to public Markdown.
It does not run benchmarks, load raw snapshots, verify their identity or decide
thresholds. The caller must complete those operations before building the input
contract described in [the publication guide](../../../../docs/snapshot-publication.md).
Existing saved-report and comparison APIs are independent of this adapter.

Generated publications include three stable fragment targets:

- `#publication-engine-names` explains the upstream engine-name boundary.
- `#publication-metric-names` maps the four decision-axis keys to display names.
- `#publication-reason-codes` maps reason codes to their public descriptions.

Link to these explicit HTML targets rather than renderer-generated heading IDs.
They occur once per publication, even with multiple runs, and remain unchanged
when run order, provenance or adoption decisions change. The preview guide
contains the same generated sections and navigation links. Engine names are not
part of the input contract; callers must supply that context separately.

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
