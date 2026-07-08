---
created_at: 2026-07-08T18:21:59+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure, Config]
effort:
commit_hash:
category:
depends_on: [20260708182154-reorganize-llm-foundation-research-ia.md]
mission:
---

# 公開境界を反転する（正本を本リポジトリに移し、exporter とパイプラインを整える）

## Overview

IA 再編（別チケット）で「最終記事の正本を本リポジトリで持つ」と決めたが、**現状のコードは逆向きに動いている**。
`scripts/export-corporate-research.mjs` は `../qmu-co-jp/docs` へ **直接書き込み**、法人サイトの記事本文を丸ごと
生成している。`scripts/publish-research.sh` は常にこの exporter を経由する。ADR 0003 は VitePress→Astro への
一方向コピーを記述しており、新しい `llm-foundation-research` の流れを反映していない。

このチケットは **公開境界の反転**を実装として決着させる:

- exporter を「artifact からの**データ骨子（下書き）生成**」に位置付け、出力先を **本リポジトリの正本
  日本語記事ディレクトリ**へ向ける（法人サイトへ直接書き込まない）。
- 法人サイトへは、正本記事を **コピーする別ステップ**（一方向）にする。
- `publish-research.sh` と ADR 0003 を新しい境界に合わせて更新する。
- 生成記事に **provenance frontmatter** を必須化し、ハードコードされた古い状態文言を除去する。

（IA・命名・ディレクトリ・リンク・既存記事の再配置は IA 再編チケットが担う。本チケットはパイプラインと境界。）

## Policies

- `workaholic:operation` / `policies/ci-cd.md` — 公開はローカル手順で回す。exporter とコピー手順を明確な段に分ける。
- `workaholic:implementation` / `policies/objective-documentation.md` — 生成記事は provenance・generatedAt・trials・
  区間・source commit を持ち、実挙動と一致させる。ハードコードの古い状態文言（"fixture self-test / baseline" 等）を
  除去する。
- `workaholic:implementation` / `policies/directory-structure.md` — exporter の出力先を本リポジトリの正本ディレクトリに
  閉じ、コピー手順を分離する。
- `workaholic:design` / `policies/vendor-neutrality.md` — 法人サイト（Astro）への依存を境界の外に保ち、コピーは
  素の Markdown で行う。

## Key Files

- `scripts/export-corporate-research.mjs` - 現在 `../qmu-co-jp/docs` へ直接書き込み（5-7・19-24 行）、記事本文を丸ごと
  生成（107-143・346-469 行）。出力先を本リポジトリ正本へ変え、下書き生成に位置付け直す。ハードコードの
  状態文言（119-123 行付近）を除去。
- `scripts/publish-research.sh` - 常に exporter 経由（44-45 行付近）。生成とコピーを分ける。
- `docs/adr/0003-vitepress-preview-astro-publish-boundary.md` - 一方向コピーの記述（13-18 行）。新境界に更新する。
- 本リポジトリの正本日本語記事ディレクトリ（IA 再編チケットで確定）- exporter の新しい出力先。

## Related History

ADR 0003 が現行の VitePress プレビュー／Astro 公開境界を定義している。本チケットはその境界を、正本を本リポジトリに
持つ形へ更新する。

- 20260708182154-reorganize-llm-foundation-research-ia.md（本リポジトリ・todo）- IA と正本ディレクトリを確定する前提チケット
- 20260708035635-vector-store-comparison-descriptive-article.md（`../qmu-co-jp` リポジトリの todo）- 法人サイト側で記事を
  記述的に仕上げるチケット。正本が本リポジトリへ移るため、二重執筆を避けるよう関係を整理する

## Implementation Steps

1. exporter の出力先を、法人サイト（`../qmu-co-jp/docs`）から **本リポジトリの正本日本語記事ディレクトリ**へ変更する。
   exporter は「artifact から下書き（データ骨子・表・provenance）を生成する」役割に位置付け直す。
2. ハードコードされた状態文言（"fixture self-test / baseline" 等）を除去し、生成物に provenance・generatedAt・trials・
   区間・source commit を含める。
3. 法人サイトへの反映を、正本記事の **一方向コピー**の別ステップにする（`publish-research.sh` を生成とコピーに分離）。
4. ADR 0003 を新境界（本リポジトリ正本→法人サイトはコピー）に更新する。
5. 生成記事の **provenance frontmatter** を必須化し、コピー手順で検証する（次項 Quality Gate）。

## Quality Gate

**Acceptance criteria**:

- exporter が `../qmu-co-jp` へ直接書き込まず、本リポジトリの正本ディレクトリへ下書きを出力する。
- 生成記事に provenance frontmatter（`source_artifact`・`source_commit`・`generated_at`・`copied_to_corporate_at`・
  `provenance`）が入り、ハードコードの古い状態文言が無い。
- 法人サイトへの反映が、正本の一方向コピーの独立ステップになっている（`publish-research.sh` が生成とコピーを分離）。
- ADR 0003 が新境界を記述している。

**Verification method**:

- exporter を実行し、出力が本リポジトリ正本ディレクトリに出て `../qmu-co-jp` を変更しないことを確認する。
- 生成記事の frontmatter に必須項目が揃い、`generatedAt`・trials・区間が artifact と一致することを確認する。
- コピー手順を実行し、法人サイト側が正本と一致することを確認する。

**Gate**:

- exporter が正本を本リポジトリに出力し、provenance frontmatter を備え、古い状態文言が消え、ADR 0003 が更新済み。

## Considerations

- **二重執筆の解消**: 法人サイト側の記事は正本のコピー由来とし、`../qmu-co-jp` の記述記事チケット
  （20260708035635）との役割衝突を解消する。数値更新は本リポジトリ→法人の一方向。
- **区間・provenance**: 信頼区間チケット（20260708143652 / 143653）が入ると生成物に区間が乗る。exporter は点推定の
  ハードコードをやめ、artifact の `{mean, stdDev/interval, n}` を描く。
- **IA 依存**: 正本ディレクトリ名・区分は IA 再編チケットに従う。
