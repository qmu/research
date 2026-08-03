---
created_at: 2026-07-23T09:40:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Config]
effort: 1h
commit_hash:
category: Changed
depends_on:
claim: work-20260801-120832
---

# Guard the article exporter against overwriting downstream-authored prose

## Overview

`publish-research.sh` copies report articles into the downstream docs site deterministically. At least one exported article (the vector-store comparison) has since been given an intentionally authored descriptive body on the downstream side, which is now the authoritative text — a re-run of the exporter would silently overwrite it. Add a guard so the exporter cannot clobber downstream-authored prose: refuse (or require an explicit flag) when the destination file differs from what the exporter last emitted, and record in the script's header comment that downstream prose is authoritative for already-authored articles.

## Policies

- A deterministic generator that shares a destination with hand-authored content needs an ownership boundary stated in the tool, not in memory.

## Implementation

1. On copy, compare the destination against the exporter's own last-emitted content (a stored hash or a marker comment); if the destination diverged, skip it with a loud message unless an explicit overwrite flag is passed.
2. Document in the script header which side is authoritative once an article has been authored downstream.

## Test Plan

- Re-running the exporter over a hand-edited destination leaves the file untouched and prints the skip reason.
- A fresh (never-authored) article still exports normally.

## Quality Gate

- No exporter run can silently replace a diverged destination file.

## Final Report

Development completed as planned. The exporter now decides ownership **before**
writing, and the decision is recorded rather than remembered.

**Mechanism.** A committed ledger (`scripts/publish-ledger.tsv`,
`<dest-path>\t<sha256>`) records what the exporter last emitted for each
destination. Per copy:

| state | action |
| --- | --- |
| destination missing | copy (nothing to lose) |
| hash matches the ledger | copy (untouched since our emit) |
| hash differs from the ledger | **skip, loudly** (authored downstream) |
| no entry, dest **==** source | record and continue (bootstrap) |
| no entry, dest **!=** source | **skip, loudly** |

The last row is the conservative bootstrap: with no record, a differing
destination is indistinguishable from downstream-authored prose, so it is
treated as authored. `--force` is the explicit override; `--dry-run` refuses too
and writes nothing.

A marker comment in the destination was rejected in favour of the sidecar
ledger: the destinations are published prose, and a machine marker in them would
be visible on the corporate site.

**The guard was mutation-tested.** Neutralising the ownership check makes
`scripts/check-publish-guard.sh` fail **5** assertions — including the ticket's
own scenario, reported verbatim as `a hand-edited destination was OVERWRITTEN`.
With the guard in place all 9 assertions pass. Wired in as `make publish-guard`
and a CI step so it cannot rot.

**The ledger was seeded from the real downstream state**, not left empty. Of the
35 planned destinations: **32** are byte-identical to their source and were
recorded (they are demonstrably this exporter's own emits), **1** does not exist
downstream yet, and **2** diverge and were deliberately left unrecorded so they
skip loudly for review:

- `agent-vm-comparison.md` — its downstream frontmatter carries
  `provenance: authored-fixture-translation`, i.e. genuinely authored on the
  qmu-co-jp side. Skipping is the correct outcome.
- `image-generation.md` — a **stale export**, not authored prose: its downstream
  copy points at an older frame (`source_commit: 78a9397`, 118 lines) while the
  source has since been regenerated (175 lines). This one wants `--force` (or a
  recorded hash) at the next publish; it is the pending article the
  image-generation mission is waiting to ship.

A dry run against the real `../qmu-co-jp` confirms the split: 33 reports would
copy, those 2 skip with a stated reason, and nothing was written.

### Discovered Insights

- **Insight**: The bootstrap case is where a hash-ledger guard silently fails,
  in either direction.
  **Context**: Treating "no record" as *clean* would have overwritten the very
  article the ticket was filed about on the first run. Treating it as *diverged*
  unconditionally would have blocked all 35 destinations at once and taught the
  operator to reach for `--force` reflexively — which disarms the guard
  permanently. Comparing against the **source** splits the case correctly: an
  unrecorded destination equal to the source has nothing to lose.
- **Insight**: Seeding the ledger is part of shipping this guard, not a follow-up.
  **Context**: An empty committed ledger makes every destination look authored,
  so the first real `/ship` after this merge would have skipped everything and
  the guard would have read as broken. The seed had to be computed against the
  live sibling checkout, and the two exclusions are the guard's real findings.
- **Insight**: "Diverged" does not mean "authored" — it means "we cannot prove it
  is ours".
  **Context**: Of the two divergences found, only one is authored prose; the
  other is a stale export awaiting publish. The skip message therefore states a
  reason and names both remedies rather than asserting the downstream text is
  authoritative.
