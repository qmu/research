import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { publishedResearchTopics } from "./domain/site";
import { findTopic } from "./domain/topic";
import { latestMeasuredFrame } from "./current-article-runner";

/**
 * Guard over the committed CURRENT pages of topics that have a real, measured
 * dated frame: the current pages must be rendered FROM that frame (the
 * committed real-data source of truth), never from the keyless fixture
 * placeholder. This is the disk-level invariant behind the measured-frame
 * composition in `composeCurrentPagesFromLatestMeasuredFrame` — it failed in
 * the field when the image-generation article showed 「0件が測定済み」 while
 * the 3/3-measured trial sat only in its dated frame.
 */

const repoPath = (path: string): string =>
  resolve(process.cwd(), "../..", path);

const inPlaceTopicsWithMeasuredFrame = async () => {
  const rows = [];
  for (const topic of publishedResearchTopics) {
    if (findTopic(topic.id)?.fixtureRewritesCurrentPage !== true) continue;
    const frame = await latestMeasuredFrame(topic.id);
    if (frame !== undefined) rows.push({ topic, frame });
  }
  return rows;
};

describe("current pages of topics with a measured dated frame", () => {
  it("covers the image-generation topic (the trial this guard was written for)", async () => {
    const rows = await inPlaceTopicsWithMeasuredFrame();
    expect(rows.map((row) => row.topic.id)).toContain("image-generation");
  });

  it("keeps the current data artifact a verbatim copy of the latest measured frame's artifact", async () => {
    for (const { topic, frame } of await inPlaceTopicsWithMeasuredFrame()) {
      if (topic.dataPath === undefined || frame.dataPath === undefined) {
        continue;
      }
      expect(
        readFileSync(repoPath(topic.dataPath), "utf8"),
        `${topic.id}: ${topic.dataPath} must equal ${frame.dataPath}`,
      ).toBe(readFileSync(repoPath(frame.dataPath), "utf8"));
    }
  });

  it("keeps the current English page the frame's survey article composed with the series blocks", async () => {
    for (const { topic, frame } of await inPlaceTopicsWithMeasuredFrame()) {
      if (frame.sourcePath === undefined) continue;
      const current = readFileSync(repoPath(topic.source.docsPath), "utf8");
      const frameArticle = readFileSync(repoPath(frame.sourcePath), "utf8");
      // The frame's §4 measured-count line must appear verbatim on the
      // current page — the fixture render's "0 measured" line must not.
      const measuredLine = frameArticle
        .split("\n")
        .find((line) => line.includes("measured** of"));
      expect(
        measuredLine,
        `${frame.sourcePath} should state its measured count`,
      ).toBeDefined();
      expect(current).toContain(measuredLine as string);
      expect(current).toContain("**推移 / Trend across surveys**");
      expect(current).toContain("**過去の調査 / Past surveys in this series**");
    }
  });

  it("keeps the current Japanese page the frame's translated survey article when the frame has one", async () => {
    for (const { topic, frame } of await inPlaceTopicsWithMeasuredFrame()) {
      if (frame.japanesePath === undefined) continue;
      const current = readFileSync(repoPath(topic.japanese.docsPath), "utf8");
      const frameArticle = readFileSync(repoPath(frame.japanesePath), "utf8");
      // Same body: the current JP page is the frame translation plus the
      // composed blocks, so every frame paragraph appears on the page.
      const firstParagraph = frameArticle
        .replace(/^---\n[\s\S]*?\n---\n/, "")
        .split("\n")
        .find((line) => line.trim() !== "" && !line.startsWith("#"));
      expect(
        firstParagraph,
        `${frame.japanesePath} should have a body paragraph`,
      ).toBeDefined();
      expect(current).toContain(firstParagraph as string);
    }
  });
});
