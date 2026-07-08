import { describe, expect, it } from "vitest";
import { splitFrontmatter } from "./translate-runner";

describe("splitFrontmatter", () => {
  it("parses key: value frontmatter and returns the body", () => {
    const md = [
      "---",
      "source_artifact: rag-benchmark.data.json",
      "insights_model: claude-sonnet-5",
      'generated_at: "2026-07-09T00:00:00.000Z"',
      "trials: 5",
      "---",
      "",
      "The insights body.",
    ].join("\n");
    const { frontmatter, body } = splitFrontmatter(md);
    expect(frontmatter.get("source_artifact")).toBe("rag-benchmark.data.json");
    expect(frontmatter.get("insights_model")).toBe("claude-sonnet-5");
    // Quoted values are unwrapped.
    expect(frontmatter.get("generated_at")).toBe("2026-07-09T00:00:00.000Z");
    expect(frontmatter.get("trials")).toBe("5");
    expect(body).toBe("The insights body.");
  });

  it("treats a document without frontmatter as all body", () => {
    const { frontmatter, body } = splitFrontmatter("Just prose.");
    expect(frontmatter.size).toBe(0);
    expect(body).toBe("Just prose.");
  });
});
