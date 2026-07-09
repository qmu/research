import { describe, expect, it } from "vitest";
import {
  historyPathFor,
  japaneseResearchItems,
  publishSlugs,
  publishPlan,
  renderJapaneseIndex,
  renderQmuTicketPayload,
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
    ]);
    expect(japaneseResearchItems().map((item) => item.link)).toEqual([
      "/llm-foundation/",
      ...researchSiteTopics.map((topic) =>
        topic.japanese.docsPath.replace(/^docs\/(.+)\.md$/, "/$1"),
      ),
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
