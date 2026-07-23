---
type: Mission
title: Support newly released Gemini models in the LLM comparison
slug: support-newly-released-gemini-models-in-the-llm-comparison
status: active
created_at: 2026-07-23T15:24:14+09:00
author: a@qmu.jp
assignee: a@qmu.jp
strategy: keep-the-llm-speed-and-accuracy-comparison-current-as-providers-release-new-models
drive_authorized: true
predicted_hours:
actual_hours:
tickets: []
stories: []
concerns: []
gate_type:
gate_target:
gate_assert:
---

# Support newly released Gemini models in the LLM comparison

## Goal

qmu.co.jp's published LLM speed and accuracy comparison (the shared `npm run
compare` instrument-v2 sweep) loses value the moment Google ships a newer Gemini
the table doesn't show. Google has since released **Gemini 3.6 Flash**
(`gemini-3.6-flash`, GA) and **Gemini 3.5 Flash-Lite** (`gemini-3.5-flash-lite`,
GA), superseding the registry's current **Gemini 3.5 Flash** and **Gemini 3.1
Flash-Lite**; **Gemini 3.5 Pro** is announced but not yet released, so the Pro
tier stays **Gemini 3.1 Pro**. This mission refreshes the comparison to the new
Gemini generation and — because this is a recurring research surface — runs the
refresh as a controlled head-to-head so the published article shows, with real
numbers, **how the new Gemini generation improved over the former one**.

## Scope

Done means: the newly released Gemini models are the registry's canonical
"latest" Gemini, and this refresh round is run as an apples-to-apples head-to-head
where the **only** thing that differs between the former and new Gemini rows is
the model — same prompts, same instrument-v2 configs, same judge, same cost
model. Concretely:

- The comparison registry (`llm-model-comparison/models.ts` + the model reference
  catalog) gains `gemini-3.6-flash` and `gemini-3.5-flash-lite` as the latest
  Gemini, with **web-verified** prices, effort, and API surface; the former Gemini
  (`gemini-3.5-flash`, `gemini-3.1-flash-lite`) are retained for this round as
  explicitly tagged **previous-generation** entries paired to their successors so
  both appear in one sweep under identical conditions. Pro is unchanged.
- A **dedicated generational-delta insight** pairs each former→new Gemini tier,
  quantifies the per-metric delta (speed, accuracy, cost), and renders an explicit
  "what improved / what regressed / net verdict" narrative into the EN report and
  the JP insights — a first-class output, not something inferred from the table.
- One **owner-approved real head-to-head sweep** (priced with `--estimate` first,
  run within a **$15/run ceiling**) committed as a dated frame; EN/JP comparison
  pages and the generational-delta insight are recomposed from the measured frame.

Out of scope: adding non-Gemini providers' new models (separate refresh missions
under the same strategy), changing the instrument/prompts/judge (that would break
the identical-conditions guarantee this round depends on), Gemini 3.5 Pro (not GA
— revisit when released), and permanently deciding whether the previous-generation
Gemini rows stay in the live registry after this round (the dated frame preserves
them regardless; a later round may drop them).

## Experience

A reader of the refreshed LLM速度比較 / 精度比較 article sees the new Gemini
generation in the comparison table alongside every other current model, with
web-verified prices and API ids. Because the former Gemini sits in the **same**
table under identical conditions, the article carries a dedicated
generational-delta section that states, per tier and per metric, how much faster /
more accurate / cheaper the new Gemini is than the one it replaced (e.g. "Gemini
3.6 Flash vs 3.5 Flash: −X% median latency, +Y pts accuracy, ≈same $/1M tokens →
net improvement"), plus a plain net verdict — improved, mixed, or regressed.
Every measured cell is honestly provenance-labelled (`measured` only when a real
API call returned; otherwise `fixtured`/`error`, never synthesized), and the
dated frame records exactly which model ids and prices produced it. Re-running the
keyless fixture path reproduces the published pages byte-identically ($0 spend).
`/drive` judges its changes against exactly this: new Gemini ids added + former
retained as paired previous-generation under identical instrument-v2 conditions, a
quantified generational-delta insight in EN + JP, and one real head-to-head sweep
within the $15 ceiling committed as a dated frame.

## Acceptance

- [ ] Comparison registry updated: `gemini-3.6-flash` and `gemini-3.5-flash-lite` added as the latest Gemini with web-verified prices/effort/API surface; former `gemini-3.5-flash` and `gemini-3.1-flash-lite` retained as tagged previous-generation entries paired to their successors (identical tier/config); Pro unchanged; model reference catalog updated; keyless fixture byte-stable; per-package tests/build/lint green (#20260723153001-gemini-comparison-registry-add-new-models.md)
- [ ] Dedicated generational-delta insight: pairs each former→new Gemini tier, quantifies the per-metric delta (speed, accuracy, cost), and renders an explicit "what improved / what regressed / net verdict" narrative into the EN report (§4/§7) and the JP insights; keyless path deterministic; unit tests cover the pairing and delta math (#20260723153002-gemini-generational-delta-insight.md)
- [ ] Real head-to-head sweep priced with `--estimate` then run within the $15/run ceiling under identical instrument-v2 conditions (only the Gemini models differ); committed as a dated frame; EN/JP comparison pages + generational-delta insight recomposed from the measured frame; provenance honest (#20260723153003-gemini-headtohead-real-sweep.md)
- [ ] qmu-co-jp receives the refreshed comparison + generational-delta article through the publish ticket flow on the next `/ship` (#20260723153003-gemini-headtohead-real-sweep.md)

## Changelog

<!-- Append-only, dated timeline relating this mission's tickets and reports over time.
     One line per event ("- YYYY-MM-DD — event — filename"); never rewrite past lines. -->
- 2026-07-23 — mission created — 20260723153001-gemini-comparison-registry-add-new-models.md
- 2026-07-23 — strategy created — keep-the-llm-speed-and-accuracy-comparison-current-as-providers-release-new-models — strategy.md
- 2026-07-23 — strategy linked — keep-the-llm-speed-and-accuracy-comparison-current-as-providers-release-new-models
- 2026-07-23 — ticket added — 20260723153001-gemini-comparison-registry-add-new-models.md
- 2026-07-23 — ticket added — 20260723153002-gemini-generational-delta-insight.md
- 2026-07-23 — ticket added — 20260723153003-gemini-headtohead-real-sweep.md
- 2026-07-23 — drive-authorized — head-to-head sweep spend approved ($15/run ceiling, --estimate first); new Gemini = 3.6 Flash / 3.5 Flash-Lite (web-verified 2026-07-23); dedicated generational-delta insight; identical conditions — mission.md
