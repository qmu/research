---
created_at: 2026-07-13T12:30:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 2h
commit_hash:
category: Changed
depends_on:
mission:
---

# §4 concise overview for ALL published research articles

## Overview

Owner correction (2026-07-13, mid-drive): the v0.2.0 §4/§7 restructure
(ticket `20260713103908`, demand 6) was applied only to the speed and accuracy
articles, but the demand is a **site-wide editorial policy**: section 4
検証結果 of every published research article must be a concise, intuitive
overview — aggregated values and optionally an inline-SVG chart — with the
exhaustive per-subject tables and lists moved to section 7 検証データ. The OCR
article on qmu-co-jp still leads with the raw per-model table; RAG,
availability, and the foundation-model catalog have the same shape.

## Key Files

- `packages/tech/src/ocr-comparison/domain/report.ts` — per-model CER/WER
  table sits in `verificationResults`; move to `verificationData`, replace
  with measured-count + best/median/worst per metric.
- `packages/tech/src/rag-benchmark/domain/report.ts` — the wide per-backend
  table moves to §7; §4 keeps the history trend charts (compact SVG) plus an
  aspect overview (best backend / median / worst per metric).
- `packages/tech/src/llm-model-comparison/domain/availability-report.ts` —
  §4 keeps the 90-day uptime chart plus one compact per-provider summary
  table (30d/90d derived uptime, incident counts); the detailed 30d/90d
  tables (downtime/maintenance hours) and the recent-incident list move
  to §7.
- `packages/tech/src/llm-model-comparison/domain/catalog.ts` — §4 becomes a
  per-provider summary (model count, tier coverage, price range); the full
  catalog table moves to §7 above the source list.
- `packages/tech/src/research/domain/published-pages.test.ts` — add a
  machine check so the policy cannot regress: §4 of every published page
  that carries the numbered outline stays within a compactness budget
  (SVG markup excluded).

## Implementation Steps

1. Restructure the four renderers as above (speed/accuracy already conform).
2. Add the §4 budget guard to the published-pages test.
3. Regenerate committed EN pages via the keyless paths (`ocr:fixture`,
   `rag:fixture`, `availability:fixture`, `catalog`).
4. Re-translate the four affected Japanese pages
   (`research:translate-report -- ocr|rag|availability|foundation-models`).
5. Full gate; commit; the change reaches qmu-co-jp on the next `/ship`.

## Quality Gate

- [ ] §4 of every published EN/JP article contains no per-subject result
      table; those tables render intact in §7.
- [ ] New §4 budget guard green over the committed pages; outline, title,
      and no-mermaid guards stay green.
- [ ] `make lint`, `env -C packages/tech npm test`, `make build` green;
      keyless fixtures remain deterministic.

## Considerations

- The image-generation topic (ticket `20260713120500`, same drive) must
  render §4 in this shape from its first version.
- JP re-translation is a small LLM cost (~$2–4, claude-sonnet-5), same as
  the v0.2.0 precedent.
