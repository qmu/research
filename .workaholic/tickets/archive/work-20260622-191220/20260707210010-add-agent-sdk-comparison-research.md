---
created_at: 2026-07-07T21:00:10+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort:
commit_hash:
category:
depends_on:
mission:
---

# Agent SDKの比較をLLM基礎調査へ追加する

## Overview

`LLM基礎調査` に `Agent SDKの比較` 記事を追加する。既存の `基盤モデルの比較`、`ベクトルDBの比較` と同じ並びで、Agent SDK / agent framework をアプリケーション開発時の選定材料として比較できる研究記事にする。

この記事は、特定ベンダーの宣伝的な紹介ではなく、測定対象、比較軸、制約、再現方法を明確にした基礎調査として扱う。初回は比較設計と対象一覧を公開し、実測値が未取得の項目は fixture / baseline / 未測定を明確に分ける。

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — 既存の docs collection 構造に従い、`docs/llm-foundation-research/` 配下へ記事を追加する。
- `workaholic:implementation` / `policies/coding-standards.md` — navigation 変更は既存の TypeScript データ構造に閉じ、不要な型緩和を追加しない。
- `workaholic:implementation` / `policies/objective-documentation.md` — 比較記事は測定対象・測定していない能力・制約を分けて書き、推測を実測のように扱わない。
- `workaholic:planning` / `policies/market-research.md` — Agent SDK 選定を事業・開発プロセス上の基礎調査として扱い、後続の設計・実装判断に使える比較軸を持たせる。
- `workaholic:design` / `policies/self-explanatory-ui.md` — サイドバーと overview の記事名だけで、読者が比較対象を理解できる情報設計にする。

## Key Files

- `docs/llm-foundation-research.md` - LLM基礎調査の overview。`Agent SDKの比較` への導線を追加する。
- `docs/llm-foundation-research/agent-sdk-comparison.md` - 新規記事。Agent SDK 比較の測定対象、比較軸、対象 SDK、制約、再現方法を書く。
- `packages/astro/src/data/navigation.ts` - サイドバーの単一 source of truth。`Agent SDKの比較` を `LLM基礎調査` グループへ追加する。
- `packages/astro/src/pages/[...slug].astro` - docs collection の slug を route 化する既存ページ。新規 markdown が公開 route になることを確認する。
- `packages/astro/src/styles/global.css` - 既存の研究記事向け table / chart overflow スタイルが新規記事でも破綻しないことを確認する。

## Related History

既存の LLM 基礎調査追加では、overview、個別記事、navigation を同時に追加し、研究記事として policy 定型ではなく測定対象・比較・制約・再現方法で構成している。今回も同じ構造に合わせ、記事名は `基盤モデルの比較`、`ベクトルDBの比較` と同じ `対象の比較` 形式にする。

- [20260707102117-add-llm-foundation-research-policy-group.md](.workaholic/tickets/archive/work-20260707-044643/20260707102117-add-llm-foundation-research-policy-group.md) - `LLM基礎調査` グループと `基盤モデルの比較` の追加履歴。
- [20260606120062-foundational-research.md](.workaholic/tickets/archive/work-20260529-193006/20260606120062-foundational-research.md) - 研究系コンテンツを公開サイトへ取り込んだ履歴。

## Implementation Steps

1. `docs/llm-foundation-research/agent-sdk-comparison.md` を追加し、H1 を `Agent SDKの比較` にする。
2. 記事本文に、調査の目的、測定対象、比較対象 SDK、範囲と制約、指標別の比較、総合比較、再現方法を入れる。
3. 比較対象候補として、少なくとも OpenAI Agents SDK、Anthropic / Claude Code 周辺の agent 実行系、Cloudflare Agents SDK、LangGraph などを整理する。実際に掲載する対象は、公開 API と比較可能な測定軸を確認してから確定する。
4. 比較軸は、状態管理、ツール呼び出し、長時間実行、リトライ、human-in-the-loop、structured output、observability、deployment/runtime、vendor lock-in、ローカル開発のしやすさを候補にする。
5. 実測値がない項目は、空欄や暗黙の低評価にせず、`未測定` / `設計比較` / `fixture` のように provenance を明示する。
6. `docs/llm-foundation-research.md` に `## [Agent SDKの比較](/llm-foundation-research/agent-sdk-comparison)` を追加し、既存の比較記事と同じ読み味の説明文を書く。
7. `packages/astro/src/data/navigation.ts` の `LLM基礎調査` グループへ `Agent SDKの比較` を追加する。
8. 新規 route `/llm-foundation-research/agent-sdk-comparison` が build で生成されることを確認する。
9. スマートフォン、タブレット、PC viewport で、表がページ全体を横にはみ出さず、記事見出しと sidebar 表示が破綻しないことを確認する。

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- `/llm-foundation-research/agent-sdk-comparison` が docs route として生成される。
- `LLM基礎調査` overview と sidebar に `Agent SDKの比較` が表示される。
- 記事本文が policy 記事の定型ではなく、研究記事として測定対象、比較対象、比較軸、範囲と制約、再現方法を持つ。
- 実測値、fixture、未測定、設計比較が混同されていない。
- 表や図がある場合、SP viewport でページ全体の横スクロールを発生させない。

**Verification method** — the commands/tests/probes that prove them:

- `npm run astro:build` を `packages/astro` で実行する。
- build output に `dist/client/llm-foundation-research/agent-sdk-comparison/index.html` が存在することを確認する。
- `rg -n "Agent SDKの比較" docs/llm-foundation-research.md docs/llm-foundation-research/agent-sdk-comparison.md packages/astro/src/data/navigation.ts` で overview、article、navigation の表示名を確認する。
- Playwright または同等のブラウザ検証で 390px、768px、1024px、1440px viewport を開き、ページ overflow と browser error がないことを確認する。
- `git diff --check` を実行する。

**Gate** — what must pass before approval:

- Astro build、route 生成確認、表示名検索、responsive viewport 検証、`git diff --check` がすべて通ること。

## Considerations

- Agent SDK は更新が速く、機能名や推奨 API が変わりやすい。実装時は一次情報または既存 research artifact を確認し、古い知識だけで比較しない。
- SDK と runtime / hosting / provider が密結合している場合、SDK 単体比較と whole-stack 比較を分ける。
- `Agent SDKの比較` は製品選定の補助資料であり、汎用的な優劣の断定ではなく、用途別の判断材料として書く。
- 今回は qmu.co.jp 側の記事追加を対象とし、測定 harness や外部 research repo の実測追加が必要な場合は別チケットへ分ける。
