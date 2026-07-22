import { describe, expect, it } from "vitest";
import {
  appendRelatedBlock,
  buildRelatedBlock,
  buildTrendBlock,
  composeCurrentArticle,
  latestCompleteFrame,
  stripSurveyBlocks,
} from "./current-article";
import type { ResearchHistoryFrame, ResearchSiteTopic } from "./site";
import type { SnapshotPoint } from "./snapshot";

const article = [
  "---",
  "title: X",
  "---",
  "",
  "# X",
  "",
  "## 4. Verification Results",
  "",
  "results body",
  "",
  "## 5. Analysis",
  "",
  "analysis body",
  "",
  "## 7. Verification Data",
  "",
  "data body",
  "",
].join("\n");

const frames: ReadonlyArray<ResearchHistoryFrame> = [
  {
    topicId: "speed",
    generatedAt: "2026-06-01T00:00:00.000Z",
    sourcePath:
      "docs/research-reports/history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison.md",
    japanesePath:
      "docs/research-reports/history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison.ja.md",
    dataPath:
      "docs/research-reports/history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison.data.json",
  },
  {
    topicId: "speed",
    generatedAt: "2026-07-01T00:00:00.000Z",
    sourcePath:
      "docs/research-reports/history/speed/2026-07-01T00-00-00-000Z/llm-speed-comparison.md",
  },
];

const topic = {
  id: "speed",
  design: {
    metrics: [{ name: "ttftMs", unit: "ms", direction: "lower-is-better" }],
  },
} as unknown as ResearchSiteTopic;

describe("composeCurrentArticle (trend into §4)", () => {
  it("injects the trend before section 5, leaving §7 for the appended block", () => {
    const out = composeCurrentArticle(article, "**推移 / Trend**\n\nchart");
    const trendAt = out.indexOf("**推移 / Trend**");
    const sec5At = out.indexOf("## 5. Analysis");
    expect(trendAt).toBeGreaterThan(-1);
    expect(trendAt).toBeLessThan(sec5At); // trend ends §4, before §5
    expect(out).toContain("## 4. Verification Results");
    expect(out).toContain("## 7. Verification Data");
  });

  it("is a no-op when the trend block is empty (first run)", () => {
    expect(composeCurrentArticle(article, "")).toBe(
      article.replace(/\n+$/, "\n"),
    );
  });

  it("is idempotent: an already-composed article is returned unchanged", () => {
    const trendBlock =
      "**推移 / Trend across surveys**\n\nfirst-survey placeholder";
    const once = composeCurrentArticle(article, trendBlock);
    expect(composeCurrentArticle(once, trendBlock)).toBe(once);
    // Even a DIFFERENT trend block never stacks onto a composed article.
    expect(
      composeCurrentArticle(
        once,
        "**推移 / Trend across surveys**\n\nnewer chart",
      ),
    ).toBe(once);
  });
});

describe("stripSurveyBlocks (frame snapshots are pure articles)", () => {
  // A composed CURRENT page carries both cross-run blocks and a top-level
  // `](./history/...)` past-survey link. An archived FRAME snapshot must carry
  // NEITHER: that link doubles the /history/ segment (and self-references) from
  // inside a frame dir, so it is dead in the VitePress build.
  const composed = appendRelatedBlock(
    composeCurrentArticle(
      article,
      "**推移 / Trend across surveys**\n\nfirst-survey placeholder",
    ),
    buildRelatedBlock(frames, "ja"),
  );

  it("removes both survey-series blocks and the ./history/ link", () => {
    expect(composed).toContain("**推移 / Trend across surveys**");
    expect(composed).toContain("**過去の調査 / Past surveys in this series**");
    expect(composed).toContain("](./history/");
    const pure = stripSurveyBlocks(composed);
    expect(pure).not.toContain("**推移 / Trend across surveys**");
    expect(pure).not.toContain("**過去の調査 / Past surveys in this series**");
    expect(pure).not.toContain("](./history/");
    // The 7-section article survives intact.
    expect(pure).toContain("## 4. Verification Results");
    expect(pure).toContain("## 5. Analysis");
    expect(pure).toContain("## 7. Verification Data");
  });

  it("round-trips to the pure article and is idempotent", () => {
    const pure = stripSurveyBlocks(composed);
    expect(pure).toBe(article.replace(/\n+$/, "\n"));
    expect(stripSurveyBlocks(pure)).toBe(pure);
  });
});

