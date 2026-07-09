---
created_at: 2026-07-09T05:20:00+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, Infrastructure, UX, Config]
effort:
commit_hash:
category:
depends_on:
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# 可用性トピックを「API 能動プローブ」から「ステータスページ観測」へ作り直す

## Overview

現在の可用性トピックは **設計が誤っている**。`realSamples`
(`packages/tech/src/entrypoints/run-llm-availability.ts`) が各プロバイダーの
**モデル API を実際に叩き**（`probeLlmHealth` → `CompletionClient` に
`AVAILABILITY_HEALTH_PROMPT` を送信）、自分のリクエストの成功/失敗・レイテンシ・
エラー種別を測る **能動プローブ**になっている。そのため real 実行に API キーと
クォータが必要で、オーナーの意図（「各社の**ヘルスチェック／ステータスページを
見て、報告されている状態を記録・要約するだけ**」）と食い違う。

本チケットは可用性トピックを **受動的なステータスページ観測**へ作り直す。自分で
API を叩かず、各プロバイダーの公開ステータスページ（多くは Statuspage 系の
`/api/v2/summary.json`）を取得し、コンポーネント別の稼働状態・稼働中インシデント・
直近履歴を記録して要約する。**API キー不要**になる。

「断定的な可用性ランキングや SLA は出さない」方針は維持（むしろ他社の**報告の
記録**という性格に一致する）。

## 決定事項（Quality Gate 面談 2026-07-09）

- **取得方法**: Statuspage JSON API 優先（`/api/v2/summary.json`）、JSON を持たない
  提供元のみ HTML フォールバック。`components[] {name, status}` と
  `incidents[]`（active）を構造的に取得し、**`source_url` と `fetched_at` を
  provenance に残す**。
- **記録内容**: 取得時点の**コンポーネント別スナップショット**＋**稼働中
  インシデント／メンテ**＋**直近インシデント履歴**（コンポーネント uptime% が
  取得できれば併記）。
- **fixture 方針**: 各社の status レスポンス（JSON）を**リポジトリにコミット**し、
  `--fixture` はそれを読む（ネットワーク無し・決定的・byte-stable）。real 経路
  だけ live fetch（キー不要）。CI は fixture のみ。

## Policies

- `workaholic:design` / `policies/vendor-neutrality.md` — ステータスページ取得は
  `vendors/status/` の ACL に閉じる。各社フォーマット差（Statuspage / Google 独自）
  はアダプタで正規化し、ドメインは正規化済みの状態型だけを扱う。
- `workaholic:operation` / `policies/observability.md` — これは**観測**であり測定
  ではない。観測窓・取得時点・サンプル（＝各社の報告）を明示し、断定的ランキングを
  出さない。
- `workaholic:implementation` / `policies/objective-documentation.md` — 「他社が
  こう報告していた」という一次情報の provenance（`source_url`・`fetched_at`・
  status ページのタイムスタンプ）を成果物に必ず残す。他社の報告を自分の測定の
  ように見せない。
- `workaholic:operation` / `policies/ci-cd.md` — keyless fixture（コミット済み
  status JSON）で byte-stable を維持。live fetch は real 経路のみ、CI に乗せない。
- `workaholic:implementation` / `policies/directory-structure.md` — ドメイン
  （状態の正規化・要約）は純関数、fetch は `vendors/`、entrypoint は薄く。

## Key Files

- `packages/tech/src/vendors/llm/health.ts` — **撤去/置換**。API 能動プローブ
  (`probeLlmHealth`, `classifyHealthProbeError`) はステータスページ観測では不要。
- **新規** `packages/tech/src/vendors/status/*.ts` — ステータスページ取得 ACL。
  Statuspage `summary.json` アダプタ＋提供元別アダプタ。各社エンドポイント:
  - Anthropic `https://status.anthropic.com/api/v2/summary.json`
  - OpenAI `https://status.openai.com/api/v2/summary.json`
  - xAI `https://status.x.ai/api/v2/summary.json`（Statuspage 系か要確認）
  - Google Cloud（Vertex/Gemini）`https://status.cloud.google.com/incidents.json`
    は Statuspage と別形式 → 専用アダプタか HTML フォールバック（**要確認**）。
- `packages/tech/src/entrypoints/run-llm-availability.ts` — `realSamples` を
  ステータス取得に置換。API キー要求・`AVAILABILITY_HEALTH_PROMPT` 依存・
  `CompletionClient` 生成を撤去。estimate は「取得件数（≒プロバイダー数）・費用
  ゼロ・キー不要」に。
- `packages/tech/src/llm-model-comparison/domain/availability.ts` /
  `availability-report.ts` — 型を「サンプル・成功率・meanResponseTimeMs・失敗種別」
  から「コンポーネント別 status・インシデント・取得 provenance」へ変更。
- **新規** `packages/tech/src/**/fixtures/status/*.json`（またはそれに準ずる場所）
  — 各社 status レスポンスの固定コピー（fixture 経路の入力）。
