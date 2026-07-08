---
created_at: 2026-07-08T18:21:54+09:00
author: a@qmu.jp
type: refactoring
layer: [UX, Domain]
effort:
commit_hash:
category:
depends_on:
mission:
---

# LLM基礎検証の情報構造を再編し、最終記事の正本をこのリポジトリに置く

## Overview

現状、調査の知見は法人サイト（`../qmu-co-jp`）側のエージェントが本リポジトリのレポートを見て
「向こうのリポジトリで書き直す」形で流れている。これを反転し、**最終記事（日本語・清書済み）の正本を
本リポジトリで持つ**。本リポジトリで記事を生成・確定し、法人サイトへは記事をコピー&ペーストするだけにする。

あわせて、`LLM基礎検証` の情報構造を次の 6 区分へ再編する:

- **対象基盤モデル**（概要・コスト など）— 既存（カタログ／価格）
- **速度の比較**（スループット・TTFT・レイテンシ）— 既存
- **精度の比較**（長さ精度・JSONスキーマ構造化精度・**情報精度**）— 長さ・スキーマは既存、**情報精度は新規**
- **可用性の比較**（ダウン頻度・ダウンタイム長）— **新規**
- **OCR能力の比較** — **新規**
- **ベクトルDBの比較** — 既存（rag-benchmark）

このチケットは **情報構造（IA）の定義と既存コンテンツの再配置**までを扱う。新規領域（情報精度・可用性・
OCR）は個別のフォローアップチケットで実装する（本チケットが IA の受け皿を用意する）。

命名の揺れ（`検証`／`調査`、`基盤モデルの比較`／`基盤モデル比較調査`、`ベクトルDBの比較`／
`vector-store-comparison`）を **一系統へ確定**する（本依頼の表記に合わせ `LLM基礎検証` を採用）。

## Policies

- `workaholic:design` / `policies/self-explanatory-ui.md` — 区分名・記事名だけで、何を比較した調査かが
  読者に伝わる情報設計にする。6 区分は用途（速度／精度／可用性／OCR／ベクトルDB）で分ける。
- `workaholic:planning` / `policies/market-research.md` — 基盤モデル選定を、後続の設計・実装判断の前提調査
  として位置付ける。区分は判断材料の切り口に対応させる。
- `workaholic:implementation` / `policies/directory-structure.md` — 記事は `docs/` 配下の一貫した構造へ置き、
  正本（日本語清書）と再現可能ソース（英語レポート＋data.json＋history）を分けて扱う。
- `workaholic:implementation` / `policies/objective-documentation.md` — 記事は測定条件・時点・provenance を
  検証可能に保つ。既存記事の再配置で数値の出所を失わない。

## Key Files

- `docs/research-reports/` - 現状の英語レポート（`llm-model-comparison.md` 等）＋ `.real.data.json`／history。
  これは **再現可能ソース**として残す。
- `../qmu-co-jp/docs/llm-foundation-research/` - 現在の日本語記事群（`foundation-model-comparison.md`,
  `vector-store-comparison.md`）と索引。**正本を本リポジトリへ移す**際の元・対応先。
- `../qmu-co-jp/packages/astro/src/data/navigation.ts` - 現行 IA（`LLM基礎検証` グループとリンク）。
  本リポジトリ側の新 IA の対応表として参照する。
- `scripts/export-corporate-research.mjs` - 現在 `exportLlm()`/`exportRag()` が法人サイトへ決定的に書き込む。
  正本が本リポジトリに移るのに合わせ、役割（データ骨子生成 vs 清書記事）を整理する。
- `docs/.vitepress/config.*` - 本リポジトリの VitePress 設定（別チケットで新 IA を提示）。

## Related History

法人サイト側では `docs/<group>.md` ＋ `docs/<group>/<article>.md` ＋ navigation で IA を広げてきた。本リポジトリ
でも同じ構造を採り、正本（日本語記事）をこちらに持つ形へ反転する。

