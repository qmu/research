# undici と wrangler の更新(qmu/research#305)を取り込む前の確認手順

対象: Dependabot PR qmu/research#305(`/docs`、undici 6.28.0→6.29.1、祖先依存の wrangler も同時更新)。

## 更新の要点(PR 本文のリリースノートによる)

undici 6.29.1 はセキュリティ修正を含みます。

- TLS 1.2 の再ネゴシエーションで証明書が変わると、プロセスが落ちる DoS(高)
- `Agent` のオプション複製で、関数値の TLS オプション(`checkServerIdentity` 等)が落ちる問題(高)
- 過大な `Content-Encoding` 値による DoS(高)

undici は wrangler 経由の間接依存で、`docs` は staging 配備(`make deploy-docs`)で wrangler を使います。

## 取り込み前に流す確認

1. `npm --prefix docs ci --ignore-scripts` が成功すること(lockfile と package.json の整合)
2. `npm --prefix docs run build` が成功すること(VitePress のビルド)
3. `npm --prefix docs run deploy:dry` が成功すること(Cloudflare に接続せず `dist` を梱包できる)
4. `make lockfiles` で manifest が書き換わらないこと(npm 10.9 系で実行)

## この文書の限界

上の確認は未実行です。この文書は手順の記録のみで、コードと lockfile は変えていません。
