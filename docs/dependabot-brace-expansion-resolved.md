# brace-expansion 更新が main に取り込み済みである確認

対象: qmu/research#291(packages/industry)、qmu/research#292(packages/tech)。どちらも brace-expansion 5.0.7→5.0.12。

## 確認

```sh
grep -n -A2 '"node_modules/brace-expansion"' packages/tech/package-lock.json packages/industry/package-lock.json docs/package-lock.json
```

| lockfile | version |
| --- | --- |
| packages/tech | 5.0.12 |
| packages/industry | 5.0.12 |
| docs | 1.1.18(別系統の推移依存。#291・#292 の対象外) |

## 結論

packages/tech と packages/industry は既に 5.0.12 のため、#291・#292 は追加の変更を持たない。閉じてよい。

## 限界

lockfile の読み取りのみ。`npm ci` とビルドはこの確認では流していない。
