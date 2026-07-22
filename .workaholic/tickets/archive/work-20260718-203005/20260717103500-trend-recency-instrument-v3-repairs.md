---
created_at: 2026-07-17T10:35:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 4h
commit_hash: 0d1688c
category: Changed
mission: periodic-research-target-trend-catchable-ai-models-grok-perplexity
depends_on: [20260714010001-trend-recency-first-validation-trial.md]
---

# Trend-recency instrument v3: xAI Agent Tools migration, robust abstention scoring, citation date signal

## Overview

The first validation trial (2026-07-17, `trend-recency-v2-20260717`) proved the
design — grounded 1.00 vs. control 0.00 recencyAccuracy on all three measured
pairs, cost $0.25 vs. $0.47 estimated — and surfaced four instrument gaps to fix
before (or alongside) the second trial. The committed run record
(`docs/research-reports/trend-recency-history/2026-07-17-trend-recency-v2-20260717.result.json`)
lets the scoring changes be validated by re-scoring recorded answers without
new paid calls.

## Policies

- **workaholic:mission** — keyless byte-stable fixtures and never-faked numbers
  are the mission's load-bearing constraints; every claim here is backed by the
  committed v2 result frame, and error rows stay honest error rows.
- **workaholic:implementation** — external surfaces stay behind the `vendors/`
  anti-corruption layers (the xAI migration touches only `xai.ts`); scoring is
  pure domain logic validated by re-scoring recorded data, machine-checkable
  without new spend.
- **workaholic:development** — paid runs are owner-gated: the Quality Gate's
  single-subject re-probe and the Sonar re-run both wait for explicit approval.

## Findings to fix

1. **xAI Live Search is deprecated.** The real run returned
   `410 "Live search is deprecated. Please switch to the Agent Tools API"` for
   `grok-4-3-grounded`. Migrate `createXaiGroundedClient`
   (`packages/tech/src/vendors/llm/xai.ts`) from `search_parameters` to the
   Agent Tools API surface, per current xAI docs.
2. **Abstention detection misses typographic apostrophes and common phrasings.**
   `scoreAbstention` (`packages/tech/src/trend-recency/domain/score.ts`) missed
   `“I don’t have reliable information …”` (U+2019 apostrophe; GPT-5.5 control)
   and `“The 2026 … have not yet occurred.” / “No such models exist.”` (Grok
   control) — controls' honest abstentions scored 0. Conversely, a grounded
   Claude answer that opened with an abstention phrase before searching and
   answering correctly scored abstained=1 (false positive). Normalize
   apostrophes/quotes, extend the marker set ("not yet occurred", "no such",
   "can't verify"), and judge the FINAL stance of the answer — or fold this into
   the planned LLM-judge grade (hallucination-rate metric), which this trial's
   wrong-vs-abstained control behavior already motivates.
