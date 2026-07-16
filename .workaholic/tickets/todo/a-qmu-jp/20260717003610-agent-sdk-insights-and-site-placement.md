---
created_at: 2026-07-17T00:36:10+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category: Changed
depends_on:
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# agent-sdk 参照トピックに insights/JP 層とサイト掲載を与え、Acceptance 項目6を完成させる

## Overview

ミッション Acceptance 項目6（non-benchmark reference topics）は半分だけ達成されて
いる。`foundation-models` はカタログ provenance つきで insights + JP が公開済み
（`docs/research-reports/foundation-models.insights.md` / `.insights.ja.md`、
site.ts に EN/JP 両サイドバー掲載）だが、`agent-sdk` は:

- `packages/tech/src/research/domain/topic.ts` に `kind: "article"` として登録され、
  `npm run research -- agent-sdk --fixture` は provenance（設計比較 / 未測定 /
  要確認）を表示して通るものの、`stages: ["benchmark"]` のみで insights /
  translation 段を持たない。
- `packages/tech/src/research/domain/site.ts` の公開トピック registry に存在せず、
  手書き記事 `docs/llm-foundation/agent-sdk-comparison.md`（日本語）はサイドバー・
  index から辿れない orphan ページとして build されている。
- 英語版が存在しない（他トピックは EN ソース + JP の対で公開する構造）。

## Policies

- **workaholic:implementation** — 公開トピックの掲載順・ラベルは site.ts の
  単一 metadata から導出し、手書きの並行リストを作らない（多経路到達性）。
- **workaholic:design** — 参照トピックは実測と混同されない provenance
  （design-comparison / 未測定 / 要確認）を UI 上も保持する。

## Implementation Steps

1. article-kind トピックのパイプライン形を決める: 手書き JP 記事を正とし EN を
   生成（翻訳の逆方向）するか、EN 記事を書き起こして通常の insights/JP 構造に
   載せるか。provenance（design-comparison / 未測定 / 要確認）は必ず保持する。
2. `site.ts` に agent-sdk の EN/JP 掲載エントリと qmuSlug を追加し、
   `write-indexes` で両 index に載せる。
3. `topic.ts` の stages を決定した形に更新し、`planPipeline` / estimate 経路を通す。
4. `npm run research:site -- copy-plan` に載ることを確認し、qmu-co-jp への公開は
   既存の /ship publish-ticket フローに任せる。

## Quality Gate

- agent-sdk が EN/JP 両サイドバーに provenance 明示つきで載り、orphan でなくなる。
- `npm test` / `npm run lint` / `make build` 緑。
- 完了後、ミッション Acceptance 項目6 をチェックできる（7/7）。
