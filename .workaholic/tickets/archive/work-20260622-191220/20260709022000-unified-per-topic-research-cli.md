---
created_at: 2026-07-09T02:20:00+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, Infrastructure, Config]
effort:
commit_hash:
category:
depends_on:
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# 研究トピックを統一 CLI（research <topic>）に載せる

## Overview

各研究トピック（速度・精度・可用性・OCR・ベクトルDB…）を、**一つの
`research <topic>` サブコマンド規約**に載せるための土台を作る。現状は
`compare` / `rag` / `ocr` / `availability` がそれぞれ独立した entrypoint を持ち、
出力形式・fixture・estimate の契約がトピックごとにバラバラ。これを、共通の
**TopicSpec レジストリ**と、共通パイプライン（benchmark → data artifact →
EN insights → JP translation）に統一する。

このチケットは**骨格のみ**。insights 生成（別チケット）・JP 翻訳（別チケット）・
compare の速度/精度分割（別チケット）は後続。ここでは、既存トピックを新しい
`TopicSpec` として登録し、`research <topic>` から現行と同じ benchmark を呼べる
状態にする（振る舞いは不変、配線のみ）。

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — トピック定義と
  パイプライン制御は `domain/`、entrypoint は薄く、プロバイダー/SDK は `vendors/`。
- `workaholic:implementation` / `policies/coding-standards.md` — `TopicSpec` を型で
  定義し、各トピックが benchmark/fixture/estimate を型で満たす。既存型を緩めない。
- `workaholic:operation` / `policies/ci-cd.md` — 各トピックの keyless fixture は
  byte-stable を維持。実測・insights・翻訳は owner-triggered で CI に乗せない。
- `workaholic:implementation` / `policies/objective-documentation.md` — パイプラインの
  各段（data / insights / translation）の provenance を成果物に持たせる。

## Key Files

- `packages/tech/src/**/domain/topic.ts` - **新規**。`TopicSpec`（id・表示名・
  benchmark runner・fixture・estimate・artifact パス・insights/translation の有無）と
  トピックレジストリ。
- `packages/tech/src/entrypoints/run-research.ts` - **新規**。`research <topic>
  [--fixture|--estimate|--real] [...]` を dispatch する薄い entrypoint。
- `packages/tech/package.json` - `research` スクリプト（および後方互換の
  `compare`/`rag`/`ocr`/`availability` エイリアス）。
- `packages/tech/src/{llm-model-comparison,rag-benchmark,ocr-comparison}/run.ts` +
  availability runner - 既存 runner を `TopicSpec` として登録する薄いアダプタ。

## Implementation Steps

1. `TopicSpec` 型と共通パイプライン骨格（benchmark → artifact →〔insights〕→〔translate〕）を
   `domain/` に定義する。insights/translation 段は本チケットでは no-op プレースホルダ。
2. 既存トピック（llm-model-comparison, rag, ocr, availability）を `TopicSpec` として
   登録し、現行 benchmark をそのまま呼ぶ。出力・fixture・estimate は現行と一致させる。
3. `run-research.ts` を追加し、`research <topic> --fixture|--estimate|--real` を dispatch。
   既存の `compare`/`rag`/`ocr`/`availability` スクリプトは後方互換エイリアスとして残す。
4. 各トピックの keyless fixture が byte-stable のままであることを確認する。

## Quality Gate

**Acceptance criteria**

- `research <topic>` で既存の各トピックの benchmark が呼べ、`--fixture` 出力が
  移行前と byte-identical。
- `TopicSpec` レジストリが型で benchmark/fixture/estimate を要求し、全既存トピックが
  それを満たす。
- insights/translation 段は骨格のみ（no-op）で、後続チケットが差し込める形。

**Verification method**

- `npm test`（レジストリ・dispatch の単体テスト含む）／`npm run lint`／`make build` 緑。
- 全トピックの `*:fixture` を 2 回実行し byte-identical。既存エイリアスも同結果。

**Gate**

- テスト・lint・build 緑、全 fixture byte-stable、`research <topic>` が現行と同値。

## Considerations

- 本チケットは配線のみ。振る舞いを変えない（速度/精度分割は別チケット）。
- パイプラインの insights/translation 段は「差し込み口」を用意するだけ。実装は
  [[per-topic-research-pipeline-benchmark-llm-insights-jp-translation]] の後続チケット。
- 後方互換エイリアスを残し、既存の CI・ドキュメント参照を壊さない。
