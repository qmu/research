---
created_at: 2026-07-14T01:30:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category: Added
mission: periodic-research-target-svg-generation-and-animation
depends_on: [20260714005159-kickoff-propose-periodic-research.md]
---

# Wire the svg-generation topic into the unified CLI, report renderer, and published EN/JP pages

## Overview

The keyless `svg-generation` skeleton (registry, domain scorers, fixture/estimate
runner, tests) landed with the kickoff drive. This ticket makes it a first-class
published topic: reachable through the unified research CLI, rendered as a
§4-policy report, and published as EN + JP pages wired through the shared
`site.ts` metadata — following the image-generation topic exactly.

## Key Files

- `packages/tech/src/svg-generation/` — the scaffolded topic (run/estimate/domain).
- `packages/tech/src/image-generation/` + `src/entrypoints/run-image-generation.ts` — the reference for CLI + report wiring.
- `packages/tech/src/research/domain/site.ts` — `publishedResearchTopics` (add the topic here; title == sidebar label).
- `packages/tech/src/research/domain/article-outline.ts` — the 7-section outline the report must satisfy.

## Implementation Steps

1. Add `src/svg-generation/domain/report.ts` producing the 7-section EN report from a `SvgGenerationResult` (keep §4 within the size budget; no mermaid).
2. Add the entrypoint `src/entrypoints/run-svg-generation.ts` (fixture default, `--real`, `--estimate`, `--only`/model filter), and register the topic in the unified `run-research.ts` + `site.ts` metadata.
3. Author the EN result page under `docs/research-reports/`; generate the JP translation via `npm run research:translate-report`.
4. Add the disk-reading published-page guards (title==sidebar-label, no-mermaid, §4 budget, 7-section outline) as tests.
5. `make test && make lint` green; keyless fixture path stays byte-stable.

## Considerations

Do not fork a parallel design — mirror image-generation. No paid run here: the
page ships fixture-provenance first (clearly labelled), exactly as
image-generation did; real numbers arrive with the first-real-trial ticket.
