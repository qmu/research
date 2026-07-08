---
created_at: 2026-07-08T18:21:58+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260708182154-reorganize-llm-foundation-research-ia.md, 20260708182160-vision-capable-provider-port.md]
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
2. **画像入力は vision ポート（依存チケット 20260708182160）を用いる**。本チケットでは画像＋指示を送って
   テキスト書き起こし・構造化抽出を得る呼び出しと、その正規化に集中する（ポート自体は依存チケットが用意）。
3. `domain/ocr.ts`（新規）で CER/WER と構造化抽出の**フィールド単位**の採点を純関数で行う。画像前処理（解像度・
   ページ分割）・言語/文字種の混在・レイアウト難易度・構造化スキーマを定義し、単体テストする。
4. keyless fixture（決定的）＋実測（事前 estimate、資源クリーンアップ）を用意し、指標を履歴・レポートへ通す。
5. 「OCR能力の比較」区分の記事を追加する。

## Quality Gate

**Acceptance criteria**:

- **データセットが実装前提の gate**: 法的に利用可能な文書画像セットを、id＋参照テキスト（＋構造化フィールドの
  正解）とライセンスを持つ manifest として先に確定し（本文/画像は再配布せず fetch/cache）、決定的 scorer テストがある。
- 画像前処理（解像度・ページ分割）・言語/文字種・レイアウト難易度・構造化スキーマ・フィールド単位の採点式が明記される。
- OCR 精度（CER/WER・フィールド単位精度）が対象の vision モデルごとに測定され、provenance／時点つきで報告される。
  対象外（vision 非対応）や部分カバレッジは明示的にラベルする。
- keyless fixture が byte-stable、実測は owner-triggered で事前 estimate を表示。「OCR能力の比較」区分の記事が追加される。

**Verification method**:

- `npm test`（CER/WER・フィールド採点の既知入力テスト含む）／`npm run lint`／`make build` が緑、fixture byte-stable。
- pinned manifest に対し決定的 scorer が既知入力で期待値を返し、実測の数値・provenance・時点が artifact と一致する
  （「妥当」のような主観判定はゲートにしない）。対象モデルのカバレッジ（全対象か部分か）が記事に明記される。

**Gate**:

- テスト・lint・build 緑、fixture byte-stable、OCR 精度が検証可能な採点で報告され記事化される。

## Considerations

- **モダリティ拡張**: 画像入力は既存のテキスト probe と別系統。vision 非対応モデルは対象外として明示する。
- **データセットのライセンス**: 文書画像＋ground-truth の再配布に注意（manifest＋fetch を検討）。
- **コスト**: vision 入力は入力トークンが大きくなりがち。事前 estimate を出し、実測は owner-triggered。
- **区分**: 新区分（IA 再編チケットが受け皿を用意）。
