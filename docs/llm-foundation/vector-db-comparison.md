---
description: 2026-07-07T18:30:26.646Z に生成した RAG ベクトルDBの比較レポートである。5件のベクトルストア／RAG バックエンドを、固定 embedding による検索品質、取り込み時間、クエリレイテンシ、コスト・運用制約で比較する。
---

# RAG ベクトルDBの比較

この検証は `2026-07-07T18:30:26.646Z` に生成したレポートである。5件のバックエンドを対象に、そのうち 4 件をライブ測定した。データセットは `scifact-beir-subset`（150文書、30クエリ、36 relevance judgment）である。検索品質は、自己管理ストアに共通の固定 embedding を与えた store-isolated な測定である。

## 1. 検証の目的

RAG システムで使うベクトルストアを、検索品質・レイテンシ・コスト・運用制約から選ぶための再現可能な測定表を作ることを目的とする。一般的な優劣の順位表ではなく、用途ごとの制約に対して候補を絞るための資料として扱う。

## 2. 測定対象

自己管理ストア（sqlite-vec / S3 Vectors / Vectorize）には共通の固定 embedding（`text-embedding-3-small@512`）を与え、ストア単体を比較する。マネージドストア（OpenAI Vector Store / AutoRAG）は embedding と索引を内部で行うため、ストア単体ではなく whole-stack の測定として扱い、store-isolated 列を「いいえ」とする。

| 測定対象 | 測っているもの | 読み方 |
| --- | --- | --- |
| recall@3 | 正解文書が上位 3 件に含まれる割合 | 高いほど必要な文書を拾いやすい |
| nDCG@3 | 順位を考慮した graded relevance | 高いほど正解が上位に来やすい |
| MRR | 最初の正解が出る順位の逆数 | 高いほど最初の有用結果が早い |
| 取り込み時間 | 文書を索引へ登録するまでの時間 | 初期投入や再構築の運用負荷を見る |
| クエリレイテンシ | 検索リクエストの p50 / p95 | ユーザー応答やエージェント処理時間を見る |
| コスト | API / ストレージ / クエリ費用 | スケール時の継続費用を見る |
| store-isolated | 固定 embedding か、マネージド側に内包されるか | ストア単体比較か whole-stack 比較かを分ける |

## 3. バックエンドと分類

| Backend | 種別 | Embedding | store-isolated | メタデータフィルタ | 測定 |
| --- | --- | --- | --- | --- | --- |
| sqlite-vec | 自己管理 | fixed | はい | なし | 実測 |
| OpenAI vector store (File Search) | マネージド | managed | いいえ | あり | 実測 |
| AWS S3 Vectors | 自己管理 | fixed | はい | あり | 実測 |
| Cloudflare Vectorize | 自己管理 | fixed | はい | あり | 実測 |
| Cloudflare AutoRAG | マネージド | managed | いいえ | あり | エラー |

## 4. 範囲と制約

- 各バックエンド×測定項目は 1 試行である。
- 結果は `2026-07-07T18:30:26.646Z` 時点のサービス挙動で、レイテンシは実行環境とネットワークに依存する。
- 自己管理ストアは同一の固定 embedding を共有するため、検索品質はほぼ同水準に収束し、差は主に運用面に表れる。
- マネージドストアは内部 embedding とチャンク分割を含む whole-stack の測定であり、固定 embedding 行と同列には比較しない。
- 価格は生成日時点のカタログ値を引用しており、実費は入力量・保存量・クエリ数で変わる。

## 5. 指標別の観測（検索品質）

固定 embedding を与えた自己管理ストアと、内部 embedding のマネージドストアを、recall@3 / nDCG@3 / MRR で比較する。実測したバックエンドのみを掲載する。

| 順位 | Backend | 種別 | Recall@3 | nDCG@3 | MRR |
| ---: | --- | --- | ---: | ---: | ---: |
| 1 | sqlite-vec | 自己管理 | 95.3% | 93.8% | 0.928 |
| 2 | AWS S3 Vectors | 自己管理 | 95.3% | 93.8% | 0.928 |
| 3 | Cloudflare Vectorize | 自己管理 | 95.3% | 93.8% | 0.928 |
| 4 | OpenAI vector store (File Search) | マネージド | 90.3% | 96.1% | 0.878 |

## 6. 指標別の観測（取り込み時間）

データセット全体を索引へ登録するまでの時間である。マネージドや eventually-consistent なストアでは、索引が検索可能になるまでの待ち時間を含む。

