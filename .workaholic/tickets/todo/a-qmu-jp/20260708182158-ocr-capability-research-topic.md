---
created_at: 2026-07-08T18:21:58+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260708182154-reorganize-llm-foundation-research-ia.md]
mission:
---

# OCR能力の比較を追加する

## Overview

`LLM基礎検証` に新区分 **OCR能力の比較** を追加する。視覚対応モデルに文書画像を与え、
**書き起こしの正確性（CER/WER）と、構造化抽出の精度**を測る。他の調査と同じく、引用可能なデータセット・
検証可能な採点・provenance／時点つきで報告する。

これは新しいモダリティ（画像入力）を要するため、既存のテキスト probe とは別トピックとして立てる
（レジストリ＋ACL＋fixture の型は踏襲）。ground-truth 付きの文書画像セットに対し、CER/WER などの決定的指標で採点する。

## Policies

- `workaholic:implementation` / `policies/objective-documentation.md` — OCR 精度は CER/WER 等の検証可能な指標で示し、
  参照テキスト・採点式・時点を明記する。
- `workaholic:implementation` / `policies/directory-structure.md` — 画像入力の provider アクセスは `vendors/`、CER/WER
  等の採点は `domain/`、runner は薄く。
- `workaholic:implementation` / `policies/coding-standards.md` — 型駆動。scorer は純関数・単体テスト。
- `workaholic:operation` / `policies/ci-cd.md` — keyless fixture を byte-stable に保ち、実測は owner-triggered。
- `workaholic:design` / `policies/vendor-neutrality.md` — 各ベンダーの vision/OCR エンドポイントを ACL の裏に閉じる。

## Key Files

- `packages/tech/src/vendors/llm/*` - vision 対応モデルの ACL（画像入力対応の追加／拡張）。
- `packages/tech/src/**/domain/ocr.ts` - **新規**。CER/WER・構造化抽出精度の純粋 scorer。
- データセット - ground-truth 付き文書画像セット（ライセンス・再配布に注意。id＋参照テキストの manifest 方式を検討）。
- `packages/tech/src/rag-benchmark/domain/data/` - manifest＋fetch でコーパスを扱う参照実装。

## Related History

RAG で「id＋参照だけコミットし本文は fetch」の型を確立している。OCR の画像＋ground-truth も、ライセンスに応じて
同じ扱いにできる。

- [20260706202821-rag-benchmark-add-aws-s3-vectors.md](.workaholic/tickets/archive/work-20260622-191220/20260706202821-rag-benchmark-add-aws-s3-vectors.md) - ACL＋fixture＋registry の型（参照）

## Implementation Steps

1. ground-truth 付きの文書画像データセットを選び、ライセンスに応じて manifest＋fetch か小規模 fixture で扱う。
2. vision 対応モデルの ACL を用意／拡張し、画像を入力してテキスト書き起こし・構造化抽出を得る。SDK 型は ACL に閉じる。
3. `domain/ocr.ts`（新規）で CER/WER・構造化抽出精度を純関数で採点・単体テストする。
4. keyless fixture（決定的）＋実測（事前 estimate、資源クリーンアップ）を用意し、指標を履歴・レポートへ通す。
5. 「OCR能力の比較」区分の記事を追加する。

## Quality Gate

**Acceptance criteria**:

- OCR 精度（CER/WER 等）が vision 対応モデルごとに測定され、provenance／時点つきで報告される。
- 採点が検証可能（参照テキスト・採点式が明記）で、データセットが引用可能。
- keyless fixture が byte-stable、実測は owner-triggered で事前 estimate を表示。
- 「OCR能力の比較」区分の記事が追加される。

**Verification method**:

- `npm test`（CER/WER scorer の既知入力テスト含む）／`npm run lint`／`make build` が緑、fixture byte-stable。
- 実測で一部モデルの OCR 精度が妥当に出ることを確認する。

**Gate**:

- テスト・lint・build 緑、fixture byte-stable、OCR 精度が検証可能な採点で報告され記事化される。

## Considerations

- **モダリティ拡張**: 画像入力は既存のテキスト probe と別系統。vision 非対応モデルは対象外として明示する。
- **データセットのライセンス**: 文書画像＋ground-truth の再配布に注意（manifest＋fetch を検討）。
- **コスト**: vision 入力は入力トークンが大きくなりがち。事前 estimate を出し、実測は owner-triggered。
- **区分**: 新区分（IA 再編チケットが受け皿を用意）。
