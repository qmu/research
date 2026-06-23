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
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Research reports", link: "/research-reports/" },
    ],
    sidebar: [
      {
        text: "Research reports",
        link: "/research-reports/",
        items: [
          {
            text: "LLM exact-match benchmark",
            link: "/research-reports/llm-benchmark",
          },
          {
            text: "LLM model comparison",
            link: "/research-reports/llm-model-comparison",
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
