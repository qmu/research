# brace-expansion 5.0.12 の取り込み状況

確認: `grep -A4 '"node_modules/brace-expansion"' packages/{tech,industry}/package-lock.json`

- packages/tech: version 5.0.12
- packages/industry: version 5.0.12
- integrity `sha512-YovQ3rzh…EimQ==` は `npm view brace-expansion@5.0.12 dist.integrity` と一致

結論: qmu/research#291 と qmu/research#292 の変更は既に lockfile にあり、重複です。閉じてよい状態です。

未実行: `npm ci` と `make test`。
