---
created_at: 2026-07-19T00:05:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Config, UX]
effort: 2h
commit_hash: 54a0f1d
category: Changed
mission: periodic-research-target-trend-catchable-ai-models-grok-perplexity
depends_on: []
---

# Trend-recency: run the owed Grok Agent Tools live probe, turn the xAI error row into a measured row

> **UNBLOCKED 2026-07-18/19** — the developer explicitly authorized the owed paid
> probes ("go all the actual runs"). `XAI_API_KEY` is present; the single-subject
> Grok grounded probe is key-backed. `PERPLEXITY_API_KEY` is still absent, so the
> Sonar/Sonar-Pro rows stay honest error rows.

## Overview

The published trend-recency v2 survey (frame `2026-07-17T01-34-36-857Z`) carries
7 measured of 10 subject rows. `grok-4-3-grounded` was an honest `error` row: the
2026-07-17 first trial got `410 "Live search is deprecated"` and the xAI adapter
was migrated to the Agent Tools `web_search` (Responses) surface but never
verified live. Run the single-subject `--real` Grok probe to verify the migration
on the wire and, if it succeeds, fill that row in as measured — re-rendering the
frame and re-composing the current EN/JP pages from it.

## Policies

- **workaholic:development** — proposal-first and objective docs: a row becomes
  `measured` only from a real, owner-authorized wire call; unmeasurable rows stay
  honest `error` rows (Sonar/Sonar-Pro), never faked numbers.
- **workaholic:implementation** — no hand-written parallel lists and keyless
  byte-stability: the current EN/JP pages compose deterministically from the
  committed measured frame, and `make drift` regenerates them with zero diff.

## Key Files

- `packages/tech/src/vendors/llm/xai.ts` — Agent Tools grounded client under test.
- `packages/tech/src/trend-recency/models.ts` — `grok-4-3-grounded` card.
- `docs/research-reports/history/trend-recency/2026-07-17T01-34-36-857Z/` — the
  measured dated frame the current pages compose from.

## Implementation Steps

1. `npm run research -- trend-recency --estimate --models grok-4-3-grounded`;
   proceed only within the $30 ceiling (it is ~$0.02).
2. `npm run research -- trend-recency --real --models grok-4-3-grounded` to a
   scratch OUTPUT_PATH; confirm the wire result (measured, not another error).
3. Splice the measured Grok row into the frame `data.json` (replace the error
   row, keep the other 9 rows byte-identical and the survey's top-level
   `generatedAt`), re-render the frame `.md` deterministically.
4. Re-translate the raw frame article to refresh the frame `.ja.md`
   (`research:translate-report`, one small call).
5. Re-compose current EN/JP pages + data.json from the updated frame; regenerate
   indexes (`research:site -- write-indexes`).

## Quality Gate

- The Grok grounded row is `measured` in the frame + current data.json; the frame
  and current pages agree (drift byte-stable).
- Page guards pass: title == label, no mermaid, §4 within budget, 7-section EN/JP
  outline.
- Per-package verification green with bare exit codes: `npm run build`,
  `npx vitest --run`, `npm run lint`.
- Sonar/Sonar-Pro rows remain honest `error` rows (no `PERPLEXITY_API_KEY`); no
  faked numbers.

## Final Report — 2026-07-19 (drive on desk `work-20260718-203005`, commit `54a0f1d`)

**Outcome: implemented.** The owed Grok Agent Tools live probe was run and the
`grok-4-3-grounded` error row is now a measured row; the survey reports 8 of 10
subject rows measured.

### Wire result

The single-subject `--real --models grok-4-3-grounded` probe (estimate ~$0.02,
well under the $30 ceiling) verified the xAI Agent Tools `web_search` (Responses)
migration on the wire — the prior `410 "Live search is deprecated"` is gone. All
three trailing-window probes answered correctly with valid citations:

- recencyAccuracy 1.00 (n=3), citationValidity 1.00 (n=3), citationFreshness
  0.0 d (n=1), median latency ~7195 ms.
- Wimbledon → "Jannik Sinner", World Cup → "Argentina and Spain", GPT-5.6 →
  "Sol, Terra, and Luna" — each cited.

Grok is now tied for the recency-accuracy / citation-validity lead among grounded
subjects, at the lowest grounded search price ($5/1k vs. the retired Live Search
$25/1k).

### What landed (commit `54a0f1d`)

- Measured Grok row spliced into the 2026-07-17 v2 survey frame
  (`history/trend-recency/2026-07-17T01-34-36-857Z/`), keeping the other 9 rows
  byte-identical and the survey's top-level `generatedAt`; the row carries its own
  honest `2026-07-18T15:06:31Z` `measuredAt`. Frame `.md` re-rendered
  deterministically; frame `.ja.md` re-translated (`research:translate-report`,
  claude-sonnet-5).
- Current EN/JP pages + data artifact re-composed from the updated measured frame
  via the keyless path; indexes unchanged (topic set/order stable).
- `report.ts` methodology bullet corrected: xAI Agent Tools verified live;
  Perplexity Sonar/Sonar Pro stay error rows pending `PERPLEXITY_API_KEY`.

### Verification

build 0 · vitest 0 (567 passed / 1 skipped) · lint 0 · `make drift` 0
(keyless fixtures byte-stable). Per-package, bare exit codes.

### Escalation

Perplexity Sonar and Sonar Pro remain honest `error` rows: `PERPLEXITY_API_KEY`
is still unprovisioned in `packages/tech/.env`, so those two rows cannot be
measured. They carry forward on the mission.
