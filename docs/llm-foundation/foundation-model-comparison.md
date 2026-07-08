---
title: 基礎的LLMモデル比較（日本語版）
description: 19個の大規模言語モデルを4プロバイダー、59件のモデル×effort構成で比較した再現可能な検証レポートの日本語版。スループット、レイテンシ、JSONスキーマ複雑度、長さ指示への追従性を1試行で測定し、構成ごとのLLM審査レビューを伴う。
---

# 基礎的LLMモデル比較（日本語版）

この文書は [`llm-model-comparison.real.md`](../research-reports/llm-model-comparison.real.md) の日本語版です。元レポートは `2026-07-06T13:08:50.282Z` に生成された実測版で、Anthropic、OpenAI、Google、xAI の現在の大規模言語モデルを、モデルごとの effort レベルまで展開した **59件のモデル×effort構成**で比較しています。

測定対象は4つの狭い、自動採点可能な挙動です。長文生成時の持続スループット、短いプロンプトへの応答レイテンシ、構造化出力で扱えるJSONスキーマ複雑度、そして「100語ちょうど」の長さ指示への追従性です。プロバイダー、モデル名、価格、tier、effortレベルなどのカタログ情報は、実測値とは型レベルで分離されています。

## 方法

**構成。** 19モデルを4プロバイダーにわたり収集し、各モデルが持つ effort レベルをすべて走査しました。合計は59件のモデル×effort構成です。effort は各プロバイダー固有の推論調整値、つまり Anthropic の `output_config.effort`、OpenAI の `reasoning_effort`、Google の thinking budget に対応します。モデルが対応しないレベルは、代替値で偽装せず、非対応として扱います。

**試行と統計。** 各プローブは構成ごとに **1回**実行されます。試行値は `packages/tech/src/llm-model-comparison/domain/aggregate.ts` の純粋関数で平均と標本標準偏差に集約されます。失敗した試行は0として数えず、集計対象から除外し、各平均には `n` を併記します。

**プローブ。** 各構成は `packages/tech/src/vendors/llm/` のプロバイダー中立な `CompletionClient` 境界を通して、次の4プローブに送られます。

- **スループット**: 長いストリーミング生成。`total - time-to-first-token` の生成時間で出力トークン数を割った、生成中の持続 tokens/sec を測ります。往復レイテンシではなく生成速度です。
- **レイテンシ**: 短いストリーミングプロンプト。time-to-first-token と合計応答時間を、スループットとは別に測ります。
- **JSONスキーマ複雑度**: プロバイダーの構造化出力モードを、ネスト深度（最大48）とフィールド幅（最大192）という2軸で増やします。2から幾何級数的に上げ、その後二分探索で「スキーマ準拠出力が返る最大値」を求めます。
- **長さ精度**: “the water cycle” について100語ちょうどの段落を書かせます。精度は `1 - min(1, |actual - target| / target)` です。

## コストと時間

この実測 sweep は **59構成 × 4プローブ × 1試行**に、構成ごとの judge 呼び出しを加えたものです。概算では約 **1770 API calls**、費用は約 **$25.82**、ETA は約 **266分**でした。実行前に runner は見積もりを表示し、`--estimate` ではプロバイダー呼び出しなしで見積もりだけを出します。実際のトークン使用量は run artifact に保存されます。CI は実 sweep を実行せず、APIキー不要の `compare:fixture` self-test のみを実行します。

## 比較表

