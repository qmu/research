---
created_at: 2026-07-08T18:21:55+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Config]
effort:
commit_hash:
category:
depends_on: [20260708182154-reorganize-llm-foundation-research-ia.md]
mission:
---

# 本リポジトリの VitePress を正本の公開サイトに仕立てる

## Overview

本リポジトリには既に VitePress サイト（`docs/.vitepress`、"qmu research"、`research.qmu.dev`）があるが、
現状は生の英語レポートを並べているだけ。これを、**清書済みの日本語記事（正本）を法人サイトと同じ情報構造で
提示する公開サイト**に仕立てる。ここで記事を確定し、法人サイトへはコピー&ペーストする運用にする。

新しい Astro 基盤を立てるのではなく、**既存の VitePress を強化**する（スタックを二重に持たない）。IA 再編
チケットが確定した `LLM基礎検証` の 6 区分を、VitePress の nav／sidebar と索引ページへ反映する。

## Policies

- `workaholic:design` / `policies/self-explanatory-ui.md` — nav・sidebar・索引だけで、各区分が何の比較かを
  読者が理解できる情報設計にする。法人サイトの IA と一貫させる。
- `workaholic:design` / `policies/wcag-conformance.md` — 公開サイトとして到達可能性・可読性を担保する
  （見出し構造、リンク文言、コントラスト）。
- `workaholic:operation` / `policies/ci-cd.md` — サイトビルドはローカル／既存 CI で検証する。`make build`
  （VitePress ビルド）で内部リンク・サイトマップを死活確認し、壊れたリンクを持ち込まない（`make docs` は
  `vitepress dev` でプレビュー用）。
- `workaholic:implementation` / `policies/directory-structure.md` — サイト設定は `docs/.vitepress` に閉じ、
  記事は再編後の正本ディレクトリを指す。

## Key Files

- `docs/.vitepress/config.*` - サイト設定（title・nav・sidebar・sitemap）。新 IA を反映する単一の真実。
- `docs/` 配下の正本記事ディレクトリ（IA 再編チケットで確定）- サイトが提示する日本語記事群。
- `../qmu-co-jp/packages/astro/src/data/navigation.ts` / `docs/llm-foundation-research/` - 参照する法人サイトの
  IA・記事構造（一貫させる対象）。
- `Makefile`（`make docs`）- VitePress のビルド／プレビュー。

## Related History

法人サイトは Astro で IA を提示している。本リポジトリは既存 VitePress を強化して同じ IA を提示し、正本を
こちらで持つ。

- [20260707102117-add-llm-foundation-research-policy-group.md](.workaholic/tickets/archive/work-20260707-044643/20260707102117-add-llm-foundation-research-policy-group.md) - 法人サイトの IA 拡張（提示構造の元）

## Implementation Steps

1. VitePress の nav／sidebar を、再編後の `LLM基礎検証` 6 区分へ更新する（対象基盤モデル／速度／精度／可用性／
   OCR／ベクトルDB）。法人サイトのラベル・階層と一貫させる。
2. トップ／グループ索引ページを用意する（`LLM基礎検証` の導入＋各区分へのリンク）。法人サイトの索引に相当する
   読み口を本リポジトリ側に持つ。
3. サイトが指すのは再編後の**日本語清書記事（正本）**とし、英語レポート＋data.json＋history は再現可能ソースとして
   別扱いにする（サイトの主線からは区別して配置）。
4. `make build`（VitePress を含む全ビルド）でビルドし、内部リンク・サイトマップの死活を検証する。壊れたリンクを解消する（`make docs` は `vitepress dev` でプレビュー用のため、検証ゲートには使わない）。
5. 新規区分（情報精度・可用性・OCR）は、記事が入るまで索引にプレースホルダとして提示する。

## Quality Gate

**Acceptance criteria**:

- VitePress の nav／sidebar／索引が、再編後の 6 区分 IA を法人サイトと一貫した形で提示する。
- サイトの主線が日本語清書記事（正本）を指し、英語レポート／data.json／history は再現可能ソースとして区別される。
- `make build` のビルドが内部リンク切れ・サイトマップエラー無しで通る。
- 新規区分がプレースホルダとして索引に並ぶ。

**Verification method**:

- `make build`（または `cd docs && npm run build`）を実行し、ビルド成功・内部リンク死活・サイトマップ生成を確認する（`make docs` はローカルプレビュー用で終了しない）。
- ローカルプレビューで nav／sidebar／索引が 6 区分を正しく提示し、記事へ到達できることを確認する。

**Gate**:

- サイトが 6 区分 IA を提示し、正本記事へ到達でき、`make build` がリンク・サイトマップともに緑。

## Considerations

- **既存 VitePress を強化**（Astro を新設しない）: スタックを一つに保つ。法人サイトとは「同じ IA・同じ記事内容」で
  一貫させ、見た目の完全一致は求めない。
- **依存**: IA 再編チケット（20260708182154）が確定してから nav／索引を組む。区分名・slug はそちらに従う。
- **正本→コピー運用**: このサイトが正本。法人サイトへは記事をコピー&ペーストし、数値更新は本リポジトリ→法人の
  一方向で追随させる（`objective-documentation`）。
- **公開ホスト**: `research.qmu.dev`（既存 sitemap 設定）。デプロイ手順は既存の docs デプロイに従う（本チケットは
  ビルド検証まで。配信は別）。
