# docs の zod 4 / pa11y-ci 更新（#288）の基準結果

対象: qmu/research#288（`docs/` の zod 3.25.76 → 4.6.7、祖先 pa11y-ci の同時更新）。

## 適用前の基準（main の lockfile）

| コマンド | 結果 |
| --- | --- |
| `npm --prefix docs ci --ignore-scripts` | 成功 |
| `npm --prefix docs ls zod` | zod 3.25.76 は pa11y-ci@4.1.1 → puppeteer@24.43.1 → chromium-bidi@14.0.0 の推移依存のみ |
| `npm --prefix docs run build` | 成功（VitePress、7.66 秒） |

`docs/package.json` は zod を直接依存に持たないため、major 更新の影響は pa11y-ci 経由の推移依存に限られる。

## 更新適用後に流す手順（未実行）

1. #288 のブランチで `npm --prefix docs ci`
2. `npm --prefix docs run build`
3. `make a11y`（6 URL がエラー 0 であること）
4. `make lockfiles`（manifest の書き換えが無いこと）