| プロバイダー | モデル | Tier | Effort | 価格 (in / out per MTok) | スループット (tok/s) | TTFT (ms) | 合計レイテンシ (ms) | 最大スキーマ深度 | 最大スキーマ幅 | 長さ精度 |
| ------------ | ------ | ---- | ------ | ------------------------ | -------------------- | --------- | ------------------- | ---------------- | -------------- | -------- |
| anthropic | Claude Fable 5 | frontier | low | $6.00 / $30.00 | 70 | 3613 | 4678 | 21 | 72 | 100% |
| anthropic | Claude Fable 5 | frontier | medium | $6.00 / $30.00 | 66 | 3434 | 4418 | 21 | 72 | 100% |
| anthropic | Claude Fable 5 | frontier | high | $6.00 / $30.00 | 71 | 4103 | 4545 | 21 | 72 | 100% |
| anthropic | Claude Fable 5 | frontier | xhigh | $6.00 / $30.00 | 66 | 3466 | 4253 | 21 | 72 | 100% |
| anthropic | Claude Fable 5 | frontier | max | $6.00 / $30.00 | 131 | 5842 | 6826 | 21 | 72 | 100% |
| anthropic | Claude Opus 4.8 | flagship | low | $5.00 / $25.00 | 67 | 1237 | 1783 | 21 | 73 | 100% |
| anthropic | Claude Opus 4.8 | flagship | medium | $5.00 / $25.00 | 60 | 1176 | 1935 | 21 | 73 | 100% |
| anthropic | Claude Opus 4.8 | flagship | high | $5.00 / $25.00 | 66 | 1078 | 2014 | 21 | 73 | 100% |
| anthropic | Claude Opus 4.8 | flagship | xhigh | $5.00 / $25.00 | 63 | 2143 | 2896 | 21 | 73 | 99% |
| anthropic | Claude Opus 4.8 | flagship | max | $5.00 / $25.00 | 61 | 1643 | 2343 | 21 | 73 | 99% |
| anthropic | Claude Sonnet 5 | mid | low | $3.00 / $15.00 | 85 | 792 | 1665 | 21 | 72 | 93% |
| anthropic | Claude Sonnet 5 | mid | medium | $3.00 / $15.00 | 82 | 938 | 1757 | 21 | 72 | 95% |
| anthropic | Claude Sonnet 5 | mid | high | $3.00 / $15.00 | 84 | 872 | 1678 | 21 | 72 | 100% |
| anthropic | Claude Sonnet 5 | mid | xhigh | $3.00 / $15.00 | 90 | 961 | 1589 | 21 | 72 | 0% |
| anthropic | Claude Sonnet 5 | mid | max | $3.00 / $15.00 | 154 | 16739 | 16758 | 15 | 72 | 0% |
| anthropic | Claude Haiku 4.5 | small | n/a | $1.00 / $5.00 | 83 | 842 | 1148 | 21 | 73 | 97% |
| openai | GPT-5.5 | flagship | none | $5.00 / $30.00 | 33 | 1405 | 1868 | 10 | 192 | 96% |
| openai | GPT-5.5 | flagship | low | $5.00 / $30.00 | 38 | 912 | 1380 | 10 | 192 | 100% |
| openai | GPT-5.5 | flagship | medium | $5.00 / $30.00 | 28 | 1057 | 1580 | 10 | 192 | 100% |
| openai | GPT-5.5 | flagship | high | $5.00 / $30.00 | 34 | 1098 | 1326 | 10 | 192 | 100% |
| openai | GPT-5.4 | mid | none | $2.50 / $15.00 | 61 | 677 | 1349 | 10 | 192 | 93% |
| openai | GPT-5.4 | mid | low | $2.50 / $15.00 | 48 | 1099 | 1387 | 10 | 192 | 100% |
| openai | GPT-5.4 | mid | medium | $2.50 / $15.00 | 64 | 1194 | 1617 | 10 | 192 | 100% |
| openai | GPT-5.4 | mid | high | $2.50 / $15.00 | 71 | 837 | 1081 | 10 | 192 | 100% |
| openai | GPT-5.4 mini | small | none | $0.50 / $2.00 | 109 | 853 | 1279 | 10 | 192 | 97% |
| openai | GPT-5.4 mini | small | low | $0.50 / $2.00 | 138 | 410 | 678 | 10 | 192 | 100% |
| openai | GPT-5.4 mini | small | medium | $0.50 / $2.00 | 142 | 946 | 1209 | 10 | 192 | 100% |
| openai | GPT-5.4 mini | small | high | $0.50 / $2.00 | 146 | 596 | 827 | 10 | 192 | 100% |
| openai | GPT-5.4 nano | small | none | $0.15 / $0.60 | 162 | 1130 | 1858 | 10 | 192 | 91% |
| openai | GPT-5.4 nano | small | low | $0.15 / $0.60 | 140 | 368 | 623 | 10 | 192 | 100% |
| openai | GPT-5.4 nano | small | medium | $0.15 / $0.60 | 158 | 399 | 643 | 10 | 192 | 100% |
| openai | GPT-5.4 nano | small | high | $0.15 / $0.60 | 165 | 467 | 596 | 10 | 192 | 100% |
| openai | o4-mini | mid | low | $1.10 / $4.40 | 147 | 930 | 1136 | 10 | 192 | 100% |
| openai | o4-mini | mid | medium | $1.10 / $4.40 | 223 | 2876 | 3254 | 10 | 7 | 100% |
| openai | o4-mini | mid | high | $1.10 / $4.40 | 202 | 7409 | 7633 | 10 | 2 | 0% |
| openai | GPT Realtime | flagship | n/a | $4.00 / $16.00 | 127 | 1137 | 1336 | 0 | 0 | 99% |
| openai | GPT-5.3 Codex | flagship | low | $1.75 / $14.00 | 51 | 873 | 1383 | 10 | 192 | 100% |
| openai | GPT-5.3 Codex | flagship | medium | $1.75 / $14.00 | 58 | 760 | 1529 | 10 | 127 | 100% |
| openai | GPT-5.3 Codex | flagship | high | $1.75 / $14.00 | 58 | 1783 | 4284 | 10 | 192 | 100% |
| openai | GPT-5.3 Codex | flagship | xhigh | $1.75 / $14.00 | 0 | 2430 | 3072 | 10 | 192 | 100% |
| openai | GPT-5.1 Codex mini | small | low | $0.25 / $2.00 | 184 | 725 | 944 | 10 | 13 | 100% |
| openai | GPT-5.1 Codex mini | small | medium | $0.25 / $2.00 | 219 | 641 | 932 | 10 | 6 | 100% |
| openai | GPT-5.1 Codex mini | small | high | $0.25 / $2.00 | 193 | 522 | 818 | 10 | 57 | 0% |
| google | Gemini 3.1 Pro | flagship | low | $2.00 / $12.00 | 167 | 6530 | 6530 | 15 | 192 | 100% |
| google | Gemini 3.1 Pro | flagship | medium | $2.00 / $12.00 | 155 | 4206 | 4394 | 15 | 192 | 100% |
| google | Gemini 3.1 Pro | flagship | high | $2.00 / $12.00 | 146 | 7122 | 7123 | 15 | 192 | 73% |
| google | Gemini 3.5 Flash | mid | low | $0.30 / $2.50 | 267 | 2762 | 2762 | 15 | 192 | 100% |
| google | Gemini 3.5 Flash | mid | medium | $0.30 / $2.50 | 255 | 2680 | 2680 | 15 | 192 | 27% |
| google | Gemini 3.5 Flash | mid | high | $0.30 / $2.50 | 221 | 3082 | 3084 | 15 | 192 | 15% |
| google | Gemini 3.1 Flash-Lite | small | low | $0.10 / $0.40 | 250 | 928 | 931 | 15 | 192 | 100% |
| google | Gemini 3.1 Flash-Lite | small | medium | $0.10 / $0.40 | 453 | 1250 | 1250 | 15 | 192 | 100% |
| google | Gemini 3.1 Flash-Lite | small | high | $0.10 / $0.40 | 460 | 1259 | 1259 | 15 | 192 | 66% |
| xai | Grok 4.3 | frontier | none | $1.25 / $2.50 | 99 | 584 | 779 | 48 | 192 | 99% |
| xai | Grok 4.3 | frontier | low | $1.25 / $2.50 | 76 | 3083 | 3258 | 48 | 192 | 100% |
| xai | Grok 4.3 | frontier | medium | $1.25 / $2.50 | 177 | 7150 | 7273 | 48 | 192 | 100% |
| xai | Grok 4.3 | frontier | high | $1.25 / $2.50 | 196 | 3735 | 3962 | 22 | 192 | 100% |
| xai | Grok 4.20 Reasoning | flagship | n/a | $1.25 / $2.50 | 104 | 2532 | 2637 | 32 | 192 | 99% |
| xai | Grok 4.20 Non-Reasoning | mid | n/a | $1.25 / $2.50 | 96 | 362 | 522 | 48 | 192 | 97% |
| xai | Grok Build 0.1 | small | n/a | $1.00 / $2.00 | 227 | 9531 | 9681 | 11 | 192 | 100% |

