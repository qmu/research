# 0006 — A dated survey-article series per topic (supersedes 0005)

## Context

[ADR 0005](./0005-snapshot-articles-over-dated-trial-history.md) split each
topic into two surfaces: a compact renderer-produced **snapshot** sidebar page
and hidden full **trial reports** under
`docs/research-reports/history/<topic-id>/<timestamp>/`. In practice this was
only applied to the `speed` topic, and it forked the two languages: the
published Japanese page was translated from the hidden full report
(`*.report.md`), not from the English sidebar snapshot, so the English page
opened on a "Tendency" summary while the Japanese page opened on the 7-section
outline. The owner (2026-07-13) found the "snapshot" concept misleading and
asked for a simpler, uniform structure.

## Decision

Each published topic is a **dated series of survey articles**. There is no
separate snapshot surface.

- **Current page** — the stable per-topic slug (e.g. `llm-speed-comparison`)
  always holds the **latest** survey's article: the standard 7-section article
  (`packages/tech/src/research/domain/article-outline.ts`) plus two composed
  blocks —
  - a **推移 / Trend** block in §4 charting each metric across the surveys in
    the tendency window (a note until two same-instrument surveys exist), and
  - a **過去の調査 / Past surveys** block in §7 linking every earlier dated
    survey, newest first.
  Both are bold-labelled blocks, not new headings, so the 7-section outline and
  the §4 compactness expectations hold.
- **Past surveys** — the earlier dated articles under
  `history/<topic>/<ts>/`. Each is a complete article for its run and is never
  rewritten when a new survey lands. When survey N+1 runs, a new article is
  created and becomes the current page; article N moves into the past-surveys
  list but remains reachable at its dated slug.
- **English first, then translated.** The current page is generated in English
  and the Japanese current page is a translation of it, so the two never fork.
  The `research -- <topic> --real` pipeline composes the current page and then
  translates it (`packages/tech/src/research/current-article-runner.ts`).
- **Publish all runs.** Every dated survey's Japanese article is copied to
  qmu-co-jp under a mirrored `history/<topic>/<ts>/` path, so the in-article
  過去の調査 links resolve there (`framePublishPlan` in `site.ts`).

Topic initiation still follows the proposal-first protocol in
`docs/research-development-guideline.md` (cadence, subjects, metrics,
cost/trial-count range, accumulated history; developer approval before any paid
run; first trial validates the design).

## Alternatives considered

- **Keep ADR 0005's separate snapshot page**: rejected — it forked the two
  languages and only ever covered one topic; a single uniform article per
  language is simpler and restores English → translate → Japanese.
- **Drop the trend/past-links and publish plain 7-section reports**: rejected —
  the owner wants each article to carry its own trend and to link the whole
  survey history, so a reader lands on the latest and can walk backwards.
- **Rewrite past frames into the new structure retroactively**: rejected — past
  articles are the historical record for their run and stay as-is; the new
  structure applies to the current page and to surveys from here forward.

## Consequences

- One article shape per topic per language: the current page is the latest
  survey with trend + past-survey links; detail for each run lives in that
  run's own dated article.
- Composition is a site step (`compose-current-articles`) reused by the
  real-run pipeline, so the CLI and the pipeline cannot drift.
- The ADR 0005 snapshot renderer (`renderSnapshot`, the 1,500-token snapshot
  budget) is retired from the published path; its trend-charting and
  frame-listing helpers are reused by the composer.
- Remaining follow-ups (tracked on ticket
  `20260713144951-dated-article-series-with-trend-and-backlinks`): language-
  matched past-survey links for the qmu English section, retiring the
  now-vestigial insights stage, and trend point extractors for the non-speed/
  accuracy topics.
