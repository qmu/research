---
created_at: 2026-07-09T02:20:01+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260709022000-unified-per-topic-research-cli.md]
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# トピックの計測結果から LLM 分析レポート（insights）を生成する

## Overview

各トピックの **data artifact（決定的な計測結果）を LLM に渡し、分析的な
overview / insights レポート（英語）を生成する**パイプライン段を追加する。
現状のレポートは template でテーブルを描くだけで、「この数値が何を意味するか」の
考察が無い。insights 段は、計測値・provenance・区間を入力に、読者が選定判断に
使える分析文（英語）を生成する。

LLM 生成のため **非決定的・要 API キー**。よって insights は **real-run・
owner-gated・再生成可能**な成果物とし、keyless の byte-stable fixture には
insights を出さない（決定的なスタブのみ）。

## Policies

- `workaholic:implementation` / `policies/objective-documentation.md` — insights は
  data artifact の数値に基づき、provenance（source_artifact・model・generated_at）を
  必須にする。数値を捏造・誇張しない。裁定的表現と観測を分ける。
- `workaholic:design` / `policies/vendor-neutrality.md` — insights 生成に使う LLM は
  `vendors/llm` の既存 ACL 経由。生成器はドメインの正規化型だけを扱う。
- `workaholic:operation` / `policies/ci-cd.md` — insights は CI に乗せない。keyless
  fixture は insights 抜きで byte-stable。
- `workaholic:implementation` / `policies/coding-standards.md` — プロンプト構築と
  出力整形は純関数寄りに保ち、LLM 呼び出しのみ副作用に閉じる。

## Key Files

- `packages/tech/src/**/domain/insights.ts` - **新規**。data artifact → insights 用
  プロンプト構築（純関数）と、生成結果の整形・provenance 付与。
- `packages/tech/src/vendors/llm/*` - insights 生成に使う既存 ACL（固定モデル）。
- `packages/tech/src/**/domain/topic.ts` - パイプラインの insights 段をここに差し込む。
- `packages/tech/src/vendors/llm/fixture.ts` - keyless 用の決定的 insights スタブ
  （固定入力→固定文）。

## Implementation Steps

1. `insights.ts` に、data artifact から insights プロンプトを組む純関数を追加する
   （指標・区間・provenance・トピック文脈を含め、モデルに数値の解釈を求める）。
2. 固定 insights モデル（`vendors/llm` 経由）で英語 overview を生成し、provenance
   frontmatter（source_artifact・source_commit・insights_model・generated_at・
   trials・provenance）を付ける。
3. 生成物は real 経路（owner-gated、事前 `--estimate` で費用表示）でのみ出力。
   keyless fixture 経路は決定的スタブ（またはトピック本文に insights を含めない）。
4. パイプライン（topic.ts の insights 段）へ接続する。
5. 単体テスト: プロンプト構築の既知入力テスト、fixture スタブの決定性、provenance の
   必須フィールド。

## Quality Gate

**Acceptance criteria**

- 任意トピックの data artifact から、英語の insights レポートが provenance つきで
  生成できる（real 経路・owner-gated）。
- insights は数値を artifact から取り、frontmatter に source/model/時点を持つ。
- keyless fixture は insights 抜き（または決定的スタブ）で byte-stable のまま。
- `--estimate` が insights 生成の費用・呼び出し数を表示する。

**Verification method**

- `npm test`（プロンプト構築・スタブ決定性のテスト）／`npm run lint`／`make build` 緑。
- keyless fixture が 2 回 byte-identical。real 経路の生成物 provenance が artifact と一致。

**Gate**

- テスト・lint・build 緑、fixture byte-stable、insights が real 経路で provenance つき生成。

## Considerations

- insights は非決定的なので **headline の計測数値と混ぜない**（数値は artifact 由来、
  insights は解釈層）。翻訳段（[[per-topic-research-pipeline-benchmark-llm-insights-jp-translation]]）は
  この英語 insights を入力にする。
- モデル・プロンプトのバージョンを provenance に残し、再現性を担保する。
