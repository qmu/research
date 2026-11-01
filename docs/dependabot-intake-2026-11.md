# Dependabot 取り込み確認（2026-11）

対象は qmu/research#290（docs の ip-address）、qmu/research#291（packages/industry の brace-expansion）、qmu/research#292（packages/tech の brace-expansion）です。

## 再現手順

環境は Node 22.23.4 / npm 10.9.9 です（`engines` の宣言範囲内）。

```sh
npm --prefix packages/industry update brace-expansion --package-lock-only --ignore-scripts
npm --prefix packages/tech update brace-expansion --package-lock-only --ignore-scripts
npm --prefix docs update ip-address --package-lock-only --ignore-scripts
git diff --stat
```

`npm install <pkg>@<version>` は package.json に依存を追加するため使いません。`update` を使うと lockfile だけが変わります。

## 結果

| 対象 | 変更 | 差分 |
| --- | --- | --- |
| docs/package-lock.json | ip-address 10.4.0 → 10.7.5 | 6 行 |
| packages/tech/package-lock.json | brace-expansion 5.0.7 → 5.0.12 | 8 行 |
| packages/industry/package-lock.json | brace-expansion 5.0.7 → 5.0.12 | 8 行 |

- package.json の差分はありません。
- brace-expansion 5.0.12 は `engines.node` が `18 || 20 || >=22` から `20 || >=22` に変わります。リポジトリの宣言は `>=22 <23` で範囲内です。

## 未確認

`make build`・`make test`・`make lint`・`make lockfiles` はこの確認では流していません。取り込み前に CI の結果で確認します。
