---
title: コンピュータ操作
source_artifact: docs/research-reports/computer-use-comparison.data.json
insights_model: source-report
translated_from: computer-use-comparison.md
translation_model: manual-translation-keyless
generated_at: 2026-01-01T00:00:00.000Z
trials: 0
provenance: manual-translation
---

# コンピュータ操作

このレポートは、コンピュータ操作モデルを**機械的に検証可能な**タスク成果のみで比較します——各被験対象は同一の固定ブラウザハーネスで固定タスク群を操作し、成功は最終ページ状態に対する宣言的な述語で判定されます。美的評価や操作過程への主観的判断はスコアに一切含まれません。

## 1. 調査の目的

本調査の目的は、API ネイティブなコンピュータ操作ツールにはどのようなものが存在し、それぞれが固定されたブラウザタスク群をどれだけ確実に完了できるか、解決までに何手（ステップ）と実時間を要するか、そして 1 タスクあたりのコストがいくらか——つまり、あるプロバイダーのエージェントを実際の Web 作業に組み込めるかどうかを左右する特性を記録することである。

## 2. 測定対象

### 対象モデル

対象は、選定済みレジストリ（`packages/tech/src/computer-use/models.ts`）に含まれる 3 つの API ネイティブなコンピュータ操作ツールであり、プロバイダーごとに 1 構成、それぞれ引用元および最終確認日と共に掲載されている。すべて同一の固定ハーネス（Playwright（リポジトリの Playwright MCP プラグイン））で駆動されるため、変動する要因はモデル／ツールのみである。

- **xAI（Grok）** は対象外である：API ネイティブなコンピュータ操作ツールを提供していないため（2026-07-14 時点で確認済み）。

### 対象メトリクス

測定対象のメトリクスは、タスク成功率（満たされた述語数／試行数、高いほど良い）、完了手数（成功試行あたりのアクション数、低いほど良い）、アクションあたりレイテンシ（ms、低いほど良い）、タスクあたり実時間（秒、低いほど良い）、タスク単価（トークン使用量から算出した USD、低いほど良い）、およびリカバリ率（リカバリを要した試行数／試行数、低いほど良い——副次的な堅牢性の指標）である。

## 3. 範囲と制約

- **述語で判定し、主観評価はしない。** 各タスクの成功は、最終的な DOM／URL に対する宣言的なチェック（URL の接尾辞、テキストの存在、入力値、要素数）で判定される。LLM による判定も美的な採点も行わない。タスク群の変更はバージョンの引き上げに相当する。
- タスク群バージョン `1`：固定された自己完結型のフィクスチャサイト（`computer-use-fixture-site@1`）上の 8 タスク。公開ベンチマーク（OSWorld 2.0、WebArena、WebVoyager）はメトリクス定義が参照する基準であるが、v1 は独自の決定論的タスク群を固定する——ライブサイト型や分裂したバリアント型のベンチマークはそれ自体が再現可能ではないためである。履歴は同一タスク群バージョン・同一ハーネスの地点同士のみを接続する。
- **ブラウザのみ、プロバイダーごとに 1 構成。** デスクトップ OS（OSWorld）およびモバイル（AndroidWorld）のタスクは v1 の範囲外であり、第 2 の DOM ファーストなハーネス（browser-use）も範囲外である。
- フィクスチャ経路はキー不要かつ決定論的で、ブラウザを一切起動しない。実際の識別可能な数値は、オーナーが承認済みのコスト上限内で実経路を実行した場合にのみ現れる（まず `--estimate` を実行すること）。
- 特定時点のもの：計測された挙動は `2026-01-01T00:00:00.000Z` 時点のモデル・ツール・API を反映している。カタログのトークン価格は各行の最終確認日時点のものである。

## 4. 検証結果

この実行では、3 つの被験行のうち **0 件が計測値** である（計測値でない行は `fixtured` のハーネス確認、または `error` 行であり、数値を捏造することはない）。すべての被験対象は同一の固定ハーネス（Playwright（リポジトリの Playwright MCP プラグイン））で駆動され、変動する要因はモデル／ツールのみである。

要約すべき計測値は存在しない。コミットされたフィクスチャページは、スコアリングのパイプラインが端から端まで動作することを示すものである。被験対象ごと・タスクごとの記録はセクション 7「検証データ」にある。

