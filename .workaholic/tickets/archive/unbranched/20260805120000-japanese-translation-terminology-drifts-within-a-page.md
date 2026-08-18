---
created_at: 2026-08-05T12:00:00+09:00
status: abandoned
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category:
mission:
depends_on:
---

# The Japanese translator names the same field two different ways inside one page

## Overview

`research:translate-report` translates a report in chunks, and the chunks do not
share a glossary. The result is that one published article gives the same field
more than one name. Observed on 2026-08-05 in the pages regenerated at `1fefebc`:

| page | term | occurrences |
| ---- | ---- | ----------- |
| `llm-accuracy-comparison.insights.ja.md` | `総合判定` | 9 |
| | `総合評価` | 1 |
| `llm-speed-comparison.insights.ja.md` | `総合判定` | 11 |
| | `mixed（混在）` | 9 |
| | `まちまち` | 1 |

The last generational block of the accuracy article reads
`_総合評価: **まちまち** — 9個のメトリクスのうち3個が改善…_` while the eight
blocks above it read `_総合判定: **mixed** — 9メトリクス中、改善3…_`. A reader
comparing two blocks of the same table has to work out that `総合評価` and
`総合判定` are the same row, and that `まちまち` and `mixed` are the same verdict.

**The numbers are correct.** All nine verdict lines were checked figure by figure
against the English source and match; no retired throughput value survives. This
is a labelling defect, not a data defect.

## Why it happens

The reports are long — the accuracy page is 661 lines and priced at ~245k output
tokens — so the translator processes them in ~15 calls. Each call sees its own
slice, so a term first rendered in call 3 is re-invented in call 14. The drift
lands preferentially at the END of a document, which is where the chunk boundary
count is highest and where a reviewer's attention is lowest.

## Impact

- **Published articles are internally inconsistent**, on the corporate site.
- **It is invisible to the existing checks.** Nothing compares term usage across
  a document, and the byte-stability fixtures cover the keyless English path, not
  the paid Japanese one.
- **It recurs on every translation**, and each pass costs real money (~$7.20 for
  these two reports), so catching it after the fact is expensive: the 2026-08-05
  regeneration was itself a second paid pass.

## Key Files

- `packages/tech/src/entrypoints/translate-research-report.ts` — the chunked
  translation runner.
- `docs/research-reports/*.insights.ja.md` — the outputs.

## Policies

- `workaholic:implementation` / `objective-documentation` — a term that changes
  name mid-document forces the reader to reconstruct what the writer meant. The
  numbers being right does not make the page readable.
- `workaholic:design` / UX — these are published customer-facing articles.

## Implementation Steps

1. **Give the translator a glossary.** A fixed term map (`総合判定`,
   `改善`/`悪化`/`変化なし`, `判別不能`, metric names) passed into every chunk's
   prompt, so a term cannot be re-invented per call. This is the cheap fix and it
   addresses the mechanism directly.
2. **Assert it afterwards.** A check over the produced Japanese page that each
   glossary term's alternatives do NOT appear — runnable with no API calls, so it
   can sit in `make lint` rather than costing a translation pass to discover.
3. Consider translating the generational section as one unit, since its blocks
   are parallel by construction and are where the drift shows.

## Quality Gate

- A regenerated Japanese page uses one name per glossary term throughout;
  asserted mechanically, not by reading.
- The check runs without API calls and fails on the 2026-08-05 output as
  committed (that page is the regression fixture — it is known-bad and its
  numbers are known-good).
- Numbers stay verified separately: every verdict line still matches the English
  figure for figure.

## Considerations

- **Do not fix this by re-translating.** A third pass costs another ~$7.20 and
  would drift somewhere else; the mechanism is the missing glossary, not this
  particular output.
- The committed pages at `1fefebc` are correct in substance and were left as they
  are deliberately, so this ticket has a real fixture to test against.
