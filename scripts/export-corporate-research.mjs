#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { renderTimeSeriesChart } from "../packages/tech/src/research-report/domain/chart.js";

const repoRoot = resolve(import.meta.dirname, "..");
// The structured reports are the committed, reader-facing product (site main
// line + corporate publish source), generated from the real data artifacts.
const draftDir = resolve(repoRoot, "docs/llm-foundation");
const gitRevParseHead = () => {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();
  } catch (error) {
    if (typeof error.stdout === "string" && error.stdout.trim()) {
      return error.stdout.trim();
    }
    throw error;
  }
};
const sourceCommit = gitRevParseHead();

const readJson = (path) =>
  JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));

const existsJson = (path) => {
  try {
    return readJson(path);
  } catch {
    return undefined;
  }
};

const readArtifact = (realPath, fixturePath) => {
  const real = existsJson(realPath);
  if (real) return { sourceArtifact: realPath, result: real };
  return { sourceArtifact: fixturePath, result: readJson(fixturePath) };
};

const provenanceFor = (items) =>
  items.some((item) => item.provenance === "measured")
    ? "measured"
    : "fixtured";

const frontmatter = ({
  sourceArtifact,
  generatedAt,
  trials,
  provenance,
}) => `---
source_artifact: ${sourceArtifact}
source_commit: ${sourceCommit}
generated_at: ${JSON.stringify(generatedAt)}
trials: ${trials}
provenance: ${provenance}
copied_to_corporate_at: null
---`;

