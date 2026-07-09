---
created_at: 2026-07-09T12:00:00+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, Infrastructure, UX, Config]
effort:
commit_hash:
category:
depends_on:
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# 可用性トピックを「スナップショット」から「LLM 抽出＋累積 DB＋30/90 日トレンド」へ作り直す

## Overview

オーナー判断（2026-07-09）で、直前に実装した**決定論的スナップショット観測**
（commit 9d37ac4）は棄却された。ある時点のコンポーネント状態を出すだけで役に立たない。

正しい設計:
- 各プロバイダーの**ステータス／ヘルス履歴ページを定期的にウェブ取得**する。
  決定論的パースはしない（各社フォーマットが割れて壊れる）。**LLM が取得内容を
  読み取り**、規定の JSON スキーマへ抽出する。
- 抽出結果を**リポジトリ内の JSON ファイルに累積コミット**していく（real／キー
  ありの実行が per-provider DB を更新・コミットする＝「ストックしていく」）。
- DB には provider ×（product・発生時刻・継続時間・インシデント・影響）を記録。
- リサーチ完了時点で、レポート上に**各プロバイダーの 30 日／90 日トレンド**
  （アップタイム／ダウンタイム推移）が**すでに描画**されている状態にする。各社は
  自社インシデント履歴を数週間〜数ヶ月分公開しており、1 回の取得でその範囲を取得できる。
- 「Active incidents and maintenance」セクションは廃止（インシデントリンクが 404）。

## 取得元の実地調査（2026-07-09）

- Anthropic: `status.anthropic.com` は `status.claude.com` へ 302。
  `https://status.claude.com/api/v2/incidents.json` が 200・50 件・約 1 ヶ月分。
- OpenAI: `https://status.openai.com/api/v2/incidents.json` 200・25 件（Statuspage）。
- Google: `https://status.cloud.google.com/incidents.json` 200・独自形式。
- xAI: `status.x.ai` は Cloudflare 403（スクリプト取得不可）。→「取得不可」を正直に記録。

各社の形式が割れる（Statuspage JSON / Google 独自 / HTML / 取得不可）ため、**単一の
LLM 抽出ステージ**で正規化するのが妥当。

## 設計判断（この drive で採用）

- **累積 DB**: `docs/research-reports/availability-history/<provider>.json`。
  `{ provider, providerName, sourceUrl, sourceKind, lastFetchedAt, asOf,
  extraction:{model,extractedAt}, incidents:[{id,title,impact,affectedProducts,
  startedAt,endedAt,reportedUptimePct,sourceUrl}] }`。real 実行がインシデント id で
  マージ（追加・ongoing 更新）してコミット。
- **抽出**: `vendors/status/` は keyless で生ソース（JSON/HTML text）を取得するだけ。
  LLM 抽出ステージ（research 層、キーあり）が生ソースを読み、スキーマへ正規化。
- **トレンド計算（純関数・決定論）**: インシデントの [startedAt, endedAt||asOf] を
  窓 [asOf-日数, asOf] と重ね合わせ、impact 重み（critical/major=1.0、minor=0.5、
  maintenance=0 は別集計、none=0）でダウンタイム分を積算 → uptime% = 1 - dt/窓分。
  日次系列も算出しチャート化。30 日・90 日の 2 窓。
- **描画（keyless・CI・byte-stable）**: レンダーは LLM を使わず、コミット済み DB から
  30/90 日トレンドを計算して `llm-availability.{md,data.json}` を出力。`asOf` は
  コミット済み DB の最大 `asOf`（決定論）。
- **entrypoint**: `--fixture`＝コミット済み DB から描画のみ（CI）。default/real＝
  fetch＋LLM 抽出＋DB マージ・コミット→描画（要 ANTHROPIC_API_KEY）。`--estimate`＝
  取得件数・LLM 呼び出し見積のみ。
- uptime% は各社報告値ではなく**インシデントから導出**（Anthropic/xAI は uptime% を
  API 公開しないため）。LLM が明示的 uptime% を読めれば `reportedUptimePct` に併記。

## Policies

- `workaholic:operation` / `observability.md` — これは各社の**報告の記録**であり
  当方の測定ではない。provenance（source_url・fetched_at・抽出モデル）を必ず残す。
  断定的ランキング・SLA は出さない。
- `workaholic:implementation` / `objective-documentation.md` — 導出 uptime% は
  「報告インシデントからの導出値・重み付き」と明記。捏造しない。取得不可（xAI）は
  正直に記録。
- `workaholic:design` / `vendor-neutrality.md` — 取得は `vendors/status/` に閉じ、
  各社差は LLM 抽出で正規化。ドメインは正規化済みインシデント型のみ扱う。
- `workaholic:operation` / `ci-cd.md` — CI は keyless（コミット済み DB から描画）で
  byte-stable。live fetch＋LLM は real 経路のみ。

