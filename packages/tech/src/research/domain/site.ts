export const EN_RESEARCH_TITLE = "LLMs Research";
export const JA_RESEARCH_TITLE = "LLMs Research (Japanese)";

export type ResearchPage = Readonly<{
  text: string;
  link: string;
}>;

export type ResearchTopicPage = Readonly<{
  text: string;
  docsPath: string;
  summary: string;
}>;

export type MetricDirection =
  | "lower-is-better"
  | "higher-is-better"
  | "reference";

export type ResearchMetric = Readonly<{
  name: string;
  unit: string;
  direction: MetricDirection;
}>;

export type TrialsPerRun = Readonly<{
  minimum: number;
  maximum: number;
  premises: string;
}>;

export type CostBudget = Readonly<{
  ceilingUsd: number;
  premises: string;
}>;

/**
 * The per-topic research design the proposal-first protocol
 * (docs/research-development-guideline.md) agrees with the developer. Recorded
 * as shared metadata so the snapshot page, the cost gate before a real run,
 * and the accumulated history all read the same agreed values.
 */
export type ResearchDesign = Readonly<{
  cadence: string;
  offCadenceTrigger: string;
  subjects: string;
  metrics: ReadonlyArray<ResearchMetric>;
  trialsPerRun: TrialsPerRun;
  costPerRun: CostBudget;
  accumulates: string;
}>;

export type ResearchSiteTopic = Readonly<{
  id: string;
  artifactBase: string;
  npmScript: string;
  source: ResearchTopicPage;
  japanese: ResearchTopicPage;
  dataPath?: string;
  qmuSlug: string;
  design: ResearchDesign;
  /**
   * "snapshot": the sidebar page (source/japanese docsPath) is the compact
   * renderer-produced snapshot over the dated trial frames, and the full
   * trial report lives at `report.*` for archiving. Absent (default): the
   * sidebar page is the full report itself (pre-ADR-0005 layout).
   */
  articleMode?: "snapshot";
  report?: Readonly<{
    sourcePath: string;
    japanesePath: string;
  }>;
}>;

export type InternalResearchSource = Readonly<{
  id: string;
  artifactBase: string;
  npmScript: string;
  sourceForTopicIds: ReadonlyArray<string>;
  dataPaths: ReadonlyArray<string>;
  sideMarkdownPaths: ReadonlyArray<string>;
}>;

const stripMarkdown = (path: string): string => path.replace(/\.md$/, "");

const docsLink = (path: string): string =>
  `/${stripMarkdown(path.replace(/^docs\//, ""))}`;

export const overview = {
  source: { text: "Overview", link: "/research-reports/" },
  japanese: { text: "はじめに", link: "/llm-foundation/" },
} satisfies Readonly<{ source: ResearchPage; japanese: ResearchPage }>;

export const historyOverview = {
  source: { text: "History", link: "/research-reports/history" },
  japanese: { text: "History", link: "/llm-foundation/history" },
} satisfies Readonly<{ source: ResearchPage; japanese: ResearchPage }>;

