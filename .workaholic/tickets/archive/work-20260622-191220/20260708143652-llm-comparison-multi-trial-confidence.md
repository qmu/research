---
created_at: 2026-07-08T14:36:52+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Config]
effort:
commit_hash:
category:
depends_on:
mission:
---

# LLM 比較を複数試行にして信頼区間つきで報告する

## Overview

LLM 比較レポートは全指標が「1 試行」で、値のばらつきが読者に見えない。試行数を
**3 試行**へ上げ、各指標を **平均 ± 95% 信頼区間** として報告する。計測エンジンは既に
`MetricStat`（`mean` / `stdDev` / `n`）を試行ごとに集計しているが、compact なper-config
射影とレポートが **平均だけを残して stdDev を捨てている**。ここを通し、実測を 3 試行で
回してレポート／エクスポートに区間を出す。

見積り（エンジンの `--estimate`、rough）: 3 試行で ~5,192 API calls、~$76（実測は通常
これより低い）、逐次で ~13h。judge 呼び出しは config ごとに 1 回で試行数には比例しない。

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — 変更は既存の
  `llm-model-comparison/domain/` と entrypoint、exporter に閉じる。
- `workaholic:implementation` / `policies/coding-standards.md` — 型を緩めず、集計・射影は
  純関数として `domain/` に置く。
- `workaholic:implementation` / `policies/objective-documentation.md` — 数値は試行数 `n` と
  区間つきの観測として提示し、点推定を確定値のように見せない。
- `workaholic:operation` / `policies/ci-cd.md` — fixture self-test はキー不要・byte-stable の
  まま。実プロバイダーの sweep は owner-triggered で CI には乗せない。

## Key Files

- `packages/tech/src/llm-model-comparison/domain/types.ts` - `MetricStat`(mean/stdDev/n) は
  既にあるが、compact 射影（~177 行、`throughputTokensPerSec: number` 等）が mean のみを保持。
- `packages/tech/src/llm-model-comparison/domain/aggregate.ts` - 試行集計（mean/stdDev/n）。
- `packages/tech/src/llm-model-comparison/domain/report.ts` - 現状 mean のみを描画。区間を追加。
- `packages/tech/src/entrypoints/run-llm-model-comparison.ts` - `DEFAULT_TRIALS`(=3)、`--trials`、
  `--estimate`。実測を 3 試行で回す。
- `scripts/export-corporate-research.mjs` - `exportLlm()` が各指標表を mean で描画。区間を追加し、
  §4「各構成×測定項目は 1 試行です」を実際の試行数と区間の説明へ差し替える。
- `docs/research-reports/llm-model-comparison.real.data.json` - 3 試行の実測で再生成（gitignore・
  history から再レンダー可能）。

## Related History

LLM 比較はこれまで単発試行の実測を history に積み、レポートを再レンダーする形で運用してきた。
本チケットは集計済みの分散を捨てずに射影・描画へ通し、試行数を上げるだけの最小変更にする。

- [20260704170045-llm-comparison-multimodel-multitrial-engine.md](.workaholic/tickets/archive/work-20260622-191220/20260704170045-llm-comparison-multimodel-multitrial-engine.md) - 複数試行エンジン（mean/stdDev/n の集計を導入した回）
- [20260706105042-recurring-incremental-llm-comparison-with-history.md](.workaholic/tickets/archive/work-20260622-191220/20260706105042-recurring-incremental-llm-comparison-with-history.md) - history と再レンダー（同じ artifact→レポート経路）

## Implementation Steps

1. compact な per-config 射影へ `stdDev` と `n` を通す（`domain/types.ts` の射影型と、射影を
   作る関数）。指標ごとに mean だけでなく spread と試行数を保持する。**履歴点も同様に**:
   `HistoryPoint`（`types.ts:171-184`）と `toHistoryPoint`（`history.ts:17-30`）が現状 mean のみを残すので、
   `{ mean, stdDev, n }` を持つ形へ揃える（履歴・チャートが区間を扱えるようにし、RAG 履歴の形と合わせる）。
2. レポート（`domain/report.ts`）と exporter（`exportLlm()`）で、各指標を **平均 ± 95% 信頼区間**
   （`1.96·stdDev/√n`）＋ `n` として描画する。`n < 2` の指標は平均のみ＋「n=1」と明記。
3. 実測を `npm run compare -- --trials 3`（~$76 rough、事前 estimate を表示）で回し、history へ
   マージ。レポートと exporter 出力を再生成する。
4. 生成文言を更新: 「各構成×測定項目は 1 試行です」→「各構成×測定項目は 3 試行。値は平均 ±
   95% 信頼区間で示す」。

## Quality Gate

**Acceptance criteria**:

- 実測レポート／exporter 出力の各測定指標が **平均 ± 95% 信頼区間** と `n` を表示し、実測 sweep の
  `n` が 3 である。
- compact artifact が指標ごとに `stdDev` と `n` を保持する（mean のみでない）。
- 「1 試行」の記述が実際の試行数と区間の説明へ置き換わっている。
- `n < 2` の指標は区間を出さず平均のみ・`n=1` と正直に明記する。

**Verification method**:

- `npm test`（tsc + vitest）、`npm run lint`、`make build` が緑。fixture self-test が byte-stable。
- 生成した `.real.data.json` の各指標に `stdDev`/`n` が入り、レポートの区間がそれと一致する。
- 実行前に `--estimate` が費用見積りを表示することを確認。

**Gate**:

- テスト・lint・ビルドが緑、fixture byte-stable、実測が 3 試行で区間つきに更新されている。

## Considerations

- **費用と時間**: 3 試行 ~$76 rough（実測は通常より低い）、逐次で ~13h。owner-triggered。
  sweep をプロバイダー横断で並列化すれば wall-clock は縮む（現状の逐次 ETA は上限）。
- **judge 費用は試行数に非比例**（config ごと 1 回）。区間は probe 指標にのみ意味を持つ。
- **history マージ**（`domain/merge.ts`）: 増分 sweep をマージする際、区間は artifact 内の試行群から
  再計算されること。単発マージで `n` が壊れないよう確認する。
