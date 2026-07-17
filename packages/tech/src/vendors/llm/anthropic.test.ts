import { describe, expect, it } from "vitest";
import { extractAnthropicWebSearchCitations } from "./anthropic";

const searchResultBlock = {
  type: "web_search_tool_result",
  tool_use_id: "srvtoolu_1",
  content: [
    {
      type: "web_search_result",
      url: "https://a.example/one",
      title: "One",
      page_age: "April 30, 2025",
    },
    {
      type: "web_search_result",
      url: "https://b.example/two",
      title: "Two",
      page_age: "2 hours ago",
    },
  ],
};

describe("extractAnthropicWebSearchCitations", () => {
  it("returns empty for missing or citation-free content", () => {
    expect(extractAnthropicWebSearchCitations(undefined)).toEqual([]);
    expect(
      extractAnthropicWebSearchCitations([{ type: "text", text: "hi" }]),
    ).toEqual([]);
  });

  it("prefers cited sources, enriched with the search result's parsed date", () => {
    expect(
      extractAnthropicWebSearchCitations([
        searchResultBlock,
        {
          type: "text",
          text: "answer",
          citations: [
            {
              type: "web_search_result_location",
              url: "https://a.example/one",
              title: "One",
              cited_text: "…",
            },
            { type: "char_location", document_index: 0 },
          ],
        },
      ]),
    ).toEqual([
      {
        url: "https://a.example/one",
        title: "One",
        publishedDateIso: "2025-04-30",
      },
    ]);
  });

  it("falls back to the raw search results when nothing is cited, dating only parseable ages", () => {
    expect(extractAnthropicWebSearchCitations([searchResultBlock])).toEqual([
      {
        url: "https://a.example/one",
        title: "One",
        publishedDateIso: "2025-04-30",
      },
      { url: "https://b.example/two", title: "Two" },
    ]);
  });
});