## Implementation Steps

1. `vendors/status/`: 決定論 normalize アダプタ（statuspage.ts/google.ts）を撤去し、
   `sources.ts`（provider→history URL・kind）＋ `fetch.ts`（keyless 生取得、403/302 は
   ok:false）に置換。
2. `domain/availability.ts`: 累積 DB 型・インシデント型・マージ・30/90 日トレンド計算
   （純関数、unit-test）。
3. LLM 抽出ステージ（research 層）: 生ソース＋kind を入力に、スキーマへ正規化する
   プロンプト＋（keyless スタブ or キーあり実 LLM）。tolerant JSON parse＋検証。
4. entrypoint: 上記 3 経路（fixture 描画／real fetch+extract+merge+描画／estimate）。
5. report renderer: 30/90 日トレンド表＋日次アップタイム時系列チャート（provider 別）、
   provenance、断定回避。active-incidents セクション廃止。
6. exporter `exportAvailability`: 同トレンド内容に作り直し（考察 splice は維持）。
7. real 実行で Anthropic/OpenAI/Google の DB を実データで seed・コミット（xAI は取得不可
   を記録）。keyless 描画が byte-stable であることを 2 回実行で確認。

## Quality Gate

- keyless（`--fixture`）描画がコミット済み DB から 30/90 日トレンドを再現し、2 回
  byte-identical。CI は live fetch も LLM も呼ばない。
- real 経路が各社履歴を取得→LLM 正規化→DB を累積コミット。provenance あり。取得不可
  （xAI）は正直に記録。
- レポートに provider 別 30/90 日トレンド（表＋チャート）が実データで描画されている。
- 断定的ランキング・SLA なし。active-incidents セクションなし。
- tsc + vitest + lint + `make build` 緑。

## Outcome（2026-07-09 /drive で実装・実データ seed 済み）

スナップショット設計（9d37ac4）を破棄し、**LLM 抽出＋累積 DB＋30/90 日トレンド**へ作り直した。

**実装:**
- `vendors/status/`: 決定論アダプタを撤去し `sources.ts`（provider→履歴 URL・kind）＋
  `fetch.ts`（keyless 生取得、403/302 は ok:false）に置換。
- `domain/availability.ts`: インシデント型・累積 DB 型・`mergeIncidents`（id マージ）・
  `computeAvailabilityWindow`（カレンダー日次・impact 重み付き・30/90 日）。
- `domain/availability-extract.ts`: 生ソースの縮約（statuspage/google/html）・抽出
  プロンプト・tolerant JSON parse（純関数、unit-test）。
- entrypoint: `--fixture`＝累積 DB から描画（keyless・決定論）／default(real)＝
  fetch＋LLM 抽出（sonnet-5, maxTokens 16384）＋DB マージ・コミット→描画／`--estimate`。
- renderer: 30/90 日トレンド表＋90 日日次アップタイム SVG チャート＋直近インシデント
  ＋provenance。active-incidents セクション廃止。exporter も同内容に作り直し（考察 splice 維持）。

**導出アップタイムの頑健化（重要）:** 単一の長時間・特定プロダクト限定インシデント
（例: Anthropic の「Claude Mythos 5 access suspended」が critical で 450 時間）が指標を
支配し、初回は Anthropic 31%/30日 という非現実的な値になった。対策として impact 重みを
critical×1.0／major×0.5／minor×0.1、かつ**単一インシデントは最大 24 時間まで**として
指標を頑健化（実継続時間はインシデント記録に保持）。結果: Anthropic 94.7%／Google 100%／
OpenAI 98.2%（30日）と現実的に。

**実データ seed（コミット済み）:** `docs/research-reports/availability-history/`
- anthropic（status.claude.com）50 件、openai 25 件、google 3 件を実取得・LLM 抽出。
- **xAI は Cloudflare 403 でスクリプト取得不可** → `available:false` で正直に記録。

**Gate（全緑）:** tsc + 230 vitest / prettier + eslint / `make build`（dead-link 修正済み）。
`availability:fixture` 2 回 byte-identical。real 経路は要 ANTHROPIC_API_KEY（抽出のみ、
取得自体は keyless）。

**オーナー向け申し送り:**
1. **xAI の正しい取得先が未解決**（`status.x.ai` は CF 403）。別 URL／ブラウザ経由の
   取得は今後の課題。現状は「取得不可」を正直に記録。
2. **公開レポート `availability-comparison.md` と 考察 は本 drive では未再生成**（owner-gated
   publish 手順）。exporter 生成器は新トレンド形式を出力することを確認済み。
3. トレンドは各社が公開する履歴の範囲（数週間〜数ヶ月）に依存。90 日全部が埋まるかは
   各社の掲載期間次第（Google は少数・長期、Anthropic は多数・直近寄り）。
