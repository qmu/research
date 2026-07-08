import { describe, expect, it } from "vitest";
import {
  assertInsightsProvenance,
  buildInsightsPrompt,
  estimateInsights,
  generateInsights,
  insightsFixtureBody,
  renderInsightsMarkdown,
  type InsightsInput,
  type InsightsProvenance,
} from "./insights";
import { createFixtureInsightsClient } from "../../vendors/llm/fixture";

const input: InsightsInput = {
  topicId: "rag",
  topicTitle: "RAG / vector store benchmark",
  sourceArtifact: "rag-benchmark.data.json",
  sourceCommit: "abc1234",
  trials: 5,
  dataArtifact: {
    runs: [{ backend: "sqlite-vec", recallAtK: 0.42 }],
    trials: 5,
  },
};

describe("buildInsightsPrompt", () => {
  it("is a pure function of its input (same input → same prompt)", () => {
    expect(buildInsightsPrompt(input)).toBe(buildInsightsPrompt(input));
  });

  it("embeds the artifact and forbids fabricated numbers", () => {
    const prompt = buildInsightsPrompt(input);
    expect(prompt).toContain("sqlite-vec");
    expect(prompt).toContain("0.42");
    expect(prompt).toContain("MUST come from this artifact");
    expect(prompt).toContain("RAG / vector store benchmark");
  });
});

describe("renderInsightsMarkdown", () => {
  const provenance: InsightsProvenance = {
    source_artifact: "rag-benchmark.data.json",
    source_commit: "abc1234",
    insights_model: "claude-sonnet-5",
    generated_at: "2026-07-09T00:00:00.000Z",
    trials: 5,
    provenance: "llm-insights",
  };

  it("emits every provenance field in frontmatter", () => {
    const md = renderInsightsMarkdown("Body text.", provenance);
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("source_artifact: rag-benchmark.data.json");
    expect(md).toContain("source_commit: abc1234");
    expect(md).toContain("insights_model: claude-sonnet-5");
    expect(md).toContain("generated_at: 2026-07-09T00:00:00.000Z");
    expect(md).toContain("trials: 5");
    expect(md).toContain("provenance: llm-insights");
    expect(md.trimEnd().endsWith("Body text.")).toBe(true);
  });
});

describe("assertInsightsProvenance", () => {
  const base: InsightsProvenance = {
    source_artifact: "a.json",
    source_commit: "c",
    insights_model: "m",
    generated_at: "t",
    trials: 0,
    provenance: "llm-insights",
  };

  it("accepts a fully-populated provenance (trials may be 0)", () => {
    expect(() => assertInsightsProvenance(base)).not.toThrow();
  });

  it("throws when a required field is empty", () => {
    expect(() =>
      assertInsightsProvenance({ ...base, source_artifact: "" }),
    ).toThrow(/source_artifact/);
    expect(() =>
      assertInsightsProvenance({ ...base, insights_model: "  " }),
    ).toThrow(/insights_model/);
  });
});

describe("insightsFixtureBody", () => {
  it("is deterministic and clearly labelled as a stub", () => {
    expect(insightsFixtureBody(input)).toBe(insightsFixtureBody(input));
    expect(insightsFixtureBody(input)).toContain("Fixtured insights stub");
  });
});

describe("estimateInsights", () => {
  it("reports one call with positive token estimates", () => {
    const estimate = estimateInsights(input);
    expect(estimate.calls).toBe(1);
    expect(estimate.promptTokens).toBeGreaterThan(0);
    expect(estimate.outputTokens).toBeGreaterThan(0);
  });
});

describe("generateInsights", () => {
  it("wraps the model answer with validated provenance, deterministically via the stub", async () => {
    const client = createFixtureInsightsClient("fixture-insights");
    const first = await generateInsights({
      client,
      input,
      generatedAt: "2026-07-09T00:00:00.000Z",
    });
    const second = await generateInsights({
      client,
      input,
      generatedAt: "2026-07-09T00:00:00.000Z",
    });
    expect(first.markdown).toBe(second.markdown);
    expect(first.provenance.insights_model).toBe("fixture-insights");
    expect(first.provenance.source_artifact).toBe("rag-benchmark.data.json");
    expect(first.provenance.trials).toBe(5);
    expect(first.markdown).toContain("Fixtured insights stub");
  });

  it("defaults source_commit and trials when the input omits them", async () => {
    const client = createFixtureInsightsClient();
    const report = await generateInsights({
      client,
      input: { ...input, sourceCommit: undefined, trials: undefined },
      generatedAt: "2026-07-09T00:00:00.000Z",
    });
    expect(report.provenance.source_commit).toBe("uncommitted");
    expect(report.provenance.trials).toBe(0);
  });
});
