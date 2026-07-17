---
created_at: 2026-07-17T00:36:11+09:00
author: a@qmu.jp
type: bugfix
layer: [Domain]
effort:
commit_hash: 363f108
category: Changed
depends_on:
mission: per-topic-research-pipeline-benchmark-llm-insights-jp-translation
---

# keyless fixture 成果物の drift を解消する（models.ts 拡張後の再生成と compose 経路の突合）

## Overview

2026-07-17 のミッション突合で、keyless fixture 経路は全トピックで通るものの、
再生成すると committed 成果物と一致しない drift を確認した:

1. **モデル registry 拡張が反映されていない** —
   `packages/tech/src/llm-model-comparison/models.ts` は現在 27 モデル / 8
   プロバイダー（Perplexity・AWS Bedrock・Vertex AI・OpenRouter 追加後）だが、
   committed の `docs/research-reports/foundation-models.md` / `.data.json` は
   19 モデル / 4 プロバイダー時点、`ocr-comparison.md` / `.data.json` も
   19 行時点のまま。カタログは「models.ts が source of truth」と明記している
   ので、公開ページが一次情報とずれている。
2. **compose 経路の分岐** — `npm run research -- rag|ocr|availability|
   foundation-models --fixture` の再生成は、committed ページにある
   「推移 / Trend across surveys」と「過去の調査 / Past surveys in this series」
   セクション（archive 済み dated survey へのリンクを含む）を出力しない。
   つまり fixture 実行が archive-composed の現行ページを上書きすると情報が
   失われる。速度/精度は `*.fixture.md` 別ファイルに書くため衝突しない。

## Policies

- **workaholic:mission** — keyless byte-stable fixture はミッションの
  load-bearing constraint。committed 成果物と再生成出力の一致は検証済み事実で
  裏づける。
- **workaholic:implementation** — source of truth（models.ts）と公開ページの
  乖離を機械検査（CI drift ゲート）で早期に検出できる構造にする。

## Implementation Steps

1. fixture 再生成でも history/trend セクションを compose する（current-article
   compose 経路を run-research の書き出しに通す）か、fixture 出力を常に
   `*.fixture.md` 側へ分離するかを決めて統一する。
2. その上で foundation-models / ocr の committed keyless 成果物を再生成して
   コミットし、27 モデル / 8 プロバイダーを反映する。
3. CI に「keyless fixture 再生成が committed 成果物と byte 一致する」drift
   ゲートを追加できるか検討する（byte-stability はミッションの load-bearing
   constraint）。

## Quality Gate

- `npm run research -- <topic> --fixture` を再実行しても `git status` が
  クリーンなまま（byte-stable）になる。
- 公開カタログ・OCR 行が models.ts と一致する。
- `npm test` / `npm run lint` / `make build` 緑。
