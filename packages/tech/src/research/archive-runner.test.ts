import { describe, expect, it } from "vitest";
import { rewriteRealArtifactReferences } from "./archive-runner";

describe("rewriteRealArtifactReferences", () => {
  it("rewrites the topic's .real artifact reference to the committed frame name", () => {
    const report = [
      "The complete run record is committed as",
      "[`image-generation-comparison.real.data.json`](./image-generation-comparison.real.data.json).",
    ].join(" ");
    expect(
      rewriteRealArtifactReferences(report, "image-generation-comparison"),
    ).toBe(
      [
        "The complete run record is committed as",
        "[`image-generation-comparison.data.json`](./image-generation-comparison.data.json).",
      ].join(" "),
    );
  });

  it("rewrites the artifactPath field inside a data artifact", () => {
    const artifact = JSON.stringify({
      artifactPath: "image-generation-comparison.real.data.json",
    });
    expect(
      JSON.parse(
        rewriteRealArtifactReferences(artifact, "image-generation-comparison"),
      ),
    ).toEqual({ artifactPath: "image-generation-comparison.data.json" });
  });

  it("leaves other topics' names and plain artifact names untouched", () => {
    const content =
      "ocr-comparison.real.data.json and image-generation-comparison.data.json";
    expect(
      rewriteRealArtifactReferences(content, "image-generation-comparison"),
    ).toBe(content);
  });
});
