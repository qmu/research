# brace-expansion 5.0.12 は lockfile で既に満たされている

qmu/research#291（packages/industry）と qmu/research#292（packages/tech）は brace-expansion を 5.0.7 から 5.0.12 に上げる Dependabot PR である。この PR の枝（既定ブランチ由来）の lockfile は、どちらも既に 5.0.12 である。

## 確認コマンド

```sh
grep -n -A1 '"node_modules/brace-expansion"' packages/industry/package-lock.json packages/tech/package-lock.json
```

## 結果（2026-11-04 時点）

| lockfile | 行 | version |
| --- | --- | --- |
| packages/industry/package-lock.json | 1362 | 5.0.12 |
| packages/tech/package-lock.json | 3057 | 5.0.12 |

`npm view brace-expansion@5.0.12 dist.integrity` の値は、両 lockfile の `integrity`（`sha512-YovQ3rzh…EimQ==`）と一致する。

## 含意

- #291・#292 が lockfile に与える差分は、この枝では無いはずである。Dependabot の枝を rebase して差分が空になるか、あるいは閉じてよいかを、各 PR で確認すること。
- docs/package-lock.json の brace-expansion は 1.1.18（別系統）であり、この件の対象外である。
- 未実行: `make lockfiles` と CI。この記録は grep と `npm view` の結果のみに基づく。
