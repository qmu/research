---
title: エージェントVM/サンドボックス
source_artifact: docs/research-reports/agent-vm-comparison.data.json
translated_from: agent-vm-comparison.md
provenance: authored-fixture-translation
trials: 0
---

# エージェントVM/サンドボックス

このレポートは、AIエージェントが untrusted なコードを実行できるサンドボックス／microVM 基盤を比較する。参照列（分離モデル、価格、機能）は各プロバイダーのドキュメントから選定したカタログ情報であり、コールドスタートとコストの列はライブプローブ、またはセルフテストページではキー不要のフィクスチャが生成する。

## 1. 調査の目的

本調査の目的は、どのようなエージェントVM／サンドボックス基盤が存在し、どのようにコードを分離し、いくらかかり、どれだけ速く起動するか——エージェントのコード実行層をどのバックエンドの上に築くかを決める特性——を記録することである。

## 2. 測定対象

### 対象モデル

対象は、選定済みレジストリ（`packages/tech/src/agent-vm/models.ts`）に含まれる8プロバイダーであり、各行は引用元と最終確認日を持つ。

- **AWS Lambda microVMs**（`aws-lambda-microvm`）: firecracker 分離 — 出典 https://aws.amazon.com/lambda/pricing/（確認 2026-07-14）。
- **Fly.io Machines**（`fly-machines`）: firecracker 分離 — 出典 https://fly.io/docs/about/pricing/（確認 2026-07-14）。
- **E2B**（`e2b`）: firecracker 分離 — 出典 https://e2b.dev/docs/pricing（確認 2026-07-14）。
- **Modal**（`modal`）: gvisor 分離 — 出典 https://modal.com/pricing（確認 2026-07-14）。
- **Daytona**（`daytona`）: container 分離 — 出典 https://www.daytona.io/pricing（確認 2026-07-14）。
- **Cloudflare Containers / Sandbox SDK**（`cloudflare-sandbox`）: container 分離 — 出典 https://developers.cloudflare.com/containers/pricing/（確認 2026-07-14）。
- **Vercel Sandbox**（`vercel-sandbox`）: firecracker 分離 — 出典 https://vercel.com/docs/vercel-sandbox（確認 2026-07-14）。
- **Northflank Sandboxes**（`northflank`）: kata 分離 — 出典 https://northflank.com/pricing（確認 2026-07-14）。

### 対象メトリクス

参照メトリクス（カタログ選定）: 分離モデル、公表 $/vCPU-hr と $/GB-hr（低いほど良い）、課金粒度、最大実行時間（高いほど良い）、スナップショット/レジューム、ファイルシステム永続性、ネットワークエグレス、GPU 提供の有無。測定メトリクス（プローブ）: コールドスタート p50/p95（ms、低いほど良い）、ウォーム再利用レイテンシ（ms、低いほど良い）、固定タスクの実時間（ms、低いほど良い）、およびそこから導出される固定タスクコスト（USD、低いほど良い）。

## 3. 範囲と制約

- **公称の分離であり、監査ではない。** 分離モデルの列は各ベンダーが文書で述べる境界（Firecracker microVM、gVisor、Kata、コンテナ）を記録する。本トピックはその境界のペネトレーションテストを行わない。
- **価格は選定済みのカタログ情報**（標準ティア）であり、頻繁に変動する——全行が出典と最終確認日を持ち、トライアル時に必ず再確認しなければならない。
- **コストは計算時間のみ。** 固定タスクコストはタスクの vCPU 秒を公表レートで価格化したものであり、起動ごとの最低課金、アカウント料金、エグレスは注記に留め、数値には織り込まない。
- フィクスチャ経路はキー不要かつ決定論的である。実際のコールドスタートの数値は、オーナーが認証情報を用いて、承認済みコスト上限の範囲内で実経路を実行した場合にのみ現れる（まず `--estimate` を実行すること）。プローブアダプターのないプロバイダーは、アダプターが実装されるまで `unreachable` のままである。
- 特定時点のもの: 測定された挙動は `2026-01-01T00:00:00.000Z` 時点の各プラットフォームを反映する。参照値は各行の最終確認日時点のものである。

## 4. 検証結果

今回の実行では、8件のプロバイダー行のうち **8件をプローブ** した（残りは `unreachable` — プローブアダプター/認証情報が未整備 — または `error` の行であり、数値を捏造することは一切ない）。

| メトリクス | 最良（プロバイダー） | 中央値 | 最悪 |
| ---------- | -------------------- | ------ | ---- |
| コールドスタート p50 | 92 ms — E2B | 408 ms | 2856 ms |
| コールドスタート p95 | 98 ms — E2B | 436 ms | 3052 ms |
| 固定タスクコスト | $0.000001 — Northflank Sandboxes | $0.000002 | $0.000004 |

「最良」「最悪」は各メトリクス自身の方向に従う（コールドスタートとコストは低いほど良い）。分離モデル、公表レート、機能の列はプロバイダー表の参照情報である。プロバイダーごとの完全な記録は第7節「検証データ」に記載している。

