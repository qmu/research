---
created_at: 2026-07-08T20:00:00+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort:
commit_hash:
category:
depends_on:
mission:
---

# RAG ベンチマークのエラー経路でクラウド資源を確実に破棄する

## Overview

`rag:real` の実測中に、AutoRAG バックエンドが取り込み失敗
(`produced no searchable documents`) で `error` になると、その試行で作成した
**AutoRAG インスタンスと R2 バケット（コーパス取り込み用）が削除されずに残る**。
2026-07-08 の 5 試行実測（ticket 20260708143653）で、AutoRAG インスタンス 1 つと
199 オブジェクトの R2 バケット 1 つが残留し、後から手動 API 呼び出しで削除した。

レポート本文は「test resources are deleted after the run」と述べているため、
**エラー経路でも teardown が走る**ことをコードで保証する必要がある。

## Policies

- `workaholic:operation` / `policies/ci-cd.md` — 実バックエンド sweep は
  owner-triggered。実行後にクラウド資源が残らないことは運用上の必須条件。
- `workaholic:implementation` / `policies/directory-structure.md` — teardown は
  各バックエンドの ACL (`vendors/`) 側に閉じ、runner は呼び出しの順序だけを持つ。
- `workaholic:implementation` / `policies/objective-documentation.md` — 「破棄した」
  とレポートに書く以上、破棄はコードで保証されていなければならない。

## Key Files

- `packages/tech/src/rag-benchmark/run.ts` — 試行ループ／バックエンドループの
  `try/catch`（現状 ~321–417 行）。ストア作成後にエラーが出ても teardown が走るよう、
  作成した資源のハンドルを掴んで `finally` で破棄する。
- `packages/tech/src/vendors/vectorstore/autorag.ts`（または該当 ACL）— AutoRAG
  インスタンス削除と、取り込み用 R2 バケットの **空にしてから削除**（199 オブジェクトの
  ように空でないと 400 になる）を冪等に実装する。
- `packages/tech/src/vendors/vectorstore/*.ts` — 他バックエンド（OpenAI vector store,
  Vectorize）の `close()` も、部分的に作成された状態から呼ばれても安全か確認する。

## Implementation Steps

1. `run.ts` で、各バックエンド試行の資源作成を `store` ハンドルに集約し、
   `try { ingest→query } finally { await store.close?.() }` の形にして、
   **例外時も必ず close が走る**ことを保証する（現状は close が測定ループの
   finally にあるが、AutoRAG の whole-stack 資源は close で完全には消えていない）。
2. AutoRAG ACL の teardown を、(a) R2 バケットのオブジェクトを（ページングして）
   全削除 →(b) バケット削除 →(c) AutoRAG インスタンス削除、の順で冪等に実装する。
   途中失敗しても次回 teardown で回収できるよう、`rag-bench-` プレフィックスの
   孤児資源を一覧・削除するヘルパを用意する。
3. teardown 失敗は握り潰さず、警告として stderr に出す（プロビジョニングの残骸を
   運用者が気づけるように）。
4. ユニットテスト: close がエラー経路でも呼ばれることを、失敗を注入した
   フェイクストアで検証する（キー不要・ネットワーク不要）。

## Quality Gate

**Acceptance criteria**

- `rag:real` のどのバックエンドが取り込み／クエリで例外を投げても、その試行で
  作成したクラウド資源（AutoRAG インスタンス、R2 バケット＋中身、vector store、
  index）が実行終了時に残らない。
- teardown は冪等で、孤児 `rag-bench-*` 資源を回収できる。
- teardown 失敗は警告として可視化される。

**Verification method**

- `npm test`（close-on-error のフェイクストアテストを含む）、`npm run lint`、
  `make build` が緑。
- owner-gated: 実 `rag:real` を 1 回流し、実行後に OpenAI vector stores /
  Vectorize indexes / AutoRAG instances / R2 buckets を list して
  `rag-bench-*` が 0 件であることを確認する。

**Gate**

- テスト・lint・ビルドが緑、実測後のクラウド資源 list が 0 件。

## Considerations

- AutoRAG の R2 バケットは空でないと削除できないため、削除前に必ず全オブジェクトを
  ページング削除する（今回の残骸は 199 オブジェクトだった）。
- teardown をベストエフォートにしすぎると再び黙って漏れる。失敗は必ず可視化する。
- この不具合は 20260708143653（試行と信頼区間）の実測で発見された。
