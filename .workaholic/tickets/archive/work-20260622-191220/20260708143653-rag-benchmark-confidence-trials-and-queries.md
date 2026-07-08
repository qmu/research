---
created_at: 2026-07-08T14:36:53+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on:
mission:
---

# RAG ベンチマークに試行と信頼区間を入れる

## Overview

RAG レポートも「1 試行」で、値のばらつきが見えない。RAG は指標ごとに信頼の源が異なるため、
二つのレバーで扱う。

- **検索品質（recall@k / nDCG@k / MRR）は、固定 embedding の自己管理ストアでは決定的**（同じ
  ベクトル・同じ kNN で毎回同一。実測でも sqlite-vec / S3 / Vectorize が完全一致）。試行を
  増やしても情報は増えない。信頼の源は **クエリ数**。クエリ集合を **~100 クエリ**へ拡大し、
  クエリ上の **95% 信頼区間**（recall は Wilson 区間、nDCG/MRR は bootstrap もしくは正規近似）で
  報告する。
- **運用指標（取り込み時間・クエリレイテンシ）は実行ごとに変動**する。**試行ループ**（既定 5 試行）を
  実装し、平均 ± 標準偏差で報告する。

見積り（File Search の検索課金が支配的、他は無料枠）: 5 試行 × ~100 クエリ ≈ ~$1.30、~18 分。
embedding は ~$0.01。

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — 純粋な指標・集計・データ整形は
  `rag-benchmark/domain/`、SDK/HTTP は `vendors/`、runner は薄く保つ。
- `workaholic:implementation` / `policies/coding-standards.md` — 型駆動で、集計は純関数として置く。
- `workaholic:implementation` / `policies/objective-documentation.md` — 決定的な検索品質と変動する
  運用指標を区別して提示し、試行で偽の分散を作らない。数値は検証可能に。
- `workaholic:operation` / `policies/ci-cd.md` — `rag:fixture` はキー不要・byte-stable のまま。
  実バックエンド sweep は owner-triggered で CI に乗せない。

## Key Files

- `packages/tech/src/rag-benchmark/run.ts` - 現状は試行ループ無し（`trials` は記録のみ）。運用指標の
  試行ループと集計を追加する。
- `packages/tech/src/rag-benchmark/domain/types.ts` - `OperationalMetrics` に spread（stdDev）を、
  `RetrievalMetrics` に区間を持たせる。
- `packages/tech/src/rag-benchmark/domain/{operational,aggregate,retrieval-metrics}.ts` - 平均/標準偏差、
  percentile、Wilson/bootstrap 区間の純関数を追加・単体テストする。
- `packages/tech/src/rag-benchmark/domain/data/scifact-subset.manifest.json` - クエリを ~100 へ拡大した
  マニフェストへ再生成（id と qrels のみ。コーパス本文は非コミット）。
- `packages/tech/src/rag-benchmark/domain/report.ts` + `scripts/export-corporate-research.mjs` -
  検索品質は区間つき、運用は平均±標準偏差で描画。「1 試行」を試行数＋決定性の注記へ差し替える。
- `docs/research-reports/rag-benchmark.real.data.json` - 5 試行・~100 クエリで再生成（gitignore・再生成可能）。

## Related History

RAG ベンチマークは固定 embedding による store-isolated 測定として実装済みで、実測では自己管理
ストアの検索品質が一致することを確認している。本チケットはその決定性を前提に、信頼の源を指標ごとに
正しく分けて報告へ通す。

- [20260706202819-rag-benchmark-foundation-sqlite-vec.md](.workaholic/tickets/archive/work-20260622-191220/20260706202819-rag-benchmark-foundation-sqlite-vec.md) - ハーネス基盤（scifact-mini fixture、metric scorers）
- [20260706202821-rag-benchmark-add-aws-s3-vectors.md](.workaholic/tickets/archive/work-20260622-191220/20260706202821-rag-benchmark-add-aws-s3-vectors.md) - 自己管理ストアの store-isolated 測定（決定性の確認）

