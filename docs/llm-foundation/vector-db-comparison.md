---
source_artifact: docs/research-reports/rag-benchmark.real.data.json
source_commit: 834ade815730cfceb6a1d908e56d78d97d3cb17f
generated_at: "2026-07-08T19:21:49.400Z"
trials: 5
provenance: measured
copied_to_corporate_at: null
---

# RAG Vector Store 比較調査

この調査は `2026-07-08T19:21:49.400Z` に生成したレポートです。5件のバックエンドを対象に、そのうち 3 件をライブ測定しました。データセットは `scifact-mini`（5文書、3クエリ、3 relevance judgment）です。現在の公開データはキー不要の fixture 行であり、バックエンド比較の結論ではありません。 fixture データでは運用指標を 5 試行の平均±標本標準偏差として表示します。検索品質の区間は 3 クエリ上の 95% 信頼区間です。

## 1. 調査の目的

RAG システムで使うベクトルストアを、検索品質・レイテンシ・コスト・運用制約から選ぶための再現可能な測定表を作ることを目的としています。一般的な優劣の順位表ではなく、用途ごとの制約に対して候補を絞るための資料として扱います。

## 2. 測定対象

自己管理ストア（sqlite-vec / S3 Vectors / Vectorize）には共通の固定 embedding（`fixed-hash-embedding-v1`）を与え、ストア単体を比較します。マネージドストア（OpenAI Vector Store / AutoRAG）は embedding と索引を内部で行うため、ストア単体ではなく whole-stack の測定として扱い、store-isolated 列を「いいえ」とします。

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
| AWS S3 Vectors | 自己管理 | fixed | はい | あり | fixture |
| Cloudflare Vectorize | 自己管理 | fixed | はい | あり | 実測 |
| Cloudflare AutoRAG | マネージド | managed | いいえ | あり | エラー |

## 4. 範囲と制約

- 運用指標（取り込み時間、クエリレイテンシ）は 5 試行の平均±標本標準偏差です。
- 検索品質（recall@3、nDCG@3、MRR）は 3 クエリ上の 95% 信頼区間つきで表示します。
- 結果は `2026-07-08T19:21:49.400Z` 時点のサービス挙動で、レイテンシは実行環境とネットワークに依存します。
- 自己管理ストアは同一の固定 embedding を共有するため検索品質は決定的で、試行を増やして検索品質の分散を作りません。
- マネージドストアは内部 embedding とチャンク分割を含む whole-stack の測定であり、固定 embedding 行と同列には比較しません。
- 価格は生成日時点のカタログ値を引用しており、実費は入力量・保存量・クエリ数で変わります。

## 履歴チャート

以下のインライン SVG は実測履歴から生成します。fixture 経路では出力しません。

### Recall@k 履歴

<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="export-rag-recallAtK-history-title export-rag-recallAtK-history-desc" viewBox="0 0 640 320"><title id="export-rag-recallAtK-history-title">RAG Recall@k 履歴</title><desc id="export-rag-recallAtK-history-desc">Recall@k 履歴 by measured series over manual measurement history. Single-date histories are marked as one data point and do not draw a trend line.</desc><rect x="0" y="0" width="640" height="320" fill="#ffffff"/><line x1="64.00" y1="256.00" x2="616.00" y2="256.00" stroke="#333333" stroke-width="1"/><line x1="64.00" y1="32.00" x2="64.00" y2="256.00" stroke="#333333" stroke-width="1"/><text x="64.00" y="276.00" font-size="10">2026-07-08</text><text x="616.00" y="276.00" text-anchor="end" font-size="10">2026-07-08</text><text x="320.00" y="306.00" text-anchor="middle" font-size="12">Measured at</text><text x="14.00" y="160.00" transform="rotate(-90 14.00 160.00)" text-anchor="middle" font-size="12">Recall</text><text x="56.00" y="36.00" text-anchor="end" font-size="10">0.91</text><text x="56.00" y="256.00" text-anchor="end" font-size="10">0.83</text><text x="64.00" y="22.00" font-size="12" font-weight="700">データ点 1</text><g><circle cx="340.00" cy="32.00" r="3.5" fill="#1f77b4"><title>sqlite-vec 2026-07-08 0.91</title></circle></g><g><g stroke="#d62728" stroke-width="1.5"><line x1="340.00" y1="201.96" x2="340.00" y2="256.00"/><line x1="336.00" y1="201.96" x2="344.00" y2="201.96"/><line x1="336.00" y1="256.00" x2="344.00" y2="256.00"/></g><circle cx="340.00" cy="228.98" r="3.5" fill="#d62728"><title>OpenAI vector store (File Search) 2026-07-08 0.84</title></circle></g><g><circle cx="340.00" cy="32.00" r="3.5" fill="#2ca02c"><title>Cloudflare Vectorize 2026-07-08 0.91</title></circle></g><g><line x1="484.00" y1="18.00" x2="504.00" y2="18.00" stroke="#1f77b4" stroke-width="2"/><text x="508.00" y="22.00" font-size="10">sqlite-vec</text></g><g><line x1="484.00" y1="33.00" x2="504.00" y2="33.00" stroke="#d62728" stroke-width="2" stroke-dasharray="5 3"/><text x="508.00" y="37.00" font-size="10">OpenAI vector store (File Search)</text></g><g><line x1="484.00" y1="48.00" x2="504.00" y2="48.00" stroke="#2ca02c" stroke-width="2" stroke-dasharray="2 3"/><text x="508.00" y="52.00" font-size="10">Cloudflare Vectorize</text></g></svg>

