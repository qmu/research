---
created_at: 2026-07-09T02:20:02+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260709022000-unified-per-topic-research-cli.md, 20260709022001-llm-insights-report-generator.md]
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# 英語 insights レポートを日本語へ自動翻訳する

## Overview

各トピックの英語 insights レポートを **LLM で日本語へ翻訳する**パイプライン段を
追加する。これまで日本語記事は手動で書いていたが、per-topic パイプラインでは
英語 insights を正本とし、その **日本語版を自動生成**する（数値・provenance は
英語版と一致させ、翻訳で数値を変えない）。

LLM 翻訳のため **非決定的・要 API キー**。翻訳は real-run・owner-gated・再生成可能な
成果物とし、keyless fixture には決定的スタブのみ。

## Policies

- `workaholic:implementation` / `policies/objective-documentation.md` — 翻訳は英語版の
  数値・provenance・時点を保持する。翻訳で数値や結論を変えない。生成物に
  `translated_from` と `translation_model` を残す。
- `workaholic:design` / `policies/vendor-neutrality.md` — 翻訳 LLM は `vendors/llm` の
  既存 ACL 経由。ドメインは正規化型のみ扱う。
- `workaholic:operation` / `policies/ci-cd.md` — 翻訳は CI に乗せない。keyless fixture は
  byte-stable。
- `workaholic:design` / `policies/self-explanatory-ui.md` — 日本語版はそれ単体で
  読者が比較内容を理解できる文章にする。

## Key Files

- `packages/tech/src/**/domain/translate.ts` - **新規**。英語 insights → 日本語翻訳の
  プロンプト構築（純関数）と provenance 付与。
- `packages/tech/src/vendors/llm/*` - 翻訳に使う既存 ACL（固定モデル）。
- `packages/tech/src/**/domain/topic.ts` - パイプラインの translation 段を差し込む。
- `packages/tech/src/vendors/llm/fixture.ts` - keyless 用の決定的翻訳スタブ。

## Implementation Steps

1. `translate.ts` に、英語 insights（＋数値の対応表）から日本語翻訳プロンプトを組む
   純関数を追加する。数値・固有名詞・provenance は保持するよう指示する。
2. 固定翻訳モデルで日本語版を生成し、`translated_from`・`translation_model`・
   `generated_at` を frontmatter に付ける。
3. real 経路（owner-gated、事前 estimate）でのみ出力。keyless は決定的スタブ。
4. パイプライン（topic.ts の translation 段）へ接続する。
5. 単体テスト: プロンプト構築の既知入力、スタブ決定性、数値保持（英語版と日本語版の
   数値が一致することの検証）。

## Quality Gate

**Acceptance criteria**

- 英語 insights から日本語版が provenance つきで生成できる（real 経路・owner-gated）。
- 日本語版の数値・時点が英語版と一致する（翻訳で改変しない）。
- keyless fixture は決定的スタブで byte-stable。
- `--estimate` が翻訳の費用・呼び出し数を表示する。

**Verification method**

- `npm test`（プロンプト構築・スタブ決定性・数値保持テスト）／`npm run lint`／`make build` 緑。
- keyless fixture 2 回 byte-identical。real 経路の日本語版 provenance が英語版と対応。

**Gate**

- テスト・lint・build 緑、fixture byte-stable、日本語版が数値保持で生成。

## Considerations

- 翻訳は英語 insights（[[per-topic-research-pipeline-benchmark-llm-insights-jp-translation]] の
  insights 段）を入力にする。英語版が無いトピックは翻訳対象外。
- 数値保持を機械的に検証できるよう、翻訳入力に数値の対応表を渡す設計にする。
