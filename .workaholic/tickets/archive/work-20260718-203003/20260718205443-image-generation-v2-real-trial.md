---
created_at: 2026-07-18T20:54:43+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort: 2h
commit_hash: 88154cf
category: Added
depends_on:
mission: image-generation-benchmark
---

# image-generation マニフェスト v2 の初回 real トライアルを承認済みコスト上限内で実施し、生成画像付き履歴フレームとしてコミットする

## Overview

マニフェスト v2（practical カテゴリ: presentation-slide / photo / character /
infographic / meeting-document ＋ v1 を `mechanical` として保持）と画像永続化・
インライン表示・qmu-co-jp への画像アセット搬送のプラミングは keyless で構築済み
（コミット cd2094a、全ガード緑、fixture バイト安定、`make drift` 安定）。残るは
オーナー起動の real 実行のみ。今日時点の `--estimate` は生成 ~$1.47（3 モデル ×
13 プロンプト × 1）で、insights + 全文翻訳の LLM コストを加えても承認上限 $20 の
十分内。practical カテゴリの画像のみが日付付きフレームの `images/` に永続化され
（`imagePath` + `imageSha256` + `imageByteLength` を data artifact に記録）、EN/JP
ページがそれを inline 表示する。

手順:

1. real 実行前に registry のモデル ID・価格を各社公開情報と照合する
   （concern: model-ids-require-periodic-live-verification）。ずれがあれば
   registry を先に修正する。
2. `( cd packages/tech && npm run research -- image-generation --estimate )` を
   再実行し、生成 + insights + 翻訳の合計が $20 を下回ることを確認する。
3. オーナーの実行承認（API キーと課金の同意）を得たうえで
   `npm run research -- image-generation --real` を1トライアル実行する。生成
   された practical 画像は `image-generation-comparison.real.images/` に書かれる。
4. `npm run research:archive -- image-generation --generated-at <iso>` で日付付き
   履歴フレームを作る。フレームに `images/` が同梱され、data artifact の各
   practical call に `imagePath`/`imageSha256`/`imageByteLength` が入っている
   ことを確認する。design-validation review を添える。
5. 現在ページが測定フレームから再合成され、EN/JP ページに画像が inline 表示
   され、`published-images` ガードが全参照を解決し、既存ガード（title==sidebar、
   no-mermaid、§4 予算、7節アウトライン）が緑のままであることを確認する。
6. コミット済みフレーム画像の合計サイズが method セクションに記した per-image
   予算内に収まっているか確認する（超える場合は provider の最小サイズ要求 /
   再エンコードを検討）。

## Policies

- **proposal-first / owner-gated real run** — 課金を伴う real 実行はオーナーの
  明示承認後にのみ行う。承認前にコストを発生させない（本チケットが唯一の
  課金ゲート）。
- **keyless fixture 不可侵** — CI が依存する fixture 経路はバイトずれ・キーレス
  のまま保つ。real 結果と real 画像は `.real` パターンの再生成可能アーティ
  ファクトで、フレーム化で初めてコミットされる。
- **workaholic:implementation（objective-documentation）** — レポートは機械
  検証済みの事実のみを述べ、画像は意見スコアではなく証拠として提示する。
- **workaholic:mission** — 完了時に mission.md の v2 Acceptance 2項目をチェック
  し Changelog に行を追記する。

## Quality Gate

- 承認上限（$20）内で v2 real トライアルが1回完了し、practical 画像を同梱した
  日付付き履歴フレームとしてコミットされている。
- data artifact の各 practical call に `imagePath` / `imageSha256` /
  `imageByteLength` が記録され、`imagePath` が指すファイルがフレームの `images/`
  に存在する。
- EN/JP の現在ページが測定フレームから再合成され、画像が inline 表示され、
  `published-images.test.ts` の存在ガードが全参照を解決する。
- design-validation review が履歴フレームに付随している。
- 全既存テスト・published-page ガードが緑。fixture 経路のバイト安定性が保たれる。
- mission.md の v2 Acceptance 2項目がチェックされ、Changelog に記録がある。

