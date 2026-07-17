---
created_at: 2026-07-17T10:45:25+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 4h
commit_hash: 3eb60cd
category: Added
depends_on:
mission: llm-token-metering
---

# トークン自前カウント調査とリサーチ記事の公開

## Overview

既存ライブラリ（tiktoken / @anthropic-ai/tokenizer 等）に依存せず、**自前で**トークン数をカウントし、利用者（プリンシパル）別に LLM API 使用量・コストを推定する方法を調査し、成果を **research リポの正規公開フロー全部**（dated report の merge + 索引登録 + 日本語訳 + qmu-co.jp への一方向コピーライン）に乗せて記事として公開する。対象プロバイダは Anthropic Claude / OpenAI / Google Gemini / OSS・ローカルモデルの4系統。

HQ 規約（`.workaholic/hq-desk-rules.md`）に従い、実体は research トピックデスク `.worktrees/research-token-metering/` で proposal-first に実施し、strategy にはタイムライン2層（道のり・日報）で進行を記録する。既存資産（`docs/research-reports/foundation-models.md` のモデル別単価）は入力として再利用し、重複させない。本チケットの成果（誤差表・較正パラメータ・実装方針章）は後続の plgg ライブラリチケットの入力になる。

**精度検証の API 実測は合計 $5 を上限として開発者が事前承認済み（2026-07-17）。** 上限内なら /drive は実測前に確認を挟まず進んでよい。超える見込みが出た場合のみ再確認する。

## Policies

The standard engineering policies — synced from the corporate site (qmu.co.jp) into the `workaholic` policy skills — that govern this ticket. The implementing session **MUST** read each linked policy hard copy before writing code and keep every change defensible against that policy's Goal (目標), Responsibility (責務), and Practices (実践).

- `workaholic:implementation` / `policies/directory-structure.md` — 検証コードを research リポの規約配置（`packages/` 配下、domain / entrypoints / vendors 分層）に置くため（全コード作業に適用）
- `workaholic:implementation` / `policies/coding-standards.md` — 検証スクリプトの TypeScript / スタイル規約（全コード作業に適用）
- `workaholic:design` / `policies/vendor-neutrality.md` — 本チケットの核心。「自前実装をまず選ぶ」原則と、既存ライブラリに依存する場合の4点依存判断ログ（理由・評価・監視計画・撤退戦略）。プロバイダ・トークナイザは ACL 越しに扱う
- `workaholic:planning` / `policies/verify-before-building.md` — 自前カウンタの技術的不確実性は本格構築前に小さく検証する（1トピック1ラボ、破棄前提の PoC）
- `workaholic:planning` / `policies/cost-estimation.md` — 使用量・コスト推定は内訳を保ち、未検証の不確実性は単一値でなく**幅**で示す
- `workaholic:development` / `policies/weekly-quota.md` — 余剰クォータの調査投入を正当な仕事と定める（本調査の根拠）
- `workaholic:implementation` / `policies/observability.md` — 利用者別使用量はカスタムビジネスメトリクス。ベンダー中立形式、構造化ログのユーザー ID は非 PII 形式（実装方針章の制約）
- `workaholic:design` / `policies/data-sovereignty.md` — 利用者別使用量レコードはユーザー帰属データ。データ最小化、スキーマ時点で削除・エクスポート意味論を決める（実装方針章の制約）
- `workaholic:implementation` / `policies/objective-documentation.md` — 記事は評価形容詞を排し、検証可能な記述と ADR 様式の意思決定記録で書く

## Key Files

- `.workaholic/hq-desk-rules.md` - research トピックデスク（`.worktrees/research-<topic>/`）の設置・撤去手順と境界上書き規律
- `.worktrees/research/docs/research-development-guideline.md` - proposal-first プロトコルと7節構成の記事様式。成果物が従う必須レシピ
- `.worktrees/research/docs/research-reports/foundation-models.md` - モデル別単価（PRICE）の既存カタログ。コスト推定の単価入力として再利用
- `.worktrees/research/docs/research-reports/index.md` - 既存レポート索引。新レポートの登録先
- `.worktrees/research/docs/llm-foundation/index.md` - 日本語正規リーディングライン（qmu-co.jp へ一方向コピー）。公開フローの終端
- `.worktrees/research/CLAUDE.md` - research リポ規約: `src/` 分層（domain / entrypoints / vendors ACL）、`make` 単一ランナー、客観的文書
- `docs/plan.md` - RBAC+PBAC のプリンシパルモデル。「利用者別」帰属の単位の定義元
- `docs/timeline.md` - 道のり表。ミッションルートの追加と ▶ 現在地の更新先
- `site.config.ts` - 日報ページのサイドバー定義（デッドリンク検査あり）

## Implementation Steps

1. 上記 Policies の各ハードコピーを読む。特に `vendor-neutrality.md` の4点依存判断ログ様式と `research-development-guideline.md` の proposal-first プロトコル。
2. research トピックデスク `.worktrees/research-token-metering/` を設置する（`~/projects/research` の worktree、ブランチはリテラル `work-YYYYMMDD-HHMMSS`）。
3. proposal-first: 調査対象（4プロバイダ）・メトリクス（±5% 精度検証の方法とサンプルセット）・実測コスト見積もり（上限 $5 承認済み）を提案としてまとめる。
4. プロバイダ別に「自前カウント」の成立条件を調査する:
   - **OpenAI**: BPE 仕様と公開語彙（cl100k_base / o200k_base の vocab・merges）から BPE を自前実装する道筋。tiktoken は参照実装として比較対象に留める
   - **OSS/ローカル（Llama 等）**: `tokenizer.json`（語彙・マージ規則が完全公開）からの自前実装
   - **Google Gemini**: SentencePiece 系。公開語彙の有無と、countTokens API を照合基準に使う構成
   - **Anthropic Claude**: 現行モデルのトークナイザは非公開。count_tokens API を基準とした**較正付き推定器**（言語別 chars/token 比・バイト長ベース等）の設計と、その誤差特性
