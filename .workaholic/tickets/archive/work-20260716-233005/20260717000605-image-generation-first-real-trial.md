---
created_at: 2026-07-17T00:06:05+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category: Added
depends_on:
mission: image-generation-benchmark
---

# image-generation の初回 real トライアルを承認済みコスト上限内で実施し、日付付き履歴フレームとしてコミットする

## Overview

ミッション image-generation-benchmark（3/5）の未達先頭項目「First real trial
run within the approved cost ceiling, committed as a dated history frame with
the design-validation review (step 3 of the guideline)」を満たす。トピックは
`npm run research -- image-generation` で fixture/estimate/real の3モードが
動く状態まで構築済み（見積り ~$0.95/トライアル、承認上限 $20）。残っているのは
オーナー起動の real 実行と、その結果の履歴フレーム化・設計検証レビューである。

手順:

1. `docs/research-development-guideline.md` の step 3（design-validation
   review）の要件を再読する。
2. real 実行前に registry のモデル ID・価格を現時点の各社公開情報と照合する
   （concern: model-ids-require-periodic-live-verification）。ずれがあれば
   registry を先に修正する。
3. オーナーの実行承認（API キーと課金の同意）を得たうえで
   `npm run research -- image-generation` の real モードを1トライアル実行する。
4. 結果を日付付き履歴フレームとしてコミットし、design-validation review
   （測定は設計どおり機能したか、rubric は機械検証可能だったか）を添える。
5. EN/JP ページが real 結果で再生成され、ガード（title==sidebar、no-mermaid、
   §4 予算、7節アウトライン）が緑のままであることを確認する。

## Policies

- **proposal-first / owner-gated real run** — 課金を伴う実行はオーナーの明示
  承認後にのみ行う。承認前にコストを発生させない。
- **keyless fixture 不可侵** — CI が依存する fixture 経路はバイト安定・キー
  レスのまま保つ。real 結果は `.real` パターンの再生成可能アーティファクト。
- **workaholic:mission** — 完了時に mission.md の該当 Acceptance をチェックし
  Changelog に行を追記する。

## Quality Gate

- 承認上限（$20）内で real トライアルが1回完了し、日付付き履歴フレームとして
  コミットされている。
- design-validation review が履歴フレームに付随している。
- 全既存テスト・published-page ガードが緑。fixture 経路のバイト安定性が保たれる。
- mission.md の Acceptance 4項目目がチェックされ、Changelog に記録がある。

## Considerations

- 実行には各プロバイダ（openai / google / xai）の API キーが必要。キーの所在
  と課金主体をオーナーに確認してから着手する。
- モデル ID は失効しやすい（登録済み concern）。real 実行が 4xx で落ちる場合は
  まず registry の現行性を疑う。
- 残る最終項目「qmu-co-jp への publish ticket flow 反映」は次チケット（/ship
  時）に送る — 本チケットには含めない。
