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

export type ResearchSiteTopic = Readonly<{
  id: string;
  artifactBase: string;
  npmScript: string;
  source: ResearchTopicPage;
  japanese: ResearchTopicPage;
  dataPath?: string;
  qmuSlug: string;
}>;

const stripMarkdown = (path: string): string => path.replace(/\.md$/, "");

const docsLink = (path: string): string =>
  `/${stripMarkdown(path.replace(/^docs\//, ""))}`;

export const overview = {
  source: { text: "Overview", link: "/research-reports/" },
  japanese: { text: "はじめに", link: "/llm-foundation/" },
} satisfies Readonly<{ source: ResearchPage; japanese: ResearchPage }>;

export const researchSiteTopics = [
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
  },
  {
    id: "llm-model-comparison",
    artifactBase: "llm-model-comparison",
    npmScript: "npm run research -- llm-model-comparison --real",
    source: {
      text: "LLM model comparison",
      docsPath: "docs/research-reports/llm-model-comparison.md",
      summary:
        "The combined model-by-effort sweep that speed and accuracy topics project from.",
    },
    japanese: {
      text: "LLMモデル比較",
      docsPath: "docs/research-reports/llm-model-comparison.insights.ja.md",
      summary:
        "モデル×effort の統合比較。速度・精度トピックの投影元になる測定。",
    },
    dataPath: "docs/research-reports/llm-model-comparison.data.json",
    qmuSlug: "llm-model-comparison",
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
  },
] satisfies ReadonlyArray<ResearchSiteTopic>;

export const sourceResearchItems = (): ReadonlyArray<ResearchPage> => [
  overview.source,
  ...researchSiteTopics.map((topic) => ({
    text: topic.source.text,
    link: docsLink(topic.source.docsPath),
  })),
];

export const japaneseResearchItems = (): ReadonlyArray<ResearchPage> => [
  overview.japanese,
  ...researchSiteTopics.map((topic) => ({
    text: topic.japanese.text,
    link: docsLink(topic.japanese.docsPath),
  })),
];

export const publishSlugs = (): ReadonlyArray<string> =>
  researchSiteTopics.map((topic) =>
    stripMarkdown(topic.japanese.docsPath).replace(/^docs\//, ""),
  );

export type PublishPlanEntry = Readonly<{
  sourceSlug: string;
  destinationSlug: string;
}>;

export const publishPlan = (): ReadonlyArray<PublishPlanEntry> =>
  researchSiteTopics.map((topic) => ({
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

export const renderSourceIndex = (): string => `---
title: ${EN_RESEARCH_TITLE}
description: English reports, data artifacts, and history kept as reproducible source material.
---

# ${EN_RESEARCH_TITLE}

English reports, data artifacts, and history are kept here as reproducible
source material. The public reading line for the Japanese canonical articles is
[${JA_RESEARCH_TITLE}](../llm-foundation/).

These are organized by research topic. The keyless-fixture data reports here are
the byte-stable CI self-tests and the reproducible source for each topic; the
per-topic reading experience and its Japanese version are generated from these
by an owner-triggered real run.

**Topics**

${researchSiteTopics
  .map(
    (topic) =>
      `- [${topic.source.text}](./${stripMarkdown(topic.source.docsPath).replace("docs/research-reports/", "")}) — ${topic.source.summary}`,
  )
  .join("\n")}

To add a study, see the \`TEMPLATE.md\` in the relevant package under \`packages/\`.
`;

export const renderJapaneseIndex = (): string => `---
title: ${JA_RESEARCH_TITLE}
description: LLMs Research と同じ構成で、日本語の生成・翻訳済み記事を並べる。
---

# ${JA_RESEARCH_TITLE}

このページは [${EN_RESEARCH_TITLE}](../research-reports/) と同じトピック順で、
日本語の生成・翻訳済み記事を並べる。英語レポート、\`data.json\`、history は
再現可能なソースとして英語側に残し、日本語側は同じトピックを日本語で読む入口にする。

## トピック

${researchSiteTopics
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

export const renderQmuTicketPayload = (): string =>
  [
    "# Reflect LLMs Research Japanese reports",
    "",
    "Copy the following Japanese report files in order, preserving this order in the qmu-co-jp navigation and indexes:",
    "",
    ...researchSiteTopics.map(
      (topic, index) =>
        `${index + 1}. ${topic.japanese.docsPath} -> docs/llm-foundation-research/${topic.qmuSlug}.md`,
    ),
    "",
    "Update the qmu-co-jp index/table-of-contents entries from the same order.",
  ].join("\n");