const writeDraft = (slug, body) => {
  const relativePath = `${slug}.md`;
  const path = resolve(draftDir, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${body.trim()}\n`, "utf8");
  console.log(`generated docs/llm-foundation/${relativePath}`);
};

// The LLM-generated Japanese analysis for a topic, read from its committed
// insight file (produced by the research <topic> pipeline). Strips the
// frontmatter and returns the prose body, or "" when no insight exists. This
// becomes the "考察" section — the interpretation layer over the data tables.
const insightBody = (insightsBase) => {
  try {
    const raw = readFileSync(
      resolve(repoRoot, `docs/research-reports/${insightsBase}.insights.ja.md`),
      "utf8",
    );
    const match = raw.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
    return (match ? match[1] : raw).trim();
  } catch {
    return "";
  }
};

// Render the "考察" section: the LLM analysis when present, else a short note.
const kousatsuSection = (number, insightsBase, fallback) => {
  const body = insightBody(insightsBase);
  return `## ${number}. 考察

${
  body === ""
    ? fallback
    : `${body}\n\n_この節は、上表の実測データを固定入力として LLM が生成した分析です（考察のみ非決定的で、数値は上表と一致します）。_`
}`;
};

const yen = (value) => String(value).replace(/\.0+$/, "");
const percent = (value) => `${Math.round(value * 100)}%`;
const metric = (value, digits = 0) => Number(value).toFixed(digits);
const llmCi95HalfWidth = (stat) =>
  stat.n < 2 ? 0 : (1.96 * stat.stdDev) / Math.sqrt(stat.n);
const llmMetric = (stat, digits = 0) => {
  const mean = Number(stat.mean).toFixed(digits);
  return stat.n < 2
    ? `${mean} (n=${stat.n})`
    : `${mean} ± ${llmCi95HalfWidth(stat).toFixed(digits)} (95%信頼区間, n=${stat.n})`;
};
const llmPercent = (stat, digits = 0) => {
  const mean = `${(stat.mean * 100).toFixed(digits)}%`;
  return stat.n < 2
    ? `${mean} (n=${stat.n})`
    : `${mean} ± ${(llmCi95HalfWidth(stat) * 100).toFixed(digits)}pp (95%信頼区間, n=${stat.n})`;
};
const uniqueBy = (items, key) => {
  const seen = new Set();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

const metricStat = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { mean: value, stdDev: 0, n: 1 };
  }
  if (
    value &&
    typeof value === "object" &&
    Number.isFinite(value.mean) &&
    Number.isFinite(value.stdDev) &&
    Number.isFinite(value.n)
  ) {
    return { mean: value.mean, stdDev: value.stdDev, n: value.n };
  }
  return undefined;
};

const intervalForStat = (stat) =>
  stat.n < 2
    ? undefined
    : {
        lower: stat.mean - (1.96 * stat.stdDev) / Math.sqrt(stat.n),
        upper: stat.mean + (1.96 * stat.stdDev) / Math.sqrt(stat.n),
      };

const chartCaption = (series) => {
  const points = series.flatMap((s) => s.points);
  const dates = new Set(points.map((point) => point.measuredAt));
  const ns = points.map((point) => point.n);
  const minN = Math.min(...ns);
  const maxN = Math.max(...ns);
  const nText = minN === maxN ? `n=${minN}` : `n range ${minN}-${maxN}`;
  return `Caption: sample count ${points.length} plotted point(s) across ${dates.size} manual run date(s); metric sample ${nText}. Cadence: manual on-demand runs only, not scheduled. Numeric tables remain the accessible text alternative.`;
};

const isRealArtifact = (sourceArtifact) => sourceArtifact.includes(".real.");

const llmHistoryMetrics = [
  {
    key: "throughputTokensPerSec",
    title: "スループット履歴",
    yLabel: "Tokens/sec",
    valueDigits: 1,
  },
  { key: "ttftMs", title: "TTFT 履歴", yLabel: "Milliseconds", valueDigits: 0 },
  {
    key: "totalLatencyMs",
    title: "合計レイテンシ履歴",
    yLabel: "Milliseconds",
    valueDigits: 0,
  },
  {
    key: "maxSchemaDepth",
    title: "JSON スキーマ深度履歴",
    yLabel: "Maximum accepted depth",
    valueDigits: 0,
  },
  {
    key: "maxSchemaBreadth",
    title: "JSON スキーマ幅履歴",
    yLabel: "Maximum accepted fields",
    valueDigits: 0,
  },
  {
    key: "lengthAccuracy",
    title: "長さ精度履歴",
    yLabel: "Accuracy",
    valueDigits: 2,
  },
];

const ragHistoryMetrics = [
  {
    key: "recallAtK",
    title: "Recall@k 履歴",
    yLabel: "Recall",
    valueDigits: 2,
  },
  { key: "ndcgAtK", title: "nDCG@k 履歴", yLabel: "nDCG", valueDigits: 2 },
  { key: "mrr", title: "MRR 履歴", yLabel: "MRR", valueDigits: 2 },
  {
    key: "ingestMs",
    title: "取り込み時間履歴",
    yLabel: "Milliseconds",
    valueDigits: 1,
  },
  {
    key: "p50Ms",
    title: "クエリ p50 履歴",
    yLabel: "Milliseconds",
    valueDigits: 1,
  },
  {
    key: "p95Ms",
    title: "クエリ p95 履歴",
    yLabel: "Milliseconds",
    valueDigits: 1,
  },
  { key: "costUsd", title: "実行コスト履歴", yLabel: "USD", valueDigits: 4 },
];

const llmHistorySeries = (history, metric) => {
  const grouped = new Map();
  for (const entry of history.entries ?? []) {
    for (const point of entry.points ?? []) {
      if (point.provenance !== "measured") continue;
      const stat = metricStat(point[metric.key]);
      if (!stat) continue;
      const id = `${point.id}-${point.effort}`;
      if (!grouped.has(id)) {
        grouped.set(id, {
          id,
          label: `${point.modelName} [${point.effort}]`,
          points: [],
        });
      }
      grouped.get(id).points.push({
        measuredAt: point.measuredAt,
        value: stat.mean,
        n: stat.n,
        interval: intervalForStat(stat),
      });
    }
  }
  return [...grouped.values()];
};

const ragHistorySeries = (history, metric, labels) => {
  const grouped = new Map();
  for (const entry of history.entries ?? []) {
    for (const point of entry.points ?? []) {
      if (point.provenance !== "measured") continue;
      const stat = point[metric.key];
      if (!stat) continue;
      if (!grouped.has(point.id)) {
        grouped.set(point.id, {
          id: point.id,
          label: labels.get(point.id) ?? point.id,
          points: [],
        });
      }
      grouped.get(point.id).points.push({
        measuredAt: point.measuredAt,
        value: stat.mean,
        n: stat.n,
        interval: intervalForStat(stat),
      });
    }
  }
  return [...grouped.values()];
};

const renderHistoryCharts = ({
  idPrefix,
  titlePrefix,
  history,
  metrics,
  seriesFor,
}) => {
  if (!history) return "";
  const charts = metrics
    .map((metric) => {
      const series = seriesFor(metric);
      const pointCount = series.reduce((sum, s) => sum + s.points.length, 0);
      if (pointCount === 0) return "";
      return `### ${metric.title}

${renderTimeSeriesChart({
  id: `${idPrefix}-${metric.key}-history`,
  title: `${titlePrefix} ${metric.title}`,
  description: `${metric.title} by measured series over manual measurement history. Single-date histories are marked as one data point and do not draw a trend line.`,
  xLabel: "Measured at",
  yLabel: metric.yLabel,
  valueDigits: metric.valueDigits,
  series,
})}

_${chartCaption(series)}_`;
    })
    .filter((chart) => chart !== "");
  return charts.length === 0
    ? ""
    : `## 履歴チャート

以下のインライン SVG は実測履歴から生成します。fixture 経路では出力しません。

${charts.join("\n\n")}
`;
};

const top = (configs, key, direction = "desc", count = 8) =>
  configs
    .filter((config) => config.provenance === "measured")
    .toSorted((a, b) =>
      direction === "asc" ? key(a) - key(b) : key(b) - key(a),
    )
    .slice(0, count);

const modelRows = (configs) =>
  uniqueBy(
    configs.toSorted(
      (a, b) =>
        a.provider.localeCompare(b.provider) ||
        a.modelName.localeCompare(b.modelName),
    ),
    (config) => config.id,
  )
    .map((model) => {
      const efforts = configs
        .filter((config) => config.id === model.id)
        .map((config) => config.effort)
        .join(", ");
      return `| ${providerName(model.provider)} | ${model.modelName} | ${model.tier} | ${yen(model.inputCostPerMTok)} | ${yen(model.outputCostPerMTok)} | ${efforts} |`;
    })
    .join("\n");

const providerName = (provider) =>
  ({
    anthropic: "Anthropic",
    openai: "OpenAI",
    google: "Google",
    xai: "xAI",
  })[provider] ?? provider;

const topRows = (rows, columns) =>
  rows
    .map((config, index) => {
      const values = columns.map((column) => column(config));
      return `| ${index + 1} | ${values.join(" | ")} |`;
    })
    .join("\n");

// Every measured config, all metrics — so models that never crack a top-8
// leaderboard (e.g. GPT Realtime) are still visible with their numbers.
const completeRows = (configs) =>
  configs
    .filter((config) => config.provenance === "measured")
    .toSorted(
      (a, b) =>
        a.provider.localeCompare(b.provider) ||
        a.modelName.localeCompare(b.modelName) ||
        String(a.effort).localeCompare(String(b.effort)),
    )
    .map(
      (c) =>
        `| ${providerName(c.provider)} | ${c.modelName} | ${c.effort} | ${llmMetric(c.stats.throughputTokensPerSec)} | ${llmMetric(c.stats.ttftMs)} | ${llmMetric(c.stats.totalLatencyMs)} | ${llmMetric(c.stats.maxSchemaDepth)} | ${llmMetric(c.stats.maxSchemaBreadth)} | ${llmPercent(c.stats.lengthAccuracy)} |`,
    )
    .join("\n");

const exportLlm = () => {
  const { sourceArtifact, result } = readArtifact(
    "docs/research-reports/llm-model-comparison.real.data.json",
    "docs/research-reports/llm-model-comparison.data.json",
  );
  const configs = result.configs;
  const providers = new Set(configs.map((config) => config.provider)).size;
  const models = new Set(configs.map((config) => config.id)).size;
  const measured = configs.filter(
    (config) => config.provenance === "measured",
  ).length;
  const history = isRealArtifact(sourceArtifact)
    ? existsJson("docs/research-reports/llm-model-comparison.history.json")
    : undefined;
  const historyCharts = renderHistoryCharts({
    idPrefix: "export-llm",
    titlePrefix: "LLM",
    history,
    metrics: llmHistoryMetrics,
    seriesFor: (metric) => llmHistorySeries(history, metric),
  });

  writeDraft(
    "foundation-model-comparison",
    `${frontmatter({
      sourceArtifact,
      generatedAt: result.generatedAt,
      trials: result.trials,
      provenance: provenanceFor(configs),
    })}

# 基盤モデル比較調査

この調査は \`${result.generatedAt}\` に生成されたレポートです。${providers}プロバイダー、${models}モデル、${configs.length}件のモデル×effort構成を対象にしています。ライブ測定された構成は ${measured} 件です。

## 1. 調査の目的

アプリケーション開発時、モデル選択の参考とすることを目的としています。一般能力の順位表ではなく、用途ごとの制約に対して候補を減らすための測定表として扱います。

## 2. 測定対象

effort はプロバイダーごとに意味が異なり、Anthropic の \`output_config.effort\`、OpenAI の \`reasoning_effort\`、Google の thinking budget などに対応します。effort が \`n/a\` の行は、モデルにユーザー選択可能な effort 制御がないことを示します。測定値側の \`n/a (...)\` とは意味が異なります。

| 測定対象 | 測っているもの | 読み方 |
| --- | --- | --- |
| スループット | 長いストリーミング生成で、生成開始後に継続して出るトークン数 | 長文生成、要約、バッチ処理では高いほど扱いやすい |
| TTFT | 短いプロンプトで最初のトークンが返るまでの時間 | 対話 UI、補完、ツール実行前の応答では低いほど扱いやすい |
| 合計レイテンシ | 短いプロンプトで応答が完了するまでの時間 | 体感速度を見る指標で、低いほど扱いやすい |
| JSON スキーマ深度 | 構造化出力で準拠できた最大ネスト深度 | 深い JSON を返す処理では高いほど余裕がある |
| JSON スキーマ幅 | 構造化出力で準拠できた最大フィールド数 | 横に広い JSON を返す処理では高いほど余裕がある |
| 長さ精度 | 100 語ちょうどの段落を求めたときの追従性 | 文字数・語数制約が厳しい出力では高いほど扱いやすい |
| コスト | 100 万 input / output tokens あたりのカタログ価格 | 用途の入出力量に合わせて、性能指標と同時に見る |

## 3. モデルと価格

価格は 100 万 tokens あたりのカタログ値です。実際の費用は、入力量、出力量、再試行、ツール呼び出し、キャッシュ利用で変わります。

| Provider | Model | Tier | Input $/MTok | Output $/MTok | 測定した effort |
| --- | --- | --- | ---: | ---: | --- |
${modelRows(configs)}

## 4. 範囲と制約

- 各構成×測定項目は ${result.trials} 試行。値は平均 ± 95% 信頼区間で示す。
- 結果は \`${result.generatedAt}\` 時点のモデルと API の挙動です。
- モデル名、価格、tier は生成日時点のカタログ情報に依存します。
- effort の意味はプロバイダーごとに異なるため、横断比較では慎重に扱います。
- この測定は狭い挙動だけを測り、一般能力や推論品質を測りません。

${historyCharts}
## 5. 指標別の観測（スループット）

長いストリーミング生成で、生成開始後に継続して出るトークン数を測ります。

| 順位 | Provider | Model | Effort | スループット (tok/s) | 長さ精度 |
| ---: | --- | --- | --- | ---: | ---: |
${topRows(
  top(configs, (c) => c.stats.throughputTokensPerSec.mean),
  [
    (c) => providerName(c.provider),
    (c) => c.modelName,
    (c) => c.effort,
    (c) => llmMetric(c.stats.throughputTokensPerSec),
    (c) => llmPercent(c.stats.lengthAccuracy),
  ],
)}

## 6. 指標別の観測（TTFT）

短いプロンプトで最初のトークンが返るまでの時間を測ります。

| 順位 | Provider | Model | Effort | TTFT (ms) | 合計レイテンシ (ms) |
| ---: | --- | --- | --- | ---: | ---: |
${topRows(
  top(configs, (c) => c.stats.ttftMs.mean, "asc"),
  [
    (c) => providerName(c.provider),
    (c) => c.modelName,
    (c) => c.effort,
    (c) => llmMetric(c.stats.ttftMs),
    (c) => llmMetric(c.stats.totalLatencyMs),
  ],
)}

## 7. 指標別の観測（合計レイテンシ）

短いプロンプトで応答が完了するまでの時間を測ります。

| 順位 | Provider | Model | Effort | 合計レイテンシ (ms) | TTFT (ms) |
| ---: | --- | --- | --- | ---: | ---: |
${topRows(
  top(configs, (c) => c.stats.totalLatencyMs.mean, "asc"),
  [
    (c) => providerName(c.provider),
    (c) => c.modelName,
    (c) => c.effort,
    (c) => llmMetric(c.stats.totalLatencyMs),
    (c) => llmMetric(c.stats.ttftMs),
  ],
)}

## 8. 指標別の観測（構造化出力）

JSON スキーマに沿って返せる構造の深さと幅を測ります。構造化出力モードに対してネスト深度とフィールド幅を段階的に増やし、スキーマに準拠した出力が返る最大値を記録します。

| 順位 | Provider | Model | Effort | 最大深度 | 最大幅 |
| ---: | --- | --- | --- | ---: | ---: |
${topRows(
  top(configs, (c) => c.stats.maxSchemaDepth.mean),
  [
    (c) => providerName(c.provider),
    (c) => c.modelName,
    (c) => c.effort,
    (c) => llmMetric(c.stats.maxSchemaDepth),
    (c) => llmMetric(c.stats.maxSchemaBreadth),
  ],
)}

## 9. 指標別の観測（長さ精度）

指定した語数にどれだけ近い出力を返せるかを測ります。

| 順位 | Provider | Model | Effort | 長さ精度 |
| ---: | --- | --- | --- | ---: |
${topRows(
  top(configs, (c) => c.stats.lengthAccuracy.mean, "asc"),
  [
    (c) => providerName(c.provider),
    (c) => c.modelName,
    (c) => c.effort,
    (c) => llmPercent(c.stats.lengthAccuracy),
  ],
)}

## 10. 全構成の測定結果

上位 8 位の観測表に載らない構成も含め、ライブ測定した全 ${measured} 構成の値を一覧します。GPT Realtime のように、どの指標でも上位に入らないために順位表へ現れないモデルも、ここで実測値を確認できます。Realtime API は音声対話向けの API で、構造化出力（JSON スキーマ）に対応しないため、最大深度・最大幅は 0 になります。

| Provider | Model | Effort | スループット (tok/s) | TTFT (ms) | 合計レイテンシ (ms) | 最大深度 | 最大幅 | 長さ精度 |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
${completeRows(configs)}

${kousatsuSection(
  11,
  "llm-model-comparison",
  "モデル選択では、まず用途の失敗条件を決めます。長い生成を大量に回す用途ではスループットと output cost を優先し、短い対話 UI では TTFT と合計レイテンシを優先します。深い JSON や広い JSON を返す処理では構造化出力の深度・幅を先に見ます。厳密な語数制約がある出力では、長さ精度の低い構成を候補から外します。この調査はモデルの一般能力を測っていません。",
)}

## 12. 再現方法

調査は公開リポジトリ \`qmu/research\` で再生成できます。API キーなしの fixture データ生成、プロバイダー呼び出しなしの見積もり、実プロバイダーでの sweep が分かれています。

\`\`\`sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

npm run compare:fixture
npm run compare -- --estimate
npm run compare
\`\`\`

公開判断に使う場合は、\`apiModelId\` と生成日時を記録し、同じ表示名のモデルでも API 側の実体が変わり得ることを前提に扱います。`,
  );
};