**凡例。** プロバイダー、モデル、tier、effort、価格は引用元に基づくカタログデータです。スループット、TTFT、合計レイテンシ、最大スキーマ複雑度、長さ精度は実測値です。この実測版では各値は1試行の平均です。`n/a (fixtured)` はAPIキーなしの決定的 fixture client による値であり、実測ではありません。`n/a (error)` はその構成の全試行が失敗したことを意味します。

## 観測結果

**スループット。** 59件の実測構成で最速は **Gemini 3.1 Flash-Lite [high]** の 460 tok/s でした。低価格帯の Gemini Flash-Lite 系は生成速度が強く、Grok Build 0.1 と o4-mini も高い値を出しています。一方で **GPT-5.3 Codex [xhigh]** は 0 tok/s と記録されており、この構成は生成速度の観点では異常値として扱うべきです。

**初回トークンまでの時間。** 最速は **Grok 4.20 Non-Reasoning [n/a]** の 362 ms でした。OpenAI の GPT-5.4 nano [low/medium/high] も 368-467 ms と短く、対話用途に向いています。最も遅いのは **Claude Sonnet 5 [max]** の 16739 ms で、max effort は応答開始の遅さが大きな制約になります。

**合計レイテンシ。** 最短は **Grok 4.20 Non-Reasoning [n/a]** の 522 ms でした。GPT-5.4 nano [high] は 596 ms、GPT-5.4 nano [low] は 623 ms で、短い応答では非常に速い構成です。最長は **Claude Sonnet 5 [max]** の 16758 ms でした。

