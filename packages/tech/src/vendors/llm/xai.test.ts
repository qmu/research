import { describe, expect, it } from "vitest";
import { extractXaiAgentText, extractXaiCitations } from "./xai";

/**
 * Fixture payloads for the Agent Tools API (the surface that replaced the retired
 * Live Search — see `xai.ts`). Shapes follow the xAI docs read 2026-07-17
 * (https://docs.x.ai/developers/tools/web-search, .../tools/citations): a
 * Responses-shaped `output[]` with `output_text` content parts and inline
 * `url_citation` annotations, plus a top-level `citations` list of URL strings.
 * The LIVE verification of this wiring is still owed (owner-gated); these prove
 * the parser against the documented shape without a network call.
 */
const agentToolsResponse = {
  output_text: "Jannik Sinner won. [[1]](https://apnews.com/2026/07/12/final)",
  output: [
    { type: "web_search_call", status: "completed" },
    {
      type: "message",
      content: [
        {
          type: "output_text",
          text: "Jannik Sinner won. [[1]](https://apnews.com/2026/07/12/final)",
          annotations: [
            {
              type: "url_citation",
              url: "https://apnews.com/2026/07/12/final",
              // xAI's annotation `title` is the visible citation NUMBER, not a
              // source title — the parser must not surface it as one.
              title: "1",
              start_index: 20,
              end_index: 24,
            },
          ],
        },
      ],
    },
  ],
  citations: ["https://apnews.com/2026/07/12/final", "https://espn.com/tennis"],
};

describe("extractXaiCitations", () => {
  it("returns empty when neither citation surface is present or well-formed", () => {
    expect(extractXaiCitations({})).toEqual([]);
    expect(extractXaiCitations({ citations: "not-an-array" })).toEqual([]);
    expect(extractXaiCitations({ citations: [null, 42, ""] })).toEqual([]);
    expect(extractXaiCitations({ output: "not-an-array" })).toEqual([]);
  });

  it("reads the documented top-level array-of-URL-strings shape", () => {
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

  it("falls back to inline url_citation annotations, dropping the number-title", () => {
    // A response that carried annotations but no top-level list.
    expect(extractXaiCitations({ output: agentToolsResponse.output })).toEqual([
      { url: "https://apnews.com/2026/07/12/final" },
    ]);
  });

  it("de-duplicates an annotation URL against the top-level list", () => {
    expect(extractXaiCitations(agentToolsResponse)).toEqual([
      { url: "https://apnews.com/2026/07/12/final" },
      { url: "https://espn.com/tennis" },
    ]);
  });

  it("ignores non-url_citation annotations and annotations without a URL", () => {
    expect(
      extractXaiCitations({
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                annotations: [
                  { type: "file_citation", file_id: "ignored" },
                  { type: "url_citation", title: "no url, skipped" },
                ],
              },
            ],
          },
        ],
      }),
    ).toEqual([]);
  });
});

describe("extractXaiAgentText", () => {
  it("prefers the aggregated output_text convenience field", () => {
    expect(extractXaiAgentText(agentToolsResponse)).toBe(
      agentToolsResponse.output_text,
    );
  });

  it("concatenates output_text content parts when the field is absent", () => {
    expect(
      extractXaiAgentText({
        output: [
          { type: "web_search_call", status: "completed" },
          {
            type: "message",
            content: [
              { type: "output_text", text: "Sinner " },
              { type: "reasoning", text: "ignored" },
              { type: "output_text", text: "won." },
            ],
          },
        ],
      }),
    ).toBe("Sinner won.");
  });

  it("returns an empty string when there is no text at all", () => {
    expect(extractXaiAgentText({})).toBe("");
    expect(extractXaiAgentText({ output: "not-an-array" })).toBe("");
    expect(extractXaiAgentText({ output_text: "" })).toBe("");
  });
});
