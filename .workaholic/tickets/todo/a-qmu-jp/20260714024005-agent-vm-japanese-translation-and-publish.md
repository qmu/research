---
created_at: 2026-07-14T02:40:05+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 1h
commit_hash:
category: Added
mission: periodic-research-target-compare-agent-vm-solutions-lambda-microvms-etc
depends_on: [20260714024002-agent-vm-wire-into-published-topics.md]
---

# Translate the agent-vm topic to Japanese and wire it into the qmu publish pipeline

## Overview

Produce the Japanese `agent-vm` page as a translation of the composed English
current article (English → translate → Japanese, never forked), and include the
topic in the qmu publish plan so `scripts/publish-research.sh` and the qmu ticket
payload carry it in order.

**Gated:** publish step — after the topic is wired into `publishedResearchTopics`
and (ideally) has at least the fixture or first-trial page.

## Key Files

- `packages/tech/src/research/report-translation-runner.ts` /
  `translate-runner.ts` — the translation stage.
- `packages/tech/src/research/domain/site.ts` — `publishPlan`, `renderQmuTicketPayload`.
- `docs/research-reports/agent-vm-comparison.insights.ja.md` (generated).

## Implementation Steps

1. Add `agent-vm` to the topic's `japanese` page metadata in `site.ts`.
2. Run the translation stage (`research:translate-report`) after composing the
   current English article.
3. Regenerate indexes; verify the JP page appears in the same order as EN.

## Considerations

The JP page is a translation of the English current page, not the insights prose.
Follow the `/ship` reflect-onto-qmu-co-jp flow in CLAUDE.md for the actual copy.