| 順位 | Backend | 種別 | 取り込み (ms) |
| ---: | --- | --- | ---: |
| 1 | sqlite-vec | 自己管理 | 1.9 |
| 2 | AWS S3 Vectors | 自己管理 | 1082.9 |
| 3 | Cloudflare Vectorize | 自己管理 | 36072.2 |
| 4 | OpenAI vector store (File Search) | マネージド | 135057.6 |

## 7. 指標別の観測（クエリレイテンシ）

検索リクエストが返るまでの時間の p50 / p95 である。対話 UI やエージェント処理では低いほど扱いやすい指標である。

| 順位 | Backend | 種別 | p50 (ms) | p95 (ms) |
| ---: | --- | --- | ---: | ---: |
| 1 | sqlite-vec | 自己管理 | 0.2 | 0.2 |
| 2 | AWS S3 Vectors | 自己管理 | 66.2 | 114.0 |
| 3 | Cloudflare Vectorize | 自己管理 | 130.8 | 239.2 |
| 4 | OpenAI vector store (File Search) | マネージド | 1690.8 | 2297.1 |

## 8. コストと運用制約

| Backend | 種別 | store-isolated | メタデータフィルタ | コスト |
| --- | --- | --- | --- | --- |
| sqlite-vec | 自己管理 | はい | なし | Local SQLite extension; no API cost for benchmark queries. |
| OpenAI vector store (File Search) | マネージド | いいえ | あり | Storage $0.10/GB/day after the first free GB; search calls $2.50 per 1k (platform.openai.com/pricing, 2026-07). |
| AWS S3 Vectors | 自己管理 | はい | あり | Storage + PUT/query request pricing per AWS S3 Vectors (docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-pricing.html, 2026-07); this benchmark's volume is well under $0.01. |
| Cloudflare Vectorize | 自己管理 | はい | あり | Priced per stored-vector-dimension and per queried-vector-dimension (developers.cloudflare.com/vectorize/platform/pricing, 2026-07); this benchmark's volume is within the free allotment. |
| Cloudflare AutoRAG | マネージド | いいえ | あり | Managed pipeline priced on the underlying Workers AI + R2 + Vectorize usage (developers.cloudflare.com/autorag, 2026-07); no separate AutoRAG fee as of source. |

実測できなかったバックエンドの扱い:

- **Cloudflare AutoRAG** は実測できなかった（エラーとして記録）。Fully-managed: ingests from an R2 bucket and embeds/indexes internally (whole-stack, not store-isolated). Indexing is asynchronous (a 6-hour cycle or a rate-limited force sync); its R2 data-source binding is provisioned via the dashboard, so a live REST-only end-to-end run may render an honest `error` rather than `measured`.

## 9. 総合比較

ストア選択では、まず用途の失敗条件を決める。検索品質は固定 embedding を共有する自己管理ストア間ではほぼ同水準に収束するため、実運用の差はレイテンシ・取り込み時間・コスト・メタデータフィルタ・スケール上限に表れる。

- 低レイテンシと単純な運用を優先する場合は、ローカルの sqlite-vec や、リクエスト単価の低い自己管理ストアを検討する。
- エッジ配信や Workers との結合を重視する場合は Cloudflare Vectorize を候補にするが、書き込みが eventually-consistent である点を取り込み時間として見込む。
- embedding からチャンク分割・索引までをプロバイダー側に委ねたい場合は、OpenAI Vector Store や AutoRAG などの whole-stack を選ぶ。この場合の数値はストア単体ではなくスタック全体の挙動である。
- AutoRAG のように索引が非同期（ダッシュボード連携やスケジュール同期）なサービスは、同期的なベンチマークでは実測が難しく、その場合はエラーとして正直に記録する。

この検証はベクトルストアの一般的な優劣を決めるものではなく、固定 embedding を前提とした検索品質と、実運用で効く運用指標に対して候補を絞るための基礎資料である。

## 10. 再現方法

検証は公開リポジトリ `qmu/research` で再生成できる。API キー不要の fixture self-test と、実バックエンドでの sweep が分かれている。実測は BEIR SciFact サブセットを取得してから実行する（コーパス本文は再配布せず、選んだ id と qrels のみをコミットしている）。

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# API キー不要の fixture self-test
npm run rag:fixture

# 費用見積もり
npm run rag:estimate

# 実測（SciFact サブセットを取得してから実行）
../../scripts/fetch-scifact.sh
npm run rag:real
```

公開判断に使う場合は、データセット・embedding モデル・バックエンド・生成日時・provenance を記録し、fixture 行・実測行・エラー行を分けて扱う。