- `docs/research-reports/llm-availability.{md,data.json}` + `.history.json` —
  fixture 成果物の形が変わる。byte-stable に作り直す。
- `scripts/export-corporate-research.mjs` の `exportAvailability` — セクションを
  「成功率／平均応答」から「コンポーネント別 status・インシデント・取得時点」へ
  作り直す（`可用性の観測` レポート）。`考察` 段はそのまま。
- `packages/tech/src/research/domain/topic.ts` の `availability` トピック — real
  経路がキー不要になった点を反映（modeArgv/estimate 表示）。
- `packages/tech/src/research/insights-runner.ts` の `TOPIC_GUIDANCE.availability`
  — 「他社ステータスページの報告の要約であり、自前の稼働測定ではない」旨に更新。

## Implementation Steps

1. `vendors/status/` に ACL を作る。Statuspage `summary.json` を取得し、
   `{ provider, source_url, fetched_at, pageUpdatedAt, components:[{name,status}],
   incidents:[{name,impact,status,startedAt,...}] }` に正規化する型を定義。
   Google Cloud は別形式のため専用アダプタ（または HTML フォールバック）を用意。
   タイムアウト・ネットワークエラーは握って「取得失敗」として記録（断定しない）。
2. ドメイン（`availability.ts`）を、能動プローブのサンプル型から、上記の**正規化
   ステータス観測型**＋要約（コンポーネント別状態の集計、稼働中インシデント数、
   直近履歴）に置き換える。純関数で unit-test 可能に。
3. entrypoint の real 経路をステータス取得へ差し替え、API キー要求・
   `CompletionClient`・`AVAILABILITY_HEALTH_PROMPT` を撤去。estimate をキー不要・
   費用ゼロの表示に。
4. fixture: 各社 status レスポンス（JSON）をコミットし、`--fixture` がそれを読む
   ように配線。`availability:fixture` を 2 回実行して byte-identical を確認。
5. exporter の `exportAvailability` を新しい観測内容（コンポーネント別 status 表・
   インシデント一覧・取得 provenance・断定回避の注記）に作り直す。`考察`
   （`llm-availability.insights.ja.md`）の splice はそのまま。
6. `insights-runner` の availability 用 guidance を「ステータスページの報告の
   要約」に更新。
7. 旧 API プローブ資産（`health.ts`、`AVAILABILITY_HEALTH_PROMPT`、
   `classifyHealthProbeError` とそのテスト）を撤去し、参照を掃除する。

## Quality Gate

**Acceptance criteria**

- `research availability`（real 経路）が **API キーを一切要求せず**、各社の
  ステータスページを取得して、コンポーネント別 status・稼働中インシデント・直近
  履歴を記録・要約する。自前の API 呼び出し（成功率/レイテンシ測定）は残っていない。
- 各観測に **provenance（`source_url`・`fetched_at`・ページ側タイムスタンプ）** が
  付く。他社の報告を自前測定のように提示しない。
- **断定的な可用性ランキング・SLA を出さない**（観測として提示、注記あり）。
- keyless fixture（コミット済み status JSON）で `availability:fixture` が
  **2 回 byte-identical**。CI は fixture のみで、live fetch を行わない。
- Google Cloud のように Statuspage と別形式の提供元も、取得できない場合は「取得
  失敗／未取得」として正直に記録し、捏造しない。

**Verification method**

- `cd packages/tech && npm test`（ステータス正規化・要約の純関数テスト、fixture
  経路の決定性テストを含む）／`npm run lint`／repo-root `make build` が緑。
- `availability:fixture` を 2 回実行しハッシュ一致。
- real 経路を **キーを外した環境**で実行し、キー無しで成功する（＝ API を叩いて
  いない）ことを確認。取得できた成果物に provenance が入っていること。
- `make build` で可用性レポートのリンク・レンダリングが壊れていないこと。

**Gate**

- テスト・lint・build 緑、fixture byte-stable、real 経路がキー不要で成功、成果物に
  provenance、断定的ランキングを出さない、旧 API プローブ資産が撤去されている。

## Considerations

- 本チケットは、コミット済みの構造化レポート `可用性の観測`
  （`docs/llm-foundation/availability-comparison.md`、commit `c0a4ba3`）の中身を
  **作り直す**。carry チケット `20260709051500` の可用性に関する記述（能動プローブ
  前提の再生成手順）は本チケットで supersede される。
- Statuspage の `summary.json` はレート制限が緩いが、**利用規約と取得頻度**に注意。
  手動オンデマンド取得に留め、常時ポーリングはしない。
- 各社フォーマット差（特に Google Cloud の `incidents.json`）を ACL で吸収する。
  未対応フォーマットは「未取得」を正直に記録し、HTML フォールバックは最小限に。
- provenance のため、ページ側の更新時刻（`page.updated_at` 等）と自分の
  `fetched_at` の両方を残す。
- real 経路がキー不要になるので、`availability` の estimate/実行が他トピックより
  安全・安価になる点をドキュメントに反映（CLAUDE.md の記述が必要なら別途）。
