import { defineConfig } from "vitepress";

// The base path is environment-driven so the same build can serve from a
// subpath (e.g. GitHub Pages) or the dev tunnel root.
const base = process.env.DOCS_BASE ?? "/";

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
        // The main reading line: per-topic generated Japanese reports.
        text: "LLM基礎検証（日本語）",
        items: [
          { text: "はじめに", link: "/llm-foundation/" },
          {
            text: "対象基盤モデル（カタログ）",
            link: "/research-reports/foundation-models.insights.ja",
          },
          {
            text: "速度の比較",
            link: "/research-reports/llm-speed-comparison.insights.ja",
          },
          {
            text: "精度の比較",
            link: "/research-reports/llm-accuracy-comparison.insights.ja",
          },
          {
            text: "可用性の比較",
            link: "/research-reports/llm-availability.insights.ja",
          },
          {
            text: "OCR能力の比較",
            link: "/research-reports/ocr-comparison.insights.ja",
          },
          {
            text: "ベクトルDB／RAGの比較",
            link: "/research-reports/rag-benchmark.insights.ja",
          },
          {
            text: "Agent SDKの比較",
            link: "/llm-foundation/agent-sdk-comparison",
          },
        ],
      },
      {
        // The same per-topic reports in English (the insights source of truth).
        text: "Reports (English)",
        items: [
          {
            text: "Foundation model catalog",
            link: "/research-reports/foundation-models.insights",
          },
          {
            text: "LLM response speed",
            link: "/research-reports/llm-speed-comparison.insights",
          },
          {
            text: "LLM output accuracy",
            link: "/research-reports/llm-accuracy-comparison.insights",
          },
          {
            text: "LLM API availability",
            link: "/research-reports/llm-availability.insights",
          },
          {
            text: "OCR capability comparison",
            link: "/research-reports/ocr-comparison.insights",
          },
          {
            text: "RAG / vector store",
            link: "/research-reports/rag-benchmark.insights",
          },
        ],
      },
      { text: "Research data (source)", link: "/research-reports/" },
    ],
    sidebar: [
      {
        text: "LLM基礎検証（日本語）",
        link: "/llm-foundation/",
        items: [
          { text: "はじめに", link: "/llm-foundation/" },
          {
            text: "対象基盤モデル（カタログ）",
            link: "/research-reports/foundation-models.insights.ja",
          },
          {
            text: "速度の比較",
            link: "/research-reports/llm-speed-comparison.insights.ja",
          },
          {
            text: "精度の比較",
            link: "/research-reports/llm-accuracy-comparison.insights.ja",
          },
          {
            text: "可用性の比較",
            link: "/research-reports/llm-availability.insights.ja",
          },
          {
            text: "OCR能力の比較",
            link: "/research-reports/ocr-comparison.insights.ja",
          },
          {
            text: "ベクトルDB／RAGの比較",
            link: "/research-reports/rag-benchmark.insights.ja",
          },
          {
            text: "Agent SDKの比較",
            link: "/llm-foundation/agent-sdk-comparison",
          },
        ],
      },
      {
        text: "Reports (English)",
        items: [
          {
            text: "Foundation model catalog",
            link: "/research-reports/foundation-models.insights",
          },
          {
            text: "LLM response speed",
            link: "/research-reports/llm-speed-comparison.insights",
          },
          {
            text: "LLM output accuracy",
            link: "/research-reports/llm-accuracy-comparison.insights",
          },
          {
            text: "LLM API availability",
            link: "/research-reports/llm-availability.insights",
          },
          {
            text: "OCR capability comparison",
            link: "/research-reports/ocr-comparison.insights",
          },
          {
            text: "RAG / vector store",
            link: "/research-reports/rag-benchmark.insights",
          },
        ],
      },
      {
        // Detailed hand-written Japanese write-ups from the earlier IA. Kept as
        // reference; the generated per-topic reports above are the main line.
        text: "詳細記事（手書き・参考）",
        collapsed: true,
        items: [
          {
            text: "基礎的LLMモデル比較",
            link: "/llm-foundation/foundation-model-comparison",
          },
          {
            text: "ベクトルDBの比較（詳細）",
            link: "/llm-foundation/vector-db-comparison",
          },
          {
            text: "可用性の比較（詳細）",
            link: "/llm-foundation/availability-comparison",
          },
          {
            text: "OCR能力の比較（詳細）",
            link: "/llm-foundation/ocr-comparison",
          },
        ],
      },
      {
        text: "Research data (source)",
        link: "/research-reports/",
        items: [
          {
            text: "Research reports index",
            link: "/research-reports/",
          },
          {
            text: "Foundation model catalog",
            link: "/research-reports/foundation-models",
          },
          {
            text: "LLM response speed",
            link: "/research-reports/llm-speed-comparison",
          },
          {
            text: "LLM output accuracy",
            link: "/research-reports/llm-accuracy-comparison",
          },
          {
            text: "LLM model comparison",
            link: "/research-reports/llm-model-comparison",
          },
          {
            text: "LLM API availability",
            link: "/research-reports/llm-availability",
          },
          {
            text: "OCR capability comparison",
            link: "/research-reports/ocr-comparison",
          },
          {
            text: "RAG vector store benchmark",
            link: "/research-reports/rag-benchmark",
          },
          {
            text: "LLM exact-match benchmark",
            link: "/research-reports/llm-benchmark",
          },
        ],
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
