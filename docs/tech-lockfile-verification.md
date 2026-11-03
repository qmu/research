# packages/tech の検証記録

## 再現手順

git で管理した写し（`git init && git add -A && git commit`）で次を流しました。

1. `npm --prefix packages/tech ci --ignore-scripts` → 成功（284 packages added）
2. `npm --prefix packages/tech test` → `tsc --noEmit` 成功。vitest 4.1.10: 984 passed / 2 skipped / 失敗 0（127 files passed, 1 skipped）

## 前回記録からの訂正

前回の記録（968 passed / 16 failed）の失敗 16 件は全て `src/local-inference/` の `Cannot determine target commit` で、検証に使った写しが git リポジトリではなかったことが原因でした。git 管理下で流すと失敗は 0 件です。コードの不具合ではありません。

## 限界

- 追記: この branch の写しで `npm --prefix packages/tech test` を再実行したところ、vitest は v4.1.12 で動き、`tsc --noEmit` 成功、127 files passed / 1 skipped、984 passed / 2 skipped、失敗 0 でした（git 管理下の写し）。上の 4.1.10 の記録は古く、qmu/research#293 相当の 4.1.12 でも結果は同じです。
- `--ignore-scripts` で導入しています。標準の導入は GitHub CI で確認が必要です。
- `npm ci` 後の audit は 16 件（moderate 13、high 3）を報告しました。この更新の対象外で、内容は未調査です。