## Considerations

- 実行には各プロバイダ（openai / google / xai）の API キーが必要。キーの所在と
  課金主体をオーナーに確認してから着手する（キーは packages/tech/.env に存在
  するが、課金同意は別途必要）。
- モデル ID は失効しやすい（登録済み concern）。real 実行が 4xx で落ちる場合は
  まず registry の現行性を疑う。
- 画像は practical カテゴリのみ永続化される（`shouldPersistImage`）。mechanical
  プローブは判定後に破棄され、フレーム肥大を抑える。
- qmu-co-jp への画像アセット反映は publish ticket flow（/ship）で行う。本チケット
  はこのリポジトリ側の real フレーム化までを範囲とする。

## Final Report

Implemented (commit `88154cf`). Manifest v2 の初回 real トライアルを承認済み上限
内で実施し、生成画像付きの日付付き履歴フレームとしてコミットした。

- **見積り**: `--estimate` = 生成 ~$1.47（3 モデル × 13 プロンプト）＋ insights
  ~$0.02 ＋ 全文 JP 翻訳（上限）→ all-in ~$3.5、承認上限 $20 の十分内。
- **実行**: `npm run research -- image-generation --real`（generatedAt
  `2026-07-18T15:04:12.341Z`、judge `claude-sonnet-5`、1 repetition、manifest v2
  13 プロンプト）。**2/3 measured, 1 error（正直な error 行、捏造なし）**:
  - GPT Image 1.5 — measured、adherence 95.5% ± 10.1%、text 100%、latency
    18085 ± 6170 ms、practical 画像 5 枚永続化。
  - Gemini 2.5 Flash Image — **error**（`returned no image`）。v1 では measured
    だったため provider 応答のリグレッション。owner ゲートのコスト方針に従い
    real 再実行はせず error 行として記録（フォローアップで Google ACL の空応答
    ハードニング＋ id 再検証）。
  - Grok Imagine — measured、adherence 100%、text 100%、latency 5346 ± 876 ms、
    practical 画像 5 枚永続化。
- **フレーム化**: 実 English を canonical に昇格（artifact 参照を `.data.json`
  へ書換）→ `research:translate-report` で v2 の実レポートを JP 翻訳 → 
  `research:archive -- image-generation --generated-at 2026-07-18T15:04:12.341Z`
  で `history/image-generation/2026-07-18T15-04-12-341Z/` を生成（`.md`/`.ja.md`
  /`.data.json` は bare な v2、`images/` に 10 枚、design-validation-review.md
  添付）。各 practical call に `imagePath`/`imageSha256`/`imageByteLength` を記録。
- **再合成**: `research -- image-generation --fixture` で canonical EN/JP を測定
  フレームから再合成（推移/過去の調査ブロック付与、frame images を
  `docs/research-reports/images/` へミラー、fixture レンダは `.fixture.*` へ退避）。
  4 ページ計 40 の画像参照が全て disk 上で解決。
- **検証（bare exit codes）**: `packages/tech` → `npm test` 84 files / 591 pass
  / 1 skip（`published-images` 存在ガード含む・緑）、`npm run build` 0、
  `npm run lint` 0。
- **実コスト**: ≈$1.1–1.3（生成 GPT 13×$0.034 + Grok 13×$0.020 = $0.70、judge
  26 reads ≈$0.17、insights ≈$0.02、全文 JP 翻訳 2 回 ≈$0.2–0.4。Gemini は画像
  未返却のため配信課金なし）。承認上限 $20 の十分内。
- **予算メモ**: GPT の photo(1.40MB)/infographic(1.47MB) 2 枚が per-image
  budget 512 KiB 超過。「証拠を落とさない」方針に従い返却バイトのまま永続化
  （sha256 が証拠）。フレーム `images/` 合計 ~4.6MB。恒久的問題化するなら小さい
  size tier か可逆再エンコードをフォローアップで。
