import { describe, expect, it } from "vitest";
import {
  imageAssetPublishPlan,
  renderQmuTicketPayload,
  type ResearchHistoryFrame,
} from "./site";

const frameWithImages: ResearchHistoryFrame = {
  topicId: "image-generation",
  generatedAt: "2026-08-01T00:00:00.000Z",
  sourcePath:
    "docs/research-reports/history/image-generation/2026-08-01T00-00-00-000Z/image-generation-comparison.md",
  japanesePath:
    "docs/research-reports/history/image-generation/2026-08-01T00-00-00-000Z/image-generation-comparison.ja.md",
  dataPath:
    "docs/research-reports/history/image-generation/2026-08-01T00-00-00-000Z/image-generation-comparison.data.json",
  imagesDir:
    "docs/research-reports/history/image-generation/2026-08-01T00-00-00-000Z/images",
};

const textOnlyFrame: ResearchHistoryFrame = {
  topicId: "speed",
  generatedAt: "2026-08-01T00:00:00.000Z",
  sourcePath: "docs/research-reports/history/speed/x/llm-speed-comparison.md",
};

describe("imageAssetPublishPlan", () => {
  it("is empty when no frame ships images", () => {
    expect(imageAssetPublishPlan([textOnlyFrame])).toEqual([]);
  });

  it("carries the current shared dir plus each frame's images dir, both languages", () => {
    const plan = imageAssetPublishPlan([frameWithImages, textOnlyFrame]);
    // Current shared dir first, then the frame dir.
    expect(plan[0]).toEqual({
      sourceDir: "docs/research-reports/images",
      japaneseDestDir: "docs/llm-foundation-research/images",
      englishDestDir: "docs/en/llm-foundation-research/images",
    });
    expect(plan[1]).toEqual({
      sourceDir: frameWithImages.imagesDir,
      japaneseDestDir:
        "docs/llm-foundation-research/history/image-generation/2026-08-01T00-00-00-000Z/images",
      englishDestDir:
        "docs/en/llm-foundation-research/history/image-generation/2026-08-01T00-00-00-000Z/images",
    });
  });
});

describe("renderQmuTicketPayload image assets", () => {
  it("emits directory copy lines for both languages when frames ship images", () => {
    const payload = renderQmuTicketPayload([frameWithImages]);
    expect(payload).toContain("Image assets");
    expect(payload).toContain(
      "- docs/research-reports/images/ -> docs/llm-foundation-research/images/",
    );
    expect(payload).toContain(
      "- docs/research-reports/images/ -> docs/en/llm-foundation-research/images/",
    );
  });

  it("omits the image-assets section for a text-only history", () => {
    expect(renderQmuTicketPayload([textOnlyFrame])).not.toContain(
      "Image assets",
    );
  });
});
