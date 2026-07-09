import { describe, expect, it } from "vitest";
import {
  historyOverview,
  historyPathFor,
  japaneseResearchItems,
  publishSlugs,
  publishPlan,
  renderJapaneseHistoryIndex,
  renderJapaneseIndex,
  renderQmuTicketPayload,
  renderSourceHistoryIndex,
  renderSourceIndex,
  researchSiteTopics,
  sourceResearchItems,
} from "./site";

describe("research site metadata", () => {
  it("derives English and Japanese navigation from the same topic order", () => {
    expect(sourceResearchItems().map((item) => item.link)).toEqual([
      "/research-reports/",
      ...researchSiteTopics.map((topic) =>
        topic.source.docsPath.replace(/^docs\/(.+)\.md$/, "/$1"),
      ),
      historyOverview.source.link,
    ]);
    expect(japaneseResearchItems().map((item) => item.link)).toEqual([
      "/llm-foundation/",
      ...researchSiteTopics.map((topic) =>
        topic.japanese.docsPath.replace(/^docs\/(.+)\.md$/, "/$1"),
      ),
      historyOverview.japanese.link,
    ]);
  });

  it("publishes Japanese report slugs in sidebar order", () => {
    expect(publishSlugs()).toEqual(
      researchSiteTopics.map((topic) =>
        topic.japanese.docsPath.replace(/^docs\/(.+)\.md$/, "$1"),
      ),
    );
    expect(publishPlan()).toEqual(
      researchSiteTopics.map((topic) => ({
        sourceSlug: topic.japanese.docsPath.replace(/^docs\/(.+)\.md$/, "$1"),
        destinationSlug: topic.qmuSlug,
      })),
    );
  });

  it("does not publish the internal combined LLM comparison page", () => {
    expect(researchSiteTopics.map((topic) => topic.id)).not.toContain(
      "llm-model-comparison",
    );
    expect(renderSourceIndex()).not.toContain("LLM model comparison");
    expect(renderJapaneseIndex()).not.toContain("LLMモデル比較");
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

  it("renders both indexes from the shared topic list", () => {
    const source = renderSourceIndex();
    const japanese = renderJapaneseIndex();
    for (const topic of researchSiteTopics) {
      expect(source).toContain(topic.source.text);
      expect(japanese).toContain(topic.japanese.text);
      expect(japanese).toContain(topic.source.text);
    }
    expect(source).toContain("[History](./history)");
    expect(japanese).toContain("[History](./history)");
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
    expect(source).toContain(
      "[English](./history/foundation-models/2026-07-09T10-05-17-123Z/foundation-models)",
    );
    expect(source).toContain(
      "[Japanese](./history/foundation-models/2026-07-09T10-05-17-123Z/foundation-models.ja)",
    );
    expect(source).toContain(
      "[data.json](./history/foundation-models/2026-07-09T10-05-17-123Z/foundation-models.data.json)",
    );
    expect(japanese).toContain(`# History`);
    expect(japanese).toContain(topic.japanese.text);
    expect(japanese).toContain(
      "[English](../research-reports/history/foundation-models/2026-07-09T10-05-17-123Z/foundation-models)",
    );
    expect(japanese).toContain(
      "[Japanese](../research-reports/history/foundation-models/2026-07-09T10-05-17-123Z/foundation-models.ja)",
    );
    expect(japanese).toContain(
      "[data.json](../research-reports/history/foundation-models/2026-07-09T10-05-17-123Z/foundation-models.data.json)",
    );
  });

  it("renders a qmu handoff payload with ordered destination slugs", () => {
    const payload = renderQmuTicketPayload();
    expect(payload).toContain("Reflect LLMs Research Japanese reports");
    for (const [index, topic] of researchSiteTopics.entries()) {
      expect(payload).toContain(
        `${index + 1}. ${topic.japanese.docsPath} -> docs/llm-foundation-research/${topic.qmuSlug}.md`,
      );
    }
  });

  it("documents a runnable command for every published topic", () => {
    expect(
      researchSiteTopics.every((topic) => topic.npmScript.length > 0),
    ).toBe(true);
  });
});
