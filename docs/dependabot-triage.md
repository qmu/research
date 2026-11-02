# Dependabot PR の取り込み状況（main の lockfile 基準）

2026-11-02 に main の lockfile を読んだ結果です。確認コマンドは `grep -n -A1 '"node_modules/<name>"' <lockfile>` です。

| PR | 対象 | main の版 | 判定 |
| --- | --- | --- | --- |
| qmu/research#291 | packages/industry の brace-expansion 5.0.12 | 5.0.12 | 取り込み済み。閉じてよい |
| qmu/research#292 | packages/tech の brace-expansion 5.0.12 | 5.0.12 | 取り込み済み。閉じてよい |
| qmu/research#289 | packages/industry の vitest 4.1.12 | 4.1.12 | 取り込み済み。閉じてよい |
| qmu/research#293 | packages/tech の vitest 4.1.12 | 4.1.10 | 未取り込み。更新が必要 |
| qmu/research#290 | docs の ip-address 10.7.5 | 10.4.0 | 未取り込み（qmu/research#304 が同じ変更） |
| qmu/research#288 | docs の zod 4 と pa11y-ci | zod 3.25.76 | 未取り込み。major 更新のため別途検証 |

再現手順: `npm --prefix packages/tech ci` のあと `make test` を流し、`vitest` の版が lockfile と一致することを確かめます。

未実行: 本文書は lockfile の読み取りのみで、ビルドとテストは流していません。