5. エッジケース4種を調査・文書化する: (a) 日本語テキストの単価特性と誤差傾向、(b) 出力トークンの事前推定（実行前に確定不能 — max_tokens 上限・実績比ベースの推定方式の整理）、(c) prompt caching / tool use / system prompt の課金上の数え方、(d) 画像・マルチモーダルのトークン換算式。
6. 「利用者別」帰属の設計方針を書く: plan.md のプリンシパルモデルを帰属単位とし、使用量レコードのスキーマ方針（データ最小化・削除意味論・分離 ADR）、メトリクス出力（ベンダー中立形式、非 PII ユーザー ID）、トークン数・金額の branded type 化。
7. 検証ハーネスを research 規約（domain / entrypoints / vendors ACL、`make test` / `make lint`）で実装し、日本語・英語・コードのサンプルセットで自前カウント vs API 実測値の誤差表を作る（±5% 基準の実証、上限 $5 内）。較正パラメータとサンプルセットは後続 plgg チケットが再利用できる形で保存する。
8. 記事を research の様式（dated report: EN `.md` + `data.json` + 日本語訳、`docs/research-reports/` 配下 + 索引登録 + `docs/llm-foundation/` リーディングライン掲載）で書き、**実装方針章**（plgg ライブラリ化の設計案、ACL 境界、依存判断ログ）を含めて、公開パイプライン（qmu-co.jp への一方向コピーライン）に乗せる。PR 作成まで — merge は開発者承認。
9. strategy 側の記録: `docs/timeline.md` にミッションルートを追加して現在地を動かし、当日の日報と `site.config.ts` のサイドバー葉を更新、`npm run build` でデッドリンク検査を通す。

## Quality Gate

**Acceptance criteria** — 承認時に成立していなければならない検証可能条件:

- 記事が Anthropic Claude / OpenAI / Google Gemini / OSS・ローカルモデルの4系統について、トークンの数え方・自前カウントの成立条件・料金体系を比較している
- 入力トークンの自前カウント（Claude は較正付き推定器）が、日本語・英語・コードを含むサンプルセットで API 実測値に対し**誤差 ±5% 以内**であることを実測表で示している。±5% を満たせないプロバイダ・条件は誤差幅を明記している
- エッジケース4種（日本語 / 出力トークン事前推定 / キャッシュ・ツール使用 / 画像換算）を独立の節でカバーしている
- 実装方針章に、利用者別帰属の設計、使用量レコードのスキーマ方針、4点依存判断ログが含まれている
- 記事が research の正規公開フロー全部に乗っている: dated report (EN + data.json) の merge、索引登録、日本語訳、`docs/llm-foundation/` リーディングライン掲載（qmu-co.jp コピーライン）
- 文書は objective-documentation 準拠（評価形容詞なし、検証可能な記述、出典明記）

**Verification method** — それを証明するコマンド・手順:

- research デスクで `make test` と `make lint` が exit code 0（`| tail` 等でマスクしない）。検証ハーネスが誤差表を再生成できる
- API 実測ログ（モデル・入力・API 報告値・自前カウント値・誤差率）を `data.json` として同梱。実測費用の合計が $5 以内であることを記録
- strategy 側は `npm run build` が exit code 0（デッドリンク検査込み）

**Gate** — `/drive` 承認前に green であるべきもの:

- 上記 acceptance criteria 全項目のチェック結果と誤差表の提示
- research デスクの `make test` / `make lint` green、strategy の `npm run build` green
- API 実測費用が事前承認枠 $5 以内（超過見込みが出た時点で開発者に再確認）。PR は作成まで — merge は開発者の明示承認

## Considerations

- Anthropic Claude はトークナイザ非公開のため、厳密な「自前カウント」は成立せず較正付き推定器になる。±5% が達成困難な場合、誤差幅を明記して開発者判断を仰ぐ (`.worktrees/research/docs/research-reports/foundation-models.md`)
- 既存ライブラリ（tiktoken 等）は「使わない」対象だが、**参照実装としての比較**は依存判断ログを書くために必要 — 排除ではなく対照群として扱う (`workaholic:design` / `policies/vendor-neutrality.md`)
- 出力トークンは実行前に確定できない構造的制約がある。「推定」の意味論（事前見積もり vs 事後集計）を記事冒頭で分けて定義する
- 較正パラメータ・サンプルセット・誤差表は後続チケット（plgg ライブラリ）の受け入れ基準が同一サンプルで再現を要求するため、再利用可能な形（`data.json` + 生成手順）で残す (#20260717104526-plgg-token-metering-library.md)
- 利用者別使用量レコードは個人情報に接続し得る。スキーマ方針ではデータ最小化・非 PII ユーザー ID・削除意味論を最初から織り込む (`workaholic:design` / `policies/data-sovereignty.md`)
- 記事の公開は対外的操作を含む（qmu-co.jp コピーライン）。公開パイプラインへの投入は PR merge 承認と一体で開発者ゲートを通す