_Caption: sample count 3 plotted point(s) across 1 manual run date(s); metric sample n range 1-5. Cadence: manual on-demand runs only, not scheduled. Numeric tables remain the accessible text alternative._

### nDCG@k 履歴

<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="export-rag-ndcgAtK-history-title export-rag-ndcgAtK-history-desc" viewBox="0 0 640 320"><title id="export-rag-ndcgAtK-history-title">RAG nDCG@k 履歴</title><desc id="export-rag-ndcgAtK-history-desc">nDCG@k 履歴 by measured series over manual measurement history. Single-date histories are marked as one data point and do not draw a trend line.</desc><rect x="0" y="0" width="640" height="320" fill="#ffffff"/><line x1="64.00" y1="256.00" x2="616.00" y2="256.00" stroke="#333333" stroke-width="1"/><line x1="64.00" y1="32.00" x2="64.00" y2="256.00" stroke="#333333" stroke-width="1"/><text x="64.00" y="276.00" font-size="10">2026-07-08</text><text x="616.00" y="276.00" text-anchor="end" font-size="10">2026-07-08</text><text x="320.00" y="306.00" text-anchor="middle" font-size="12">Measured at</text><text x="14.00" y="160.00" transform="rotate(-90 14.00 160.00)" text-anchor="middle" font-size="12">nDCG</text><text x="56.00" y="36.00" text-anchor="end" font-size="10">0.88</text><text x="56.00" y="256.00" text-anchor="end" font-size="10">0.81</text><text x="64.00" y="22.00" font-size="12" font-weight="700">データ点 1</text><g><circle cx="340.00" cy="32.00" r="3.5" fill="#1f77b4"><title>sqlite-vec 2026-07-08 0.88</title></circle></g><g><g stroke="#d62728" stroke-width="1.5"><line x1="340.00" y1="207.86" x2="340.00" y2="256.00"/><line x1="336.00" y1="207.86" x2="344.00" y2="207.86"/><line x1="336.00" y1="256.00" x2="344.00" y2="256.00"/></g><circle cx="340.00" cy="231.93" r="3.5" fill="#d62728"><title>OpenAI vector store (File Search) 2026-07-08 0.82</title></circle></g><g><circle cx="340.00" cy="32.00" r="3.5" fill="#2ca02c"><title>Cloudflare Vectorize 2026-07-08 0.88</title></circle></g><g><line x1="484.00" y1="18.00" x2="504.00" y2="18.00" stroke="#1f77b4" stroke-width="2"/><text x="508.00" y="22.00" font-size="10">sqlite-vec</text></g><g><line x1="484.00" y1="33.00" x2="504.00" y2="33.00" stroke="#d62728" stroke-width="2" stroke-dasharray="5 3"/><text x="508.00" y="37.00" font-size="10">OpenAI vector store (File Search)</text></g><g><line x1="484.00" y1="48.00" x2="504.00" y2="48.00" stroke="#2ca02c" stroke-width="2" stroke-dasharray="2 3"/><text x="508.00" y="52.00" font-size="10">Cloudflare Vectorize</text></g></svg>

_Caption: sample count 3 plotted point(s) across 1 manual run date(s); metric sample n range 1-5. Cadence: manual on-demand runs only, not scheduled. Numeric tables remain the accessible text alternative._

### MRR 履歴

