#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const draftDir = resolve(repoRoot, "docs/llm-foundation/_generated");
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
  console.log(`generated docs/llm-foundation/_generated/${relativePath}`);
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

## 11. 総合比較

モデル選択では、まず用途の失敗条件を決めます。長い生成を大量に回す用途ではスループットと output cost を優先し、短い対話 UI では TTFT と合計レイテンシを優先します。深い JSON や広い JSON を返す処理では構造化出力の深度・幅を先に見ます。厳密な語数制約がある出力では、長さ精度の低い構成を候補から外します。

この調査はモデルの一般能力を測っていません。価格、速度、構造化出力、長さ制約というアプリケーション実装上の制約に対して、候補を絞るための基礎資料です。

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

## 9. 総合比較

ストア選択では、まず用途の失敗条件を決めます。検索品質は固定 embedding を共有する自己管理ストア間ではほぼ同水準に収束するため、実運用の差はレイテンシ・取り込み時間・コスト・メタデータフィルタ・スケール上限に表れます。

- 低レイテンシと単純な運用を優先する場合は、ローカルの sqlite-vec や、リクエスト単価の低い自己管理ストアを検討します。
- エッジ配信や Workers との結合を重視する場合は Cloudflare Vectorize を候補にしますが、書き込みが eventually-consistent である点を取り込み時間として見込みます。
- embedding からチャンク分割・索引までをプロバイダー側に委ねたい場合は、OpenAI Vector Store や AutoRAG などの whole-stack を選びます。この場合の数値はストア単体ではなくスタック全体の挙動です。
- AutoRAG のように索引が非同期（ダッシュボード連携やスケジュール同期）なサービスは、同期的なベンチマークでは実測が難しく、その場合はエラーとして正直に記録します。

この調査はベクトルストアの一般的な優劣を決めるものではなく、固定 embedding を前提とした検索品質と、実運用で効く運用指標に対して候補を絞るための基礎資料です。

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

exportLlm();
exportRag();
