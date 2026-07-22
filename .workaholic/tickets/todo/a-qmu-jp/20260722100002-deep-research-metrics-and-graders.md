---
title: "Metrics + graders: rubric quality, citation validity, diversity, latency, cost"
created_at: 2026-07-22T10:00:02+09:00
author: a@qmu.jp
status: todo
type: enhancement
layer: [Domain]
effort: 4h
commit_hash:
category: Added
mission: periodic-research-target-compare-deep-research-alike-apis
depends_on: [20260722100001-deep-research-subject-vendors.md]
---

# Metrics + graders for the deep-research topic

## Overview

With the five subjects reachable behind `vendors/`, this ticket implements the
metric + grader pipeline the proposal specifies, so every trial scores each
(subject, question) on the full indicator set and records it in full in the
`.data.json` artifact. Rubric and citation-validity metrics are graded by an LLM
judge against a fixed per-question reference rubric (the pattern the
`accuracy`/`ocr` topics already use), so grading is reproducible.

Metrics (from the approved proposal):

| Metric | Unit | Better | How measured |
|--------|------|--------|--------------|
| Answer quality vs. rubric | 0–100 | higher | LLM judge grades the report against a per-question reference rubric |
| Citation count | count | context | citations returned with the report |
| Citation validity | % | higher | fetch + LLM-judge check of a sampled subset |
| Source diversity | distinct domains | higher | unique registrable domains among citations |
| Latency | seconds | lower | request start → final report |
| Cost per query | USD | lower | summed from the provider's billed token/tool usage |

Primary decision metric is **answer quality vs. rubric**, read against **cost per
query** and **latency**. Citation validity guards against fluent-but-fabricated
reports.

## Key Files

- `packages/tech/src/deep-research/domain/` — pure metric computation (diversity,
  latency, cost aggregation) with unit tests; no vendor types.
- `packages/tech/src/deep-research/domain/grade.ts` (or equivalent) — the LLM-judge
  rubric grader + citation-validity checker port; keyless fixture judge for CI.
- `packages/tech/src/deep-research/models.ts` — the per-question reference rubrics.
- The `.data.json` artifact serializer — must record every metric for every
  (subject, question, repetition) so a report renders at any detail level.

## Policies

- **proposal-first ゲートは充足済み** — 2026-07-22 Floor tier 承認。本チケットは
  有償実行を含まない（judge/citation-check は fixture 経路で単体テスト）。有償の
  実データ試行は first-validation-trial チケット、`--estimate` ≤ ≈$32 確認後。
- **artifact = 完全記録** — `.data.json` は全 subject × 全 question × 全 rep の
  全メトリクスを保持し、任意の詳細度でレポートが再生成できること（[[llm-comparison-artifact-full-record]]）。
- **workaholic:implementation** — メトリクス計算は純粋関数として `domain/` に置き、
  LLM judge のベンダー呼び出しは port 越しにする。捏造ゼロ：到達不能・採点不能は
  正直な欠測として記録する。
- **keyless fixture 不可侵** — judge/citation-check の fixture 経路はキーレスで
  バイト安定。CI が緑のまま。

## Implementation Steps

1. Implement the pure metrics in `domain/` (source diversity via registrable
   domain, latency, cost aggregation from billed usage) with unit tests.
2. Implement the LLM-judge rubric grader and the citation-validity checker behind
   a port, with a keyless fixture judge for CI.
3. Attach the per-question reference rubrics to the subject/question registry.
4. Extend the `.data.json` serializer to record every metric for every
   (subject, question, repetition) with no lossy aggregation.
5. Unit-test the scorers on fixture data; keep the fixture path byte-stable.

## Quality Gate

- `cd packages/tech && npm test` の bare exit code が 0（`make` 非経由・非マスク）。
  lint 緑。
- 6 メトリクスすべてが計算され、`.data.json` に (subject, question, rep) 粒度で
  完全記録される（任意の詳細度で再レンダー可能）。
- rubric grader と citation-validity checker が port 越しで、keyless fixture judge
  により CI がキーレスで緑。
- 純粋メトリクスに単体テストがあり、ベンダー型が `domain/` に漏れていない。

## Considerations

Keep the judge behind a port so CI never needs a key. The artifact is the full
record — no lossy aggregation. Missing/unscoreable cells are honest gaps, not
zeros.
