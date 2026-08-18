---
type: Mission
title: Support newly released Claude models in the LLM comparison
slug: support-newly-released-claude-models-in-the-llm-comparison
status: abandoned
created_at: 2026-07-26T18:43:48+09:00
author: a@qmu.jp
assignee: a@qmu.jp
strategy: keep-the-llm-speed-and-accuracy-comparison-current-as-providers-release-new-models
predicted_hours:
actual_hours:
tickets: []
stories: []
concerns: []
gate_type:
gate_target:
gate_assert:
claim: work-20260804-165538
---

# Support newly released Claude models in the LLM comparison

## Goal

qmu.co.jp's published LLM speed and accuracy comparison (the shared `npm run
compare` instrument-v2 sweep) loses value the moment a provider ships a newer
model the table doesn't show. Anthropic has since released **Claude Opus 5**
(`claude-opus-5`, GA), the successor to **Claude Opus 4.8** at the *same* list
price ($5 / $25 per MTok); the registry's Anthropic tier still names Opus 4.8 as
its flagship and has no Opus 5 entry at all. A second, quieter defect was found
while confirming this: the registry prices **Claude Fable 5 at $6 / $30 when the
published catalog says $10 / $50** — so every cost figure the article reports for
the frontier tier is understated by roughly 40%.

This mission refreshes the comparison to the current Claude generation and —
because this is a recurring research surface under the same strategy as the
Gemini round — runs the refresh as a controlled head-to-head, so the published
article shows with real numbers **how Opus 5 improved over the Opus 4.8 it
replaces**.

## Scope

Done means: Claude Opus 5 is the registry's canonical current Anthropic flagship,
the frontier-tier price defect is corrected, and this refresh round is run as an
apples-to-apples head-to-head where the **only** thing differing between the
former and new Claude rows is the model — same prompts, same instrument-v2
configs, same judge, same cost model. Concretely:

- The comparison registry (`llm-model-comparison/models.ts` + the model reference
  catalog) gains `claude-opus-5` as the current flagship with **web-verified**
  price, effort ladder, and API surface; `claude-opus-4-8` is retained for this
  round as an explicitly tagged **previous-generation** entry paired to its
  successor, so both appear in one sweep under identical conditions.
- **Claude Fable 5's price is corrected to the web-verified $10 / $50** and every
  other Anthropic id, price, and effort ladder is re-verified against the
  published catalog at refresh time. Claude Sonnet 5's introductory pricing
  ($2 / $10 through 2026-08-31) is recorded so a reader can tell the list price
  from what is actually billed today.
- One **owner-approved real head-to-head sweep** (priced with `--estimate` first,
  run within a **$15/run ceiling**) committed as a dated frame; the EN/JP
  comparison pages and the generational-delta insight are recomposed from the
  measured frame.

**Depends on the Gemini round landing first.** The `generation` /
`supersedes` / `supersededBy` registry fields and the generational-delta
renderer exist only on the Gemini refresh branch — `main` has zero occurrences.
This mission consumes that infrastructure and must not rebuild it; building a
second copy on a parallel branch guarantees a conflict in the shared registry.

Out of scope: other providers' new models (separate refresh missions under the
same strategy); changing the instrument, prompts, or judge (that would break the
identical-conditions guarantee this round depends on); **Claude Mythos 5**
(invitation-only via Project Glasswing — not self-serve accessible, so it cannot
be measured reproducibly); the Bedrock and Vertex Claude rows (the IaaS-hosted
surface is its own mission, and entitlement lag there is a known separate
finding); and permanently deciding whether the previous-generation Claude row
stays in the live registry after this round (the dated frame preserves it
regardless).

## Experience

A reader of the refreshed LLM速度比較 / 精度比較 article sees Claude Opus 5 in the
comparison table alongside every other current model, with a web-verified price
and API id, and sees the frontier-tier cost figures corrected — Claude Fable 5
priced at its published $10 / $50 rather than the understated $6 / $30 the table
carried before. Because Opus 4.8 sits in the **same** table under identical
conditions, the article carries a generational-delta section stating, per metric,
how much faster / more accurate / cheaper Opus 5 is than the model it replaces
(e.g. "Opus 5 vs Opus 4.8: −X% median latency, +Y pts accuracy, same $/1M tokens
→ net improvement"), plus a plain net verdict — improved, mixed, or regressed.
Every measured cell is honestly provenance-labelled (`measured` only when a real
API call returned; otherwise `fixtured`/`error`, never synthesized), and the dated
frame records exactly which model ids and prices produced it. Re-running the
keyless fixture path reproduces the published pages byte-identically ($0 spend).

`/drive` judges its changes against exactly this: Opus 5 added as current
flagship + Opus 4.8 retained as paired previous-generation under identical
instrument-v2 conditions, the Fable 5 price corrected against the published
catalog, a quantified generational-delta in EN + JP, and one real head-to-head
sweep within the $15 ceiling committed as a dated frame.

## Acceptance

- [x] Comparison registry updated: `claude-opus-5` added as the current Anthropic flagship with web-verified price/effort/API surface; `claude-opus-4-8` retained as a tagged previous-generation entry paired to its successor (identical tier/config); Claude Fable 5 repriced to the web-verified $10/$50 and every other Anthropic id/price re-verified; Sonnet 5's introductory-pricing window recorded; model reference catalog updated; keyless fixture byte-stable; per-package tests/build/lint green (#20260726184500-claude-comparison-registry-add-opus-5.md)
- [x] The generational-delta insight built in the Gemini round pairs Opus 5 → Opus 4.8 and renders the per-metric delta and net verdict into the EN report (§4/§7) and the JP insights, with the `not-measured` label on the keyless path (#20260726184500-claude-comparison-registry-add-opus-5.md)
- [x] Real head-to-head sweep priced with `--estimate` then run within the $15/run ceiling under identical instrument-v2 conditions (only the Claude models differ); committed as a dated frame; EN/JP comparison pages + generational-delta recomposed from the measured frame; provenance honest (#20260726184501-claude-headtohead-real-sweep.md)
- [ ] qmu-co-jp receives the refreshed comparison + generational-delta article through the publish ticket flow on the next `/ship` (#20260726184501-claude-headtohead-real-sweep.md)

## Changelog

<!-- Append-only, dated timeline relating this mission's tickets and reports over time.
     One line per event ("- YYYY-MM-DD — event — filename"); never rewrite past lines. -->
- 2026-07-26 — mission created — 20260726184500-claude-comparison-registry-add-opus-5.md
- 2026-07-26 — strategy linked — keep-the-llm-speed-and-accuracy-comparison-current-as-providers-release-new-models — strategy.md
- 2026-07-26 — ticket added — 20260726184500-claude-comparison-registry-add-opus-5.md
- 2026-07-26 — ticket added — 20260726184501-claude-headtohead-real-sweep.md
- 2026-07-26 — drive-authorized — head-to-head spend approved ($15/run ceiling, --estimate first); Opus 5 = current flagship paired to Opus 4.8; Fable 5 price drift $6/$30 → web-verified $10/$50; depends on the Gemini round's pairing + delta renderer landing first — mission.md
- 2026-07-26 — duration predicted (archive basis 0) — mission.md
- 2026-08-01 — ticket archived — 20260726184500-claude-comparison-registry-add-opus-5.md
- 2026-08-05 — ticket archived — 20260804170000-sustained-throughput-excludes-thinking-time.md
- 2026-08-05 — ticket archived — 20260726184501-claude-headtohead-real-sweep.md
- 2026-08-13 — mission abandoned — mission.md