export const publishedResearchTopics: ReadonlyArray<ResearchSiteTopic> = [
  {
    id: "foundation-models",
    artifactBase: "foundation-models",
    npmScript: "npm run research -- foundation-models --real",
    source: {
      text: "Foundation model catalog",
      docsPath: "docs/research-reports/foundation-models.md",
      summary:
        "A reference catalog of the compared models: provider, tier, price, effort, and API surface.",
    },
    japanese: {
      text: "対象基盤モデル（カタログ）",
      docsPath: "docs/research-reports/foundation-models.insights.ja.md",
      summary:
        "対象モデルのプロバイダー、tier、価格、effort、API サーフェスの参照カタログ。",
    },
    dataPath: "docs/research-reports/foundation-models.data.json",
    qmuSlug: "foundation-models",
    design: {
      cadence: "monthly",
      offCadenceTrigger: "a provider model release",
      subjects: "models in the shared model registry",
      metrics: [
        { name: "inputCostPerMTok", unit: "USD/MTok", direction: "reference" },
        { name: "outputCostPerMTok", unit: "USD/MTok", direction: "reference" },
      ],
      trialsPerRun: {
        minimum: 0,
        maximum: 0,
        premises: "curated catalog rows; no measurement calls",
      },
      costPerRun: {
        ceilingUsd: 0,
        premises: "keyless and costless; reads the committed model registry",
      },
      accumulates: "catalog revisions, one dated frame per archive",
    },
  },
  {
    id: "speed",
    artifactBase: "llm-speed-comparison",
    npmScript: "npm run research -- speed --real",
    source: {
      text: "LLM response speed",
      docsPath: "docs/research-reports/llm-speed-comparison.md",
      summary: "Sustained throughput, time-to-first-token, and total latency.",
    },
    japanese: {
      text: "LLM応答速度",
      docsPath: "docs/research-reports/llm-speed-comparison.insights.ja.md",
      summary: "持続スループット、time-to-first-token、総レイテンシの比較。",
    },
    dataPath: "docs/research-reports/llm-speed-comparison.data.json",
    qmuSlug: "llm-speed-comparison",
    design: {
      cadence: "monthly",
      offCadenceTrigger: "a major model release",
      subjects: "models in the foundation-models catalog",
      metrics: [
        { name: "ttftMs", unit: "ms", direction: "lower-is-better" },
        {
          name: "throughputTokensPerSec",
          unit: "tokens/s",
          direction: "higher-is-better",
        },
        { name: "totalLatencyMs", unit: "ms", direction: "lower-is-better" },
      ],
      trialsPerRun: {
        minimum: 1,
        maximum: 3,
        premises:
          "one repetition detects large movements; three bound run-to-run variance reported as stdDev",
      },
      costPerRun: {
        ceilingUsd: 60,
        premises:
          "shared `npm run compare` sweep; a 3-repetition full-catalog run measured about $46 (2026-07); run --estimate before each real run",
      },
      accumulates:
        "per-model HistoryPoint series for each speed metric, one point per dated frame",
    },
  },
  {
    id: "accuracy",
    artifactBase: "llm-accuracy-comparison",
    npmScript: "npm run research -- accuracy --real",
    source: {
      text: "LLM output accuracy",
      docsPath: "docs/research-reports/llm-accuracy-comparison.md",
      summary:
        "JSON-schema limits, length-instruction following, and information accuracy.",
    },
    japanese: {
      text: "LLM出力精度",
      docsPath: "docs/research-reports/llm-accuracy-comparison.insights.ja.md",
      summary: "JSON スキーマ制約、長さ指示追従、情報精度の比較。",
    },
    dataPath: "docs/research-reports/llm-accuracy-comparison.data.json",
    qmuSlug: "llm-accuracy-comparison",
    design: {
      cadence: "monthly",
      offCadenceTrigger: "a major model release",
      subjects: "models in the foundation-models catalog",
      metrics: [
        {
          name: "maxSchemaDepth",
          unit: "levels",
          direction: "higher-is-better",
        },
        {
          name: "maxSchemaBreadth",
          unit: "properties",
          direction: "higher-is-better",
        },
        {
          name: "lengthAccuracy",
          unit: "ratio",
          direction: "higher-is-better",
        },
      ],
      trialsPerRun: {
        minimum: 1,
        maximum: 3,
        premises:
          "one repetition detects large movements; three bound run-to-run variance reported as stdDev",
      },
      costPerRun: {
        ceilingUsd: 60,
        premises:
          "shared `npm run compare` sweep; a 3-repetition full-catalog run measured about $46 (2026-07); run --estimate before each real run",
      },
      accumulates:
        "per-model HistoryPoint series for each accuracy metric, one point per dated frame",
    },
  },
  {
    id: "availability",
    artifactBase: "llm-availability",
    npmScript: "npm run research -- availability --real",
    source: {
      text: "LLM API availability",
      docsPath: "docs/research-reports/llm-availability.md",
      summary:
        "Status-page incident history and derived 30/90-day availability trends.",
    },
    japanese: {
      text: "LLM API可用性",
      docsPath: "docs/research-reports/llm-availability.insights.ja.md",
      summary: "公開ステータスページ由来のインシデント履歴と 30/90 日の傾向。",
    },
    dataPath: "docs/research-reports/llm-availability.data.json",
    qmuSlug: "llm-availability",
    design: {
      cadence: "monthly",
      offCadenceTrigger: "a provider incident",
      subjects: "public provider status pages (Anthropic, OpenAI, Google, xAI)",
      metrics: [
        { name: "incidentTotal", unit: "count", direction: "lower-is-better" },
      ],
      trialsPerRun: {
        minimum: 1,
        maximum: 1,
        premises: "one observation reads each provider's public status history",
      },
      costPerRun: {
        ceilingUsd: 5,
        premises:
          "status-page fetches are free; cost is one LLM extraction call per provider; run availability:estimate first",
      },
      accumulates:
        "per-provider incident history in docs/research-reports/availability-history/*.json with 30/90-day windows",
    },
  },
  {
    id: "ocr",
    artifactBase: "ocr-comparison",
    npmScript: "npm run research -- ocr --real",
    source: {
      text: "OCR capability comparison",
      docsPath: "docs/research-reports/ocr-comparison.md",
      summary:
        "CER/WER and structured field extraction over synthetic documents.",
    },
    japanese: {
      text: "OCR能力の比較",
      docsPath: "docs/research-reports/ocr-comparison.insights.ja.md",
      summary: "視覚対応モデルの文字起こしと構造化抽出の比較。",
    },
    dataPath: "docs/research-reports/ocr-comparison.data.json",
    qmuSlug: "ocr-comparison",
    design: {
      cadence: "monthly",
      offCadenceTrigger: "a vision-capable model release",
      subjects: "vision-capable models in the foundation-models catalog",
      metrics: [
        {
          name: "characterErrorRate",
          unit: "ratio",
          direction: "lower-is-better",
        },
        { name: "wordErrorRate", unit: "ratio", direction: "lower-is-better" },
        { name: "fieldAccuracy", unit: "ratio", direction: "higher-is-better" },
      ],
      trialsPerRun: {
        minimum: 1,
        maximum: 3,
        premises:
          "one repetition detects large movements; three bound run-to-run variance reported as stdDev",
      },
      costPerRun: {
        ceilingUsd: 20,
        premises:
          "provider token/image charges over the synthetic document set; no measured baseline yet; run ocr:estimate first",
      },
      accumulates:
        "per-model HistoryPoint series for each OCR metric, one point per dated frame",
    },
  },
  {
    id: "rag",
    artifactBase: "rag-benchmark",
    npmScript: "npm run research -- rag --real",
    source: {
      text: "RAG vector store benchmark",
      docsPath: "docs/research-reports/rag-benchmark.md",
      summary:
        "Retrieval quality, ingestion time, query latency, cost, and operational constraints.",
    },
    japanese: {
      text: "RAGベクトルストアベンチマーク",
      docsPath: "docs/research-reports/rag-benchmark.insights.ja.md",
      summary:
        "検索品質、取り込み時間、クエリレイテンシ、コスト、運用制約の比較。",
    },
    dataPath: "docs/research-reports/rag-benchmark.data.json",
    qmuSlug: "rag-benchmark",
    design: {
      cadence: "monthly",
      offCadenceTrigger: "a new vector-store backend or embedding model",
      subjects: "vector-store backends behind the shared RAG harness",
      metrics: [
        { name: "recallAtK", unit: "ratio", direction: "higher-is-better" },
        { name: "ndcgAtK", unit: "ratio", direction: "higher-is-better" },
        {
          name: "queryLatencyP50Ms",
          unit: "ms",
          direction: "lower-is-better",
        },
        { name: "costUsd", unit: "USD", direction: "lower-is-better" },
      ],
      trialsPerRun: {
        minimum: 1,
        maximum: 5,
        premises:
          "retrieval quality is deterministic per dataset; five trials bound operational latency variance",
      },
      costPerRun: {
        ceilingUsd: 10,
        premises:
          "local compute plus managed-backend usage when credentials are configured; run rag:estimate first",
      },
      accumulates:
        "per-backend HistoryPoint series for retrieval and latency metrics, one point per dated frame",
    },
  },
  {
    id: "llm-benchmark",
    artifactBase: "llm-benchmark",
    npmScript: "npm run benchmark",
    source: {
      text: "LLM exact-match benchmark",
      docsPath: "docs/research-reports/llm-benchmark.md",
      summary:
        "A small exact-match accuracy benchmark that exercises the publication pipeline.",
    },
    japanese: {
      text: "LLM完全一致ベンチマーク",
      docsPath: "docs/research-reports/llm-benchmark.ja.md",
      summary:
        "研究から公開までのパイプラインを再現できる小さな完全一致精度ベンチマーク。",
    },
    qmuSlug: "llm-benchmark",
    design: {
      cadence: "on demand",
      offCadenceTrigger: "a pipeline change that needs end-to-end exercise",
      subjects: "the configured model over the small exact-match task set",
      metrics: [
        { name: "exactMatch", unit: "ratio", direction: "higher-is-better" },
      ],
      trialsPerRun: {
        minimum: 1,
        maximum: 1,
        premises: "small task set; each request costs a few hundred tokens",
      },
      costPerRun: {
        ceilingUsd: 1,
        premises: "cost follows the selected model's pricing per request",
      },
      accumulates: "one dated frame per archived pipeline exercise",
    },
  },
];