describe("appendRelatedBlock (past surveys after §7)", () => {
  it("appends the block at the end and no-ops on empty", () => {
    const out = appendRelatedBlock(article, "**過去の調査 / Past**\n\n- a");
    expect(out.indexOf("**過去の調査 / Past**")).toBeGreaterThan(
      out.indexOf("## 7. Verification Data"),
    );
    expect(appendRelatedBlock(article, "")).toBe(article);
  });

  it("is idempotent: an article with a past-surveys block is unchanged", () => {
    const relatedBlock = buildRelatedBlock(frames, "en");
    const once = appendRelatedBlock(article, relatedBlock);
    expect(appendRelatedBlock(once, relatedBlock)).toBe(once);
    expect(appendRelatedBlock(once, buildRelatedBlock(frames, "ja"))).toBe(
      once,
    );
  });
});

describe("latestCompleteFrame", () => {
  it("picks the newest frame that has both the article and the artifact", () => {
    // The 2026-07-01 fixture frame has no dataPath, so the older complete
    // frame wins — a half-written archive never becomes the restore source.
    expect(latestCompleteFrame(frames)?.generatedAt).toBe(
      "2026-06-01T00:00:00.000Z",
    );
  });

  it("returns undefined when no frame is complete", () => {
    expect(latestCompleteFrame([])).toBeUndefined();
    expect(
      latestCompleteFrame([
        { topicId: "speed", generatedAt: "2026-07-01T00:00:00.000Z" },
      ]),
    ).toBeUndefined();
  });

  it("prefers the newest of several complete frames", () => {
    const complete = (generatedAt: string) => ({
      topicId: "speed",
      generatedAt,
      sourcePath: `docs/research-reports/history/speed/x/llm-speed-comparison.md`,
      dataPath: `docs/research-reports/history/speed/x/llm-speed-comparison.data.json`,
    });
    expect(
      latestCompleteFrame([
        complete("2026-06-01T00:00:00.000Z"),
        complete("2026-07-12T00:00:00.000Z"),
        complete("2026-07-01T00:00:00.000Z"),
      ])?.generatedAt,
    ).toBe("2026-07-12T00:00:00.000Z");
  });
});

describe("buildRelatedBlock (language-matched single links)", () => {
  it("links the English frame on the English page, newest-first", () => {
    const block = buildRelatedBlock(frames, "en");
    const julyAt = block.indexOf("2026-07-01");
    const juneAt = block.indexOf("2026-06-01");
    expect(julyAt).toBeGreaterThan(-1);
    expect(julyAt).toBeLessThan(juneAt); // newest first
    expect(block).toContain(
      "(./history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison)",
    );
    expect(block).not.toContain(".ja)");
  });

  it("links the Japanese frame on the Japanese page and skips frames without one", () => {
    const block = buildRelatedBlock(frames, "ja");
    // Only the 2026-06-01 frame has a japanesePath in the fixture.
    expect(block).toContain(
      "(./history/speed/2026-06-01T00-00-00-000Z/llm-speed-comparison.ja)",
    );
    expect(block).not.toContain("2026-07-01"); // no JP frame → not listed
  });

  it("returns empty string when there are no past surveys", () => {
    expect(buildRelatedBlock([], "en")).toBe("");
    expect(buildRelatedBlock([], "ja")).toBe("");
  });
});

describe("buildTrendBlock", () => {
  it("charts a metric measured on two or more distinct dates", () => {
    const points: ReadonlyArray<SnapshotPoint> = [
      {
        seriesId: "m",
        seriesLabel: "M",
        metric: "ttftMs",
        measuredAt: "2026-06-01T00:00:00.000Z",
        value: 100,
      },
      {
        seriesId: "m",
        seriesLabel: "M",
        metric: "ttftMs",
        measuredAt: "2026-07-01T00:00:00.000Z",
        value: 90,
      },
    ];
    const block = buildTrendBlock(topic, points);
    expect(block).toContain("推移 / Trend");
    expect(block).toContain("<svg");
  });

  it("shows a first-survey note (no degenerate chart) when only one date exists", () => {
    const points: ReadonlyArray<SnapshotPoint> = [
      {
        seriesId: "a",
        seriesLabel: "A",
        metric: "ttftMs",
        measuredAt: "2026-07-01T00:00:00.000Z",
        value: 90,
      },
      {
        seriesId: "b",
        seriesLabel: "B",
        metric: "ttftMs",
        measuredAt: "2026-07-01T12:00:00.000Z",
        value: 80,
      },
    ];
    const block = buildTrendBlock(topic, points);
    expect(block).toContain("推移 / Trend"); // section always present
    expect(block).toContain("first comparable survey");
    expect(block).not.toContain("<svg"); // but no degenerate single-date chart
  });
});
