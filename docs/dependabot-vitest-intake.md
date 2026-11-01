# Dependabot の vitest 更新の取り込み条件

対象: qmu/research#293(`packages/tech`)、qmu/research#289(`packages/industry`)。
どちらも `vitest` と `@vitest/mocker` を 4.1.10 から 4.1.12 に上げる。

## 取り込み前に流す確認

各パッケージの更新ブランチで、宣言された Node 22 / npm 10.9 を使って次を流す。

1. `make install`(内部で `npm ci` 相当)
2. `make test`
3. `make lint` と `make build`
4. `make lockfiles`(lockfile が書き換わらないこと)

`| tail` や `|| true` を付けず、終了コードをそのまま確認する。

## 証拠の強さ

- `packages/tech`: テストが多数あり、`make test` の成功は十分な証拠になる。
- `packages/industry`: テストファイルが 0 件で `--passWithNoTests` のため、`make test` の成功は型検査が通ったことしか示さない。
  この更新の可否は、tech 側の結果と同じバージョン組であることで補う。

## 判断

上記がすべて成功し、`make lockfiles` が差分なしであれば取り込める。
失敗した場合は更新ではなく、失敗した確認を直す作業を先に置く。