3. **No citation carried a parseable date** — `citationFreshnessDays` was n/a on
   every row (Gemini groundingChunks and OpenAI url_citation annotations carry
   no dates; Anthropic's cited locations carried no usable `page_age` this run).
   Add a date signal: resolve cited URLs and read published metadata (this also
   upgrades citationValidity from well-formed-URL to resolves-and-supports), or
   read provider-specific date surfaces where they exist.
4. **PERPLEXITY_API_KEY is still unprovisioned** (proposal open question 4), so
   both Sonar subjects were error rows. Owner action — provisioning a key (new
   billing relationship) — not code; re-run Sonar rows once provisioned.

## Quality Gate

- Re-scoring the committed v2 result frame with the new abstention scorer flags
  the recorded GPT-5.5/Grok control abstentions and un-flags the grounded
  Claude false positive.
- A single-subject `--real` probe of `grok-4-3-grounded` (a few cents, owner
  approval) returns a measured row instead of a 410 error row.
- Keyless fixture path stays byte-stable; `make test` / `make lint` green.

## Considerations

Scoring changes are an instrument-version bump (v3): trend series connect
same-instrument-version points only, and the v2 frame stays as recorded.

## Progress — 2026-07-17 (keyless pass, branch `work-20260717-150003`)

Everything provable without a key is implemented and verified. **The ticket stays
open**: its Quality Gate has an owner-gated paid item (the live xAI probe) that no
keyless work can close.

### Landed

- **Finding 1 — xAI Agent Tools migration: code complete, LIVE VERIFICATION STILL
  OWED.** `createXaiGroundedClient` moved off the retired Live Search
  (`search_parameters` on Chat Completions) to the Agent Tools surface: the
  OpenAI-compatible Responses protocol at `${XAI_BASE_URL}/responses` with
  `tools: [{ type: "web_search" }]`, reading the answer from `output_text` and
  sources from the top-level `citations` list, falling back to inline
  `url_citation` annotations. Wire shapes taken from the xAI docs read 2026-07-17
  (`/developers/tools/overview`, `/tools/web-search`, `/tools/citations`) — the
  doc URL the 410 itself pointed at. `extractXaiCitations` / `extractXaiAgentText`
  are pure and unit-tested against recorded-shape fixture payloads, mirroring the
  other three providers' clients (PR #48). Note: an annotation's `title` is the
  visible citation NUMBER ("1"), not a source title, so it is deliberately dropped.
- **Registry drift found while migrating:** Agent Tools re-priced the grounded
  surface **down**, $25 → **$5 per 1k successful calls**
  (https://docs.x.ai/developers/pricing, verified 2026-07-17); grok-4.3 token
  prices unchanged. The card still carried the retired Live Search price, which
  would have overstated every `--estimate` for this subject 5x. Card updated
  (`modelName`, price, source, `lastVerified`).
- **Finding 2 — abstention scorer: DONE, gate bullet 1 met.** Answers are
  normalized (typographic apostrophes folded, negative contractions expanded) so
  markers are written once in canonical English; the marker set gained the
  phrasings the trial actually used; and the score now reads the answer's FINAL
  stance — a decline retracted by an announced lookup that then delivers an answer
  is not an abstention. Proved by re-scoring the **committed v2 frame** itself
  (`packages/tech/src/trend-recency/rescore-v2-frame.test.ts`), not invented
  strings: all three GPT-5.5/Grok/Gemini controls go 0→1 on all three probes, the
  grounded Claude row goes 1→0, Claude's ungrounded control stays 1, and
  `recencyAccuracy` is asserted UNMOVED (grounded 1.00 vs control 0.00 survives
  the bump). Gemini's controls were also under-counted — the ticket named only
  GPT-5.5/Grok.
- **Finding 3 — citation date signal: plumbing landed, gap NOT closed.** New pure
  `domain/citation-date.ts` dates a citation from the provider's field when present,
  else from a publisher-embedded URL path date (`/2026/07/15/`), calendar-validated
  and path-only. **Honest negative, asserted as a test:** this rescues *no* row of
  the v2 frame — Gemini returns opaque `vertexaisearch` redirects and the others
  cited undated permalinks. Freshness now has a signal only when data provides one.

### Still gated (nothing keyless can close these)

- **Live xAI verification (Quality Gate bullet 2) — OWNER-GATED, PAID.** The
  migration is documentation-faithful but unproven on the wire; the 410 is all the
  first trial verified. Needs the approved single-subject `--real` probe of
  `grok-4-3-grounded` (a few cents) to return a measured row. Until it runs the
  Grok grounded row stays an error row rather than an assumed-working one — the
  adapter comment, `run.ts`, and the report scope text all say so.
- **Finding 4 — `PERPLEXITY_API_KEY` — OWNER ACTION.** Unprovisioned (a new
  billing relationship); both Sonar rows stay error rows. Not code.

### Verification (raw exit codes, keyless — no paid call)

`npm test` (packages/tech) 0 · 524 passed/1 skipped · `make drift` 0 · `make lint`
0 · `make build` 0. Fixture regenerated byte-stable; the abstention percentages on
the fixture path did not move, confirming the scorer change is behavior-preserving
there.

**Harness finding (out of scope, needs its own ticket):** `make test` returns **0
even when a package fails** — the Makefile's `for p in $(PACKAGES)` loop takes the
last package's status, so a `tsc` error in `packages/tech` was masked by
`packages/industry` passing. CI invokes these same targets. Verified per-package
with `npm test` instead. Same shape for `build`/`lint`.

## Final Report — 2026-07-18 (drive on desk `work-20260718-203005`)

**Outcome: implemented (keyless scope complete); two owner-gated items escalated.**

The v3 keyless repairs (Findings 1–3) were already implemented and merged to
`main` in commit `0d1688c` ("Repair the trend-recency instrument (v3, keyless):
xAI Agent Tools migration, final-stance abstention scoring, citation date
signal"), an ancestor of this desk branch. This drive re-verified the keyless
Quality Gate against the committed code and archives the ticket; no new code was
needed.

### Quality Gate verdict

- ✅ **Re-scoring the committed v2 result frame with the new abstention scorer**
  flags the recorded GPT-5.5/Grok control abstentions and un-flags the grounded
  Claude false positive. Verified by `src/trend-recency/rescore-v2-frame.test.ts`
  passing in the full suite (566 passed / 1 skipped, exit 0) on this desk.
- ⛔ **Single-subject `--real` probe of `grok-4-3-grounded`** — OWNER-GATED, PAID.
  Not runnable by an autonomous drive (spend approval + `XAI_API_KEY`; the drive
  charter forbids new benchmark measurement calls). Left unchecked; escalated.
  Until it runs, the Grok grounded row stays an honest `error` row (xAI 410),
  exactly as `run.ts`, the adapter comment, and the §3 report scope already state.
- ✅ **Keyless fixture path stays byte-stable; test / lint green.** On this desk:
  `npm run build` 0 · `npx vitest --run` 0 (566 passed) · `npm run lint` 0 ·
  `bash scripts/check-fixture-drift.sh` 0 (fixtures byte-stable).

### Still owner-gated (not code; carried by the mission, not this ticket)

- **Live xAI verification** of the Agent Tools migration (the paid probe above).
- **Finding 4 — `PERPLEXITY_API_KEY`** is still unprovisioned (a new billing
  relationship), so both Sonar rows stay `error` rows. Owner action.

These two are the only reasons the instrument does not measure 10/10 subjects;
both are external/paid and outside an autonomous drive's charter.
