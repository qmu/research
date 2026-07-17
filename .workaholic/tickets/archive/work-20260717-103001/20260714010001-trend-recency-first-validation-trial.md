---
created_at: 2026-07-14T01:00:01+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 2h
commit_hash: e4a0bc9
category: Added
mission: periodic-research-target-trend-catchable-ai-models-grok-perplexity
depends_on: [20260714010000-scaffold-trend-recency-instrument.md]
blocked_on: developer approval + scaffold ticket + provider keys (this run spends money)
---

# Trend-recency: first validation trial (--real) and design review

> **BLOCKED on approval, scaffold, and keys.** Do not run until the scaffold
> ticket lands and the developer approves the spend. This ticket makes paid API
> calls.

## Overview

Run the disposable first trial that proves the design (guideline step 3). Not a
cadence commitment — a validation of whether the metrics discriminate and the
cost matches the estimate.

## Implementation Steps

1. `npm run research -- trend-recency --estimate` (from `packages/tech`); confirm
   the figure sits under the approved ceiling ($30), else stop for re-approval.
2. Curate/generate the trailing-window probe set + ground truth; commit it to
   `docs/research-reports/trend-recency-history/`.
3. `npm run research -- trend-recency --real`.
4. Review: do grounded configs beat their ungrounded controls on
   `recencyAccuracy`? Do providers separate? Did cost match the estimate? Did
   citation resolution work against live URLs?
5. Record findings in the mission changelog; confirm or revise the monthly
   cadence.

## Considerations

If the metrics do not discriminate or cost overshoots, revise the design before
committing to recurrence. Keep the trial narrow first if the developer chose the
"two surfaces + controls" trial-1 scope in the proposal's open questions.

## Completion — first validation trial run 2026-07-17 (trend desk)

Owner approved the ~$0.47 spend (stop above ~$1.00). Steps 1–5, with raw exit
codes:

1. **Estimate**: exit 0, total ~$0.4723 for 10 configs × 3 probes × 1 rep —
   under both the $30 ceiling and the $1.00 stop.
2. **Probe set curated and committed**: instrument bump to
   `trend-recency-v2-20260717` — three web-verified events from the trailing 30
   days (2026-07-12 Wimbledon men's champion; 2026-07-15 World Cup finalists;
   2026-07-09 GPT-5.6 variant names), each with dated sources, committed as
   `docs/research-reports/trend-recency-history/2026-07-17-trend-recency-v2-20260717.json`.
   Keyless fixture regenerated for v2 (byte-stable, identical sha256 across two
   runs); `npm test` 0 (after repairing a #48×#50 semantic merge break — see
   commit), `npm run lint` 0.
3. **Real run**: exit 0, via the primary checkout's gitignored `.env`
   (`node --env-file=…/research/packages/tech/.env`, no credentials copied).
   Run record committed as
   `…/trend-recency-history/2026-07-17-trend-recency-v2-20260717.result.json`
   (the `.real.*` outputs themselves are gitignored by repo policy).
4. **Design review — PASSED with follow-ups.**
   - **Grounded beats control on recencyAccuracy: yes, 3/3 measured pairs** —
     Gemini 3.1 Pro, GPT-5.5, Claude Opus 4.8 grounded all 1.00 (9/9 probes,
     every answer cited: citationValidity 1.00) vs. their ungrounded controls
     all 0.00. This is the exact separation the topic exists to measure.
   - **Providers separate** on latency (grounded: GPT 4.5s / Claude 6.9s /
     Gemini 9.8s), verbosity, and control behavior (Claude control abstained;
     GPT/Grok controls declined in phrasing the mechanical scorer missed —
     see finding below; none asserted a false answer).
   - **Cost matched**: ~$0.25 actual (measured output tokens + catalog search
     billing) vs. $0.47 estimated — the estimate is conservative; no overshoot.
   - **Citation resolution**: URLs well-formed on every measured grounded row;
     live resolution stays a later instrument version. **No citation carried a
     parseable date**, so citationFreshnessDays got no signal — follow-up.
   - **Error rows (honest, never faked)**: grok-4-3-grounded — xAI returned
     `410 Live search is deprecated → Agent Tools API` (live verification of
     the scaffold wiring doing its job); sonar / sonar-pro —
     `PERPLEXITY_API_KEY` still unprovisioned (proposal open question 4).
   - Follow-ups filed as
     `20260717103500-trend-recency-instrument-v3-repairs.md` (xAI Agent Tools
     migration, apostrophe-robust abstention scoring, citation date signal,
     Sonar key).
5. **Cadence**: monthly cadence confirmed; findings recorded in the mission
   changelog. Publish (20260714010002) stays gated on the developer reading
   this review (3 of 6 grounded subjects measured — coverage is a developer
   call).