/**
 * The pages a dated trial frame is copied from. For a snapshot topic the full
 * trial report lives at `report.*` (the sidebar page is the compact snapshot);
 * otherwise the sidebar page itself is the report.
 */
export const reportFrameSources = (
  topic: ResearchSiteTopic,
): Readonly<{ source: string; japanese: string }> => ({
  source: topic.report?.sourcePath ?? topic.source.docsPath,
  japanese: topic.report?.japanesePath ?? topic.japanese.docsPath,
});

export const internalResearchSources = [
  {
    id: "llm-model-comparison",
    artifactBase: "llm-model-comparison",
    npmScript: "npm run compare",
    sourceForTopicIds: ["speed", "accuracy"],
    dataPaths: [
      "docs/research-reports/llm-model-comparison.data.json",
      "docs/research-reports/llm-model-comparison.real.data.json",
      "docs/research-reports/llm-model-comparison.history.json",
    ],
    sideMarkdownPaths: [
      "docs/research-reports/llm-model-comparison.fixture.md",
      "docs/research-reports/llm-model-comparison.real.md",
    ],
  },
] satisfies ReadonlyArray<InternalResearchSource>;

// Backward-compatible name used by older entrypoints. It intentionally exposes
// only published topics, never internal measurement sources.
export const researchSiteTopics = publishedResearchTopics;

