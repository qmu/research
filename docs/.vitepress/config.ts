import { defineConfig } from "vitepress";
import {
  EN_RESEARCH_TITLE,
  JA_RESEARCH_TITLE,
  japaneseResearchItems,
  sourceResearchItems,
} from "../../packages/tech/src/research/domain/site";

// The base path is environment-driven so the same build can serve from a
// subpath (e.g. GitHub Pages) or the dev tunnel root.
const base = process.env.DOCS_BASE ?? "/";

export default defineConfig({
  base,
  lang: "en",
  title: "qmu research",
  description: "Public, reproducible foundational research for qmu.co.jp.",
  cleanUrls: true,
  // Role/template READMEs and combined compare side files are source material,
  // not public site pages. Speed and accuracy carry the public split articles.
  srcExclude: [
    "**/README.md",
    "llm-foundation/_generated/**",
    "research-reports/*.real.md",
    "research-reports/*.fixture.md",
  ],
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
    outline: false,
    nav: [
      { text: "Home", link: "/" },
      {
        text: EN_RESEARCH_TITLE,
        items: sourceResearchItems(),
      },
      {
        text: JA_RESEARCH_TITLE,
        items: japaneseResearchItems(),
      },
    ],
    sidebar: [
      {
        text: EN_RESEARCH_TITLE,
        link: "/research-reports/",
        items: sourceResearchItems(),
      },
      {
        text: JA_RESEARCH_TITLE,
        link: "/llm-foundation/",
        items: japaneseResearchItems(),
      },
      {
        text: "Project",
        items: [
          {
            text: "Research development guideline",
            link: "/research-development-guideline",
          },
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