const kindLabel = (kind) =>
  kind === "self-managed" ? "自己管理" : "マネージド";
const provLabel = (p) =>
  ({ measured: "実測", fixtured: "fixture", error: "エラー" })[p] ?? p;
const percent1 = (value) => `${(value * 100).toFixed(1)}%`;
const ms = (value) => `${Number(value).toFixed(1)}`;
const ci = (metric, key) =>
  metric[`${key}Ci95`] ?? { lower: metric[key], upper: metric[key] };
const ciHalfWidth = (interval) =>
  Math.max(0, (interval.upper - interval.lower) / 2);
const percentWithCi = (metric, key) =>
  `${percent1(metric[key])} ± ${(ciHalfWidth(ci(metric, key)) * 100).toFixed(1)}pp`;
const decimalWithCi = (metric, key) =>
  `${Number(metric[key]).toFixed(3)} ± ${ciHalfWidth(ci(metric, key)).toFixed(3)}`;
const msWithStdDev = (mean, deviation = 0) => `${ms(mean)} ± ${ms(deviation)}`;

const ragRankRows = (runs, columns) =>
  runs
    .map(
      (run, index) =>
        `| ${index + 1} | ${columns.map((c) => c(run)).join(" | ")} |`,
    )
    .join("\n");

const exportRag = () => {
  const { sourceArtifact, result } = readArtifact(
    "docs/research-reports/rag-benchmark.real.data.json",
    "docs/research-reports/rag-benchmark.data.json",
  );
  const runs = result.runs;
  const measured = runs.filter((r) => r.provenance === "measured");
  const errored = runs.filter((r) => r.provenance === "error");
  const fixtureModel =
    measured.find((r) => r.backend.embeddingCoupling === "fixed")
      ?.embeddingModel ?? "n/a";
  const k = runs[0]?.k ?? 3;
  const isReal = result.dataset.id !== "scifact-mini";
  const history = isRealArtifact(sourceArtifact)
    ? existsJson("docs/research-reports/rag-benchmark.history.json")
    : undefined;
  const labels = new Map(runs.map((run) => [run.backend.id, run.backend.name]));
  const historyCharts = renderHistoryCharts({
    idPrefix: "export-rag",
    titlePrefix: "RAG",
    history,
    metrics: ragHistoryMetrics,
    seriesFor: (metric) => ragHistorySeries(history, metric, labels),
  });

  const catalogRows = runs
    .map(
      (r) =>
        `| ${r.backend.name} | ${kindLabel(r.backend.kind)} | ${r.backend.embeddingCoupling} | ${r.backend.isolatedStore ? "はい" : "いいえ"} | ${r.backend.metadataFiltering ? "あり" : "なし"} | ${provLabel(r.provenance)} |`,
    )
    .join("\n");

  const byRecall = measured.toSorted(
    (a, b) => b.retrieval.recallAtK - a.retrieval.recallAtK,
  );
  const byIngest = measured.toSorted(
    (a, b) => a.operational.ingestMs - b.operational.ingestMs,
  );
  const byLatency = measured.toSorted(
    (a, b) => a.operational.queryLatencyP50Ms - b.operational.queryLatencyP50Ms,
  );

  const opsRows = runs
    .map(
      (r) =>
        `| ${r.backend.name} | ${kindLabel(r.backend.kind)} | ${r.backend.isolatedStore ? "はい" : "いいえ"} | ${r.backend.metadataFiltering ? "あり" : "なし"} | ${r.backend.costNote} |`,
    )
    .join("\n");

  const erroredNote =
    errored.length > 0
      ? errored
          .map(
            (r) =>
              `- **${r.backend.name}** は実測できませんでした（エラーとして記録）。${r.backend.ingestionNote ?? ""}`,
          )
          .join("\n")
      : "- 実測できなかったバックエンドはありません。";

  const deterministicNote = isReal
    ? `運用指標は ${result.trials} 試行の平均±標本標準偏差です。検索品質は ${result.dataset.queries.length} クエリ上の 95% 信頼区間で、自己管理ストアでは固定 embedding と同一 kNN により検索品質は決定的です。マネージドストアの信頼区間はクエリ集合上の区間で、サービス側の試行間変動は run-to-run spread として別に記録します。`
    : `fixture データでは運用指標を ${result.trials} 試行の平均±標本標準偏差として表示します。検索品質の区間は ${result.dataset.queries.length} クエリ上の 95% 信頼区間です。`;

  const spreadNotes = runs
    .filter((r) => r.retrieval.trialStdDev)
    .map(
      (r) =>
        `- **${r.backend.name}** の検索品質 run-to-run 標準偏差（${r.retrieval.trialCount} 試行）: recall ${(r.retrieval.trialStdDev.recallAtK * 100).toFixed(1)}pp、nDCG ${(r.retrieval.trialStdDev.ndcgAtK * 100).toFixed(1)}pp、MRR ${r.retrieval.trialStdDev.mrr.toFixed(3)}。`,
    )
    .join("\n");

  writeDraft(
    "vector-db-comparison",
    `${frontmatter({
      sourceArtifact,
      generatedAt: result.generatedAt,
      trials: result.trials,
      provenance: provenanceFor(runs),
    })}

# RAG Vector Store 比較調査

この調査は \`${result.generatedAt}\` に生成したレポートです。${runs.length}件のバックエンドを対象に、そのうち ${measured.length} 件をライブ測定しました。データセットは \`${result.dataset.id}\`（${result.dataset.documents.length}文書、${result.dataset.queries.length}クエリ、${result.dataset.qrels.length} relevance judgment）です。${isReal ? "検索品質は、自己管理ストアに共通の固定 embedding を与えた store-isolated な測定です。" : "現在の公開データはキー不要の fixture 行であり、バックエンド比較の結論ではありません。"} ${deterministicNote}

## 1. 調査の目的

RAG システムで使うベクトルストアを、検索品質・レイテンシ・コスト・運用制約から選ぶための再現可能な測定表を作ることを目的としています。一般的な優劣の順位表ではなく、用途ごとの制約に対して候補を絞るための資料として扱います。

## 2. 測定対象

自己管理ストア（sqlite-vec / S3 Vectors / Vectorize）には共通の固定 embedding（\`${fixtureModel}\`）を与え、ストア単体を比較します。マネージドストア（OpenAI Vector Store / AutoRAG）は embedding と索引を内部で行うため、ストア単体ではなく whole-stack の測定として扱い、store-isolated 列を「いいえ」とします。

| 測定対象 | 測っているもの | 読み方 |
| --- | --- | --- |
| recall@${k} | 正解文書が上位 ${k} 件に含まれる割合 | 高いほど必要な文書を拾いやすい |
| nDCG@${k} | 順位を考慮した graded relevance | 高いほど正解が上位に来やすい |
| MRR | 最初の正解が出る順位の逆数 | 高いほど最初の有用結果が早い |
| 取り込み時間 | 文書を索引へ登録するまでの時間 | 初期投入や再構築の運用負荷を見る |
| クエリレイテンシ | 検索リクエストの p50 / p95 | ユーザー応答やエージェント処理時間を見る |
| コスト | API / ストレージ / クエリ費用 | スケール時の継続費用を見る |
| store-isolated | 固定 embedding か、マネージド側に内包されるか | ストア単体比較か whole-stack 比較かを分ける |

## 3. バックエンドと分類

| Backend | 種別 | Embedding | store-isolated | メタデータフィルタ | 測定 |
| --- | --- | --- | --- | --- | --- |
${catalogRows}

## 4. 範囲と制約

- 運用指標（取り込み時間、クエリレイテンシ）は ${result.trials} 試行の平均±標本標準偏差です。
- 検索品質（recall@${k}、nDCG@${k}、MRR）は ${result.dataset.queries.length} クエリ上の 95% 信頼区間つきで表示します。
- 結果は \`${result.generatedAt}\` 時点のサービス挙動で、レイテンシは実行環境とネットワークに依存します。
- 自己管理ストアは同一の固定 embedding を共有するため検索品質は決定的で、試行を増やして検索品質の分散を作りません。
- マネージドストアは内部 embedding とチャンク分割を含む whole-stack の測定であり、固定 embedding 行と同列には比較しません。
- 価格は生成日時点のカタログ値を引用しており、実費は入力量・保存量・クエリ数で変わります。

${historyCharts}
## 5. 指標別の観測（検索品質）

固定 embedding を与えた自己管理ストアと、内部 embedding のマネージドストアを、recall@${k} / nDCG@${k} / MRR で比較します。実測したバックエンドのみを掲載します。

| 順位 | Backend | 種別 | Recall@${k} (95% CI) | nDCG@${k} (95% CI) | MRR (95% CI) |
| ---: | --- | --- | ---: | ---: | ---: |
${ragRankRows(byRecall, [
  (r) => r.backend.name,
  (r) => kindLabel(r.backend.kind),
  (r) => percentWithCi(r.retrieval, "recallAtK"),
  (r) => percentWithCi(r.retrieval, "ndcgAtK"),
  (r) => decimalWithCi(r.retrieval, "mrr"),
])}

${spreadNotes || "マネージド検索品質の run-to-run 標準偏差は記録されていません。"}

## 6. 指標別の観測（取り込み時間）

データセット全体を索引へ登録するまでの時間です。マネージドや eventually-consistent なストアでは、索引が検索可能になるまでの待ち時間を含みます。

| 順位 | Backend | 種別 | 取り込み (ms, mean±sd) |
| ---: | --- | --- | ---: |
${ragRankRows(byIngest, [
  (r) => r.backend.name,
  (r) => kindLabel(r.backend.kind),
  (r) => msWithStdDev(r.operational.ingestMs, r.operational.ingestMsStdDev),
])}

## 7. 指標別の観測（クエリレイテンシ）

検索リクエストが返るまでの時間の p50 / p95 です。対話 UI やエージェント処理では低いほど扱いやすい指標です。

| 順位 | Backend | 種別 | p50 (ms, mean±sd) | p95 (ms, mean±sd) |
| ---: | --- | --- | ---: | ---: |
${ragRankRows(byLatency, [
  (r) => r.backend.name,
  (r) => kindLabel(r.backend.kind),
  (r) =>
    msWithStdDev(
      r.operational.queryLatencyP50Ms,
      r.operational.queryLatencyP50MsStdDev,
    ),
  (r) =>
    msWithStdDev(
      r.operational.queryLatencyP95Ms,
      r.operational.queryLatencyP95MsStdDev,
    ),
])}

## 8. コストと運用制約

| Backend | 種別 | store-isolated | メタデータフィルタ | コスト |
| --- | --- | --- | --- | --- |
${opsRows}

実測できなかったバックエンドの扱い:

${erroredNote}

${kousatsuSection(
  9,
  "rag-benchmark",
  "ストア選択では、まず用途の失敗条件を決めます。検索品質は固定 embedding を共有する自己管理ストア間ではほぼ同水準に収束するため、実運用の差はレイテンシ・取り込み時間・コスト・メタデータフィルタ・スケール上限に表れます。この調査はベクトルストアの一般的な優劣を決めるものではなく、固定 embedding を前提とした検索品質と、実運用で効く運用指標に対して候補を絞るための基礎資料です。",
)}

## 10. 再現方法

調査は公開リポジトリ \`qmu/research\` で再生成できます。API キー不要の fixture データ生成と、実バックエンドでの sweep が分かれています。実測は BEIR SciFact サブセットを取得してから実行します（コーパス本文は再配布せず、選定した id と qrels のみをコミットしています）。

\`\`\`sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

# API キー不要の fixture データ生成
npm run rag:fixture

# 費用見積もり
npm run rag:estimate

# 実測（SciFact サブセットを取得してから実行）
../../scripts/fetch-scifact.sh
npm run rag:real -- --trials 5
\`\`\`

公開判断に使う場合は、データセット・embedding モデル・バックエンド・生成日時・provenance を記録し、fixture 行・実測行・エラー行を分けて扱います。`,
  );
};

