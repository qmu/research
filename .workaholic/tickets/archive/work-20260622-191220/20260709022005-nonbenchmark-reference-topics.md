---
created_at: 2026-07-09T02:20:05+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, UX]
effort:
commit_hash:
category:
depends_on: [20260709022000-unified-per-topic-research-cli.md, 20260709022001-llm-insights-report-generator.md, 20260709022002-japanese-auto-translation-stage.md]
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# 非計測の参照トピック（基盤モデルカタログ・Agent SDK）を構造に合わせる

## Overview

すべてのトピックが live benchmark を持つわけではない。**対象基盤モデル
（カタログ・価格）**と **Agent SDK の比較（設計比較）**は、実測ではなく参照・設計
情報のトピック。これらを per-topic 構造（insights／日本語版を持つ記事）に無理なく
収め、live benchmark が無いことを **provenance で明示**する（`未測定` / `設計比較` /
`カタログ` を実測と混同しない）。

## Policies

- `workaholic:implementation` / `policies/objective-documentation.md` — 参照・設計情報を
  実測のように見せない。provenance（カタログ／設計比較／未測定）を明示する。
- `workaholic:design` / `policies/self-explanatory-ui.md` — 記事名・導線だけで参照系
  トピックだと読者が分かる情報設計にする。
- `workaholic:planning` / `policies/market-research.md` — カタログ・Agent SDK 比較を
  選定判断の前提情報として位置付ける。
- `workaholic:implementation` / `policies/directory-structure.md` — 参照トピックも
  `TopicSpec` に載せ、benchmark 無し・insights/翻訳ありの形にする。

## Key Files

- `packages/tech/src/**/domain/topic.ts` - `foundation-models`（カタログ）・`agent-sdk`
  （設計比較）を benchmark 無しトピックとして登録。
- `packages/tech/src/llm-model-comparison/models.ts` - カタログ（モデル・価格・tier・
  effort）の source of truth。カタログトピックの入力。
- 既存 `docs/llm-foundation/agent-sdk-comparison.md` - Agent SDK 設計比較の内容
  （設計比較 provenance を保持したまま新構造へ）。

## Implementation Steps

1. `TopicSpec` に「benchmark 無し・insights/翻訳あり（または手動記事）」の種別を追加する。
2. `foundation-models` トピック: `models.ts` のカタログから、価格・tier・effort・
   vision 対応などの参照表を生成する（実測値ではなくカタログとして provenance 明示）。
3. `agent-sdk` トピック: 既存の設計比較記事を新構造へ載せ、`設計比較`/`未測定`/`要確認` の
   provenance ラベルを保持する。
4. これら参照トピックが insights/日本語版を持つ場合も、provenance を実測と分けて出す。
5. 記事・型・build を通す。

## Quality Gate

**Acceptance criteria**

- `foundation-models`（カタログ）と `agent-sdk`（設計比較）が per-topic 構造に載る。
- live benchmark を持たないことが provenance で明示され、実測と混同されない。
- カタログは `models.ts` を source of truth とし、価格・tier 等が検証可能。

**Verification method**

- `npm test`／`npm run lint`／`make build` 緑。
- カタログ表が `models.ts` と一致。Agent SDK 記事の provenance ラベルが保持される。

**Gate**

- テスト・lint・build 緑、参照トピックが provenance 明示で構造に収まる。

## Considerations

- 参照トピックは実測が無いので、insights を付ける場合も「カタログ/設計に基づく」旨を明示。
- Agent SDK は更新が速い。`要確認`/`未測定` ラベルを保ち、古い知識を実測のように出さない。
- カタログの数値（価格等）は一次情報の時点を残す（[[llm-comparison-artifact-full-record]]）。
