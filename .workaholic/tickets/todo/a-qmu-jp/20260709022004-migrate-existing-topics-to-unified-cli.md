---
created_at: 2026-07-09T02:20:04+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260709022000-unified-per-topic-research-cli.md, 20260709022001-llm-insights-report-generator.md, 20260709022002-japanese-auto-translation-stage.md]
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# RAG・OCR・可用性を統一トピック CLI へ移行する

## Overview

既存の独立トピック（**RAG / ベクトルDB**・**OCR**・**可用性**）を、統一
`research <topic>` 規約へ移行し、それぞれに **insights 段と日本語翻訳段**を付ける。
計測（benchmark）は既存実装をそのまま使い、パイプラインの後段（insights・翻訳）と
出力規約（data artifact・provenance）を他トピックと揃える。

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — 各トピックの
  benchmark は現行の `domain/` 実装を再利用。統一するのは TopicSpec 登録と後段のみ。
- `workaholic:operation` / `policies/ci-cd.md` — 各トピックの keyless fixture は
  byte-stable。実測・insights・翻訳は owner-gated。
- `workaholic:operation` / `policies/observability.md` — 可用性は時系列・観測窓・
  サンプル数の注記を保持する（手動観測の断定回避を維持）。
- `workaholic:implementation` / `policies/objective-documentation.md` — 移行で数値・
  provenance を失わない。

## Key Files

- `packages/tech/src/rag-benchmark/run.ts` - RAG を TopicSpec 登録し後段を接続。
- `packages/tech/src/ocr-comparison/run.ts` - OCR を TopicSpec 登録し後段を接続。
- `packages/tech/src/llm-model-comparison/domain/availability*.ts` +
  `entrypoints/run-llm-availability.ts` - 可用性を TopicSpec 登録し後段を接続。
- `packages/tech/src/**/domain/topic.ts` - `vector-db` / `ocr` / `availability` を登録。
- `docs/research-reports/*.history.json` - 履歴規約を他トピックと揃える。

## Implementation Steps

1. RAG・OCR・可用性を `TopicSpec` として登録し、`research <topic>` から現行 benchmark を
   呼べるようにする（振る舞い不変）。
2. 各トピックの data artifact に対し insights 段・翻訳段を接続する（real 経路・owner-gated）。
3. keyless fixture は insights/翻訳抜きで byte-stable を維持する。
4. 可用性は「手動ヘルスプローブ観測」の注記・観測窓・サンプル数を保持する。
5. 後方互換エイリアス（`rag`/`ocr`/`availability`）を残す。
6. 各トピックのテスト・fixture byte-stability を確認する。

## Quality Gate

**Acceptance criteria**

- `research vector-db` / `research ocr` / `research availability` が現行 benchmark を
  呼び、data artifact・insights・日本語版（real 経路）を出せる。
- 各 keyless fixture が byte-stable。可用性の断定回避の文言・注記が保持される。
- 移行で数値・provenance・履歴が失われない。

**Verification method**

- `npm test`／`npm run lint`／`make build` 緑。全トピックの `*:fixture` が各 2 回 byte-identical。
- 可用性記事が引き続き手動観測として提示され、断定的ランキングを出さない。

**Gate**

- テスト・lint・build 緑、全 fixture byte-stable、3 トピックが統一 CLI・後段つきで動く。

## Considerations

- OCR・可用性・RAG の benchmark は変更しない（再編のみ）。
- RAG の real 実行は AutoRAG エラー経路のクラウド資源リークに注意
  （[[rag-real-run-autorag-r2-leak]]、ticket 20260708200000）。
- insights/翻訳は [[per-topic-research-pipeline-benchmark-llm-insights-jp-translation]] の
  共通段を各トピックに適用する。
