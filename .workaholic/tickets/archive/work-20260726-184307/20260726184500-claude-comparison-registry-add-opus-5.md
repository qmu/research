---
created_at: 2026-07-26T18:45:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 2h
commit_hash:
category: Changed
depends_on:
mission: support-newly-released-claude-models-in-the-llm-comparison
---

# Add Claude Opus 5 as the current Anthropic flagship, pair it to Opus 4.8, and correct the Fable 5 price drift

## Overview

Anthropic released **Claude Opus 5** (`claude-opus-5`, GA), the successor to
**Claude Opus 4.8** at the same list price. The comparison registry has no Opus 5
entry — `grep` for `opus-5` across `packages/tech/src` returns nothing — and still
carries Opus 4.8 as the Anthropic flagship.

Confirming that surfaced a second, independent defect: the registry prices
**Claude Fable 5 at `inputCostPerMTok: 6` / `outputCostPerMTok: 30`, while the
published catalog says $10 / $50.** Every cost figure the article reports for the
frontier tier is therefore understated by roughly 40%. This is the same class of
defect as the image-generation price drift fixed earlier — a registry price that
silently went stale — and it is worth fixing in the same pass, because this round
re-verifies the whole Anthropic tier anyway.

**This ticket does not add the pairing machinery.** `generation`, `supersedes`,
and `supersededBy`, and the generational-delta renderer that consumes them, come
from the Gemini refresh round and exist only on that branch (`main` has zero
occurrences). This ticket **uses** those fields; it must not define a second copy.
If they are not present when this is driven, stop and say so rather than
rebuilding them — a parallel definition in the shared registry is a guaranteed
merge conflict.

## Implementation

1. **Verify against the published catalog before writing anything.** For every
   Anthropic row: display name, API model id, list price in/out, and effort ladder.
   Record the source URL in each entry's `source` field, as the existing rows do.
2. **Add `anthropic-claude-opus-5`** as the current flagship: `generation:
   "current"`, `supersedes: "anthropic-claude-opus-4-8"`, same tier and effort
   ladder as the entry it replaces, so the head-to-head varies only the model id.
3. **Retain `anthropic-claude-opus-4-8`** for this round as
   `generation: "previous"` with `supersededBy: "anthropic-claude-opus-5"`, at its
   web-verified price.
4. **Correct Claude Fable 5** to the web-verified $10 / $50.
5. **Record Sonnet 5's introductory pricing** ($2 / $10 through 2026-08-31) as a
   comment alongside the list price, so a later reader can tell the list rate from
   what is billed today. Keep the list price as the registry value — it is the
   rate that stays comparable across dated frames once the window closes.
6. **Update the model reference catalog** (`llm-model-comparison/domain/catalog.ts`)
   so the reference page and the comparison agree.
7. Leave the Bedrock and Vertex Claude rows alone — out of scope (see the mission).

## Policies

- `workaholic:implementation` / `policies/objective-documentation.md` — a price in
  the registry is a factual claim the article repeats; it must be verifiable
  against a cited source at the time it is written, not carried forward on trust.
- `workaholic:implementation` / `policies/domain-layer-separation.md` — the
  registry is pure domain data; keep provider access and pricing facts on their
  existing sides of the boundary.
- `workaholic:planning` / `verify-before-building` — verify each id and price
  against the published catalog first; this ticket exists partly because a stale
  value went unchecked.

## Quality Gate

Decided: keyless verification only — this ticket changes registry data and
rendering, so the provable surface is the hermetic suite plus the byte-stable
fixture render. The paid measurement is the follow-up ticket's gate.

**Acceptance criteria:**

- [ ] `claude-opus-5` present as the current Anthropic flagship with a cited,
      web-verified price and effort ladder; `claude-opus-4-8` retained and paired
      to it via `generation` / `supersededBy`.
- [ ] Claude Fable 5 priced at the web-verified $10 / $50; every other Anthropic
      id, price, and effort ladder re-verified with its `source` URL recorded.
- [ ] Sonnet 5's introductory-pricing window is recorded where a reader of the
      registry will see it.
- [ ] The generational-delta insight (from the Gemini round) pairs
      Opus 5 → Opus 4.8 and renders in the EN report §4/§7 and the JP insights;
      on the keyless path it shows the `not-measured` label.
- [ ] The model reference catalog agrees with the comparison registry.
- [ ] Keyless fixture render is byte-stable; `npm test`, `npm run build`, and
      `npm run lint` in `packages/tech` each exit 0 (bare exit codes, no `| tail`,
      no `|| true`).


## Final Report (2026-08-01)

Added `anthropic-claude-opus-5` as the current Anthropic flagship, paired to the
Opus 4.8 it supersedes through the registry metadata the Gemini round
introduced (`generation` / `supersedes` / `supersededBy`). No renderer change was
needed: the generational-delta section picked the pair up on its own and now
emits `Claude Opus 4.8 -> Claude Opus 5` per effort level.

Corrected Claude Fable 5 from 6/30 to the published 10/50 per MTok. That value
had been wrong since the row was written, understating the frontier tier's cost
by roughly 40% in every report quoting it. Recorded Sonnet 5's introductory
pricing (2/10 through 2026-08-31) as a comment while keeping the list rate as the
registry value, because the list rate is what stays comparable across dated
frames once the window closes.

The reference catalog needed no change: it consumes `ModelCard` rather than
carrying its own copy of the prices.

Gates: `npm test` 692 passed / 2 skipped exit 0, `npm run build` exit 0,
`npm run lint` exit 0, keyless fixture re-rendered byte-stable.
