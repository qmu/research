# 計測関連 PR の再現手順一覧

開いている TTFT・ピーク RSS 系の PR について、各 PR 本文に記載された確認コマンドを一覧にします。出典は各 PR 本文です。ここに書いたコマンドをこのページ作成時に再実行してはいません。

## 共通の前提

- Node 22 / npm 10.9（`engines` の宣言どおり）。
- 各 PR のブランチを checkout し、`make install` の後に流す。
- 依存関係にある PR は、前提の PR を先に統合してから確認する（順序は `docs/pr-merge-order.md` を参照）。

## 一覧

| PR | 対象 | 確認コマンド（PR 本文より） |
| --- | --- | --- |
| qmu/research#277 | HTTP runner のプロセス RSS 標本最大値 | `make test build lint gate ledger publish-guard drift lockfiles` |
| qmu/research#278 | 子孫プロセスを含む RSS ピークと取得理由 | `make test build lint gate ledger publish-guard lockfiles drift a11y` |
| qmu/research#279 | TTFT の値と取得理由を runId へ保存 | `make test build lint gate ledger publish-guard lockfiles drift` |
| qmu/research#280 | 保存済み TTFT の採否ページ採用 | `make build lint gate ledger publish-guard lockfiles drift a11y`、`npm test`（packages/tech） |
| qmu/research#281 | TTFT 取得失敗の固定理由 | `make test build lint gate ledger publish-guard drift lockfiles`、`PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium make a11y` |
| qmu/research#283 | RSS 欠測理由からの再計測要求 | `make peak-rss-remeasurement ARGS='expected.json snapshot.json'` |
| qmu/research#284 | TTFT 取得可否を採否行へ接続 | `make test build lint gate ledger publish-guard drift lockfiles a11y` |
| qmu/research#285 | 比較実行マニフェストの原子的保存 | `make test build lint gate ledger publish-guard drift lockfiles a11y` |
| qmu/research#286 | 保存 TTFT を採否計算へ接続 | `make test build lint gate ledger publish-guard drift lockfiles a11y` |

## 注意

- これらは合成 fixture による検証であり、Apple Silicon 実機の性能を主張しません。
- `packages/industry` はテストファイルが 0 件（`--passWithNoTests`）のため、その成功は弱い証拠です。
- 環境に native ビルド用ツールがない場合、PR 本文は `npm_config_ignore_scripts=true` で導入しています。標準の導入は GitHub CI で確認されます。
