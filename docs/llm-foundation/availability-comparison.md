---
title: 可用性の比較
description: LLM基礎検証における可用性の手動ヘルスプローブ観測。定常サンプリングが確立するまで、ダウン頻度・ダウンタイム長の断定的な比較は行わない。
---

# 可用性の比較

可用性の比較は、LLMプロバイダーAPIに短いヘルスプローブを繰り返し送り、成功率、失敗種別、連続失敗の観測を時系列に積む検証区分である。

現時点の公開状態は **手動ヘルスプローブ観測** である。スケジューラはまだなく、実行は owner が必要時に手で起動する。そのため、現段階ではプロバイダー間の可用性ランキング、ダウン頻度ランキング、ダウンタイム長の断定的な比較は公開しない。手動・疎なサンプルは「その実行窓で何が観測されたか」を示すだけで、継続的な可用性を表すものではない。

## サンプリング仕様

仕様は `packages/tech/src/llm-model-comparison/domain/availability.ts` の `DEFAULT_AVAILABILITY_SAMPLING_SPEC` を正とする。

| 項目 | 内容 |
| --- | --- |
| 仕様バージョン | `manual-health-probe-v1` |
| 取得方式 | 手動 on-demand。スケジュール実行ではない |
| サンプリング間隔 | 60,000 ms |
| タイムアウト | 10,000 ms |
| サンプル数 | 既定はプロバイダーごとに3サンプル。runner の `--samples` で明示変更できる |
| 観測窓 | 1回の手動実行内で、同一プロバイダーの最初のサンプルから最後のサンプル終了まで |
| リクエスト元 | `--origin` または `AVAILABILITY_REQUEST_ORIGIN` で実行者がリージョン / ネットワークを記録する。未指定の場合は「手動実行環境、詳細未記録」として扱い、比較根拠にしない |
| リクエスト | 既存の `CompletionClient` ACL 経由で `Reply with exactly the lowercase token ok.` を `maxTokens: 4` で送る |
| レート制限 | HTTP 429 / quota / rate-limit 系は `rate_limit` として記録し、サービス停止の `down` には含めない |
| censoring | 実行前、実行後、別々の手動実行の間にある未知区間は censored とする。未知区間の uptime / downtime は推測しない |

## `down` の定義

この検証で `down` と数えるのは、次をすべて満たす場合だけである。

| 条件 | 定義 |
| --- | --- |
| 失敗種別 | `timeout`、`server_error`、`network_error` のいずれか |
| タイムアウト | 10,000 ms |
| 連続失敗閾値 | 同一観測窓内で2回以上連続 |
| 除外 | `rate_limit` はレート制限として別集計。`client_error` は認証・リクエスト不備などの可能性があるためサービス停止に含めない |
| ダウンタイム長 | 観測窓が定義された場合だけ、連続失敗runの「最初の失敗観測時刻から最後の失敗プローブ終了まで」を観測値として計算する。前後の未知区間は足さない |

この定義は、実際の障害全体の開始・終了時刻を復元するものではない。手動サンプルでは、失敗が観測されていない時間を正常とも異常とも断定しない。

## 現在のデータ状態

コミット済みの実プロバイダー可用性データは、まだ **十分な定常サンプルではない**。このページでは現段階の可用性を順位づけしない。

| 種別 | 状態 | 読み方 |
| --- | --- | --- |
| keyless fixture | 実装済み。`npm run availability:fixture` はAPIキーなしで決定的な artifact / report を生成する | ハーネス検証であり、実プロバイダーの可用性ではない |
| 実プローブ | owner が `npm run availability:estimate` で見積もりを確認してから `npm run availability` を実行する | 手動ヘルスプローブ観測として履歴に積む |
| 定常サンプリング | 未実装 | これが入るまで、ダウン頻度・ダウンタイム長の断定比較は保留 |

生成される source report は `docs/research-reports/llm-availability.md`、artifact は `docs/research-reports/llm-availability.data.json` である。history は `docs/research-reports/llm-model-comparison.history.json` の `availability` 点として積む。各点は `n` と `observationWindow` を持つ。

履歴チャートを描画する場合、caption は必ずサンプル数と「manual on-demand runs only, not scheduled」を明記する。現在の renderer は、可用性チャートに「manual health-probe observations, not an availability ranking or downtime trend」と入れる。

## 再現

```sh
cd packages/tech
npm install

# APIキー不要。決定的な fixture report / artifact を生成する。
npm run availability:fixture

# 実プローブ前の見積もり。プロバイダー呼び出しはしない。
npm run availability:estimate

# owner-gated real path。実行元は比較解釈に必要なので記録する。
npm run availability -- --origin "ap-northeast-1 / qmu operator network"
```

実プローブは短いリクエストだが、APIキーと費用が必要である。このページの更新では実プローブを実行していない。
