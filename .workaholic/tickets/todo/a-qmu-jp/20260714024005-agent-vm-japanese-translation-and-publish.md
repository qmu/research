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

## Policies

- **English → translate → Japanese, never forked** — 日本語ページは合成済み
  英語 current article の翻訳として生成し、二言語を分岐させない。
- **workaholic:implementation** — 公開トピックの掲載順・ラベル・publish plan は
  site.ts の単一 metadata から導出し、手書きの並行リストを作らない。
- **リポジトリ境界** — qmu-co-jp への反映はこのリポジトリの `/ship` が
  publish ticket を生成し、qmu-co-jp 側の `/drive` が適用する（直接編集しない）。

## Implementation Steps

1. Add `agent-vm` to the topic's `japanese` page metadata in `site.ts`.
2. Run the translation stage (`research:translate-report`) after composing the
   current English article.
3. Regenerate indexes; verify the JP page appears in the same order as EN.

## Quality Gate

- `agent-vm-comparison.insights.ja.md` が合成済み英語 current article の
  pipeline 翻訳（`research:translate-report`）で再生成され、provenance
  frontmatter（source artifact / commit / model / timestamp）を持つ。
- EN/JP インデックスと qmu publish plan に同じ順序で載っている
  （`research:site -- copy-plan` / `qmu-ticket` に反映）。
- published-page ガード（title==label、no-mermaid、§4 予算、7節アウトライン）
  と全テスト・lint・docs ビルドが緑。

## Considerations

The JP page is a translation of the English current page, not the insights prose.
Follow the `/ship` reflect-onto-qmu-co-jp flow in CLAUDE.md for the actual copy.

## Progress / Blocked (2026-07-17 drive)

Partially superseded by #024002, remainder blocked:

- **Done via #024002**: the topic is in `publishedResearchTopics`, so
  `publishPlan()` / `renderQmuTicketPayload()` / `publish-research.sh` carry
  `agent-vm-comparison` in sidebar order, and a keyless placeholder
  `docs/research-reports/agent-vm-comparison.insights.ja.md` ships (svg
  precedent) so indexes and guards are green.
- **Blocked**: the pipeline translation itself (`research:translate-report`)
  needs an LLM API key — none is present in the environment — and is a paid
  call, which this run is not authorized to make. It runs as part of the first
  real trial (#024004), which composes the English current article first
  (English → translate → Japanese, never forked).

### Spend approval (2026-07-22)

Spend approved by the developer (a@qmu.jp) 2026-07-22 in the /mission planning
session. Remaining gate is environmental credentials only — FLY_API_TOKEN +
FLY_APP_NAME for the Fly.io probe (024001/024004) and an LLM API key for the
pipeline translation (024005). The `--real` path self-reports missing
credentials and records unreachable rows, so the drive proceeds and measures
whatever providers are reachable.
