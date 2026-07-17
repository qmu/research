import { describe, expect, it } from "vitest";
import { extractXaiCitations } from "./xai";

describe("extractXaiCitations", () => {
  it("returns empty when the citations extension is absent or malformed", () => {
    expect(extractXaiCitations({})).toEqual([]);
    expect(extractXaiCitations({ citations: "not-an-array" })).toEqual([]);
    expect(extractXaiCitations({ citations: [null, 42, ""] })).toEqual([]);
  });

  it("reads the documented array-of-URL-strings shape", () => {
    expect(
      extractXaiCitations({
        citations: ["https://a.example/one", "https://b.example/two"],
      }),
    ).toEqual([
      { url: "https://a.example/one" },
      { url: "https://b.example/two" },
    ]);
  });

  it("reads dated object entries and de-duplicates by URL", () => {
    expect(
      extractXaiCitations({
        citations: [
          "https://a.example/one",
          { url: "https://a.example/one", title: "One", date: "2026-07-01" },
          { title: "no url, skipped" },
        ],
      }),
    ).toEqual([
      {
        url: "https://a.example/one",
        title: "One",
        publishedDateIso: "2026-07-01",
      },
    ]);
  });
});
