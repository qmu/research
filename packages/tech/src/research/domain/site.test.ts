import { describe, expect, it } from "vitest";
import {
  findInternalResearchSource,
  findPublishedResearchTopic,
  englishFramePublishPlan,
  framePublishPlan,
  historyOverview,
  historyPathFor,
  internalResearchSources,
  japaneseResearchItems,
  publishedResearchTopics,
  publishSlugs,
  publishPlan,
  QMU_RESEARCH_GROUP_LABEL,
  renderJapaneseHistoryIndex,
  renderJapaneseIndex,
  renderQmuTicketPayload,
  renderSourceHistoryIndex,
  renderSourceIndex,
  docsRewriteTarget,
  docsRoute,
  localeRelativeRoute,
  reportFrameSources,
  retiredQmuSlugs,
  researchSiteTopics,
  sourceResearchItems,
  type ResearchSiteTopic,
} from "./site";
import { findTopic, topicIds } from "./topic";

describe("research site metadata", () => {
  it("derives English and Japanese navigation from the same topic order", () => {
    expect(researchSiteTopics).toBe(publishedResearchTopics);
    // The two locales are mirrored: each topic is `/en/<base>` and
    // `/ja/<base>`, which is what lets the header language switcher — which
    // swaps only the locale segment — land on the same study.
    expect(sourceResearchItems().map((item) => item.link)).toEqual([
      "/en/",
      ...publishedResearchTopics.map((topic) => `/en/${topic.artifactBase}`),
      historyOverview.source.link,
    ]);
    expect(japaneseResearchItems().map((item) => item.link)).toEqual([
      "/ja/",
      ...publishedResearchTopics.map((topic) => `/ja/${topic.artifactBase}`),
      historyOverview.japanese.link,
    ]);
    expect(historyOverview.source.link).toBe("/en/history");
    expect(historyOverview.japanese.link).toBe("/ja/history");
  });

  it("publishes Japanese report slugs in sidebar order", () => {
    expect(publishSlugs()).toEqual(
      publishedResearchTopics.map((topic) =>
        topic.japanese.docsPath.replace(/^docs\/(.+)\.md$/, "$1"),
      ),
    );
    expect(publishPlan()).toEqual(
      publishedResearchTopics.map((topic) => ({
        sourceSlug: topic.japanese.docsPath.replace(/^docs\/(.+)\.md$/, "$1"),
        destinationSlug: topic.qmuSlug,
      })),
    );
  });

  it("publishes every dated survey's Japanese article under a mirrored path (D1)", () => {
    const frames = [
      {
        topicId: "speed",
        generatedAt: "2026-06-01T00:00:00.000Z",
        sourcePath:
          "docs/research-reports/history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison.md",
        japanesePath:
          "docs/research-reports/history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison.ja.md",
      },
      {
        // A frame without a Japanese article is not copied.
        topicId: "ocr",
        generatedAt: "2026-06-02T00:00:00.000Z",
        sourcePath:
          "docs/research-reports/history/ocr/2026-06-02T00-00-00-000Z/ocr-comparison.md",
      },
    ];
    expect(framePublishPlan(frames)).toEqual([
      {
        sourceSlug:
          "research-reports/history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison.ja",
        destinationSlug:
          "history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison",
      },
    ]);
    // The Japanese frame mirrors to the Japanese section; the English frames
    // (both have a sourcePath) mirror to the English section.
    expect(englishFramePublishPlan(frames)).toEqual([
      {
        sourceSlug:
          "research-reports/history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison",
        destinationSlug:
          "history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison",
      },
      {
        sourceSlug:
          "research-reports/history/ocr/2026-06-02T00-00-00-000Z/ocr-comparison",
        destinationSlug: "history/ocr/2026-06-02T00-00-00-000Z/ocr-comparison",
      },
    ]);
    // The mirrored destinations equal the relative link targets the current
    // articles use, so the links resolve in both language sections.
    const payload = renderQmuTicketPayload(frames);
    expect(payload).toContain("Past-survey articles (1 Japanese)");
    expect(payload).toContain("Past-survey articles (2 English)");
    expect(payload).toContain(
      "docs/research-reports/history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison.ja.md -> docs/llm-foundation-research/history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison.md",
    );
    expect(payload).toContain(
      "docs/research-reports/history/ocr/2026-06-02T00-00-00-000Z/ocr-comparison.md -> docs/en/llm-foundation-research/history/ocr/2026-06-02T00-00-00-000Z/ocr-comparison.md",
    );
  });

  it("keeps the combined LLM comparison runnable but internal to publishing", () => {
    const internal = findInternalResearchSource("llm-model-comparison");

    expect(topicIds()).toContain("llm-model-comparison");
    expect(findTopic("llm-model-comparison")?.modes).toEqual([
      "fixture",
      "estimate",
      "real",
    ]);
    expect(internal).toEqual({
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
    });
    expect(internalResearchSources.map((source) => source.id)).toEqual(
      expect.arrayContaining(["llm-model-comparison"]),
    );
    expect(findPublishedResearchTopic("llm-model-comparison")).toBeUndefined();
    expect(publishedResearchTopics.map((topic) => topic.id)).not.toContain(
      internal?.id,
    );
    expect(renderSourceIndex()).not.toContain("LLM model comparison");
    expect(renderJapaneseIndex()).not.toContain("LLMモデル比較");
    expect(renderQmuTicketPayload()).not.toContain("llm-model-comparison");
    expect(
      renderSourceHistoryIndex([
        {
          topicId: "llm-model-comparison",
          generatedAt: "2026-07-09T10:05:17.123Z",
          sourcePath:
            "docs/research-reports/history/llm-model-comparison/2026-07-09T10-05-17-123Z/llm-model-comparison.md",
        },
      ]),
    ).not.toContain("llm-model-comparison");
  });

  it("derives stable dated history paths for report frames", () => {
    const [topic] = researchSiteTopics;
    if (topic === undefined) throw new Error("missing topic fixture");
    expect(historyPathFor(topic, "2026-07-09T10:05:17.123Z", "source")).toBe(
      "docs/research-reports/history/foundation-models/2026-07-09T10-05-17-123Z/foundation-models.md",
    );
    expect(historyPathFor(topic, "2026-07-09T10:05:17.123Z", "data")).toBe(
      "docs/research-reports/history/foundation-models/2026-07-09T10-05-17-123Z/foundation-models.data.json",
    );
    expect(historyPathFor(topic, "2026-07-09T10:05:17.123Z", "japanese")).toBe(
      "docs/research-reports/history/foundation-models/2026-07-09T10-05-17-123Z/foundation-models.ja.md",
    );
  });

  it("maps every docs page onto a mirrored locale route", () => {
    // The site serves one locale per URL prefix so the header switcher can
    // find the current locale in the leading path segment. Both languages are
    // written into `docs/research-reports/` by the pipeline, so the mapping —
    // not the directory layout — is what makes the routes mirror.
    expect(docsRewriteTarget("research-reports/llm-speed-comparison.md")).toBe(
      "en/llm-speed-comparison.md",
    );
    expect(
      docsRewriteTarget("research-reports/llm-speed-comparison.insights.ja.md"),
    ).toBe("ja/llm-speed-comparison.md");
    expect(
      docsRewriteTarget(
        "research-reports/history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison.ja.md",
      ),
    ).toBe("ja/history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison.md");
    expect(docsRewriteTarget("llm-foundation/index.md")).toBe("ja/index.md");
    // Project documents exist in English only and belong to no locale: they
    // keep a root route, and the theme hides the switcher on them rather than
    // offering a Japanese page that does not exist.
    expect(docsRewriteTarget("glossary.md")).toBeUndefined();
    expect(docsRoute("docs/glossary.md")).toBe("/glossary");
    expect(docsRoute("docs/research-reports/index.md")).toBe("/en/");
    expect(docsRoute("docs/llm-foundation/index.md")).toBe("/ja/");

    // Every published topic mirrors, and no two pages claim one route.
    const routes = publishedResearchTopics.flatMap((topic) => [
      docsRoute(topic.source.docsPath),
      docsRoute(topic.japanese.docsPath),
    ]);
    expect(routes).toEqual(
      publishedResearchTopics.flatMap((topic) => [
        `/en/${topic.artifactBase}`,
        `/ja/${topic.artifactBase}`,
      ]),
    );
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("writes in-article links relative to the article's own language section", () => {
    // A current article is copied verbatim to qmu-co-jp, where the language
    // sections sit at other paths, so its own links must carry no `/en` or
    // `/ja` prefix — and the Japanese frame must be named like its English
    // counterpart, which is what the mirrored route requires.
    expect(
      localeRelativeRoute(
        "docs/research-reports/history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison.ja.md",
      ),
    ).toBe("./history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison");
    expect(
      localeRelativeRoute(
        "docs/research-reports/history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison.md",
      ),
    ).toBe("./history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison");
  });

  it("renders both indexes from the shared topic list", () => {
    const source = renderSourceIndex();
    const japanese = renderJapaneseIndex();
    for (const topic of researchSiteTopics) {
      expect(source).toContain(topic.source.text);
      expect(japanese).toContain(topic.japanese.text);
      expect(japanese).toContain(topic.source.text);
    }
    expect(source).toContain("[History](/en/history)");
    expect(japanese).toContain("[History](/ja/history)");
    // Each index points at its counterpart's locale root, so the two reading
    // paths stay reachable from one another without the sidebar carrying both.
    expect(source).toContain("](/ja/)");
    expect(japanese).toContain("](/en/)");
  });

  it("renders history indexes from dated report frames", () => {
    const [topic] = researchSiteTopics;
    if (topic === undefined) throw new Error("missing topic fixture");
    const generatedAt = "2026-07-09T10:05:17.123Z";
    const source = renderSourceHistoryIndex([
      {
        topicId: topic.id,
        generatedAt,
        sourcePath: historyPathFor(topic, generatedAt, "source"),
        japanesePath: historyPathFor(topic, generatedAt, "japanese"),
        dataPath: historyPathFor(topic, generatedAt, "data"),
      },
    ]);
    const japanese = renderJapaneseHistoryIndex([
      {
        topicId: topic.id,
        generatedAt,
        sourcePath: historyPathFor(topic, generatedAt, "source"),
        japanesePath: historyPathFor(topic, generatedAt, "japanese"),
        dataPath: historyPathFor(topic, generatedAt, "data"),
      },
    ]);

    expect(source).toContain(`# History`);
    expect(source).toContain(topic.source.text);
    // Both indexes link a frame by its served route, so each index can point
    // at the other locale's article across the `/en` — `/ja` prefixes.
    expect(source).toContain(
      "[English](/en/history/foundation-models/2026-07-09T10-05-17-123Z/foundation-models)",
    );
    expect(source).toContain(
      "[Japanese](/ja/history/foundation-models/2026-07-09T10-05-17-123Z/foundation-models)",
    );
    expect(source).toContain(
      "[data.json](/en/history/foundation-models/2026-07-09T10-05-17-123Z/foundation-models.data.json)",
    );
    expect(japanese).toContain(`# History`);
    expect(japanese).toContain(topic.japanese.text);
    expect(japanese).toContain(
      "[English](/en/history/foundation-models/2026-07-09T10-05-17-123Z/foundation-models)",
    );
    expect(japanese).toContain(
      "[Japanese](/ja/history/foundation-models/2026-07-09T10-05-17-123Z/foundation-models)",
    );
    expect(japanese).toContain(
      "[data.json](/en/history/foundation-models/2026-07-09T10-05-17-123Z/foundation-models.data.json)",
    );
  });

  it("renders a qmu handoff payload with ordered destination slugs", () => {
    const payload = renderQmuTicketPayload();
    expect(payload).toContain("Reflect LLMs Research reports");
    expect(QMU_RESEARCH_GROUP_LABEL).toBe("LLM基礎検証について");
    expect(payload).toContain(`「${QMU_RESEARCH_GROUP_LABEL}」`);
    for (const [index, topic] of researchSiteTopics.entries()) {
      expect(payload).toContain(
        `${index + 1}. ${topic.source.docsPath} -> docs/en/llm-foundation-research/${topic.qmuSlug}.md (title: ${topic.source.text})`,
      );
      expect(payload).toContain(
        `${index + 1}. ${topic.japanese.docsPath} -> docs/llm-foundation-research/${topic.qmuSlug}.md (title: ${topic.japanese.text})`,
      );
    }
  });

  it("instructs qmu-co-jp to delete retired published copies", () => {
    expect(retiredQmuSlugs).toContain("llm-benchmark");
    expect(findPublishedResearchTopic("llm-benchmark")).toBeUndefined();
    expect(findInternalResearchSource("llm-benchmark")?.npmScript).toBe(
      "npm run benchmark",
    );
    const payload = renderQmuTicketPayload();
    expect(payload).toContain("Delete the following retired copies");
    for (const slug of retiredQmuSlugs) {
      expect(payload).toContain(`- docs/llm-foundation-research/${slug}.md`);
      expect(payload).toContain(`- docs/en/llm-foundation-research/${slug}.md`);
    }
  });

  it("documents a runnable command for every published topic", () => {
    expect(
      researchSiteTopics.every((topic) => topic.npmScript.length > 0),
    ).toBe(true);
  });

  it("carries an agreed research design for every published topic", () => {
    for (const topic of publishedResearchTopics) {
      const { design } = topic;
      expect(design.cadence.length, topic.id).toBeGreaterThan(0);
      expect(design.subjects.length, topic.id).toBeGreaterThan(0);
      expect(design.metrics.length, topic.id).toBeGreaterThan(0);
      expect(design.trialsPerRun.minimum, topic.id).toBeLessThanOrEqual(
        design.trialsPerRun.maximum,
      );
      expect(design.trialsPerRun.premises.length, topic.id).toBeGreaterThan(0);
      expect(design.costPerRun.ceilingUsd, topic.id).toBeGreaterThanOrEqual(0);
      expect(design.costPerRun.premises.length, topic.id).toBeGreaterThan(0);
      expect(design.accumulates.length, topic.id).toBeGreaterThan(0);
    }
  });

  it("archives frames from the report pages, not the snapshot", () => {
    const plain = publishedResearchTopics[0];
    if (plain === undefined) throw new Error("missing topic fixture");
    expect(reportFrameSources(plain)).toEqual({
      source: plain.source.docsPath,
      japanese: plain.japanese.docsPath,
    });

    const snapshotTopic: ResearchSiteTopic = {
      ...plain,
      articleMode: "snapshot",
      report: {
        sourcePath: "docs/research-reports/example.report.md",
        japanesePath: "docs/research-reports/example.report.ja.md",
      },
    };
    expect(reportFrameSources(snapshotTopic)).toEqual({
      source: "docs/research-reports/example.report.md",
      japanese: "docs/research-reports/example.report.ja.md",
    });
  });
});
