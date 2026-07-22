---
title: "Wire the HistoryPoint series so the 推移 (trend) block accumulates across surveys"
created_at: 2026-07-22T10:00:05+09:00
author: a@qmu.jp
status: todo
type: enhancement
layer: [Domain]
effort: 2h
commit_hash:
category: Added
mission: periodic-research-target-compare-deep-research-alike-apis
depends_on: [20260722100004-deep-research-publish-topic.md]
---

# Wire the HistoryPoint trend series for deep-research

## Overview

The topic is published, but the 推移 (trend) block is a plain note until two
same-instrument surveys exist. This ticket wires the `HistoryPoint` series so each
survey appends one point per subject to the accumulating time series, and the
current article's §4 推移 block renders the trajectory once enough surveys exist
(the `HistoryPoint` / `renderTimeSeriesChart` machinery the guideline describes).

Series (from the approved proposal):

- **Primary:** answer-quality rubric score, per subject, one point per survey.
- **Secondary:** cost per query (USD) and latency (seconds), per subject.

After three or more surveys the block shows each subject's quality trajectory
against its cost and latency across the tendency window — i.e. whether a turnkey
endpoint is getting better/cheaper faster than the Anthropic DIY baseline. Until
two same-instrument surveys exist the block stays a plain note, per the guideline.

## Key Files

- `packages/tech/src/deep-research/domain/` — the `HistoryPoint` accumulation /
  series extraction (pure, unit-tested).
- The current-article generator — §4 推移 block wiring to `renderTimeSeriesChart`.
- The committed accumulating history DB the archive step appends to.

## Policies

- **workaholic:implementation** — 推移シリーズの累積・抽出は純粋関数として
  `domain/` に置き、単体テストする。
- **accumulating committed history** — 各 survey が subject ごとに 1 点を追記する
  累積 series はリポジトリにコミットされ、再生成可能であること
  （[[availability-llm-extraction-trends]] と同じ蓄積思想）。
- **guideline の推移ゲート** — 同一計器の survey が 2 本揃うまで推移ブロックは
  プレーンな注記のまま。3 本以上で軌跡を描画する。
- **objective docs** — 傾向記述は事実ベース。欠測 subject の点は捏造しない。

## Implementation Steps

1. Define the `HistoryPoint` shape (rubric score, cost/query, latency, per subject,
   per survey) and the accumulation into the committed history series.
2. Append one point per subject per survey from the archived trial artifacts.
3. Wire the current-article §4 推移 block to `renderTimeSeriesChart` over the
   series, gated on ≥2 same-instrument surveys (plain note below that).
4. Unit-test the series extraction on fixture frames; keep it deterministic.

## Quality Gate

- `cd packages/tech && npm test` の bare exit code が 0（`make` 非経由・非マスク）。
  lint 緑。
- `HistoryPoint` 累積が subject ごとに rubric/cost/latency を保持し、各 survey で
  1 点ずつ追記される（コミット済み・再生成可能）。
- 推移ブロックが ≥2 survey で軌跡を描画し、それ未満ではプレーン注記に留まる
  （guideline のゲートに一致）。
- series 抽出に決定的な単体テストがあり、欠測 subject の点を捏造しない。

## Considerations

The trend block is gated on ≥2 same-instrument surveys; keep the accumulation
deterministic and committed so the article regenerates. Missing subjects are gaps,
not fabricated points.
