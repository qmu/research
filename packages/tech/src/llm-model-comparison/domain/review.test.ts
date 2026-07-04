import { describe, it, expect } from "vitest";
import {
  buildReviewPrompt,
  parseReview,
  reviewSchema,
  skippedReview,
} from "./review";

const subject = {
  modelName: "Test Model",
  effort: "high",
  throughputTokensPerSec: 120.4,
  ttftMs: 340,
  totalLatencyMs: 900,
  maxSchemaComplexity: 4,
  lengthAccuracy: 0.92,
  sampleOutputs: ["Some sample output about the water cycle."],
};

describe("buildReviewPrompt", () => {
  it("embeds the identity, metrics, and sample outputs", () => {
    const p = buildReviewPrompt(subject);
    expect(p).toContain("Test Model");
    expect(p).toContain("high");
    expect(p).toContain("120.4 tokens/sec");
    expect(p).toContain("water cycle");
    expect(p).toContain("strengths");
  });
});

describe("reviewSchema", () => {
  it("requires the three review fields", () => {
    expect(reviewSchema().required).toEqual([
      "strengths",
      "weaknesses",
      "bestFor",
    ]);
  });
});

describe("parseReview", () => {
  it("parses a well-formed judge response", () => {
    const raw = JSON.stringify({
      strengths: "fast",
      weaknesses: "pricey",
      bestFor: "latency-sensitive apps",
    });
    const r = parseReview(raw, "claude-opus-4-8", "judged");
    expect(r).toEqual({
      provenance: "judged",
      judgeModel: "claude-opus-4-8",
      strengths: "fast",
      weaknesses: "pricey",
      bestFor: "latency-sensitive apps",
      raw,
    });
  });

  it("tolerates a malformed response — empty fields, raw preserved", () => {
    const r = parseReview("not json", "judge", "fixtured");
    expect(r.strengths).toBe("");
    expect(r.weaknesses).toBe("");
    expect(r.bestFor).toBe("");
    expect(r.raw).toBe("not json");
    expect(r.provenance).toBe("fixtured");
  });
});

describe("skippedReview", () => {
  it("is an empty review flagged skipped", () => {
    const r = skippedReview("judge");
    expect(r.provenance).toBe("skipped");
    expect(r.raw).toBe("");
  });
});
