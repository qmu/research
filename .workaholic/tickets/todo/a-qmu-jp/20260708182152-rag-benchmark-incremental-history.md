---
created_at: 2026-07-08T18:21:52+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on:
mission:
---

# RAG ベンチマークを増分履歴モデルに載せる

## Overview

RAG ベンチマークは現在、実行のたびに `rag-benchmark.real.data.json` を上書きするだけで、
**時系列の履歴を持たない**。LLM 比較には既にある増分履歴の仕組み
（`llm-model-comparison/domain/history.ts` / `merge.ts`、コミットされる
`llm-model-comparison.history.json`、実行ごとの gzip アーカイブ
`docs/research-reports/history/<timestamp>.data.json.gz`）を **RAG にも同じ形で持たせ**、
実行を重ねるほどバックエンドごとの計測が系列として積み上がるようにする。これは、後続の
トレンド可視化（別チケット）と、いずれ入れる自動オーケストレーションの土台になる。

真実のソースの分担は LLM と揃える: 完全な artifact（`.real.data.json`）は gitignore・再生成可能、
**コンパクトな履歴点（`history.json`）とアーカイブはコミットする**。fixture 経路は履歴を書かない
（キー不要・byte-stable を維持）。

（スケジューラは対象外。実行とレポート更新は当面手動で行う。）

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — 履歴の射影・マージは純関数として
  `rag-benchmark/domain/` に置き、ファイル IO とアーカイブは entrypoint に閉じる（LLM と同じ分担）。
- `workaholic:implementation` / `policies/coding-standards.md` — 型駆動。`HistoryPoint`/`HistoryFile` を
  RAG 用に定義し、既存型を緩めない。
- `workaholic:implementation` / `policies/objective-documentation.md` — 履歴点は provenance（measured /
  fixtured / error）と measuredAt を保持し、後から measured 行と error 行を時系列で区別できるようにする。
- `workaholic:operation` / `policies/ci-cd.md` — `rag:fixture` はキー不要・byte-stable のまま。履歴は
  実バックエンドの実行時のみ更新し、CI に実行を乗せない。

## Key Files

- `packages/tech/src/llm-model-comparison/domain/history.ts` - 参照実装。`toHistoryPoint` と
  ever-growing な履歴への append を純関数で行うパターンを RAG へ写す。
- `packages/tech/src/llm-model-comparison/domain/types.ts`（171-195 行）- `HistoryPoint`/`HistoryEntry`/
  `HistoryFile` の形。RAG 版を用意する際の基準。
- `packages/tech/src/rag-benchmark/domain/history.ts` - **新規**。バックエンド実行を履歴点へ射影し、
  `history.json` へ append する純関数。
- `packages/tech/src/rag-benchmark/domain/types.ts` - RAG 用の `HistoryPoint`（backend id / provenance /
  recall@k・nDCG@k・MRR・ingestMs・p50・p95・costUsd / measuredAt）と `HistoryFile` を追加。
- `packages/tech/src/entrypoints/run-rag-benchmark.ts` - 実行（非 fixture）時に履歴点を
  `rag-benchmark.history.json` へ追記し、完全 artifact の gzip アーカイブを書く。fixture 経路は不変。
- `docs/research-reports/rag-benchmark.history.json` - **新規・コミット対象**の履歴（コンパクト）。
- `docs/research-reports/history/` - アーカイブ配置先。LLM と衝突しないよう topic 接頭辞
  （例 `rag-benchmark-<timestamp>.data.json.gz`）を付ける。

## Related History

LLM 比較は実行ごとにコンパクトな履歴点を積み、完全記録を gzip アーカイブし、レポートは最新断面を
描画する形で運用している。RAG も同じ分担（コミットする履歴＋gitignore の完全 artifact）に揃える。

- [20260706105042-recurring-incremental-llm-comparison-with-history.md](.workaholic/tickets/archive/work-20260622-191220/20260706105042-recurring-incremental-llm-comparison-with-history.md) - LLM の増分履歴・アーカイブ・error 復旧を導入した回（本チケットが写す元）
- [20260706202819-rag-benchmark-foundation-sqlite-vec.md](.workaholic/tickets/archive/work-20260622-191220/20260706202819-rag-benchmark-foundation-sqlite-vec.md) - RAG ハーネス基盤（履歴は未実装）

## Implementation Steps

1. RAG 用の履歴型を `domain/types.ts` に追加する: `HistoryPoint`（backend id・provenance・
   recall@k / nDCG@k / MRR・ingestMs・p50・p95・costUsd・measuredAt）と `HistoryFile { entries }`。
2. `domain/history.ts`（新規）に純関数を置く: `toHistoryPoint(run)` と、既存 `HistoryFile` へ新しい
   エントリ（generatedAt をキーに points 配列）を append する `appendHistory`。
3. entrypoint を更新: 非 fixture の実行後に、履歴点を `rag-benchmark.history.json` へ追記し、完全
   artifact を gzip 化して `docs/research-reports/history/rag-benchmark-<timestamp>.data.json.gz` に書く。
   これらはコミット対象（`.real.data.json` は従来どおり gitignore）。
4. fixture 経路（`--fixture`）は履歴・アーカイブを一切書かない。byte-stable を維持する。
5. 単体テスト: `history.test.ts` を写し、射影と append（既知入力→期待する points 追加）を検証する。

## Quality Gate

**Acceptance criteria**:

- 実バックエンドの `rag:real` 実行が、バックエンドごとの `HistoryPoint`（measuredAt・provenance・
  指標つき）を **コミットされる** `rag-benchmark.history.json` へ追記し、完全 artifact の gzip アーカイブを
  `docs/research-reports/history/` に書く。
- 2 回実行すると、履歴に **2 つの時点**（異なる measuredAt のエントリ）が並ぶ。
- `--fixture` 実行は履歴・アーカイブを書かず、`rag-benchmark.{md,data.json}` が byte-stable のまま。
- 履歴点は provenance（measured / error 等）を保持し、後から時系列で区別できる。

**Verification method**:

- `npm test`（tsc + vitest。history 射影・append の単体テストを含む）、`npm run lint`、`make build` が緑。
- `rag:real` を 2 回回し、`rag-benchmark.history.json` の entries が 2 になり、アーカイブが 2 ファイル
  できることを確認する。`rag:fixture` ×2 が byte-identical であることを確認する。

**Gate**:

- テスト・lint・ビルドが緑、fixture byte-stable、実行 2 回で履歴に 2 時点が積まれ、アーカイブが残る。

## Considerations

- **コミット対象の分担**: LLM と同じく、コンパクト履歴（`history.json`）と gzip アーカイブはコミットし、
  完全 `.real.data.json` は gitignore・再生成可能とする（`.gitignore` は既に `*.real.data.json` を無視）。
- **アーカイブ名の衝突**: LLM と RAG が同じ `docs/research-reports/history/` を使うため、topic 接頭辞で
  分ける（`rag-benchmark-<ts>.data.json.gz`）。
- **error 行の扱い**: AutoRAG のように error になるバックエンドも履歴点を残す（provenance=error）。トレンドで
  「いつから measured になったか」を追えるようにする（`objective-documentation`）。
- **共有形**: 後続のトレンド可視化チケットが LLM/RAG 両方の履歴を一つのチャート実装で扱えるよう、
  `HistoryPoint` の形（measuredAt＋数値指標＋provenance）は LLM と極力そろえる。