// --- OCR ---------------------------------------------------------------------

const ocrStat = (stat, asPercent) => {
  if (!stat || !Number.isFinite(stat.mean)) return "n/a";
  const mean = asPercent
    ? `${(stat.mean * 100).toFixed(1)}%`
    : `${(stat.mean * 100).toFixed(1)}%`;
  return stat.n < 2
    ? `${mean} (n=${stat.n})`
    : `${mean} ± ${(llmCi95HalfWidth(stat) * 100).toFixed(1)}pp (95%信頼区間, n=${stat.n})`;
};

const exportOcr = () => {
  const { sourceArtifact, result } = readArtifact(
    "docs/research-reports/ocr-comparison.real.data.json",
    "docs/research-reports/ocr-comparison.data.json",
  );
  const runs = result.runs;
  const measured = runs.filter((r) => r.provenance === "measured");
  const providers = new Set(runs.map((r) => r.provider)).size;
  const doc = result.dataset?.dataset ?? result.dataset ?? {};
  const docCount = doc.documents?.length ?? doc.documentCount ?? "—";

  const byCer = measured.toSorted(
    (a, b) => a.stats.characterErrorRate.mean - b.stats.characterErrorRate.mean,
  );
  const byWer = measured.toSorted(
    (a, b) => a.stats.wordErrorRate.mean - b.stats.wordErrorRate.mean,
  );
  const byField = measured.toSorted(
    (a, b) => b.stats.fieldAccuracy.mean - a.stats.fieldAccuracy.mean,
  );

  const rankRows = (rows, columns) =>
    rows
      .map(
        (r, i) => `| ${i + 1} | ${columns.map((c) => c(r)).join(" | ")} |`,
      )
      .join("\n");

  const completeOcrRows = runs
    .toSorted(
      (a, b) =>
        a.provider.localeCompare(b.provider) ||
        a.modelName.localeCompare(b.modelName),
    )
    .map(
      (r) =>
        `| ${providerName(r.provider)} | ${r.modelName} | ${provLabel(r.provenance)} | ${ocrStat(r.stats.characterErrorRate)} | ${ocrStat(r.stats.wordErrorRate)} | ${ocrStat(r.stats.fieldAccuracy)} |`,
    )
    .join("\n");

  writeDraft(
    "ocr-comparison",
    `${frontmatter({
      sourceArtifact,
      generatedAt: result.generatedAt,
      trials: result.trials,
      provenance: provenanceFor(runs),
    })}

# OCR 能力比較調査

この調査は \`${result.generatedAt}\` に生成したレポートです。${runs.length} モデルを対象に、そのうち ${measured.length} 件をライブ測定しました。文書画像を視覚対応モデルへ入力し、文字起こしの正確さ（CER / WER）と、構造化抽出のフィールド精度を測ります。データセットは合成文書フィクスチャ \`${doc.id ?? "n/a"}\`（${docCount} 文書）です。

## 1. 調査の目的

文書 OCR / 視覚読み取りを行うモデルを、文字起こしの正確さと構造化抽出の正確さから選ぶための再現可能な測定表を作ることを目的としています。一般的な優劣ではなく、用途ごとの制約に対して候補を絞るための資料として扱います。

## 2. 測定対象

| 測定対象 | 測っているもの | 読み方 |
| --- | --- | --- |
| 文字誤り率 (CER) | 正解文字列に対する編集距離ベースの文字単位誤り率 | 低いほど文字起こしが正確 |
| 単語誤り率 (WER) | 単語単位の誤り率 | 低いほど語の取りこぼし・誤りが少ない |
| フィールド精度 | 構造化抽出で正しく取れたフィールドの割合 | 高いほど帳票項目の抽出が正確 |

## 3. 範囲と制約

- 各モデル×文書は ${result.trials} 試行です。CER / WER / フィールド精度は平均 ± 95% 信頼区間で示します。
- データセットはリポジトリ生成の**合成文書フィクスチャ**であり、実文書の難易度・多様性を代表しません。値は相対比較の目安です。
- 視覚入力に対応しないモデル、および API キーのないモデルは fixture 行として扱い、実測と混同しません。
- 結果は \`${result.generatedAt}\` 時点のモデルと API の挙動です。

## 4. 指標別の観測（文字誤り率 CER・低いほど良い）

| 順位 | Provider | Model | CER | フィールド精度 |
| ---: | --- | --- | ---: | ---: |
${rankRows(byCer, [
  (r) => providerName(r.provider),
  (r) => r.modelName,
  (r) => ocrStat(r.stats.characterErrorRate),
  (r) => ocrStat(r.stats.fieldAccuracy),
])}

## 5. 指標別の観測（単語誤り率 WER・低いほど良い）

| 順位 | Provider | Model | WER | CER |
| ---: | --- | --- | ---: | ---: |
${rankRows(byWer, [
  (r) => providerName(r.provider),
  (r) => r.modelName,
  (r) => ocrStat(r.stats.wordErrorRate),
  (r) => ocrStat(r.stats.characterErrorRate),
])}

## 6. 指標別の観測（フィールド精度・高いほど良い）

| 順位 | Provider | Model | フィールド精度 | CER |
| ---: | --- | --- | ---: | ---: |
${rankRows(byField, [
  (r) => providerName(r.provider),
  (r) => r.modelName,
  (r) => ocrStat(r.stats.fieldAccuracy),
  (r) => ocrStat(r.stats.characterErrorRate),
])}

## 7. 全モデルの測定結果

ライブ測定した全 ${measured.length} 件に加え、視覚未対応・キー不在の fixture 行も含めて一覧します。

| Provider | Model | 測定 | CER | WER | フィールド精度 |
| --- | --- | --- | ---: | ---: | ---: |
${completeOcrRows}

${kousatsuSection(
  8,
  "ocr-comparison",
  "合成フィクスチャ上では多くの視覚対応モデルが CER / WER をほぼ 0、フィールド精度をほぼ 100% に収束させます。実運用では文書の劣化・レイアウト・多言語で差が開くため、この表は相対比較の出発点として扱い、対象文書に近いサンプルでの再測定を前提にします。",
)}

## 9. 再現方法

調査は公開リポジトリ \`qmu/research\` で再生成できます。API キー不要の合成フィクスチャ生成と、実モデルでの測定が分かれています。

\`\`\`sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

npm run ocr:fixture
npm run ocr:estimate
npm run ocr:real
\`\`\`

公開判断に使う場合は、データセット・モデル・生成日時・provenance を記録し、fixture 行と実測行を分けて扱います。`,
  );
};

