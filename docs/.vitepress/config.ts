import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { defineConfig } from "vitepress";
import {
  EN_RESEARCH_TITLE,
  JA_RESEARCH_TITLE,
  docsRewriteTarget,
  docsRoute,
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

// The English-only project documents. They are not part of the bilingual
// reading path, so they are served WITHOUT a locale prefix: on those pages the
// theme finds no locale and hides the language switcher, instead of offering a
// Japanese counterpart that does not exist.
const projectItems = [
  {
    text: "Research development guideline",
    link: docsRoute("docs/research-development-guideline.md"),
  },
  {
    text: "OSS foundational research (proposal)",
    link: docsRoute("docs/oss-foundation-proposal.md"),
  },
  { text: "Glossary", link: docsRoute("docs/glossary.md") },
  {
    text: "Dependency decisions",
    link: docsRoute("docs/dependency-decisions.md"),
  },
];

const enHome = docsRoute("docs/research-reports/index.md");
const jaHome = docsRoute("docs/llm-foundation/index.md");

export default defineConfig({
  base,
  lang: "en",
  title: "qmu research",
  description: "Public, reproducible foundational research for qmu.co.jp.",
  cleanUrls: true,
  // The two languages are served as locales — `/en/…` and `/ja/…` — so the
  // header carries the theme's language switcher beside the appearance toggle
  // and the sidebar holds one language at a time. The Markdown files stay
  // where the research pipeline writes them (both languages under
  // `docs/research-reports/`, the Japanese article as `<base>.insights.ja.md`);
  // `docsRewriteTarget` maps that layout onto the locale routes, and is the
  // same function the in-repo links are generated from, so a link and the page
  // it points at cannot disagree. `/` redirects to `/en/` via
  // `docs/public/index.html`.
  rewrites: (page: string) => docsRewriteTarget(page) ?? page,
  // Role/template READMEs and combined compare side files are source material,
  // not public site pages. Speed and accuracy carry the public split articles.
  srcExclude: [
    "**/README.md",
    "llm-foundation/_generated/**",
    "research-reports/*.real.md",
    "research-reports/*.fixture.md",
    // The English insights drafts each `*.insights.ja.md` article is
    // translated from. They are inputs to the translation step, are linked
    // from nowhere, and have no Japanese counterpart to switch to.
    "research-reports/*.insights.md",
    // Legacy side files from the retired snapshot layout (tendency narratives
    // and working full reports). None are produced now — each topic's current
    // page is the composed dated survey article — but the globs stay so any
    // stale copy is never served standalone.
    "research-reports/*.tendency.md",
    "research-reports/*.report.md",
    // Superseded Japanese pages kept in the tree until their cleanup ticket
    // lands. Each topic's current Japanese article is the `*.insights.ja.md`
    // page under `research-reports/`, which serves the same `/ja/` route.
    "llm-foundation/ocr-comparison.md",
    "llm-foundation/availability-comparison.md",
    "llm-foundation/vector-db-comparison.md",
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
  locales: {
    en: {
      label: "English",
      lang: "en",
      link: `${enHome}`,
      title: "qmu research",
      description: "Public, reproducible foundational research for qmu.co.jp.",
      themeConfig: {
        nav: [
          { text: EN_RESEARCH_TITLE, items: [...sourceResearchItems()] },
          { text: "Project", items: projectItems },
        ],
        sidebar: [
          {
            text: EN_RESEARCH_TITLE,
            link: enHome,
            items: [...sourceResearchItems()],
          },
          { text: "Project", items: projectItems },
        ],
      },
    },
    ja: {
      label: "日本語",
      lang: "ja",
      link: `${jaHome}`,
      title: "qmu リサーチ",
      description: "qmu.co.jp の公開・再現可能な基礎検証。",
      themeConfig: {
        nav: [
          { text: JA_RESEARCH_TITLE, items: [...japaneseResearchItems()] },
          { text: "プロジェクト文書", items: projectItems },
        ],
        sidebar: [
          {
            text: JA_RESEARCH_TITLE,
            link: jaHome,
            items: [...japaneseResearchItems()],
          },
          // The project documents are written in English only; they are listed
          // here so the Japanese reading path can still reach them.
          { text: "プロジェクト文書（英語）", items: projectItems },
        ],
        darkModeSwitchLabel: "外観",
        lightModeSwitchTitle: "ライトモードに切り替える",
        darkModeSwitchTitle: "ダークモードに切り替える",
        sidebarMenuLabel: "メニュー",
        returnToTopLabel: "トップへ戻る",
        langMenuLabel: "言語を変更",
        docFooter: { prev: "前のページ", next: "次のページ" },
      },
    },
  },
  themeConfig: {
    outline: false,
    // The locale-less project pages (ADRs, glossary, guideline) render with
    // this base configuration: both language entrances in the nav, and the
    // project documents in the sidebar.
    nav: [
      { text: "English", link: enHome },
      { text: "日本語", link: jaHome },
    ],
    sidebar: [{ text: "Project", items: projectItems }],
    socialLinks: [{ icon: "github", link: "https://github.com/qmu/research" }],
    search: {
      provider: "local",
      options: {
        locales: {
          ja: {
            translations: {
              button: { buttonText: "検索", buttonAriaLabel: "検索" },
              modal: {
                displayDetails: "詳細を表示",
                resetButtonTitle: "検索をリセット",
                backButtonTitle: "閉じる",
                noResultsText: "見つかりませんでした:",
                footer: {
                  selectText: "選択",
                  navigateText: "移動",
                  closeText: "閉じる",
                },
              },
            },
          },
        },
      },
    },
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