- [20260707102117-add-llm-foundation-research-policy-group.md](.workaholic/tickets/archive/work-20260707-044643/20260707102117-add-llm-foundation-research-policy-group.md) - 法人サイトに LLM基礎調査グループを立てた回（IA の元）
- 20260708035635-vector-store-comparison-descriptive-article.md（`../qmu-co-jp` リポジトリの todo。本リポジトリには存在しないためリンクにしない）- 法人サイト側で記事を記述的に仕上げるチケット。本再編で正本が本リポジトリへ移るため、公開境界チケット（20260708182159）で二重執筆を解消する

## Implementation Steps

1. **IA を確定する**: `LLM基礎検証` 直下に 6 区分（対象基盤モデル／速度／精度／可用性／OCR／ベクトルDB）を定義し、
   命名の揺れを一系統へ揃える（`検証` を採用）。区分名・記事 slug・索引の対応表を作る。
2. **正本の置き場所を作る**: 本リポジトリ `docs/` 配下に、日本語清書記事の正本ディレクトリ（例
   `docs/llm-foundation/` もしくは既存 `docs/research-reports/` を再編）を用意する。
3. **既存コンテンツを再配置する**: 既存の日本語記事（基盤モデル比較・ベクトルDB比較）を新 IA の該当区分へ移し、
   数値・時点・provenance を保ったまま対応付ける。英語レポート＋data.json＋history は再現可能ソースとして残す。
4. **exporter とパイプラインの反転は別チケット**で扱う（公開境界チケット 20260708182159: exporter の出力先変更・
   publish-research.sh の分離・ADR 0003 更新・provenance frontmatter）。本チケットは IA・命名・ディレクトリ・リンク・
   既存記事の再配置に限定する。
5. **新規区分をプレースホルダ化**し、フォローアップチケット（情報精度・可用性・OCR）を参照する索引エントリを置く。
6. サイト提示（VitePress 設定・nav）は別チケットで行う。本チケットはコンテンツ IA と再配置まで。

## Quality Gate

**Acceptance criteria**:

- `LLM基礎検証` 直下に 6 区分が定義され、命名が一系統（`検証`）へ揃っている（記事名・slug・索引が一致）。
- 既存の日本語記事（基盤モデル・ベクトルDB）が新 IA の該当区分へ再配置され、各記事の数値・生成日時・provenance が
  再配置前と一致する。
- 英語レポート＋`.data.json`＋history が再現可能ソースとして残り、失われていない。
- 新規区分（情報精度・可用性・OCR）が索引にプレースホルダとして並び、対応するフォローアップチケットへ紐づく。

**Verification method**:

- 再配置した記事の数値・生成日時を、対応する `docs/research-reports/*.data.json`（または history）と突き合わせて一致を確認する。
- `make build`（VitePress を含む全ビルド。`make docs` は `vitepress dev` でゲートにならないため使わない）が通り、内部リンク切れが無い（サイト提示チケット後は nav も確認）。
- 命名の一系統化を索引・記事・（後続の）nav 間で目視確認する。

**Gate**:

- 6 区分の IA が確定し、既存記事が数値を保って再配置され、命名が揃い、新規区分がフォローアップへ紐づいている。

## Considerations

- **正本の反転（実装は別チケット）**: exporter の出力先変更・`publish-research.sh` の分離・ADR 0003 更新は公開境界
  チケット（20260708182159）で実装する。本チケットは IA と既存記事の再配置まで。
- **命名の揺れ**: `検証`/`調査`、`ベクトルDBの比較`/`vector-store-comparison` 等。一度で揃え、以後ぶれさせない。
- **新規区分は本チケットで作らない**: 情報精度・可用性・OCR は測定手法の設計を要するため個別チケット
  （20260708182156 / 20260708182157 / 20260708182158）で扱う。本チケットは受け皿（索引・区分）まで。
- **法人サイトとの二重管理**: 正本が本リポジトリに移った後、法人サイトの同記事はコピー由来であることを明示し、
  数値更新時は本リポジトリ→法人サイトの一方向で追随させる。
