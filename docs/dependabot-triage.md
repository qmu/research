# Dependabot PR の取り込み状況

main の package-lock.json の版を読んだ結果です（読み取りのみ。試験は未実行）。

| PR | 対象 | lockfile の版 | 状況 |
| --- | --- | --- | --- |
| #291 | packages/industry の brace-expansion 5.0.12 | 5.0.12 | 取り込み済み。閉じてよい |
| #292 | packages/tech の brace-expansion 5.0.12 | 5.0.12 | 取り込み済み。閉じてよい |
| #289 | packages/industry の vitest 4.1.12 | 4.1.12 | 取り込み済み。閉じてよい |
| #293 | packages/tech の vitest 4.1.12 | 4.1.12 | 取り込み済み。閉じてよい |
| #290 | docs の ip-address 10.7.5 | 10.4.0 | 未取り込み。#304 が同一変更 |
| #288 | docs の zod・pa11y-ci | 未確認 | 未取り込み。a11y の検証が必要 |
| #298 | packages/tech の 9 件更新 | 未確認 | 未取り込み。型検査と試験が必要 |

確認方法: 各 lockfile で `"node_modules/<name>"` の version を読む。
