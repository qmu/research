import { describe, expect, it } from "vitest";
import { articleOutlineProblems } from "../../research/domain/article-outline";
import { markdownImageRefs, renderImageGenerationReport } from "./report";
import type {
  ImageGenCallRecord,
  ImageGenerationResult,
  ImageGenModelRun,
} from "./types";

const zeroStat = { mean: 0, stdDev: 0, n: 0 };

const run = (calls: ReadonlyArray<ImageGenCallRecord>): ImageGenModelRun => ({
  id: "grok-imagine-image",
  provider: "xai",
  modelName: "Grok Imagine",
  apiModelId: "grok-imagine-image",
  pricePerImageUsd: 0.02,
  sizeTier: "standard",
  source: "https://docs.x.ai/developers/models",
  provenance: "measured",
  measuredAt: "2026-07-18T00:00:00.000Z",
  trialsRequested: 1,
  stats: {
    generationLatencyMs: { mean: 100, stdDev: 0, n: calls.length },
    promptAdherence: { mean: 1, stdDev: 0, n: 1 },
    textRenderAccuracy: zeroStat,
  },
  calls,
});

const result = (
  calls: ReadonlyArray<ImageGenCallRecord>,
): ImageGenerationResult => ({
  generatedAt: "2026-07-18T00:00:00.000Z",
  fixture: false,
  trials: 1,
  judgeModel: "claude-sonnet-5",
  manifestVersion: "2",
  runs: [run(calls)],
  nonSubjects: [],
  artifactPath: "image-generation-comparison.data.json",
});

const practicalCall: ImageGenCallRecord = {
  promptId: "photo-red-apple",
  category: "photo",
  kind: "adherence",
  repetition: 0,
  latencyMs: 100,
  imageByteLength: 42,
  imageMimeType: "image/png",
  imagePath: "images/grok-imagine-image--photo-red-apple--r0.png",
  imageSha256: "a".repeat(64),
  promptAdherence: 1,
};

const mechanicalCall: ImageGenCallRecord = {
  promptId: "three-red-circles",
  category: "mechanical",
  kind: "adherence",
  repetition: 0,
  latencyMs: 100,
  imageByteLength: 42,
  imageMimeType: "image/png",
  imageSha256: "b".repeat(64),
  promptAdherence: 1,
};

describe("markdownImageRefs", () => {
  it("extracts image targets and ignores fenced code blocks", () => {
    const md = [
      "![a](images/one.png)",
      "text ![b](images/two.webp) more",
      "```",
      "![c](images/not-a-ref.png)",
      "```",
    ].join("\n");
    expect(markdownImageRefs(md)).toEqual([
      "images/one.png",
      "images/two.webp",
    ]);
  });
});

describe("renderImageGenerationReport gallery", () => {
  it("embeds persisted images and stays on the standard outline", () => {
    const report = renderImageGenerationReport(
      result([practicalCall, mechanicalCall]),
    );
    expect(report).toContain("Generated images (practical categories)");
    expect(markdownImageRefs(report)).toContain(practicalCall.imagePath);
    // The mechanical probe is not shown.
    expect(report).not.toContain("three-red-circles](images/");
    expect(articleOutlineProblems(report, "english")).toEqual([]);
  });

  it("renders no image references when nothing was persisted (fixture byte-stability)", () => {
    const report = renderImageGenerationReport(result([mechanicalCall]));
    expect(markdownImageRefs(report)).toEqual([]);
    expect(report).not.toContain("Generated images (practical categories)");
  });
});
