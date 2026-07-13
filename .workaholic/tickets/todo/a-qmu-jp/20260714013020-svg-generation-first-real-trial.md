---
created_at: 2026-07-14T01:30:20+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 2h
commit_hash:
category: Added
mission: periodic-research-target-svg-generation-and-animation
depends_on: [20260714013000-svg-generation-build-runner-cli-and-pages.md]
---

# Run the owner-approved first real SVG-generation trial (guideline step 3)

## Overview

The proposal-first guideline's step 3: the first real trial is a disposable
validation of the design, not a commitment to the cadence. This ticket runs it
once — **owner-gated: requires explicit approval and API keys, and spends money**
— then reviews whether the metrics discriminate between subjects and whether the
cost matched the estimate, and archives the result as a dated survey frame.

## Key Files

- `packages/tech/src/svg-generation/run.ts` — `estimateSvgGeneration` / `runSvgGeneration`.
- `docs/research-development-guideline.md` — step 3 (design validation) and step 4 (recur).

## Implementation Steps

1. **Gate:** confirm owner approval and that the estimate is within the $5/trial ceiling (`npm run research -- svg-generation --estimate`). Stop for re-approval if above.
2. Run `npm run research -- svg-generation --real` with keys present.
3. Archive: `npm run research:archive -- svg-generation --generated-at <iso>`; regenerate indexes (`npm run research:site -- write-indexes`).
4. Write the design-validation review: do render-validity / animation-presence / fidelity / cost separate the four subjects? Confirm or revise the monthly cadence.
5. On the next `/ship`, reflect the new dated article to qmu-co-jp via the publish-ticket flow.

## Considerations

Do NOT run this unattended in a night batch — it is the one step the guideline
reserves for explicit human initiation. No persistent provider resources are
created; SVG is generated in memory and scored, so there is nothing to tear down.
