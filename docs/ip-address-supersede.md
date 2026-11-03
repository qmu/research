# ip-address 更新: qmu/research#304 が qmu/research#290 を置き換える根拠

- qmu/research#290(Dependabot): `/docs` の ip-address 10.4.0→10.7.5
- qmu/research#304: 同じ更新を lockfile の 1 エントリだけで取り込む(optional の推移依存)

## 確認コマンド

1. `npm view ip-address@10.7.5 version dist.integrity` を実行し、`docs/package-lock.json` の version・resolved・integrity と一致するか見る
2. `npm --prefix docs ci --ignore-scripts`
3. `npm --prefix docs run build`

#304 の本文は 2・3 が成功したと記しています。この文書では未実行です。#304 をマージしたあと #290 は閉じて構いません。
