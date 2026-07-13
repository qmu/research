---
title: ベクトルDBの比較
source_artifact: docs/research-reports/rag-benchmark.data.json
source_commit: 734686c
insights_model: source-report
translated_from: rag-benchmark.md
translation_model: claude-sonnet-5
generated_at: 2026-07-13T10:13:26.270Z
trials: 0
provenance: llm-translation
---
# ベクトルDBの比較

本レポートは、ベクトルストアおよびRAGデータベースバックエンドに関するベンチマークハーネスを記録するものである。精査済みのバックエンド情報と、実測されたリトリーバル（検索）およびオペレーションの挙動とを分離して整理している。

## 1. 調査の目的

目的は、埋め込み境界を明確に保ちながら、RAGバックエンド間で検索品質と運用挙動を比較することである。

## 2. 測定対象

### 対象モデル

対象セットは5個のバックエンド構成である。自己管理型ストアは固定のローカル埋め込みモデル（`fixed-hash-embedding-v1`）を1つ使用し、一方でフルマネージド行はマネージドスタック全体を測定する。

### 対象メトリクス

検索品質は、コミットされたqrelsに対するrecall@3、nDCG@3、MRRであり、3件のクエリにわたる値 ± 95%信頼区間として示される。運用面の測定項目はingest timeおよびquery latency p50/p95であり、5回の試行にわたる平均 ± 標本標準偏差に加え、測定されたスケールと推定コストとして示される。

## 3. 範囲と制約

- コミットされたレポートは、CIのセルフテストとしてキーレス・フィクスチャ経路によって生成されている。実運用では同一のデータセット、採点、レンダラーを使用するが、タイミングはマシンとネットワークに依存する。
- フルマネージドのバックエンドはスタック全体を測定する。認証情報が存在しない実行では、そのカードは`fixtured`としてレンダリングされ、決して偽装されることはない。
- この小規模なデータセットは、ハーネスおよびメトリクス計算を検証するためのものであり、本番規模におけるバックエンド品質についての統計的な主張ではない。

## 4. 検証結果

今回の実行では、5個のバックエンド構成のうち**0件が測定済み**です（非測定行は、認証情報が存在しない`fixtured`カードまたは`error`行であり、数値を捏造したものでは決してありません）。

要約すべき測定値は存在しません。コミットされたフィクスチャページが、ハーネスがエンドツーエンドで機能することを証明しています。バックエンドごとの表はセクション7（検証データ）にあります。

**推移 / Trend across surveys**

これはこのシリーズにおける初めての比較可能な調査であるため、まだグラフ化できる複数回の調査にまたがる推移はありません。同一手法による2回目の調査がアーカイブされた時点で、ここに推移グラフが表示されます。それ以前の調査は検証データの下にリンクされています。

## 5. 考察

- **sqlite-vec** — store-isolated（固定embedding）。今回の実行における検索品質は決定論的であり、95%区間は試行分散ではなく3件のクエリサンプルに対するものです。運用メトリクスは5回の試行における平均値±標本標準偏差です。
- **OpenAI vector store (File Search)** — whole-stack、store-isolatedではない（managed embedding）。File Searchはサーバー側でドキュメントをチャンク化し（デフォルトで800トークンのチャンク、400トークンのオーバーラップ）、内部でembeddingを行います。インデックスされる単位はコミットされたドキュメントではなく、OpenAIのチャンクです。今回の実行における検索品質は決定論的であり、95%区間は試行分散ではなく3件のクエリサンプルに対するものです。運用メトリクスは5回の試行における平均値±標本標準偏差です。
- **AWS S3 Vectors** — store-isolated（固定embedding）。私たちが提供する固定embeddingベクトル（float32、cosine）を格納する、自己管理・store-isolatedな読み取りです。AWSの認証情報と、S3 Vectorsが利用可能なリージョン（ap-northeast-1で検証済み）が必要です。IAM: s3vectors:CreateVectorBucket/CreateIndex/PutVectors/QueryVectors/DeleteIndex/DeleteVectorBucket。今回の実行における検索品質は決定論的であり、95%区間は試行分散ではなく3件のクエリサンプルに対するものです。運用メトリクスは5回の試行における平均値±標本標準偏差です。
- **Cloudflare Vectorize** — store-isolated（固定embedding）。私たちが提供する固定embeddingベクトル（v2インデックス、cosine、次元数は[32,1536]の範囲）を格納する、自己管理・store-isolatedな読み取りです。変更操作は結果整合性（およそ5-15秒）であるため、ポーリングによる伝播待機は計測されたingestに含まれます。認証: CLOUDFLARE_ACCOUNT_ID + Vectorize編集権限を持つAPIトークン。今回の実行における検索品質は決定論的であり、95%区間は試行分散ではなく3件のクエリサンプルに対するものです。運用メトリクスは5回の試行における平均値±標本標準偏差です。
- **Cloudflare AutoRAG** — whole-stack、store-isolatedではない（managed embedding）。フルマネージド：R2バケットからingestし、内部でembedding/インデックス化を行います（whole-stackであり、store-isolatedではありません）。インデックス化は非同期（6時間サイクル、またはレート制限付きの強制同期）であり、そのR2データソースバインディングはダッシュボード経由でプロビジョニングされるため、REST限定のライブ end-to-end 実行では`measured`ではなく正直に`error`となる場合があります。今回の実行における検索品質は決定論的であり、95%区間は試行分散ではなく3件のクエリサンプルに対するものです。運用メトリクスは5回の試行における平均値±標本標準偏差です。

