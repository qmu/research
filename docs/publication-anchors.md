# Public adoption Markdown anchors

This synthetic reference demonstrates stable links for the engine, metric and
reason-code sections of a public adoption report. It contains no measurements
or adoption recommendation.

[Engine](#adoption-engines-llama.cpp) ·
[Metric](#adoption-metrics-ttft_ms) ·
[Reason code](#adoption-reason-codes-missing)

The identifiers come from persisted keys, not translated labels, heading slugs,
row numbers or run IDs. Keep a key unchanged when renaming or reordering an entry.
Sections always appear in engine → metric → reason-code order. Empty sections
still have an anchor. Entry keys are case-sensitive ASCII identifiers (letters,
digits, dot, underscore or hyphen; 1–128 characters, starting with a letter or
digit); duplicate keys in one section fail rather than acquiring numeric suffixes.
The same key in different sections has a different anchor. This renderer owns
the `adoption-` namespace: append its output only once per report.

Generate these sections from the repository root:

```sh
cd packages/tech
node --import tsx/esm src/entrypoints/render-publication-anchors.ts \
  < src/publication-anchors/examples/sections.json
```

Append the generated Markdown to an upstream public adoption report. The renderer
is independent of snapshot validation and decision calculation, and does not
claim to verify either. Supply only public, single-line labels and descriptions;
text is escaped as literal text. Invalid input produces no partial Markdown.
Explicit HTML anchors are portable between GitHub Markdown and VitePress.

External links use `/publication-anchors#adoption-engines-llama.cpp`,
`/publication-anchors#adoption-metrics-ttft_ms`, or
`/publication-anchors#adoption-reason-codes-missing` on this preview site.

<a id="adoption-engines"></a>

## Engines

<a id="adoption-engines-llama.cpp"></a>

### llama.cpp server

Synthetic example only.

<a id="adoption-metrics"></a>

## Metrics

<a id="adoption-metrics-ttft_ms"></a>

### Time to first token

Milliseconds; lower is better.

<a id="adoption-reason-codes"></a>

## Reason codes

<a id="adoption-reason-codes-missing"></a>

### Missing evidence

No adoption decision can be inferred.
