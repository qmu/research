---
title: ディープリサーチAPI
source_artifact: docs/research-reports/deep-research-comparison.data.json
source_commit: dacedfc
insights_model: source-report
translated_from: deep-research-comparison.md
translation_model: claude-sonnet-5
generated_at: 2026-07-19T02:42:29.317Z
trials: 0
provenance: llm-translation
---
# ディープリサーチAPI

本レポートでは、1つの質問から数分単位の「計画・検索・読解・統合」ループが起動し、引用付きレポートが返される自律型**ディープリサーチ**エンドポイントを、**機械的に検証可能**な挙動のみに基づいて比較する。固定のLLM審査員が各レポートに対して決定論的なyes/noルーブリックで回答し、サンプリングした引用を検証する形をとり、審美的な意見はスコアに一切反映されない。

## 1. 調査の目的

本調査の目的は、どのようなdeep-researchエンドポイントが存在し、そのレポートがどの程度信頼でき、引用がどれほど充実しているか、処理にどれくらいの時間がかかり、1クエリあたりのコストはいくらか、そして自前で構築できるagenticループ（Anthropicベースライン）を上回るような既製品が存在するかどうかを記録することである。

## 2. 測定対象

### 対象モデル

対象は、キュレーションされたレジストリ（`packages/tech/src/deep-research/models.ts`）に含まれる5つのdeep-researchエンドポイントであり、それぞれに引用元と最終確認日が付されている。そのうちの1つ、Anthropicのbuild-your-ownループ（Claude + `web_search`）は、他のターンキー製品の比較対象となる、透明性のある自前実装の**ベースライン**である。

### 対象メトリクス

測定するメトリクスは、質問ごとのルーブリックに対する回答品質（満たした項目数／総項目数、値が高いほど良い）、引用の妥当性（解決可能かつ主張を裏付ける引用数／確認対象数、値が高いほど良い）、ソースの多様性（引用された固有ドメイン数、値が高いほど良い）、レイテンシ（エンドツーエンドの秒数、値が低いほど良い）、クエリあたりのコスト（USD、値が低いほど良い）である。

## 3. 範囲と制約

- **判定は行うが、評価基準（rubric）に制約される。** 固定のLLM判定者（`claude-sonnet-5`）が決定論的なyes/no形式の質問に回答し、引用を確認する。文章のスタイルを採点することは一切ない。判定者を入れ替えることは通常の更新ではなく、計測器の変更に相当する。
- 質問マニフェストのバージョンは`2026-07`：ドメインに依存せず、十分に文書化され、検証可能かつ再現可能な回答が得られる4件の調査質問を選定している。履歴は同一マニフェストバージョンのデータポイント同士のみを接続する。
- **レポート本文はコミットされない。** 成果物にはレポートの長さ、所要時間、コスト、引用元ドメイン、判定者の回答、およびスコアが記録されており、これは本ページを再生成するのに十分な情報だが、レポート本文全体が含まれることは決してない。
- フィクスチャ経路（fixture path）はキー不要かつ決定論的であり、実際の数値は所有者が承認済みのコスト上限内で実経路（real path）を実行した後にのみ現れる（まず`--estimate`を実行すること）。
- 特定時点のデータである点に注意：測定された挙動は`2026-07-19T02:12:52.868Z`時点のエンドポイントおよびAPIを反映しており、参考として示すクエリ単価は各行の最終検証日時点のものである。

## 4. 検証結果

今回の実行では、5件の対象行のうち**2件を測定**した（非測定行は`fixtured`のハーネスチェックか`error`行であり、数値を捏造したものではない）。

| メトリクス | 最良（対象） | 中央値 | 最悪 |
| ------ | -------------- | ------ | ----- |
| 回答品質（ルーブリック） | 75.0% — Grok DeepSearch | 71.9% | 68.8% |
| 引用妥当性 | 70.8% — Anthropic build-your-own（Claude + web_search） | 47.9% | 25.0% |
| ソースの多様性 | 14.0 — Anthropic build-your-own（Claude + web_search） | 10.9 | 7.8 |
| レイテンシ | 20.9秒 — Grok DeepSearch | 38.9秒 | 57.0秒 |
| クエリあたりのコスト | $0.04 — Grok DeepSearch | $0.16 | $0.29 |

「最良」「最悪」は各メトリクス固有の方向性に従う（品質・妥当性・多様性は高いほど良く、レイテンシとコストは低いほど良い）。対象ごと・質問ごとの完全な記録はセクション7「検証データ」に記載している。

**推移 / Trend across surveys**

This is the first comparable survey in the series, so there is no multi-survey trend to chart yet. A trend chart appears here once a second same-instrument survey is archived; earlier surveys are linked under Verification Data.

## 5. 考察