## 6. 再現方法

### 再現手順

```sh
cd packages/tech
npm install

npm run rag:fixture
npm run rag
npm run rag:estimate
```

### 再現コスト（目安）

`rag:fixture` はキー不要でコストもかからない。`rag:estimate` は認証情報／プロバイダー経由のパスをプレビューする。`npm run rag` はローカルの計算資源、および設定済みのマネージドバックエンドの認証情報を使用する場合がある。

### クリーンアップ

ローカルフィクスチャのパスでは外部リソースは作成されない。マネージドバックエンドでの実運用では、プロバイダーのリソースをクリーンアップする必要があり、RAGランナーには後片付け処理と、孤立リソースの確認用の `npm run rag:sweep` が含まれている。

## 7. 検証データ

**バックエンドごとの結果**

| バックエンド | 種別 | 埋め込み | ストアの分離 | 来歴 | Recall@k (95% CI) | nDCG@k (95% CI) | MRR (95% CI) | Ingest ms (mean±sd) | Query p50 ms (mean±sd) | Query p95 ms (mean±sd) | コスト | コスト備考 |
| ------- | ---- | --------- | -------------- | ---------- | -------- | ------ | --- | --------- | ------------ | ------------ | ---- | --------- |
| sqlite-vec | self-managed | fixed | yes | fixtured | 100.0% ± 28.1pp | 100.0% ± 0.0pp | 1.000 ± 0.000 | 0.00 ± 0.00 | 0.00 ± 0.00 | 0.00 ± 0.00 | $0.0000 | ローカルのSQLite拡張であり、ベンチマーククエリにAPIコストはかからない。 |
| OpenAI vector store (File Search) | managed | managed | no | fixtured | 100.0% ± 28.1pp | 100.0% ± 0.0pp | 1.000 ± 0.000 | 0.00 ± 0.00 | 0.00 ± 0.00 | 0.00 ± 0.00 | $0.0000 | 最初の無料1GBを超えるとストレージは$0.10/GB/day、検索呼び出しは1kあたり$2.50（platform.openai.com/pricing、2026-07）。 |
| AWS S3 Vectors | self-managed | fixed | yes | fixtured | 100.0% ± 28.1pp | 100.0% ± 0.0pp | 1.000 ± 0.000 | 0.00 ± 0.00 | 0.00 ± 0.00 | 0.00 ± 0.00 | $0.0000 | AWS S3 Vectors（docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-pricing.html、2026-07）に基づくストレージ＋PUT/クエリリクエストの料金体系。本ベンチマークの利用量は$0.01を大きく下回る。 |
| Cloudflare Vectorize | self-managed | fixed | yes | fixtured | 100.0% ± 28.1pp | 100.0% ± 0.0pp | 1.000 ± 0.000 | 0.00 ± 0.00 | 0.00 ± 0.00 | 0.00 ± 0.00 | $0.0000 | 保存ベクトル次元数およびクエリベクトル次元数に応じた課金（developers.cloudflare.com/vectorize/platform/pricing、2026-07）。本ベンチマークの利用量は無料枠内に収まる。 |
| Cloudflare AutoRAG | managed | managed | no | fixtured | 100.0% ± 28.1pp | 100.0% ± 0.0pp | 1.000 ± 0.000 | 0.00 ± 0.00 | 0.00 ± 0.00 | 0.00 ± 0.00 | $0.0000 | マネージド型パイプラインであり、基盤となるWorkers AI + R2 + Vectorizeの利用量に応じて課金される（developers.cloudflare.com/autorag、2026-07）。出典時点ではAutoRAG独自の追加料金はない。 |

**データセット。** 本ベンチマークではSciFactのミニチュアサブセット（`scifact-mini`）を使用している。出典: https://github.com/allenai/scifact 。ライセンスに関する注記: SciFactはApache-2.0であり、このミニチュアフィクスチャはSciFact形式のクレームをもとにリポジトリ内で作成されたものである。実行対象は5件のドキュメント、3件のクエリ、3件の関連性判定を含む。

完全な実行記録は [`rag-benchmark.data.json`](./rag-benchmark.data.json) としてコミットされている。データセットの各行、バックエンドレジストリの事実情報、クエリ単位の結果、検索メトリクス、運用上のタイミング、来歴、生成タイムスタンプが含まれている。

生成日時: 2026-01-01T00:00:00.000Z

**過去の調査 / Past surveys in this series**

Earlier dated surveys of this topic, newest first — each a complete article for its run.

- [2026-07-09T11:02:46.726Z](./history/rag/2026-07-09T11-02-46-726Z/rag-benchmark.ja)
