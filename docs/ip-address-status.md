# docs の ip-address 更新の取り込み状況

確認日: 2026-11-03

## 事実

- `docs/package-lock.json` の `node_modules/ip-address` は **10.4.0** です（optional の推移依存）。10.7.5 はまだ取り込まれていません。
- 10.4.0 → 10.7.5 の更新は、次の二つの未マージ PR が同一の変更として扱っています。
  - qmu/research#290（Dependabot）
  - qmu/research#304（lockfile の 1 エントリのみ。`npm --prefix docs ci --ignore-scripts` と `npm --prefix docs run build` が成功と記録）

## 整理の方針

- どちらか一方だけを取り込みます。取り込んだ後、もう一方は不要になるため閉じてかまいません。
- 取り込み前の確認は `docs/dependency-update-runbook.md` の手順に従います。

## 再現手順

1. `grep -n -A3 '"node_modules/ip-address"' docs/package-lock.json` で版を読む。
2. `npm --prefix docs ci --ignore-scripts` → `npm --prefix docs run build` を流す。

未実行: `make lockfiles` と `make a11y`（CI で確認してください）。