// --- Availability ------------------------------------------------------------

const availPct = (value) =>
  typeof value === "number" ? `${(value * 100).toFixed(3)}%` : "—";
const availHours = (minutes) =>
  typeof minutes === "number" ? `${(minutes / 60).toFixed(1)} 時間` : "—";
const availDash = (value) => (value ? value : "—");

const availTrendRows = (trends, key) =>
  trends
    .map((t) => {
      if (!t.available) {
        return `| ${providerName(t.provider)} | 取得不可 | — | — | — | — |`;
      }
      const w = t[key];
      return `| ${providerName(t.provider)} | ${availPct(w.uptimePct)} | ${w.incidentCount} | ${w.majorIncidentCount} | ${availHours(w.downtimeMinutes)} | ${availHours(w.maintenanceMinutes)} |`;
    })
    .join("\n");

const exportAvailability = () => {
  const { sourceArtifact, result } = readArtifact(
    "docs/research-reports/llm-availability.real.data.json",
    "docs/research-reports/llm-availability.data.json",
  );
  const trends = (result.trends ?? [])
    .slice()
    .toSorted((a, b) => a.provider.localeCompare(b.provider));
  const measuredNote = result.fixture
    ? "現在の公開データはコミット済みの累積履歴からのキー不要レンダーです。"
    : "各社ステータスページをライブ取得し、LLM で抽出して履歴を更新した結果です。";

  const provenanceRows = trends
    .map(
      (t) =>
        `| ${providerName(t.provider)} | [\`${t.sourceUrl}\`](${t.sourceUrl}) | ${t.sourceKind} | ${t.asOf} | ${t.incidentTotal} | ${availDash(t.extraction?.model)} | ${t.available ? "ok" : `失敗: ${availDash(t.note)}`} |`,
    )
    .join("\n");

  writeDraft(
    "availability-comparison",
    `${frontmatter({
      sourceArtifact,
      generatedAt: result.generatedAt,
      trials: trends.length,
      provenance: result.fixture ? "fixtured" : "measured",
    })}

# 可用性の観測（ステータスページ履歴・30/90 日トレンド）

この記録は各社の**公開ステータスページのインシデント履歴**から構築した**時系列の可用性記録**です（as of \`${result.asOf}\`）。フォーマットが各社で割れるステータスページを **LLM が読み取り**、共通スキーマのインシデントへ正規化してリポジトリに**累積**します。以下のアップタイムは各社が報告したインシデントから impact 重み付きで**導出**した値であり、当方によるモデル API の測定ではありません。${measuredNote}

> **これは SLA でもランキングでもありません。** 導出アップタイムは各社の自己報告インシデントをローリング窓で重み付き集計した**指標**であり、サービス保証や「最も信頼できる」といった断定ではありません。プロバイダーは五十音順に並べます。重み: critical ×1.0、major ×0.5、minor ×0.1、計画メンテナンスは除外し別掲。各社でインシデントの粒度が大きく異なるため、単一インシデントが指標に寄与するのは最大 **24 時間**までとし（実際の継続時間はインシデント記録に保持）、長時間・特定プロダクト限定の事象が指標を支配しないようにしています。

## 1. 直近 30 日

| Provider | 導出アップタイム | インシデント | major/critical | ダウンタイム | メンテナンス |
| --- | ---: | ---: | ---: | ---: | ---: |
${availTrendRows(trends, "window30")}

## 2. 直近 90 日

| Provider | 導出アップタイム | インシデント | major/critical | ダウンタイム | メンテナンス |
| --- | ---: | ---: | ---: | ---: | ---: |
${availTrendRows(trends, "window90")}

## 3. 読み方と制約

- アップタイムは各社報告インシデントからの**導出値**（impact 重み付き）であり、各社公表の SLA・稼働率とは定義が異なります。
- 取得不可のプロバイダー（例: Cloudflare でブロックされる提供元）は「取得不可」と正直に記録し、値を捏造しません。
- 窓は as of 時点からのローリング 30／90 日です。日次アップタイムの推移チャートは公開リポジトリの \`docs/research-reports/llm-availability.md\` に描画されます。

## 4. 取得元（provenance）

各社の記録は、公開ステータスソース・取得基準時（as of）・抽出に用いた LLM モデルまで辿れます。

| Provider | Source | 形式 | as of | 記録インシデント数 | 抽出モデル | 取得 |
| --- | --- | --- | --- | ---: | --- | --- |
${provenanceRows}

${kousatsuSection(
  5,
  "llm-availability",
  "各社ステータスページの累積履歴からの導出トレンドであり、断定的な可用性比較や SLA には使えません。継続的な評価には定期取得と長期の窓が必要です。",
)}

## 6. 再現方法

調査は公開リポジトリ \`qmu/research\` で再生成できます。キー不要の \`--fixture\` は累積履歴から 30/90 日トレンドを描画し、real 経路は公開ステータスページを取得して LLM 抽出で履歴を更新します。

\`\`\`sh
git clone https://github.com/qmu/research
cd research/packages/tech
npm install

npm run availability:fixture   # keyless: 累積履歴から描画
npm run availability:estimate  # 見積のみ
npm run availability           # real: 取得 + LLM 抽出で履歴更新
\`\`\`

公開判断に使う場合は、取得元・as of・抽出モデル・provenance を記録し、各社の報告からの導出値であることを明記します。`,
  );
};

if (process.env.EXPORT_LEGACY_LLM_COMPARISON === "1") exportLlm();
exportRag();
exportOcr();
exportAvailability();