## 5. 考察

この実行には計測行が存在しない。すべての被験対象は fixtured または error であったため、モデル間の主張は行わない。コミットされたフィクスチャページは、モデルを比較するためではなくパイプラインを実証するために存在する。実経路では、ハーネスループが未接続の被験対象は、数値を捏造せず正直に `error` 行を記録する。

## 6. 再現方法

### 再現手順

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# キー不要の自己検証（決定論的なフィクスチャクライアント、ブラウザ・キーとも不要）:
npm run research -- computer-use --fixture

# コストの事前見積り、その後オーナー承認制の実行:
npm run research -- computer-use --estimate
npm run research -- computer-use --real
```

### 再現コスト（目安）

フィクスチャ経路はキー不要かつ無償である。実試行では、各プロバイダーに対して基盤モデルのトークン単価で課金される（アクション単位の別料金はない）。マルチターンのループを通じてスクリーンショットが入力側トークンの大半を占める。合意されている上限は 1 試行あたり $40 であり、まず `--estimate` を実行しなければならない。

### クリーンアップ

外部リソースは一切作成されない。ブラウザセッションは一時的であり、スクリーンショットはループ中メモリ上に保持されて破棄される。実行が書き出すのはローカルの Markdown／JSON アーティファクトのみである——コミット前に内容を確認すること。

## 7. 検証データ

**被験対象ごとの結果**

| 被験対象 | プロバイダー | 由来 | ツール | トークン単価 入/出（USD/MTok） | 成功率 | 手数 | アクション毎レイテンシ | タスク毎実時間 | タスク単価 | リカバリ | 備考 |
| ------- | -------- | ---------- | ---- | ----------------------------- | ------- | ----- | -------------- | --------------- | --------- | -------- | ---- |
| Claude Sonnet 5 (Computer Use) | anthropic | fixtured | `computer_20251124` | 3 / 15 | 100.0% ± 0.0% (n=8) | 4.9 ± 1.6 (n=8) | 72 ms ± 6 ms (n=8) | 0.4 s ± 0.1 s (n=8) | $0.035 ± $0.011 (n=8) | 0.0% ± 0.0% (n=8) |  |
| OpenAI computer-use-preview | openai | fixtured | `computer` | 3 / 12 | 100.0% ± 0.0% (n=8) | 4.9 ± 1.6 (n=8) | 72 ms ± 6 ms (n=8) | 0.4 s ± 0.1 s (n=8) | $0.033 ± $0.010 (n=8) | 0.0% ± 0.0% (n=8) |  |
| Gemini 2.5 Computer Use | google | fixtured | `computer_use` | 1.25 / 10 | 100.0% ± 0.0% (n=8) | 4.9 ± 1.6 (n=8) | 72 ms ± 6 ms (n=8) | 0.4 s ± 0.1 s (n=8) | $0.018 ± $0.005 (n=8) | 0.0% ± 0.0% (n=8) |  |

**タスク群（バージョン 1、サイト `computer-use-fixture-site@1`）**

| タスク ID | カテゴリ | 最小手数 | 成功述語 |
| ------- | -------- | ------------- | ----------------- |
| open-product-from-catalog | navigation | 2 | url-ends-with: /product/widget.html |
| search-and-open-first-result | search | 4 | url-ends-with: /product/notebook.html |
| add-two-items-to-cart | multi-step | 6 | element-count: #cart-items li=2 |
| submit-contact-form | form | 5 | text-present: Thank you, your message was sent |
| apply-discount-code | form | 3 | input-value: #applied-code=SAVE10 |
| confirm-order-total | extraction | 3 | input-value: #confirm-total=63 |
| filter-catalog-by-category | navigation | 2 | url-ends-with: /catalog.html?category=stationery |
| update-account-nickname | form | 3 | input-value: #nickname=researcher |

**ハーネス。** すべての被験対象は Playwright（リポジトリの Playwright MCP プラグイン）で駆動された。各試行の完全なアクション軌跡、タイミング、トークン使用量はアーティファクトに逐語的に保存されている。

完全な実行記録は [`computer-use-comparison.data.json`](./computer-use-comparison.data.json) としてコミットされている：試行ごとの軌跡、アクションごとのレイテンシ、トークン数、スコア。

生成日時: 2026-01-01T00:00:00.000Z
