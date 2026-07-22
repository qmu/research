---
created_at: 2026-07-19T11:00:30+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 2h
commit_hash:
category: Added
mission: periodic-research-target-compare-deep-research-alike-apis
depends_on: [deep-research-first-validation-trial.md]
---

# Publish the deep-research topic (EN article + JP + site registration)

## Overview

Register `deep-research` in `publishedResearchTopics` (`site.ts`), generate the
JP translation, and regenerate EN/JP indexes so the topic appears in site order.

## Implementation Steps

1. Add the `deep-research` topic entry to `site.ts` (design block + paths).
2. `npm run research:translate-report -- deep-research --estimate` then run it.
3. `npm run research:site -- write-indexes`.

## Considerations

Corporate `qmu-co-jp` copy happens later via `/ship` publish-ticket, not here.