<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="export-rag-mrr-history-title export-rag-mrr-history-desc" viewBox="0 0 640 320"><title id="export-rag-mrr-history-title">RAG MRR 履歴</title><desc id="export-rag-mrr-history-desc">MRR 履歴 by measured series over manual measurement history. Single-date histories are marked as one data point and do not draw a trend line.</desc><rect x="0" y="0" width="640" height="320" fill="#ffffff"/><line x1="64.00" y1="256.00" x2="616.00" y2="256.00" stroke="#333333" stroke-width="1"/><line x1="64.00" y1="32.00" x2="64.00" y2="256.00" stroke="#333333" stroke-width="1"/><text x="64.00" y="276.00" font-size="10">2026-07-08</text><text x="616.00" y="276.00" text-anchor="end" font-size="10">2026-07-08</text><text x="320.00" y="306.00" text-anchor="middle" font-size="12">Measured at</text><text x="14.00" y="160.00" transform="rotate(-90 14.00 160.00)" text-anchor="middle" font-size="12">MRR</text><text x="56.00" y="36.00" text-anchor="end" font-size="10">0.86</text><text x="56.00" y="256.00" text-anchor="end" font-size="10">0.81</text><text x="64.00" y="22.00" font-size="12" font-weight="700">データ点 1</text><g><circle cx="340.00" cy="32.00" r="3.5" fill="#1f77b4"><title>sqlite-vec 2026-07-08 0.86</title></circle></g><g><g stroke="#d62728" stroke-width="1.5"><line x1="340.00" y1="208.98" x2="340.00" y2="256.00"/><line x1="336.00" y1="208.98" x2="344.00" y2="208.98"/><line x1="336.00" y1="256.00" x2="344.00" y2="256.00"/></g><circle cx="340.00" cy="232.49" r="3.5" fill="#d62728"><title>OpenAI vector store (File Search) 2026-07-08 0.81</title></circle></g><g><circle cx="340.00" cy="32.00" r="3.5" fill="#2ca02c"><title>Cloudflare Vectorize 2026-07-08 0.86</title></circle></g><g><line x1="484.00" y1="18.00" x2="504.00" y2="18.00" stroke="#1f77b4" stroke-width="2"/><text x="508.00" y="22.00" font-size="10">sqlite-vec</text></g><g><line x1="484.00" y1="33.00" x2="504.00" y2="33.00" stroke="#d62728" stroke-width="2" stroke-dasharray="5 3"/><text x="508.00" y="37.00" font-size="10">OpenAI vector store (File Search)</text></g><g><line x1="484.00" y1="48.00" x2="504.00" y2="48.00" stroke="#2ca02c" stroke-width="2" stroke-dasharray="2 3"/><text x="508.00" y="52.00" font-size="10">Cloudflare Vectorize</text></g></svg>

_Caption: sample count 3 plotted point(s) across 1 manual run date(s); metric sample n range 1-5. Cadence: manual on-demand runs only, not scheduled. Numeric tables remain the accessible text alternative._

### 取り込み時間履歴

