---
created_at: 2026-07-14T01:37:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 2h
commit_hash:
category: Added
mission: periodic-research-target-text-to-speech-speech-to-text-speech-to-speech
depends_on: [20260714005158-kickoff-propose-periodic-research.md]
blocked_by: owner approval of the speech design proposal (proposal-first gate)
---

# Publish the speech topic to the site (EN + JP pages, indexes, qmu handoff)

## Overview

**Owner-gated** (in icebox): runs only after the owner approves the speech
design proposal in the mission. The `speech` topic is already built and runnable
fixture-only; this ticket makes it a **published** topic in `LLM基礎検証`.

## Implementation Steps

1. Add a `ResearchSiteTopic` entry for `speech` to `publishedResearchTopics` in
   `packages/tech/src/research/domain/site.ts` (id `speech`, artifactBase
   `speech-comparison`, qmuSlug `speech`), carrying the agreed `design` block
   (cadence/subjects/metrics/trialsPerRun/costPerRun/accumulates) from the
   mission proposal. Choose the JP sidebar label (e.g. `音声 (TTS/STT/STS)`); the
   EN sidebar label is `Speech (TTS / STT / STS)` (== the page frontmatter title).
2. Switch the `speech` `TopicSpec` in `research/domain/topic.ts` stages from
   `["benchmark"]` to `["benchmark", "insights", "translation"]` so real/estimate
   runs compose insights + the JP translation like the other published topics.
3. Generate the JP page: `npm run research:translate-report -- speech` (a real
   `claude` translation call — cents-level, needs `ANTHROPIC_API_KEY`), producing
   `docs/research-reports/speech-comparison.insights.ja.md` with `title` == the JP
   sidebar label.
4. Regenerate indexes: `npm run research:site -- write-indexes`.
5. Confirm the published-page guards pass (`published-pages.test.ts`:
   title==label on EN and JP, no mermaid, §4 ≤ 3000 chars) and `site.test.ts` /
   `article-outline.test.ts` stay green; run `make test lint`.
6. On the next `/ship`, the qmu handoff picks up the new slug via
   `npm run research:site -- qmu-ticket` / `scripts/publish-research.sh copy`.

## Considerations

Do not publish before the design is approved. The §4 overview must stay a
concise best/median/worst summary (budget-checked); exhaustive per-subject tables
stay in §7.
