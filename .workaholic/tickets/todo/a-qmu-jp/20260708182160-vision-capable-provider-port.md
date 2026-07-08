---
created_at: 2026-07-08T18:22:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on:
mission:
---

# 画像入力に対応したプロバイダーポートを用意する

## Overview

OCR 能力の比較（別チケット）は視覚対応モデルへ画像を入力する必要があるが、現状の `CompletionClient` ポートは
**テキストプロンプトと JSON スキーマ呼び出ししか受け付けない**（`vendors/llm/types.ts`）。画像入力型・画像
アーティファクトのモデル・ベンダー正規化された vision レスポンスが無い。

このチケットは **画像入力に対応したプロバイダーポート**を先に用意する（OCR の採点・データセット・記事は後続）。
ドメインは正規化された vision 入出力の型だけを知り、各ベンダーの vision エンドポイントは ACL の裏に閉じる。

## Policies

- `workaholic:design` / `policies/vendor-neutrality.md` — 各ベンダーの vision API を ACL の裏に閉じ、ドメインは
  正規化された画像入力・テキスト／構造化出力の型だけを扱う。
- `workaholic:implementation` / `policies/directory-structure.md` — ポート型は `domain`／`vendors` の境界に置き、
  SDK 型を漏らさない。
- `workaholic:implementation` / `policies/coding-standards.md` — 型駆動。既存のテキストポートを壊さず拡張する。

## Key Files

- `packages/tech/src/vendors/llm/types.ts`（86-100 行）- 現行 `CompletionClient`。テキスト／JSON スキーマのみ。画像
  入力の型が無い。ここへ vision 入力を足す（または別ポートを定義する）。
- `packages/tech/src/vendors/llm/*` - 各プロバイダー ACL。vision 対応の実装を追加する。
- `packages/tech/src/vendors/llm/fixture.ts` - keyless fixture。vision 入力の決定的 fixture を用意する。

## Related History

LLM 比較はテキスト probe 用のポートと ACL を確立している。本チケットはそれを壊さずに画像入力を足す。

- 20260706155233-add-coding-agent-models-codex-grok.md（archive）- provider ポート／ACL 拡張の型（参照）

## Implementation Steps

1. 画像入力の正規化型を定義する（画像バイト／MIME／複数ページ、テキスト指示との組）。既存テキストポートを壊さない。
2. 1 つ以上の vision 対応プロバイダー ACL を実装し、画像＋指示を送ってテキスト／構造化出力を得る。SDK 型は ACL に閉じる。
3. keyless fixture に vision 入力の決定的経路を足す。
4. 単体テスト（ポートの型・fixture の決定性）を通す。OCR 採点・データセット・記事は後続チケット。

## Quality Gate

**Acceptance criteria**:

- 正規化された画像入力型を持つポートがあり、既存のテキスト probe を壊さない。
- 1 つ以上の vision 対応 ACL が画像＋指示から出力を得られ、SDK 型がドメインへ漏れない。
- keyless fixture の vision 経路が決定的で、fixture self-test が byte-stable のまま。

**Verification method**:

- `npm test`（ポート型・fixture の単体テスト）／`npm run lint`／`make build` が緑。
- 実プロバイダーで画像 1 枚を入力し、テキストが返ることを確認する（owner-triggered）。

**Gate**:

- vision ポート＋少なくとも 1 ACL＋決定的 fixture が入り、テキストポートを壊さずテスト・lint・build が緑。

## Considerations

- **OCR の前提**: OCR 能力チケット（20260708182158）はこのポートに依存する。ここでは採点・データセットは扱わない。
- **非対応モデル**: vision 非対応モデルは対象外として明示する。
- **入力コスト**: 画像入力はトークンが大きくなりがち。実測は owner-triggered、事前 estimate は OCR チケット側で扱う。