<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="export-rag-ingestMs-history-title export-rag-ingestMs-history-desc" viewBox="0 0 640 320"><title id="export-rag-ingestMs-history-title">RAG 取り込み時間履歴</title><desc id="export-rag-ingestMs-history-desc">取り込み時間履歴 by measured series over manual measurement history. Single-date histories are marked as one data point and do not draw a trend line.</desc><rect x="0" y="0" width="640" height="320" fill="#ffffff"/><line x1="64.00" y1="256.00" x2="616.00" y2="256.00" stroke="#333333" stroke-width="1"/><line x1="64.00" y1="32.00" x2="64.00" y2="256.00" stroke="#333333" stroke-width="1"/><text x="64.00" y="276.00" font-size="10">2026-07-08</text><text x="616.00" y="276.00" text-anchor="end" font-size="10">2026-07-08</text><text x="320.00" y="306.00" text-anchor="middle" font-size="12">Measured at</text><text x="14.00" y="160.00" transform="rotate(-90 14.00 160.00)" text-anchor="middle" font-size="12">Milliseconds</text><text x="56.00" y="36.00" text-anchor="end" font-size="10">228192.3</text><text x="56.00" y="256.00" text-anchor="end" font-size="10">3.7</text><text x="64.00" y="22.00" font-size="12" font-weight="700">データ点 1</text><g><g stroke="#1f77b4" stroke-width="1.5"><line x1="340.00" y1="256.00" x2="340.00" y2="256.00"/><line x1="336.00" y1="256.00" x2="344.00" y2="256.00"/><line x1="336.00" y1="256.00" x2="344.00" y2="256.00"/></g><circle cx="340.00" cy="256.00" r="3.5" fill="#1f77b4"><title>sqlite-vec 2026-07-08 4.1</title></circle></g><g><g stroke="#d62728" stroke-width="1.5"><line x1="340.00" y1="32.00" x2="340.00" y2="86.78"/><line x1="336.00" y1="32.00" x2="344.00" y2="32.00"/><line x1="336.00" y1="86.78" x2="344.00" y2="86.78"/></g><circle cx="340.00" cy="59.39" r="3.5" fill="#d62728"><title>OpenAI vector store (File Search) 2026-07-08 200292.1</title></circle></g><g><g stroke="#2ca02c" stroke-width="1.5"><line x1="340.00" y1="213.78" x2="340.00" y2="233.69"/><line x1="336.00" y1="213.78" x2="344.00" y2="213.78"/><line x1="336.00" y1="233.69" x2="344.00" y2="233.69"/></g><circle cx="340.00" cy="223.73" r="3.5" fill="#2ca02c"><title>Cloudflare Vectorize 2026-07-08 32872.2</title></circle></g><g><line x1="484.00" y1="18.00" x2="504.00" y2="18.00" stroke="#1f77b4" stroke-width="2"/><text x="508.00" y="22.00" font-size="10">sqlite-vec</text></g><g><line x1="484.00" y1="33.00" x2="504.00" y2="33.00" stroke="#d62728" stroke-width="2" stroke-dasharray="5 3"/><text x="508.00" y="37.00" font-size="10">OpenAI vector store (File Search)</text></g><g><line x1="484.00" y1="48.00" x2="504.00" y2="48.00" stroke="#2ca02c" stroke-width="2" stroke-dasharray="2 3"/><text x="508.00" y="52.00" font-size="10">Cloudflare Vectorize</text></g></svg>

_Caption: sample count 3 plotted point(s) across 1 manual run date(s); metric sample n=5. Cadence: manual on-demand runs only, not scheduled. Numeric tables remain the accessible text alternative._

### クエリ p50 履歴

<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="export-rag-p50Ms-history-title export-rag-p50Ms-history-desc" viewBox="0 0 640 320"><title id="export-rag-p50Ms-history-title">RAG クエリ p50 履歴</title><desc id="export-rag-p50Ms-history-desc">クエリ p50 履歴 by measured series over manual measurement history. Single-date histories are marked as one data point and do not draw a trend line.</desc><rect x="0" y="0" width="640" height="320" fill="#ffffff"/><line x1="64.00" y1="256.00" x2="616.00" y2="256.00" stroke="#333333" stroke-width="1"/><line x1="64.00" y1="32.00" x2="64.00" y2="256.00" stroke="#333333" stroke-width="1"/><text x="64.00" y="276.00" font-size="10">2026-07-08</text><text x="616.00" y="276.00" text-anchor="end" font-size="10">2026-07-08</text><text x="320.00" y="306.00" text-anchor="middle" font-size="12">Measured at</text><text x="14.00" y="160.00" transform="rotate(-90 14.00 160.00)" text-anchor="middle" font-size="12">Milliseconds</text><text x="56.00" y="36.00" text-anchor="end" font-size="10">1727.6</text><text x="56.00" y="256.00" text-anchor="end" font-size="10">0.3</text><text x="64.00" y="22.00" font-size="12" font-weight="700">データ点 1</text><g><g stroke="#1f77b4" stroke-width="1.5"><line x1="340.00" y1="256.00" x2="340.00" y2="256.00"/><line x1="336.00" y1="256.00" x2="344.00" y2="256.00"/><line x1="336.00" y1="256.00" x2="344.00" y2="256.00"/></g><circle cx="340.00" cy="256.00" r="3.5" fill="#1f77b4"><title>sqlite-vec 2026-07-08 0.3</title></circle></g><g><g stroke="#d62728" stroke-width="1.5"><line x1="340.00" y1="32.00" x2="340.00" y2="41.61"/><line x1="336.00" y1="32.00" x2="344.00" y2="32.00"/><line x1="336.00" y1="41.61" x2="344.00" y2="41.61"/></g><circle cx="340.00" cy="36.80" r="3.5" fill="#d62728"><title>OpenAI vector store (File Search) 2026-07-08 1690.6</title></circle></g><g><g stroke="#2ca02c" stroke-width="1.5"><line x1="340.00" y1="234.59" x2="340.00" y2="235.01"/><line x1="336.00" y1="234.59" x2="344.00" y2="234.59"/><line x1="336.00" y1="235.01" x2="344.00" y2="235.01"/></g><circle cx="340.00" cy="234.80" r="3.5" fill="#2ca02c"><title>Cloudflare Vectorize 2026-07-08 163.8</title></circle></g><g><line x1="484.00" y1="18.00" x2="504.00" y2="18.00" stroke="#1f77b4" stroke-width="2"/><text x="508.00" y="22.00" font-size="10">sqlite-vec</text></g><g><line x1="484.00" y1="33.00" x2="504.00" y2="33.00" stroke="#d62728" stroke-width="2" stroke-dasharray="5 3"/><text x="508.00" y="37.00" font-size="10">OpenAI vector store (File Search)</text></g><g><line x1="484.00" y1="48.00" x2="504.00" y2="48.00" stroke="#2ca02c" stroke-width="2" stroke-dasharray="2 3"/><text x="508.00" y="52.00" font-size="10">Cloudflare Vectorize</text></g></svg>

