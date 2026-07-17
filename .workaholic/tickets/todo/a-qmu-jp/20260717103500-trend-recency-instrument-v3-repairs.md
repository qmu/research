---
created_at: 2026-07-17T10:35:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 4h
commit_hash:
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
