---
created_at: 2026-07-09T02:20:06+09:00
author: a@qmu.jp
type: refactoring
layer: [UX, Config]
effort:
commit_hash:
category:
depends_on: [20260709022003-split-compare-speed-accuracy-topics.md, 20260709022004-migrate-existing-topics-to-unified-cli.md, 20260709022005-nonbenchmark-reference-topics.md]
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# VitePress サイトと公開を per-topic レポートに作り直す

## 進捗メモ（2026-07-09 night /drive）— 一部完了・残りは owner-gated 実行待ち

**このドライブで安全に完了した範囲:**

- 孤立していた `docs/research-reports/llm-model-comparison.real.ja.md`
  （2026-07-06 実測の手書き日本語版、`.real.md` は gitignore 対象）を撤去。
- 今回のドライブで新設した per-topic の英語ソースレポート
  （`foundation-models` / `llm-speed-comparison` / `llm-accuracy-comparison`）と
  既存の `llm-availability` / `ocr-comparison` を、research-reports の索引と
  VitePress サイドバーに追加し、per-topic の英語ソースへ到達できるようにした。
  `make build` はリンク切れ・サイトマップエラーなしで緑。

**残り（このドライブでは着手せず、owner-gated 実行待ちのためブロック）:**

- サイト主線を「各トピックの**生成物**（英語 insights ＋日本語翻訳）」へ差し替える
  中核作業は、その生成物が **real 経路・owner-gated（`ANTHROPIC_API_KEY` 必須）**で
  しか作られず、本セッションにキーが無いため**未生成**。存在しないファイルへ nav を
  向けると `make build` がリンク切れで落ちるため、メタ導入 `index.md` と区分スタブ
  （`speed-comparison` / `accuracy-comparison` / `target-foundation-models` 等）の
  撤去と、日本語版／English の 2 系統 nav 化は保留した。
- 公開境界（`scripts/export-corporate-research.mjs` / `scripts/publish-research.sh`
  / `docs/adr/0003-*`）の per-topic 成果物への作り替えも、上記生成物の形が確定して
  から行う（手書き JP 記事前提の記述の撤去を含む）。手書き JP 記事群と `make publish`
  境界は、生成物が揃うまで現状維持（外部公開面をキー無しで作り替えるのは避ける）。

**再開の前提:** owner が `.env` にキーを入れて各トピックの `research <topic> --real`
を流し、`<topic>.insights.md` と `<topic>.insights.ja.md` を生成・コミットする。
その後に nav 主線の差し替え・メタ層撤去・公開境界の更新を行い、本チケットを archive する。

## Overview

VitePress サイトを、**各トピックのレポート（英語 insights ＋日本語翻訳）を
そのまま並べる**形へ作り直す。2026-07-08 drive で作った「メタ導入記事＋区分
スタブ（対象基盤モデル/速度/精度…の薄いページ）」の階層は撤去する。読者は
トピックごとに、英語版と日本語版の生成レポートへ直接到達できる。

あわせて公開境界（exporter / publish-research.sh / ADR）を、per-topic 成果物
（data artifact ＋ insights ＋翻訳）に合わせて整理する。

## Policies

- `workaholic:design` / `policies/self-explanatory-ui.md` — nav・sidebar・索引だけで
  各トピックが何の比較かが分かる。メタ導入記事を挟まない。
- `workaholic:design` / `policies/wcag-conformance.md` — 見出し・リンク文言・コントラスト・
  表とチャートの代替テキストを担保する。
- `workaholic:operation` / `policies/ci-cd.md` — `make build`（VitePress）で内部リンク・
  サイトマップを死活確認。keyless fixture 経路は byte-stable。
- `workaholic:implementation` / `policies/objective-documentation.md` — 各レポートに
  provenance（data/insights/翻訳の由来・時点）を表示する。

## Key Files

- `docs/.vitepress/config.ts` - nav/sidebar を per-topic（日本語版／English の 2 系統、
  または topic ごとに JP/EN）へ作り直す。単一の真実。
- `docs/llm-foundation/` - メタ導入 `index.md` と区分スタブ（`target-foundation-models`・
  `speed-comparison`・`accuracy-comparison`・`information-accuracy` 等）を撤去し、
  トピックの実レポート（英語 insights／日本語翻訳）に置き換える。
- `docs/research-reports/` - 英語レポート・data.json・history（再現可能ソース）の扱いを整理。
- `scripts/export-corporate-research.mjs` / `scripts/publish-research.sh` /
  `docs/adr/0003-*` - per-topic 成果物に合わせて出力・コピー・境界を更新する。

## Implementation Steps

1. per-topic の生成物（英語 insights ＋日本語翻訳）をサイトの主線に据える。
2. メタ導入記事・区分スタブページを撤去し、nav/sidebar を per-topic 構成へ作り直す
   （日本語版／English の 2 系統で並べる）。
3. 英語レポート＋data.json＋history は再現可能ソースとして主線から区別して残す。
4. exporter / publish-research.sh / ADR 0003 を per-topic 成果物に合わせて更新する
   （手動 JP 記事前提の記述を撤去）。
5. `make build` で内部リンク・サイトマップの死活を確認し、壊れたリンクを解消する。

## Quality Gate

**Acceptance criteria**

- サイトの各トピックが、英語 insights と日本語翻訳の実レポートへ直接到達できる。
- メタ導入記事・区分スタブが撤去され、nav に薄いプレースホルダが残らない。
- 英語ソース（レポート/data.json/history）は再現可能ソースとして区別される。
- 公開境界（exporter/publish-research.sh/ADR）が per-topic 成果物に整合する。

**Verification method**

- `make build`（VitePress 全ビルド）が内部リンク切れ・サイトマップエラー無しで緑。
  （`make docs` は dev でゲートに使わない。）
- `rg` で撤去済みスタブが nav/索引から消えていることを確認。各トピックの JP/EN 到達確認。

**Gate**

- `make build` 緑（リンク・サイトマップ）、per-topic 構成で JP/EN レポートへ到達でき、
  メタ層が撤去され、公開境界が整合している。

## Considerations

- 本チケットは 2026-07-08 の IA/公開チケット（`20260708182154`/`182159`/`182155`）の
  構造を supersede する（[[per-topic-research-pipeline-benchmark-llm-insights-jp-translation]]）。
- insights/翻訳は非決定的なので、サイトが指すのは real 生成物。keyless fixture の
  data レポートは自己テストとして別扱い（サイト主線には出さないか、明示して分ける）。
- 孤立した旧 `docs/research-reports/llm-model-comparison.real.ja.md` の去就もここで整理する。
