# packages/tech の検証記録

## 再現手順

1. `npm --prefix packages/tech ci --ignore-scripts` → 成功（284 packages）
2. `npm --prefix packages/tech test` → `tsc --noEmit` 成功。vitest 4.1.10: 968 passed / 16 failed / 2 skipped

## 失敗の内訳

失敗 16 件は全て `src/local-inference/`（run.test.ts 13、cli.test.ts 2、vendors/provenance.test.ts 1）で、原因は `Cannot determine target commit`。検証に使った写しが git リポジトリではなく、checkout の HEAD を読めないためです。コードの不具合とは判断していません。

## 限界

- git 管理下の CI または通常の checkout で再実行して確認が必要です（未確認）。
- packages/tech の vitest はこの branch で 4.1.10 のままで、qmu/research#293 の 4.1.12 は反映されていません。
