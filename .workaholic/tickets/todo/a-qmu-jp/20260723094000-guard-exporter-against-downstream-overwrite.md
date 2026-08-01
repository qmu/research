---
created_at: 2026-07-23T09:40:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Config]
effort: 0.5h
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
