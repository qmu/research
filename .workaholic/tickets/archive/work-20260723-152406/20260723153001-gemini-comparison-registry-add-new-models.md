---
created_at: 2026-07-23T15:30:01+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category: Changed
depends_on:
mission: support-newly-released-gemini-models-in-the-llm-comparison
---

# Refresh the LLM comparison registry with the newly released Gemini models, pairing each former→new generation

## Overview

Google has released **Gemini 3.6 Flash** (`gemini-3.6-flash`, GA) and **Gemini
3.5 Flash-Lite** (`gemini-3.5-flash-lite`, GA), superseding the comparison
registry's current **Gemini 3.5 Flash** (`gemini-3.5-flash`) and **Gemini 3.1
Flash-Lite** (`gemini-3.1-flash-lite`). **Gemini 3.5 Pro** is announced but not
yet released, so the Pro tier stays **Gemini 3.1 Pro** (`gemini-3.1-pro-preview`).

Update `packages/tech/src/llm-model-comparison/models.ts` (and the model
reference catalog it feeds) so the new Gemini models are the canonical "latest"
Gemini, while **retaining the former Gemini as tagged previous-generation
entries paired to their successors** — this round is a controlled head-to-head, so
both generations must appear in one sweep under identical conditions (same tier,
same instrument-v2 config; the *only* difference is the model id).

This is the first mission executing the strategy "keep the LLM speed and accuracy
comparison current as providers release new models"; the pairing metadata added
here is what the generational-delta insight (ticket 20260723153002) consumes.

## Scope decisions (developer, /mission planning session 2026-07-23)

- New latest Gemini = `gemini-3.6-flash` (Flash) and `gemini-3.5-flash-lite`
  (Flash-Lite). Pro unchanged (`gemini-3.1-pro-preview`) — 3.5 Pro not GA.
- Former Gemini (`gemini-3.5-flash`, `gemini-3.1-flash-lite`) are **kept** for this
  round as previous-generation entries, each linked to its successor (e.g. a
  `generation` / `supersedes` / `supersededBy` field or an explicit pair id), so
  the sweep runs both under identical conditions.
- Identical conditions are load-bearing: do **not** change prompts, instrument-v2
  config, judge, or cost model — only the Gemini model set differs.
- Whether the previous-generation rows stay in the live registry *after* this round
  is out of scope; the dated frame preserves them regardless.

## Policies

- `workaholic:implementation` / `objective-documentation` — every added price,
  effort tier, and API model id is **web-verified** at refresh time against
  Google's pricing/models pages; record the source URL on each entry as the
  existing Google entries do (`source: https://ai.google.dev/gemini-api/docs/pricing`).
- `workaholic:design` — the registry stays the single source of truth for the
  compared model set; the pairing metadata is added in one place so both the sweep
  and the generational-delta insight read it, keeping the two coherent.
- **No fabrication** — no invented prices or ids; if a price cannot be verified,
  leave it flagged rather than guessed.

## Implementation Steps

1. Web-verify Gemini 3.6 Flash and Gemini 3.5 Flash-Lite: API model id, input/output
   price, effort/tier, and API surface; capture the source URL.
2. Add both to `llm-model-comparison/models.ts` as the latest Gemini (mirroring the
   shape of the existing `google-gemini-*` entries).
3. Tag the former `gemini-3.5-flash` and `gemini-3.1-flash-lite` as
   previous-generation, each paired to its successor via explicit metadata the
   insight can read; keep tier/config identical to the successor.
4. Update the model reference catalog page/section so the catalog lists the new
   Gemini and marks the previous-generation pairing.
5. Keep the keyless fixture path byte-stable: regenerate any fixture snapshots the
   new/paired rows touch so re-runs are deterministic and zero-spend.

## Quality Gate

- New Gemini ids present with web-verified prices/API surface and a source URL;
  Pro unchanged; former Gemini retained and explicitly paired to their successors.
- Pairing metadata lives in one place and is machine-readable (the delta insight
  ticket consumes it) — not duplicated across the report and the data.
- Keyless fixture path renders deterministically (re-run → byte-identical); no
  fabricated cells.
- Per-package bare exit codes, run separately, no masking:
  `( cd packages/tech && npm test )`, `( cd packages/tech && npm run build )`,
  `( cd packages/tech && npm run lint )` — never `make test`/`make lint`.

## Considerations

- **Identical-conditions guarantee.** The whole point of this round is that only
  the Gemini model differs. If adding the pairing tempts a config/prompt change,
  it is out of scope here — raise it separately.
- **Downstream coupling.** Ticket 20260723153002 (generational-delta insight) and
  20260723153003 (real sweep) both depend on the pairing metadata this ticket
  establishes; keep the field names stable.
