# Dependabot brace-expansion 更新の取り込み前確認

対象は brace-expansion 5.0.7 から 5.0.12 への更新である。

| PR | 対象 |
| --- | --- |
| qmu/research#292 | packages/tech |
| qmu/research#291 | packages/industry |

## 確認手順

1. 各 PR の `package-lock.json` の差分が `brace-expansion` の version・resolved・integrity だけであることを `git diff main...<branch> -- package-lock.json` で確認する。
2. 宣言の npm（`engines`: node >=22 <23、npm >=10.9 <11）で `make install` を流し、`make lockfiles` が失敗しないことを確認する。
3. `make build`、`make test`、`make lint` を終了コードのまま流す（`| tail` や `|| true` を付けない）。

## 限界

- packages/industry にはテストファイルがなく（`--passWithNoTests`）、`make test` の成功は弱い根拠である。
- この文書の作成時点では上記手順を実行していない。結果は取り込み時に PR へ記録する。