## Implementation Steps

1. SciFact サブセットのマニフェストを **~100 クエリ**へ拡大する（それらの qrel 文書＋比例した
   distractor で ~400 文書、seed 固定で決定的）。`scifact-mini` fixture はキー不要 CI 用に据え置く。
2. **バックエンドに determinism フラグを持たせる**。自己管理（固定 embedding）は決定的として検索品質を 1 回だけ算出。
   マネージド（File Search 等）は非決定的なので、検索クエリを試行間で反復し **run-to-run のばらつき**も報告する
   （または検索品質の区間を「クエリ集合上のみ・サービス変動は含まない」と明示する）。現状 `run.ts:175-190` は全
   バックエンドを同じループで 1 回だけ問い合わせるため、この分岐を入れる。
3. `run.ts` に試行ループ（既定 5）を追加する。各試行で ingest→query を回し、**運用指標**（ingest、
   latency）は試行間で平均 ± 標準偏差に集計する。**自己管理の検索品質は決定的**なので 1 回だけ算出し、
   **クエリ上の 95% 信頼区間**を付ける。
4. 検索品質の区間: recall@k は Wilson 区間（クエリごと 0/1）、nDCG/MRR は bootstrap もしくは正規近似で
   N=クエリ数の区間を出す（`domain/retrieval-metrics.ts` に純関数＋単体テスト）。
5. レポート／exporter を更新: 運用は平均±標準偏差（試行数 n）、検索品質は値 ± 95% 信頼区間（n=クエリ数）。
   「1 試行」を「運用は N 試行の平均±標準偏差、検索品質は固定 embedding で決定的（信頼はクエリ数由来）」へ。
6. `rag:real --trials 5` で実測し、`.real.data.json` と法人サイト記事を再生成する。事前 estimate を表示し、
   実行後にクラウド資源が全て破棄されることを確認する。
7. `rag:fixture` はキー不要・byte-stable を維持（mini corpus は決定的な単一パス）。

## Quality Gate

**Acceptance criteria**:

- SciFact サブセットが ~100 クエリを持ち、recall@k / nDCG@k / MRR が **クエリ上の 95% 信頼区間**つきで
  報告される。
- 運用指標（ingest、クエリレイテンシ）が **5 試行の平均 ± 標準偏差**で報告される。
- レポートが「決定的な検索品質（信頼＝クエリ数）」と「変動する運用指標（信頼＝試行数）」を明示的に
  区別する。試行で検索品質の偽分散を作らない。
- `rag:fixture` が byte-stable、実バックエンドの sweep は owner-triggered。

**Verification method**:

- `npm test`（tsc + vitest。Wilson/bootstrap の既知入力テストを含む）、`npm run lint`、`make build` が緑。
- 生成 `.real.data.json` の区間がレポートの表示と一致する。
- 実行前に `rag:estimate` が費用（~$1.30）を表示し、実行後にストア／バケット／インデックスが残らない
   （list エンドポイントで確認）。

**Gate**:

- テスト・lint・ビルドが緑、fixture byte-stable、実測が 5 試行・~100 クエリで区間つきに更新されている。

## Considerations

- **検索品質は決定的**（固定 embedding）: 試行間で同一なので、試行由来の分散を報告しない。区間は
  クエリ上で計算する（`objective-documentation`）。マネージド（File Search）はサービス側の非決定性が
  あり得るため、そこだけ試行分散を持ち得る点は注記する。
- **試行ループの wall-time**: File Search の再取り込みは ~135s/試行で支配的。取り込み時間の信頼には
  再取り込みが要るが、クエリレイテンシだけなら「1 回取り込み→N 回クエリ」で分離でき安く速い。
  指標ごとに再取り込みの要否を決める。
- **拡大コーパスの影響**: File Search 取り込みが遅くなり検索課金も増えるが、総額は数ドル未満。
- **法人サイト記事**（`../qmu-co-jp`）は別チケットで記述的に仕上げる。数値・生成日時が更新されたら
  追随させる。
