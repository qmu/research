---
created_at: 2026-07-17T00:06:06+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category: Changed
depends_on:
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# per-topic-pipeline ミッションの Acceptance 7項目を実装済みの現実と突合し、進捗記録を現行化する

## Overview

ミッション per-topic-research-pipeline-benchmark-llm-insights-jp-translation
は 0/7 と表示されるが、Acceptance が参照する7チケット（20260709022000〜022006）
は**全て** `work-20260622-191220` として archive 済みで main に merge されて
いる。対応する実装も main に存在する（`entrypoints/run-research.ts` の統一 CLI、
`research/domain/insights.ts`、`translate-research-report.ts`、
`run-split-topic.ts`、`run-reference-topic.ts` ほか）。つまり「未着手」ではなく
「実装済みだが mission.md のチェックリストが更新されていない」状態である。

本チケットは再起動の第一歩として、7項目それぞれを現行 main のコードと成果物に
対して**証拠つきで検証**し、記録を現実に合わせる:

1. 各 Acceptance 項目について、満たしている実装・テスト・公開ページを特定し、
   実際に動かして確認する（fixture 経路: `npm run research -- <topic>` が
   キーレスで通るか、EN/JP ページが site に載っているか等）。
2. 満たしている項目は mission.md のチェックボックスを埋め、Changelog に
   検証日と証拠（チケット番号・ファイルパス）を書く。
3. 部分的にしか満たしていない項目（例: insights/JP の real 実行が未走行の
   トピックが残る、meta IA スタブの残骸がある等）は、その残差を新しい
   後続チケットとして todo に起こす。
4. 全項目が満たされているなら、ミッションを close（achieved）候補として
   開発者に提案する — close 自体は開発者の承認後。

## Policies

- **workaholic:mission** — チェックボックスの更新は検証済み事実にのみ基づく。
  基準文の書き換え（replan）が必要になった場合は Changelog に replan として
  残し、事前に開発者の確認を取る。
- **証拠主義** — 「archive にあるから done」ではなく、現行 main で動くこと・
  公開されていることを確認してからチェックする。fold 後の main で退行して
  いる可能性を排除しない。

## Quality Gate

- 7項目全てに verdict（達成 / 部分達成＋残差チケット / 未達）と証拠が付き、
  mission.md のチェックリストと Changelog が現実を反映している。
- `bash .claude/…/mission list` 系の進捗表示が突合後の checked/total を示す。
- 残差があれば、それぞれ着手可能な粒度の todo チケットとして存在する。

## Considerations

- 本ミッションの成果（統一 CLI・insights・JP 翻訳）は periodic 6本のトピック
  群の土台になっている。検証時は periodic トピックを壊さないこと（読むだけで
  よい — 修正は残差チケット側で行う）。
- ミッション Changelog の最終行は 2026-07-10 で止まっており、7/13 の大規模
  merge 以降の実態が反映されていない。突合時に中間経緯も1行で補うと後から
  追跡しやすい。
