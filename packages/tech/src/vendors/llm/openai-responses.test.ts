import { describe, expect, it } from "vitest";
import { extractOpenAiUrlCitations } from "./openai-responses";

describe("extractOpenAiUrlCitations", () => {
  it("returns empty for a missing or annotation-free output array", () => {
    expect(extractOpenAiUrlCitations(undefined)).toEqual([]);
    expect(extractOpenAiUrlCitations([])).toEqual([]);
    expect(
      extractOpenAiUrlCitations([
        { type: "web_search_call", status: "completed" },
        { type: "message", content: [{ type: "output_text", text: "hi" }] },
      ]),
    ).toEqual([]);
  });

  it("reads url_citation annotations and de-duplicates by URL", () => {
    expect(
      extractOpenAiUrlCitations([
        { type: "web_search_call", status: "completed" },
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "answer",
              annotations: [
                {
                  type: "url_citation",
                  url: "https://a.example/one",
                  title: "One",
                },
                { type: "url_citation", url: "https://a.example/one" },
                { type: "file_citation", file_id: "ignored" },
                { type: "url_citation", title: "no url, skipped" },
              ],
            },
          ],
        },
      ]),
    ).toEqual([{ url: "https://a.example/one" }]);
  });
});
