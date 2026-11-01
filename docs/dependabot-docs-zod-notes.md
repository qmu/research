# Dependabot の docs zod・pa11y-ci 更新を取り込む前の確認点

対象: qmu/research#288（`/docs`、zod 3.25.76 → 4.6.7、祖先依存 pa11y-ci の更新を伴う）。

## 性質

- zod は major 更新（3 → 4）です。docs 配下の依存は a11y 検査（pa11y-ci）の推移依存として入っており、docs 自身のコードが zod を直接 import しているかは取り込み前に `grep -rn "from 'zod'" docs --include=*.ts --exclude-dir=node_modules` で確認します。
- 直接 import が無ければ、影響は pa11y-ci の動作（`make a11y`）に限られます。

## 取り込み前に流す確認

1. `npm --prefix docs ci --ignore-scripts` が成功すること（lockfile と package.json の整合）。
2. `npm --prefix docs run build`（VitePress）が成功すること。
3. `make a11y` が既存 6 URL ですべて成功すること。pa11y-ci の更新が検査結果を変えていないかの確認です。
4. `make lockfiles` が 3 プロジェクトとも書き換えなしで終わること。

## 注意点

- 未実行の項目は、実行したと書かず「未実行」と記録します。
- qmu/research#290（ip-address）も docs の lockfile を触るため、両方を取り込む場合は後から取り込む側で lockfile の競合を再生成で解消します。
