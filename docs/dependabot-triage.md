# 重複する Dependabot PR の整理

main の lockfile を読んだ結果。

| PR | 対象 | main の現状 | 判断 |
| --- | --- | --- | --- |
| qmu/research#291 | industry の brace-expansion → 5.0.12 | 5.0.12 | 取り込み済み。閉じてよい |
| qmu/research#292 | tech の brace-expansion → 5.0.12 | 5.0.12 | 取り込み済み。閉じてよい |
| qmu/research#290 | docs の ip-address → 10.7.5 | 10.4.0 | 未取り込み。qmu/research#304 が同一変更 |

## 確認コマンド

```
grep -n -A1 '"node_modules/brace-expansion"' packages/tech/package-lock.json packages/industry/package-lock.json
grep -n -A1 '"node_modules/ip-address"' docs/package-lock.json
```