_Caption: sample count 3 plotted point(s) across 1 manual run date(s); metric sample n=5. Cadence: manual on-demand runs only, not scheduled. Numeric tables remain the accessible text alternative._

### クエリ p95 履歴

<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="export-rag-p95Ms-history-title export-rag-p95Ms-history-desc" viewBox="0 0 640 320"><title id="export-rag-p95Ms-history-title">RAG クエリ p95 履歴</title><desc id="export-rag-p95Ms-history-desc">クエリ p95 履歴 by measured series over manual measurement history. Single-date histories are marked as one data point and do not draw a trend line.</desc><rect x="0" y="0" width="640" height="320" fill="#ffffff"/><line x1="64.00" y1="256.00" x2="616.00" y2="256.00" stroke="#333333" stroke-width="1"/><line x1="64.00" y1="32.00" x2="64.00" y2="256.00" stroke="#333333" stroke-width="1"/><text x="64.00" y="276.00" font-size="10">2026-07-08</text><text x="616.00" y="276.00" text-anchor="end" font-size="10">2026-07-08</text><text x="320.00" y="306.00" text-anchor="middle" font-size="12">Measured at</text><text x="14.00" y="160.00" transform="rotate(-90 14.00 160.00)" text-anchor="middle" font-size="12">Milliseconds</text><text x="56.00" y="36.00" text-anchor="end" font-size="10">2293.2</text><text x="56.00" y="256.00" text-anchor="end" font-size="10">0.3</text><text x="64.00" y="22.00" font-size="12" font-weight="700">データ点 1</text><g><g stroke="#1f77b4" stroke-width="1.5"><line x1="340.00" y1="256.00" x2="340.00" y2="256.00"/><line x1="336.00" y1="256.00" x2="344.00" y2="256.00"/><line x1="336.00" y1="256.00" x2="344.00" y2="256.00"/></g><circle cx="340.00" cy="256.00" r="3.5" fill="#1f77b4"><title>sqlite-vec 2026-07-08 0.3</title></circle></g><g><g stroke="#d62728" stroke-width="1.5"><line x1="340.00" y1="32.00" x2="340.00" y2="41.82"/><line x1="336.00" y1="32.00" x2="344.00" y2="32.00"/><line x1="336.00" y1="41.82" x2="344.00" y2="41.82"/></g><circle cx="340.00" cy="36.91" r="3.5" fill="#d62728"><title>OpenAI vector store (File Search) 2026-07-08 2243.0</title></circle></g><g><g stroke="#2ca02c" stroke-width="1.5"><line x1="340.00" y1="237.59" x2="340.00" y2="238.70"/><line x1="336.00" y1="237.59" x2="344.00" y2="237.59"/><line x1="336.00" y1="238.70" x2="344.00" y2="238.70"/></g><circle cx="340.00" cy="238.15" r="3.5" fill="#2ca02c"><title>Cloudflare Vectorize 2026-07-08 183.0</title></circle></g><g><line x1="484.00" y1="18.00" x2="504.00" y2="18.00" stroke="#1f77b4" stroke-width="2"/><text x="508.00" y="22.00" font-size="10">sqlite-vec</text></g><g><line x1="484.00" y1="33.00" x2="504.00" y2="33.00" stroke="#d62728" stroke-width="2" stroke-dasharray="5 3"/><text x="508.00" y="37.00" font-size="10">OpenAI vector store (File Search)</text></g><g><line x1="484.00" y1="48.00" x2="504.00" y2="48.00" stroke="#2ca02c" stroke-width="2" stroke-dasharray="2 3"/><text x="508.00" y="52.00" font-size="10">Cloudflare Vectorize</text></g></svg>

