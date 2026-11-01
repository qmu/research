# Dependabot: packages/tech 9 件まとめ更新(qmu/research#298)の確認点

対象は `packages/tech` の minor/patch グループ更新です。内容は次のとおりです。

| パッケージ | 更新前 | 更新後 |
| --- | --- | --- |
| @aws-sdk/client-s3vectors | 3.1111.0 | 3.1156.0 |
| @google/genai | 2.17.1 | 2.31.0 |
| openai | 7.4.0 | 7.43.0 |
| playwright | 1.62.1 | 1.64.1 |
| @types/node | 26.2.0 | 26.6.5 |
| eslint | 10.8.1 | 10.13.0 |
| prettier | 3.9.6 | 3.9.10 |
| tsx | 4.23.12 | 4.23.15 |
| typescript-eslint | 8.67.0 | 8.72.0 |

## 取り込み前に流す手順

1. `engines` に合わせ、node 22 系・npm 10.9 系で `make install` を実行する。
2. `make lockfiles` で、manifest が書き換わらないことを確かめる。
3. `make build`、`make test`、`make lint` を、`| tail` や `|| true` を付けずに流す。
4. `make a11y` で VitePress のビルド結果を確かめる。

## 注意点

- `@google/genai` と `openai` は実 API を呼ぶ `vendors/` 層が使う。型の変更はビルドで検出されるが、実行時の挙動は `--real` 実行でしか確かめられない(未実施)。
- `eslint` と `typescript-eslint` は lint の規則集合が変わり得る。新規の警告は `make lint` で確認する。
- `playwright` は、ブラウザのバイナリ版が上がる場合がある。
- `packages/industry` はテストファイルが無いため、そちらの緑は弱い根拠である。