## 5. 考察

`fixtured`/`measured` の provenance を持つ行はコールドスタートとコストで比較できる。分離モデル、価格、機能は参照コンテキストである。コールドスタート p50 が低く p95 が高い場合はテールレイテンシのリスクが局在していることを示し、$/vCPU-hr が安く起動が遅い場合は応答性とコストのトレードオフを示す。

## 6. 再現方法

### 再現手順

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# キー不要のセルフテスト（決定論的なフィクスチャプロビジョナー）:
npm run research -- agent-vm --fixture

# コストの事前確認、その後オーナー承認による実行（プロバイダー認証情報が必要）:
npm run research -- agent-vm --estimate
npm run research -- agent-vm --real
```

### 再現コスト（目安）

フィクスチャ経路はキー不要かつ無償である。実トライアルは、到達可能な各プロバイダーに起動と固定タスクの vCPU 秒分が課金される（参照表のプロバイダーごとの $/vCPU-hr を参照）。合意された範囲は1トライアルあたり $1–$8 であり、まず `--estimate` を実行しなければならない。

### クリーンアップ

実アダプターは起動したすべてのサンドボックスを必ず破棄しなければならない（孤児リソースゼロ。RAG のティアダウン保証と同じ）。フィクスチャ経路は何もプロビジョニングしない。実行が書き出すのはローカルの Markdown/JSON アーティファクトのみである——コミット前に内容を確認すること。

## 7. 検証データ

**参照カタログ（選定）**

| プロバイダー | 分離 | $/vCPU-hr | $/GB-hr | 課金 | 最大実行時間 | スナップショット | ファイルシステム | エグレス | GPU |
| ------------ | ---- | --------- | ------- | ---- | ------------ | ---------------- | ---------------- | -------- | --- |
| AWS Lambda microVMs | firecracker | $0.10000 | $0.01100 | per-100ms | 900s | no | ephemeral | restricted | no |
| Fly.io Machines | firecracker | $0.02190 | $0.00530 | per-second | unbounded | yes | persistent | open | yes |
| E2B | firecracker | $0.10000 | $0.01080 | per-second | 86400s | yes | persistent | open | no |
| Modal | gvisor | $0.13500 | $0.00670 | per-second | 86400s | yes | persistent | open | yes |
| Daytona | container | $0.05000 | $0.01250 | per-second | unbounded | yes | persistent | open | yes |
| Cloudflare Containers / Sandbox SDK | container | $0.07200 | $0.00900 | per-second | unbounded | no | ephemeral | open | no |
| Vercel Sandbox | firecracker | $0.12800 | $0.02120 | per-second | 2700s | no | ephemeral | open | no |
| Northflank Sandboxes | kata | $0.01667 | $0.00833 | per-second | unbounded | yes | persistent | open | yes |

**測定プローブ（固定タスク: ウォームなサンドボックス内で実行する有界のCPUループ（固定反復回数）。実時間はI/Oではなくプラットフォームの計算性能を分離して測る。）**

| プロバイダー | Provenance | Cold p50 | Cold p95 | Cold (mean±sd) | ウォーム再利用 | 固定タスク | タスクコスト | 備考 |
| ------------ | ---------- | -------- | -------- | -------------- | -------------- | ---------- | ------------ | ---- |
| AWS Lambda microVMs | fixtured | 612 ms | 654 ms | 614 ± 27 (n=5) | 72 ms | 118 ms | $0.000003 |  |
| Fly.io Machines | fixtured | 2856 ms | 3052 ms | 2867 ± 126 (n=5) | 336 ms | 118 ms | $0.000001 |  |
| E2B | fixtured | 92 ms | 98 ms | 92 ± 4 (n=5) | 11 ms | 118 ms | $0.000003 |  |
| Modal | fixtured | 408 ms | 436 ms | 410 ± 18 (n=5) | 48 ms | 118 ms | $0.000004 |  |
| Daytona | fixtured | 153 ms | 164 ms | 154 ± 7 (n=5) | 18 ms | 118 ms | $0.000002 |  |
| Cloudflare Containers / Sandbox SDK | fixtured | 510 ms | 545 ms | 512 ± 23 (n=5) | 60 ms | 118 ms | $0.000002 |  |
| Vercel Sandbox | fixtured | 255 ms | 273 ms | 256 ± 11 (n=5) | 30 ms | 118 ms | $0.000004 |  |
| Northflank Sandboxes | fixtured | 1224 ms | 1308 ms | 1229 ± 54 (n=5) | 144 ms | 118 ms | $0.000001 |  |

完全な実行記録は [`agent-vm-comparison.data.json`](./agent-vm-comparison.data.json) としてコミットされている: 反復ごとのコールドスタートのサンプル、ウォーム再利用と固定タスクのタイミング、および導出コスト。

_この日本語ページはキーレス構築時に手作業で用意した暫定翻訳であり、最初の実トライアルで `research:translate-report` により再生成される。_

Generated: 2026-01-01T00:00:00.000Z