_Caption: sample count 3 plotted point(s) across 1 manual run date(s); metric sample n=5. Cadence: manual on-demand runs only, not scheduled. Numeric tables remain the accessible text alternative._

### 実行コスト履歴

<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="export-rag-costUsd-history-title export-rag-costUsd-history-desc" viewBox="0 0 640 320"><title id="export-rag-costUsd-history-title">RAG 実行コスト履歴</title><desc id="export-rag-costUsd-history-desc">実行コスト履歴 by measured series over manual measurement history. Single-date histories are marked as one data point and do not draw a trend line.</desc><rect x="0" y="0" width="640" height="320" fill="#ffffff"/><line x1="64.00" y1="256.00" x2="616.00" y2="256.00" stroke="#333333" stroke-width="1"/><line x1="64.00" y1="32.00" x2="64.00" y2="256.00" stroke="#333333" stroke-width="1"/><text x="64.00" y="276.00" font-size="10">2026-07-08</text><text x="616.00" y="276.00" text-anchor="end" font-size="10">2026-07-08</text><text x="320.00" y="306.00" text-anchor="middle" font-size="12">Measured at</text><text x="14.00" y="160.00" transform="rotate(-90 14.00 160.00)" text-anchor="middle" font-size="12">USD</text><text x="56.00" y="36.00" text-anchor="end" font-size="10">1.2500</text><text x="56.00" y="256.00" text-anchor="end" font-size="10">0.0000</text><text x="64.00" y="22.00" font-size="12" font-weight="700">データ点 1</text><g><g stroke="#1f77b4" stroke-width="1.5"><line x1="340.00" y1="256.00" x2="340.00" y2="256.00"/><line x1="336.00" y1="256.00" x2="344.00" y2="256.00"/><line x1="336.00" y1="256.00" x2="344.00" y2="256.00"/></g><circle cx="340.00" cy="256.00" r="3.5" fill="#1f77b4"><title>sqlite-vec 2026-07-08 0.0000</title></circle></g><g><g stroke="#d62728" stroke-width="1.5"><line x1="340.00" y1="32.00" x2="340.00" y2="32.00"/><line x1="336.00" y1="32.00" x2="344.00" y2="32.00"/><line x1="336.00" y1="32.00" x2="344.00" y2="32.00"/></g><circle cx="340.00" cy="32.00" r="3.5" fill="#d62728"><title>OpenAI vector store (File Search) 2026-07-08 1.2500</title></circle></g><g><g stroke="#2ca02c" stroke-width="1.5"><line x1="340.00" y1="256.00" x2="340.00" y2="256.00"/><line x1="336.00" y1="256.00" x2="344.00" y2="256.00"/><line x1="336.00" y1="256.00" x2="344.00" y2="256.00"/></g><circle cx="340.00" cy="256.00" r="3.5" fill="#2ca02c"><title>Cloudflare Vectorize 2026-07-08 0.0000</title></circle></g><g><line x1="484.00" y1="18.00" x2="504.00" y2="18.00" stroke="#1f77b4" stroke-width="2"/><text x="508.00" y="22.00" font-size="10">sqlite-vec</text></g><g><line x1="484.00" y1="33.00" x2="504.00" y2="33.00" stroke="#d62728" stroke-width="2" stroke-dasharray="5 3"/><text x="508.00" y="37.00" font-size="10">OpenAI vector store (File Search)</text></g><g><line x1="484.00" y1="48.00" x2="504.00" y2="48.00" stroke="#2ca02c" stroke-width="2" stroke-dasharray="2 3"/><text x="508.00" y="52.00" font-size="10">Cloudflare Vectorize</text></g></svg>

_Caption: sample count 3 plotted point(s) across 1 manual run date(s); metric sample n=5. Cadence: manual on-demand runs only, not scheduled. Numeric tables remain the accessible text alternative._

## 5. 指標別の観測（検索品質）

固定 embedding を与えた自己管理ストアと、内部 embedding のマネージドストアを、recall@3 / nDCG@3 / MRR で比較します。実測したバックエンドのみを掲載します。