**JSONスキーマ深度。** 最大深度は **48** で、Grok 4.3 [none/low/medium] と Grok 4.20 Non-Reasoning が到達しました。Anthropic 系は多くが深度21、Google 系は深度15、OpenAI 系は深度10付近に集まっています。GPT Realtime はこのプローブでは0です。

**JSONスキーマ幅。** 最大幅192に到達した構成が多く、OpenAI、Google、xAI の多くの構成が上限まで通りました。Anthropic 系は72-73付近で頭打ちです。o4-mini [medium/high] と GPT-5.1 Codex mini [low/medium/high] は幅方向で低い値が出ており、構造化出力の大きな横幅が必要な用途では注意が必要です。

**長さ指示への追従。** 多くの構成が100%に到達しましたが、Claude Sonnet 5 [xhigh/max]、o4-mini [high]、GPT-5.1 Codex mini [high] は0%でした。Gemini 3.5 Flash [medium/high] も27%と15%で、長さ制約が厳密な用途では構成選択に注意が必要です。

## 構成別レビュー

元レポートには、各構成の実際の試行出力と測定値を `claude-opus-4-8` judge が読んで作成した、59件の開発者向けレビューが含まれています。この日本語版では比較に使う主要な測定値と観測結果を中心にまとめ、詳細な構成別レビューは英語の原本と完全なJSON artifactを参照対象にしています。

## データの透明性

正確なプロンプト、各試行の生出力、トークン数、TTFT、スキーマ軸ごとの値と準拠結果、プロバイダーの拒否応答、judge review は、ページ横のJSON artifactに保存されています。

**スループットプローブ:**

```text
Write a detailed, flowing explanation of how large language models generate text of at least 400 words. Write continuous prose only — no lists, headings, or code. Do not stop early; keep going until you have written at least 400 words.
```

**レイテンシプローブ:**

```text
In one short sentence, state a single interesting fact about the water cycle.
```

**スキーマ複雑度プローブ:**

```text
Produce a JSON object that conforms to the provided schema: an object nested 2 level(s) deep, each level containing 1 string field(s) (and, above the deepest level, a nested "child" object). Fill every string field with a one-or-two-word value.
```

**長さプローブ:**

```text
Write a single paragraph about the water cycle that is exactly 100 words long. Respond with the paragraph only — no preamble, no word count, no markdown.
```

完全な生レコードは [`llm-model-comparison.real.data.json`](../research-reports/llm-model-comparison.real.data.json) にあります。このページはそのレコードのレンダリングであり、artifact が真実のソースです。

## 範囲と制約

これは意図的に狭いプローブセットであり、網羅的な評価 suite ではありません。

- 各構成×プローブは **1試行**です。平均とおおまかな傾向を見るには使えますが、厳密な統計研究ではありません。
- 実測挙動は生成日時点のモデルとAPIを反映します。カタログ情報もその時点の引用元に依存します。
- 4つのプローブは、生成速度、応答性、構造化出力の複雑度、長さ指示追従という狭い挙動だけを測ります。一般能力や推論品質を測るものではありません。
- effort の意味はプロバイダーごとに異なります。あるプロバイダーでは reasoning-effort enum、別のプロバイダーでは thinking-token budget、Realtime surface では該当なしです。そのため、effort レベルはプロバイダー内では比較しやすい一方、プロバイダー横断では慎重に扱うべきです。
- 生成日時: `2026-07-06T13:08:50.282Z`

## 再現方法

```sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# APIキーも費用も不要の pipeline self-test:
npm run compare:fixture

# プロバイダーを呼び出さず、call count / cost / ETA だけを見る:
npm run compare -- --estimate

# 実プロバイダーで実行する場合（先に .env を用意）:
#   ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY
# --models <id,...>, --effort <level,...>, --trials <n> で実行範囲を制限できる。
# --detail summary|standard|full でレポート詳細度を選ぶ。
npm run compare
```

実行すると、このページに対応する英語レポートとJSON run artifactが再生成されます。実運用の比較を公開する場合は、`apiModelId` を固定して、時間が経っても結果を解釈できるようにしてください。
