# packages/industry の依存更新の検証記録

対象: vitest 4.1.12、brace-expansion 5.0.12（packages/industry/package-lock.json）。

## 再現手順

1. `npm --prefix packages/industry ci --ignore-scripts` → 成功
2. `npm --prefix packages/industry test` → `tsc --noEmit` 成功、vitest v4.1.12 が起動し、テストファイルなしで exit 0

## 限界

- packages/industry にはテストファイルが無く（`--passWithNoTests`）、成功は型検査と起動確認に限られます。
- packages/tech、`make lockfiles`、a11y は未実行です。CI で確認します。