| 順位 | Backend | 種別 | Recall@3 (95% CI) | nDCG@3 (95% CI) | MRR (95% CI) |
| ---: | --- | --- | ---: | ---: | ---: |
| 1 | sqlite-vec | 自己管理 | 100.0% ± 28.1pp | 100.0% ± 0.0pp | 1.000 ± 0.000 |
| 2 | OpenAI vector store (File Search) | マネージド | 100.0% ± 28.1pp | 100.0% ± 0.0pp | 1.000 ± 0.000 |
| 3 | Cloudflare Vectorize | 自己管理 | 100.0% ± 28.1pp | 100.0% ± 0.0pp | 1.000 ± 0.000 |

- **OpenAI vector store (File Search)** の検索品質 run-to-run 標準偏差（5 試行）: recall 0.0pp、nDCG 0.0pp、MRR 0.000。

## 6. 指標別の観測（取り込み時間）

データセット全体を索引へ登録するまでの時間です。マネージドや eventually-consistent なストアでは、索引が検索可能になるまでの待ち時間を含みます。

| 順位 | Backend | 種別 | 取り込み (ms, mean±sd) |
| ---: | --- | --- | ---: |
| 1 | sqlite-vec | 自己管理 | 0.2 ± 0.1 |
| 2 | OpenAI vector store (File Search) | マネージド | 15807.4 ± 2414.5 |
| 3 | Cloudflare Vectorize | 自己管理 | 27993.8 ± 1096.2 |

## 7. 指標別の観測（クエリレイテンシ）

検索リクエストが返るまでの時間の p50 / p95 です。対話 UI やエージェント処理では低いほど扱いやすい指標です。

| 順位 | Backend | 種別 | p50 (ms, mean±sd) | p95 (ms, mean±sd) |
| ---: | --- | --- | ---: | ---: |
| 1 | sqlite-vec | 自己管理 | 0.1 ± 0.0 | 0.1 ± 0.1 |
| 2 | Cloudflare Vectorize | 自己管理 | 128.2 ± 1.8 | 131.8 ± 2.9 |
| 3 | OpenAI vector store (File Search) | マネージド | 1514.5 ± 120.6 | 1794.6 ± 243.3 |

## 8. コストと運用制約

| Backend | 種別 | store-isolated | メタデータフィルタ | コスト |
| --- | --- | --- | --- | --- |
| sqlite-vec | 自己管理 | はい | なし | Local SQLite extension; no API cost for benchmark queries. |
| OpenAI vector store (File Search) | マネージド | いいえ | あり | Storage $0.10/GB/day after the first free GB; search calls $2.50 per 1k (platform.openai.com/pricing, 2026-07). |
| AWS S3 Vectors | 自己管理 | はい | あり | Storage + PUT/query request pricing per AWS S3 Vectors (docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-pricing.html, 2026-07); this benchmark's volume is well under $0.01. |
| Cloudflare Vectorize | 自己管理 | はい | あり | Priced per stored-vector-dimension and per queried-vector-dimension (developers.cloudflare.com/vectorize/platform/pricing, 2026-07); this benchmark's volume is within the free allotment. |
| Cloudflare AutoRAG | マネージド | いいえ | あり | Managed pipeline priced on the underlying Workers AI + R2 + Vectorize usage (developers.cloudflare.com/autorag, 2026-07); no separate AutoRAG fee as of source. |

実測できなかったバックエンドの扱い:

- **Cloudflare AutoRAG** は実測できませんでした（エラーとして記録）。Fully-managed: ingests from an R2 bucket and embeds/indexes internally (whole-stack, not store-isolated). Indexing is asynchronous (a 6-hour cycle or a rate-limited force sync); its R2 data-source binding is provisioned via the dashboard, so a live REST-only end-to-end run may render an honest `error` rather than `measured`.

## 9. 考察

この小規模なSciFact由来のスライス(クエリ3件、ドキュメント5件、クエリあたり関連ドキュメント1件)では、結果を返したすべてのバックエンドが完璧な検索品質を達成しました。sqlite-vec、OpenAIのFile Search、AWS S3 Vectors、Cloudflare Vectorizeはいずれもrecall@3、nDCG@3、MRRが1.0を記録しています。つまり、ここでは検索品質が差別化要因にはなっていません——クエリ数がわずか3件という規模では(recallの95%信頼区間は0.44まで低くなり得ます)、品質の比較は本質的に情報量に乏しく、実際の意思決定シグナルは運用面、すなわちレイテンシ、取り込みコスト、アーキテクチャにあります。Cloudflare AutoRAGは例外で、低スコアではなくハードエラーを出しました。ダッシュボード限定のR2バケットバインディング要件により、REST駆動の取り込みが検索可能なインデックスを一度も生成できなかったため、その0.0という指標は品質面の失敗ではなく、測定不能な状態を反映したものです。

