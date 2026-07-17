import { describe, expect, it } from "vitest";
import { extractGoogleGroundingCitations } from "./google";

describe("extractGoogleGroundingCitations", () => {
  it("returns empty when the candidate or its grounding metadata is absent", () => {
    expect(extractGoogleGroundingCitations(undefined)).toEqual([]);
    expect(extractGoogleGroundingCitations({})).toEqual([]);
    expect(extractGoogleGroundingCitations({ groundingMetadata: {} })).toEqual(
      [],
    );
  });

  it("reads web grounding chunks and de-duplicates by URL", () => {
    expect(
      extractGoogleGroundingCitations({
        groundingMetadata: {
          groundingChunks: [
            { web: { uri: "https://a.example/one", title: "One" } },
            { web: { uri: "https://a.example/one", title: "One again" } },
            { web: { uri: "https://b.example/two" } },
            { retrievedContext: { uri: "ignored: not a web chunk" } },
            null,
          ],
        },
      }),
    ).toEqual([
      { url: "https://a.example/one", title: "One again" },
      { url: "https://b.example/two" },
    ]);
  });
});
