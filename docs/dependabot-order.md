# Dependabot 滞留 PR の取り込み順序

1. #304 をマージする（docs の ip-address 10.7.5。#290 と同一変更）。
   - 確認: `npm --prefix docs ci --ignore-scripts` と `npm --prefix docs run build`
   - 後始末: #290 を閉じる。
2. #288（docs の zod と pa11y-ci）。zod 3→4 のメジャー更新のため `make a11y` を必ず流す。
   - 確認: `make build` と `make a11y`
3. #298（packages/tech の 9 件更新）。最大の差分のため最後にする。
   - 確認: `make test` と `make lint` と `make lockfiles`
4. 取り込み済みの #289・#291・#292・#293 は docs/dependabot-close-steps.md の手順で閉じる。

順序の理由: 小さい変更から先に入れ、失敗時の原因を切り分けやすくするためです。
