import { defineConfig } from "vitepress";

// The base path is environment-driven so the same build can serve from a
// subpath (e.g. GitHub Pages) or the dev tunnel root.
const base = process.env.DOCS_BASE ?? "/";

const EN_RESEARCH_TITLE = "LLMs Research";
const JA_RESEARCH_TITLE = "LLMs Research (Japanese)";

type ResearchPage = Readonly<{
  text: string;
  link: string;
}>;

type ResearchTopic = Readonly<{
  source: ResearchPage;
  japanese: ResearchPage;
}>;

const overview = {
  source: { text: "Overview", link: "/research-reports/" },
  japanese: { text: "はじめに", link: "/llm-foundation/" },
} satisfies ResearchTopic;

const researchTopics = [
  {
    source: {
      text: "Foundation model catalog",
      link: "/research-reports/foundation-models",
    },
    japanese: {
      text: "対象基盤モデル（カタログ）",
      link: "/research-reports/foundation-models.insights.ja",
    },
  },
  {
    source: {
      text: "LLM response speed",
      link: "/research-reports/llm-speed-comparison",
    },
    japanese: {
      text: "LLM応答速度",
      link: "/research-reports/llm-speed-comparison.insights.ja",
    },
  },
  {
    source: {
      text: "LLM output accuracy",
      link: "/research-reports/llm-accuracy-comparison",
    },
    japanese: {
      text: "LLM出力精度",
      link: "/research-reports/llm-accuracy-comparison.insights.ja",
    },
  },
  {
    source: {
      text: "LLM model comparison",
      link: "/research-reports/llm-model-comparison",
    },
    japanese: {
      text: "LLMモデル比較",
      link: "/research-reports/llm-model-comparison.insights.ja",
    },
  },
  {
    source: {
      text: "LLM API availability",
      link: "/research-reports/llm-availability",
    },
    japanese: {
      text: "LLM API可用性",
      link: "/research-reports/llm-availability.insights.ja",
    },
  },
  {
    source: {
      text: "OCR capability comparison",
      link: "/research-reports/ocr-comparison",
    },
    japanese: {
      text: "OCR能力の比較",
      link: "/research-reports/ocr-comparison.insights.ja",
    },
  },
  {
    source: {
      text: "RAG vector store benchmark",
      link: "/research-reports/rag-benchmark",
    },
    japanese: {
      text: "RAGベクトルストアベンチマーク",
      link: "/research-reports/rag-benchmark.insights.ja",
    },
  },
  {
    source: {
      text: "LLM exact-match benchmark",
      link: "/research-reports/llm-benchmark",
    },
    japanese: {
      text: "LLM完全一致ベンチマーク",
      link: "/research-reports/llm-benchmark.ja",
    },
  },
] satisfies ReadonlyArray<ResearchTopic>;

const sourceResearchItems = [
  overview.source,
  ...researchTopics.map((topic) => topic.source),
];

const japaneseResearchItems = [
  overview.japanese,
  ...researchTopics.map((topic) => topic.japanese),
];

export default defineConfig({
  base,
  lang: "en",
  title: "qmu research",
  description: "Public, reproducible foundational research for qmu.co.jp.",
  cleanUrls: true,
  // Role and template READMEs are documentation for editors, not site pages.
  srcExclude: ["**/README.md"],
  sitemap: { hostname: "https://research.qmu.dev" },
  markdown: {
    // High-contrast code themes so syntax-highlighted tokens (comments,
    // keywords) in code blocks meet WCAG 2.2 AA (4.5:1). The default
    // github-light theme's comment (#6A737D, 4.46:1) and keyword (#D73A49,
    // 4.24:1) colors fall just under the threshold on the report pages.
    theme: {
      light: "github-light-high-contrast",
      dark: "github-dark-high-contrast",
    },
  },
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      {
        text: EN_RESEARCH_TITLE,
        items: sourceResearchItems,
      },
      {
        text: JA_RESEARCH_TITLE,
        items: japaneseResearchItems,
      },
    ],
    sidebar: [
      {
        text: EN_RESEARCH_TITLE,
        link: "/research-reports/",
        items: sourceResearchItems,
      },
      {
        text: JA_RESEARCH_TITLE,
        link: "/llm-foundation/",
        items: japaneseResearchItems,
      },
      {
        text: "Project",
        items: [
          { text: "Glossary", link: "/glossary" },
          { text: "Dependency decisions", link: "/dependency-decisions" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/qmu/research" }],
    search: { provider: "local" },
  },
  vite: {
    // Allow the Cloudflare tunnel host to reach the dev server.
    server: { allowedHosts: ["research.qmu.dev"] },
  },
});