export const findPublishedResearchTopic = (
  id: string,
): ResearchSiteTopic | undefined =>
  publishedResearchTopics.find((topic) => topic.id === id);

export const findInternalResearchSource = (
  id: string,
): InternalResearchSource | undefined =>
  internalResearchSources.find((source) => source.id === id);

export const sourceResearchItems = (): ReadonlyArray<ResearchPage> => [
  overview.source,
  ...publishedResearchTopics.map((topic) => ({
    text: topic.source.text,
    link: docsLink(topic.source.docsPath),
  })),
  historyOverview.source,
];

export const japaneseResearchItems = (): ReadonlyArray<ResearchPage> => [
  overview.japanese,
  ...publishedResearchTopics.map((topic) => ({
    text: topic.japanese.text,
    link: docsLink(topic.japanese.docsPath),
  })),
  historyOverview.japanese,
];

export const publishSlugs = (): ReadonlyArray<string> =>
  publishedResearchTopics.map((topic) =>
    stripMarkdown(topic.japanese.docsPath).replace(/^docs\//, ""),
  );

export type PublishPlanEntry = Readonly<{
  sourceSlug: string;
  destinationSlug: string;
}>;

export const publishPlan = (): ReadonlyArray<PublishPlanEntry> =>
  publishedResearchTopics.map((topic) => ({
    sourceSlug: stripMarkdown(topic.japanese.docsPath).replace(/^docs\//, ""),
    destinationSlug: topic.qmuSlug,
  }));

export const historyStamp = (generatedAt: string): string =>
  generatedAt.replace(/[:.]/g, "-");

export type ReportFrameKind = "source" | "data" | "japanese";

export const historyPathFor = (
  topic: ResearchSiteTopic,
  generatedAt: string,
  kind: ReportFrameKind,
): string => {
  const stamp = historyStamp(generatedAt);
  const directory = `docs/research-reports/history/${topic.id}/${stamp}`;
  if (kind === "source") return `${directory}/${topic.artifactBase}.md`;
  if (kind === "japanese") return `${directory}/${topic.artifactBase}.ja.md`;
  return `${directory}/${topic.artifactBase}.data.json`;
};

export type ResearchHistoryFrame = Readonly<{
  topicId: string;
  generatedAt: string;
  sourcePath?: string;
  japanesePath?: string;
  dataPath?: string;
}>;

const sourceHistoryLink = (path: string): string => {
  const relative = path.replace(/^docs\/research-reports\//, "");
  return `./${path.endsWith(".md") ? stripMarkdown(relative) : relative}`;
};

const japaneseHistoryLink = (path: string): string => {
  const relative = path.replace(/^docs\//, "");
  return `../${path.endsWith(".md") ? stripMarkdown(relative) : relative}`;
};

const sortHistoryFrames = (
  frames: ReadonlyArray<ResearchHistoryFrame>,
): ReadonlyArray<ResearchHistoryFrame> =>
  [...frames].sort((left, right) =>
    right.generatedAt.localeCompare(left.generatedAt),
  );

const renderHistoryFrame = (
  frame: ResearchHistoryFrame,
  linkFor: (path: string) => string,
): string => {
  const links = [
    frame.sourcePath === undefined
      ? undefined
      : `[English](${linkFor(frame.sourcePath)})`,
    frame.japanesePath === undefined
      ? undefined
      : `[Japanese](${linkFor(frame.japanesePath)})`,
    frame.dataPath === undefined
      ? undefined
      : `[data.json](${linkFor(frame.dataPath)})`,
  ].filter((link): link is string => link !== undefined);

  return `- ${frame.generatedAt}: ${links.join(" · ")}`;
};

const renderHistorySections = (
  frames: ReadonlyArray<ResearchHistoryFrame>,
  linkFor: (path: string) => string,
  titleFor: (topic: ResearchSiteTopic) => string,
  emptyText: string,
): string =>
  publishedResearchTopics
    .map((topic) => {
      const topicFrames = sortHistoryFrames(
        frames.filter((frame) => frame.topicId === topic.id),
      );
      const body =
        topicFrames.length === 0
          ? emptyText
          : topicFrames
              .map((frame) => renderHistoryFrame(frame, linkFor))
              .join("\n");
      return `### ${titleFor(topic)}

${body}`;
    })
    .join("\n\n");

export const renderSourceIndex = (): string => `---
title: ${EN_RESEARCH_TITLE}
description: English reports, data artifacts, and history kept as reproducible source material.
---

# ${EN_RESEARCH_TITLE}

English reports, data artifacts, and history are kept here as reproducible
source material. The public reading line for the Japanese canonical articles is
[${JA_RESEARCH_TITLE}](../llm-foundation/).

These are organized by research topic. Current reports and data artifacts are
the reproducible source for each topic; keyless fixture outputs remain available
as self-tests but do not replace owner-triggered real measurements on the public
reading path.

Past generated frames are listed in [History](./history).

**Topics**

${publishedResearchTopics
  .map(
    (topic) =>
      `- [${topic.source.text}](./${stripMarkdown(topic.source.docsPath).replace("docs/research-reports/", "")}) — ${topic.source.summary}`,
  )
  .join("\n")}

To add a study, see the \`TEMPLATE.md\` in the relevant package under \`packages/\`.
`;

export const renderSourceHistoryIndex = (
  frames: ReadonlyArray<ResearchHistoryFrame>,
): string => `---
title: ${EN_RESEARCH_TITLE} History
description: Dated English, Japanese, and data frames for shipped research reports.
---

# History

This page lists dated report frames committed under
\`docs/research-reports/history/\`. Each frame keeps the English source report,
Japanese translation, and \`data.json\` artifact when available.

The topic order matches [${EN_RESEARCH_TITLE}](./) and
[${JA_RESEARCH_TITLE}](../llm-foundation/).

## Frames

${renderHistorySections(
  frames,
  sourceHistoryLink,
  (topic) => topic.source.text,
  "No dated frames have been archived yet.",
)}
`;

export const renderJapaneseIndex = (): string => `---
title: ${JA_RESEARCH_TITLE}
description: LLMs Research と同じ構成で、日本語の生成・翻訳済み記事を並べる。
---

# ${JA_RESEARCH_TITLE}

このページは [${EN_RESEARCH_TITLE}](../research-reports/) と同じトピック順で、
日本語の生成・翻訳済み記事を並べる。英語レポート、\`data.json\`、history は
再現可能なソースとして英語側に残し、日本語側は同じトピックを日本語で読む入口にする。

過去の生成フレームは [History](./history) に残す。

## トピック

${publishedResearchTopics
  .map(
    (
      topic,
    ) => `### [${topic.japanese.text}](${docsLink(topic.japanese.docsPath)})

${topic.japanese.summary}
英語ソースは [${topic.source.text}](${docsLink(topic.source.docsPath)})。`,
  )
  .join("\n\n")}

## provenance について

日本語ページは、英語側のトピックと同じ順序で配置する。現在の \`*.insights.ja.md\`
ページは英語 insights を日本語へ翻訳した生成物であり、frontmatter に source
artifact、source commit、translation model、generated timestamp を保持する。
全文レポートの直接翻訳と日付別履歴は、report-history pipeline が同じ topic metadata
から生成する。
`;

export const renderJapaneseHistoryIndex = (
  frames: ReadonlyArray<ResearchHistoryFrame>,
): string => `---
title: ${JA_RESEARCH_TITLE} History
description: 生成日ごとの英語ソース、日本語翻訳、data.json の履歴。
---

# History

このページは、\`docs/research-reports/history/\` にコミットされた日付別の
調査フレームを一覧する。各フレームには、利用できる場合に英語ソース、
日本語翻訳、\`data.json\` を残す。

トピック順は [${EN_RESEARCH_TITLE}](../research-reports/) と
[${JA_RESEARCH_TITLE}](./) に合わせる。

## フレーム

${renderHistorySections(
  frames,
  japaneseHistoryLink,
  (topic) => topic.japanese.text,
  "まだ日付別フレームは保存されていない。",
)}
`;

export const renderQmuTicketPayload = (): string =>
  [
    "# Reflect LLMs Research reports",
    "",
    "Copy the following English and Japanese report files in order, preserving this order in the qmu-co-jp navigation and indexes:",
    "",
    "English reports:",
    "",
    ...publishedResearchTopics.map(
      (topic, index) =>
        `${index + 1}. ${topic.source.docsPath} -> docs/en/llm-foundation-research/${topic.qmuSlug}.md`,
    ),
    "",
    "Japanese reports:",
    "",
    ...publishedResearchTopics.map(
      (topic, index) =>
        `${index + 1}. ${topic.japanese.docsPath} -> docs/llm-foundation-research/${topic.qmuSlug}.md`,
    ),
    "",
    "Update both qmu-co-jp index/table-of-contents entries from the same order.",
  ].join("\n");
