# docs の zod major 更新(qmu/research#288)の影響範囲

## 事実（docs/package-lock.json の読み取り）

- `node_modules/zod` は 3.25.76、`optional: true`。
- `docs/package.json` に zod の直接指定はない。
- 参照元は `node_modules/chromium-bidi`（14.0.0）の `zod ^3.24.1` のみ。chromium-bidi は pa11y-ci 系の puppeteer 経由の optional 依存である。

## 影響

- #288 は zod を 4.6.7（major）へ上げ、祖先の pa11y-ci も同時に更新する。`^3.24.1` は zod 4 を満たさないため、chromium-bidi も新しい版へ解決される前提になる。lockfile の解決結果は #288 の差分で確認する。
- zod を使うのは a11y 検査の実行経路（`make a11y`）だけで、VitePress のビルド成果物には含まれない。

## 取り込み前に流す手順

```
npm --prefix docs ci --ignore-scripts
make build
make a11y
make lockfiles
```

`make a11y` はビルド済みサイトを検査するため `make build` が先に必要である。ブラウザが起動できない環境では `PUPPETEER_EXECUTABLE_PATH` にシステムの Chromium を指定する。

## 未確認

上記の手順は本ページ作成時には実行していない。
