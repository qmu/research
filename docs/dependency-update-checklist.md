# Dependabot 更新を取り込むときの確認手順

このリポジトリは `packages/tech`、`packages/industry`、`docs` がそれぞれ独立した npm プロジェクトです(ワークスペースなし)。依存更新 PR を取り込む前に、次を順に確認します。

## 1. 宣言された npm で入れる

各 `package.json` の `engines` は `node >=22 <23`、`npm >=10.9 <11` です。lockfile の形式は npm の版で変わる(npm 11 は `libc` 配列を書き、npm 10 は削除する)ため、版が違うと依存の版が動かない差分が出ます。`node -v` と `npm -v` を先に確かめます。

## 2. 入れ直しても何も変わらないことを確かめる

```sh
make install
make lockfiles
```

`make lockfiles` は install を流し、マニフェストが書き換わっていれば名前を挙げて失敗します。失敗した場合は宣言された npm で入れ直します。差分をそのままコミットしません。

## 3. 変更を確かめる

```sh
make build
make test
make lint
```

終了コードは `| tail` や `|| true` を付けずに直接確かめます。`packages/industry` はテストファイルが 0 件(`--passWithNoTests`)のため、その成功は弱い証拠です。

## 4. docs の更新のとき

```sh
npm --prefix docs ci
npm --prefix docs run build
make a11y
```

## 5. 記録する

実行したコマンドと成否、実行できなかったものを PR 本文に書きます。
