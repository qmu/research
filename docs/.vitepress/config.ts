import { writeFile } from "node:fs/promises";
import { join } from "node:path";
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

// Where this build is actually served, when it is served publicly at all.
//
// The only hosted surface today is the staging preview
// (`staging-research.qmu.co.jp`), which serves whatever is on `main` — drafts,
// ADRs, the development guideline — while the finished articles are published
// on qmu.co.jp (docs/adr/0003-*). Staging must therefore not be indexed, or
// unfinished prose competes in search with the published article.
//
// One variable drives all three search signals — the sitemap, `robots.txt` and
// the robots meta tag — so they cannot disagree with each other, and so the
// build never advertises a hostname it is not served from. Unset (the default,
// and what the staging deploy uses) means "not served publicly": no sitemap,
// and everything asked not to index. Setting it declares the opposite.
const publicHostname = process.env.DOCS_PUBLIC_HOSTNAME ?? "";
const indexable = publicHostname !== "";

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
    // Legacy side files from the retired snapshot layout (tendency narratives
    // and working full reports). None are produced now — each topic's current
    // page is the composed dated survey article — but the globs stay so any
    // stale copy is never served standalone.
    "research-reports/*.tendency.md",
    "research-reports/*.report.md",
  ],
  ...(indexable ? { sitemap: { hostname: publicHostname } } : {}),
  head: indexable
    ? []
    : [["meta", { name: "robots", content: "noindex, nofollow" }]],
  // `robots.txt` is written here rather than kept in `public/` so it is derived
  // from the same flag as the sitemap and the meta tag above; a static file
  // would be one more thing to remember to flip.
  async buildEnd(siteConfig) {
    const body = indexable
      ? `User-agent: *\nAllow: /\nSitemap: ${publicHostname.replace(/\/$/, "")}${base}sitemap.xml\n`
      : "User-agent: *\nDisallow: /\n";
    await writeFile(join(siteConfig.outDir, "robots.txt"), body, "utf8");
  },
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
          {
            text: "OSS foundational research (proposal)",
            link: "/oss-foundation-proposal",
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
    server: {
      // Bind all interfaces so a container can publish the port to the host.
      host: true,
      allowedHosts: ["research.qmu.dev"],
      // When served through the Cloudflare tunnel, HMR must ride wss:443.
      // Gated on HMR_TUNNEL, so plain local dev is unaffected.
      ...(process.env.HMR_TUNNEL
        ? { hmr: { protocol: "wss", clientPort: 443, host: "research.qmu.dev" } }
        : {}),
    },
  },
});
