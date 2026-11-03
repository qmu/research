# 取り込み済み Dependabot PR の閉じ方

対象は docs/dependabot-triage.md で「取り込み済み。閉じてよい」とした PR（#289・#291・#292・#293）です。

## 手順

1. main の最新を取得する: `git fetch origin main`
2. 対象 lockfile の版が PR の目標版以上であることを読む。
   - `grep -A1 '"node_modules/brace-expansion"' packages/tech/package-lock.json`（目標 5.0.12）
   - `grep -A1 '"node_modules/vitest"' packages/tech/package-lock.json`（目標 4.1.12）
   - packages/industry も同じ形で読む。
3. 目標版に達していれば、PR に根拠を一行コメントして閉じる: `gh pr close <番号> -R qmu/research -c "main の lockfile が <版> のため取り込み済み"`
4. 目標版に達していなければ閉じず、triage の表を「未取り込み」に直す。
5. 閉じた後、表の状況欄に閉じた日付を追記する。

## 注意

- 閉じる前に `make lockfiles` が main で成功していることを確かめる。
- #290 は #304 が同一変更のため、#304 のマージ後に同じ手順で閉じる。
