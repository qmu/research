---
created_at: 2026-07-09T02:20:03+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort:
commit_hash:
category:
depends_on: [20260709022000-unified-per-topic-research-cli.md]
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# compare を「速度」と「精度」トピックに分割する

## Overview

現状 `llm-model-comparison` は、モデル×effort 行列に対して throughput / latency /
JSON スキーマ / 長さ精度 / 情報精度の probe を**一括で走らせ一つのレポート**を出す。
per-topic 構想では、これを **速度（speed）**と **精度（accuracy）**の 2 トピックに
分割し、各トピックが自分の probe だけを走らせ、自分の data artifact・insights・
日本語版を持つ。

- **速度**: sustained throughput・TTFT・応答レイテンシ。
- **精度**: 長さ指示追従・JSON スキーマ構造化精度・情報精度（事実正確性）。

計測ロジック自体は再利用する（re-measurement ではなく再編）。

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — probe・scorer・集計は
  `domain/` の純関数のまま。トピック分割は `TopicSpec` 登録と probe 選択で行う。
- `workaholic:implementation` / `policies/coding-standards.md` — 既存の probe 型・集計・
  履歴・チャートを壊さず、トピック単位に切り出す。
- `workaholic:operation` / `policies/ci-cd.md` — 速度・精度それぞれの keyless fixture が
  byte-stable。
- `workaholic:implementation` / `policies/objective-documentation.md` — 分割後も各指標の
  provenance・時点・試行数を保持する。

## Key Files

- `packages/tech/src/llm-model-comparison/run.ts` / `domain/` - probe 群を速度/精度の
  2 トピックへ振り分ける。共通の model×effort 行列・履歴・区間・チャートは共有。
- `packages/tech/src/**/domain/topic.ts` - `speed` と `accuracy` を TopicSpec 登録。
- `docs/research-reports/` - 速度・精度それぞれの data artifact・fixture を分離。
- 履歴 `*.history.json` - トピック単位の履歴に分ける（または topic フィールドで区別）。

## Implementation Steps

1. 現行 probe を「速度 probe 群」と「精度 probe 群」に分類する。
2. `TopicSpec` に `speed` / `accuracy` を登録し、各々が自分の probe だけを走らせて
   自分の data artifact を出すようにする（model×effort 行列・estimate は共有基盤を使う）。
3. 速度・精度それぞれの keyless fixture・real 経路・履歴・チャートを分離する。
4. 旧一括 `compare` は後方互換のため残すか、速度＋精度を束ねる薄いラッパにする（判断を記載）。
5. 単体テスト・fixture byte-stability を各トピックで確認する。

## Quality Gate

**Acceptance criteria**

- `research speed` と `research accuracy` が、それぞれ自分の probe だけを走らせ、
  独立した data artifact・fixture・履歴を持つ。
- 各トピックの keyless fixture が byte-stable。
- 分割後も各指標の値・provenance・試行数・区間が分割前と一致する（re-measurement しない）。

**Verification method**

- `npm test`（probe 振り分け・集計の単体テスト）／`npm run lint`／`make build` 緑。
- 速度・精度の `*:fixture` が各 2 回 byte-identical。分割前後で数値が一致することを確認。

**Gate**

- テスト・lint・build 緑、両トピック fixture byte-stable、数値が保存されている。

## Considerations

- 情報精度（factual QA）は精度トピックに含める。判定に judge を使う場合は headline と分離。
- insights/翻訳段（[[per-topic-research-pipeline-benchmark-llm-insights-jp-translation]]）は
  速度・精度それぞれの artifact に対して働く。
- 共有の model×effort レジストリ・履歴スキーマ・チャートは重複させない。