`measured` の来歴を持つ行は、品質、引用の正確性、多様性、レイテンシ、コストの観点で比較できる。回答品質を引用の妥当性と突き合わせて読み解くことで、deep-research系プロダクトを最も特徴づける失敗モードの所在が明らかになる——流暢だが根拠のない引用を含むレポートは、品質スコアは高くても妥当性スコアは低くなる。Anthropicのベースライン行は、すぐに使えるエンドポイントのプレミアムが、自前で構築・実行できるループよりも優れたリサーチをもたらすかどうかを判断する基準点となる。

## 6. 再現方法

### 再現手順

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# キー不要のセルフテスト（決定論的なフィクスチャクライアント）:
npm run research -- deep-research --fixture

# コストのプレビュー後、オーナー承認制の本番実行:
npm run research -- deep-research --estimate
npm run research -- deep-research --real
```

### 再現コスト（目安）

フィクスチャ経路はキー不要でコストもかからない。実トライアルでは各プロバイダーへdeep-researchクエリごとに課金され（対象ごとの参考価格を参照）、それに加えてLLM-judgeの読み取り分も課金される。deep-researchクエリは単一の補完よりもはるかにコストが高く遅いため、`--estimate` を先に実行する必要があり、合意した上限を超える見積もりが出た場合は再承認のために停止する。

### クリーンアップ

外部リソースは作成されない。レポートは判定のためにメモリ上に保持された後破棄される。実行によって作成されるのはローカルのMarkdown/JSON成果物のみであり、コミット前にレビューすること。

## 7. 検証データ

**科目別結果**

| 科目 | プロバイダー | 実行状況 | 品質（平均±sd） | 引用の妥当性 | ソースの多様性 | レイテンシ | クエリあたりコスト | 備考 |
| ------- | -------- | ---------- | ----------------- | ----------------- | ---------------- | ------- | ---------- | ---- |
| OpenAI o3 Deep Research | openai | エラー | 未測定 | 未測定 | 未測定 | 未測定 | 未測定 | エラー: 520ステータスコード（本文なし） |
| Perplexity Sonar Deep Research | perplexity | エラー | 未測定 | 未測定 | 未測定 | 未測定 | 未測定 | エラー: 実際のperplexity実行にはPERPLEXITY_API_KEYが必要です。 |
| Gemini Deep Research | google | エラー | 未測定 | 未測定 | 未測定 | 未測定 | 未測定 | エラー: 400 {"error":{"message":"The 'system_instruction' parameter is not supported for the deep-research-preview-04-2026 agent. Please include any specific instructions in the 'input' prompt instead.","code":"invalid_request"}} |
| Grok DeepSearch | xai | 測定済み | 75.0% ± 50.0%（n=4） | 25.0% ± 50.0%（n=4） | 7.8 ± 5.4（n=4） | 20.9 s ± 6.0 s（n=4） | $0.04 ± $0.02（n=4） |  |
| Anthropic build-your-own（Claude + web_search） _(ベースライン)_ | anthropic | 測定済み | 68.8% ± 47.3%（n=4） | 70.8% ± 37.0%（n=4） | 14.0 ± 5.2（n=4） | 57.0 s ± 7.6 s（n=4） | $0.29 ± $0.12（n=4） |  |

**質問マニフェスト（バージョン 2026-07）**

| 質問ID | ルーブリックサイズ | プロンプト |
| ----------- | ----------- | ------ |
| http3-quic | 4 | HTTP/2とHTTP/3の主な技術的差異は何か、また、なぜQUICトランスポートプロトコルが導入されたのか？ |
| grid-batteries | 4 | グリッド規模のエネルギー貯蔵における リチウムイオン電池とナトリウムイオン電池を、エネルギー密度、コスト・材料の入手可能性、商業化状況の観点から比較せよ。 |
| svb-collapse | 4 | 2023年3月のシリコンバレー銀行破綻の主な原因は何であったか？ |
| intermittent-fasting | 4 | 断続的断食（インターミッテント・ファスティング）の健康への影響に関する現在の科学的エビデンスを、十分に裏付けられた知見と不確実な知見とを区別しながら要約せよ。 |

**判定の出所。** すべてのレポートは`claude-sonnet-5`によって採点されており、各呼び出しのルーブリック回答、引用チェック、引用ドメインはアーティファクト内に逐語的に保存されています。

完全な実行記録は[`deep-research-comparison.data.json`](./deep-research-comparison.data.json)としてコミットされています：呼び出しごとのレイテンシ、コスト、引用ドメイン、判定回答、スコアを含みます。

生成日時: 2026-07-19T02:12:52.868Z

**過去の調査 / Past surveys in this series**

Earlier dated surveys of this topic, newest first — each a complete article for its run.

- [2026-07-19T02:12:52.868Z](./history/deep-research/2026-07-19T02-12-52-868Z/deep-research-comparison.ja)