最も顕著なトレードオフはレイテンシと管理オーバーヘッドの間にあります。自己管理型の固定埋め込みストアはクエリ時に劇的に高速です。sqlite-vecのp50クエリレイテンシは1ミリ秒に満たない水準(約0.06ms)で、S3 Vectorsはp50/p95ともに0msを記録しています。ただしS3 Vectorsの実行結果は明示的に「fixtured(模擬値)」とマークされており、実際に測定されたライブのネットワーク往復ではなく代替値として読むべきです。対照的にCloudflare Vectorizeは実際に測定された自己管理型ストアであり、p50は約128msに落ち着いています——これはマネージド型のOpenAIベクトルストア(p50クエリレイテンシは約1,515ms、p95は1,795ms近く)よりもはるかに低く、およそ1桁分高速です。このギャップは、フルマネージドで内部埋め込みを行うパイプラインのコストと、すでに計算済みのベクトルをインデックス化するだけのストアとの違いを反映しています。

取り込みコストについても補完的な傾向が見られます。sqlite-vecの取り込みはほぼ瞬時(約0.24ms)である一方、Cloudflare Vectorizeの測定された取り込みは約28秒かかりました——これは主にVectorizeのミューテーションが結果整合性モデルであり、ベンチマークにおけるポーリングによる伝播待機時間がこの数値に含まれているためであって、ベクトルの書き込み自体が本質的に遅いわけではありません。OpenAIのマネージドストアは取り込みに約15.8秒を要しており、これはサーバー側でのチャンキングと埋め込みが呼び出しの一部として行われることと整合的です。つまり「マネージド」オプションは、埋め込みパイプラインの保守が不要になる代わりに、取り込みが遅くコストも高く、クエリあたりのレイテンシもはるかに高くなるというトレードオフを伴います。自己管理型の固定埋め込みストアは安価で高速ですが、自ら埋め込みステップを運用・保守する必要があります。

直接コストについては、この計測結果においてゼロではない実測コストを記録しているのはOpenAIの実行のみで、1kコールあたり2.50ドルという検索料金体系により、この実行で0.0375ドルとなっています。一方、sqlite-vec、S3 Vectors、Vectorizeはこのベンチマークの規模ではいずれも0ドルと計測されています(S3 VectorsとVectorizeは本番料金体系については注記していますが、このワークロードは無料枠以下・以内に収まることを確認しています)。このことから、この規模においてクエリあたりの可視的なコストシグナルを持つのはマネージド型のOpenAIオプションのみとなりますが、組み込みのメタデータフィルタリングを備え、インフラの運用も不要という利点もあり、レイテンシや取り込み時間のコストと比較検討する価値のある実質的なトレードオフです。

これらの結果は、狭く低nのスナップショットとして読むべきです。運用指標については5回の試行、検索品質の根拠となるクエリはわずか3件にすぎません(そのため点推定値は完璧であっても信頼区間は広くなります)。また1つのバックエンド(S3 Vectors)はライブではなくfixturedの運用数値を報告しています。データセットはSciFactの完全な評価ではなく、リポジトリが独自に作成した小規模なフィクスチャであるため、これらの知見はおもちゃ規模での相対的なレイテンシ・コスト・アーキテクチャの挙動を特徴づけるものであり、統計的に堅牢な検索品質のランキングではなく、また本番のデータ量における挙動を保証するものでもありません。

_この節は、上表の実測データを固定入力として LLM が生成した分析です（考察のみ非決定的で、数値は上表と一致します）。_

## 10. 再現方法

調査は公開リポジトリ `qmu/research` で再生成できます。API キー不要の fixture データ生成と、実バックエンドでの sweep が分かれています。実測は BEIR SciFact サブセットを取得してから実行します（コーパス本文は再配布せず、選定した id と qrels のみをコミットしています）。

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# API キー不要の fixture データ生成
npm run rag:fixture

# 費用見積もり
npm run rag:estimate

# 実測（SciFact サブセットを取得してから実行）
../../scripts/fetch-scifact.sh
npm run rag:real -- --trials 5
```

公開判断に使う場合は、データセット・embedding モデル・バックエンド・生成日時・provenance を記録し、fixture 行・実測行・エラー行を分けて扱います。
