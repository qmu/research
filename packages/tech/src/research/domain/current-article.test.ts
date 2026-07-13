import { describe, expect, it } from "vitest";
import {
  appendRelatedBlock,
  buildRelatedBlock,
  buildTrendBlock,
  composeCurrentArticle,
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
});

describe("appendRelatedBlock (past surveys after §7)", () => {
  it("appends the block at the end and no-ops on empty", () => {
    const out = appendRelatedBlock(article, "**過去の調査 / Past**\n\n- a");
    expect(out.indexOf("**過去の調査 / Past**")).toBeGreaterThan(
      out.indexOf("## 7. Verification Data"),
    );
    expect(appendRelatedBlock(article, "")).toBe(article);
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
