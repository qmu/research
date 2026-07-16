import { describe, expect, it } from "vitest";
import { extractPerplexityCitations } from "./perplexity";

describe("extractPerplexityCitations", () => {
  it("reads bare `citations` URL strings", () => {
    expect(
      extractPerplexityCitations({
        citations: ["https://a.com/1", "https://b.org/2"],
      }),
    ).toEqual([{ url: "https://a.com/1" }, { url: "https://b.org/2" }]);
  });

  it("reads dated `search_results` with title and date", () => {
    expect(
      extractPerplexityCitations({
        search_results: [
          { url: "https://a.com/1", title: "A", date: "2026-01-02" },
        ],
      }),
    ).toEqual([
      { url: "https://a.com/1", title: "A", publishedDateIso: "2026-01-02" },
    ]);
  });

  it("prefers the dated search_result over a bare citation for the same URL", () => {
    const merged = extractPerplexityCitations({
      citations: ["https://a.com/1"],
      search_results: [{ url: "https://a.com/1", date: "2026-01-02" }],
    });
    expect(merged).toEqual([
      { url: "https://a.com/1", publishedDateIso: "2026-01-02" },
    ]);
  });

  it("is total over missing / malformed fields", () => {
    expect(extractPerplexityCitations({})).toEqual([]);
    expect(
      extractPerplexityCitations({ citations: [1, null], search_results: "x" }),
    ).toEqual([]);
    expect(
      extractPerplexityCitations({ search_results: [{ title: "no url" }] }),
    ).toEqual([]);
  });
});
