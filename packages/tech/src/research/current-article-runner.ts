import { constants, type Dirent } from "node:fs";
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  findPublishedResearchTopic,
  publishedResearchTopics,
  type ResearchHistoryFrame,
  type ResearchSiteTopic,
} from "./domain/site";
import {
  composeCurrentArticle,
  currentArticleBlocks,
} from "./domain/current-article";
import {
  framesInTendencyWindow,
  instrumentVersionOf,
  snapshotPointsFor,
  type SnapshotPoint,
} from "./domain/snapshot";

/**
 * The effectful driver for the dated survey-article composition: it reads a
 * topic's dated history frames and its current artifact, builds the 推移 and
 * 過去の調査 blocks (pure, in `domain/current-article.ts`), and injects them
 * into the topic's freshly-rendered current page. Kept here (not in an
 * entrypoint) so both the `research:site -- compose-current-articles` command
 * and the `research -- <topic> --real` pipeline compose through the same code —
 * the pipeline composes the current page BEFORE translating it, so the Japanese
 * current page is always a translation of the composed English current page.
 *
 * Composition is not idempotent (it appends blocks), so a caller must compose a
 * FRESHLY-rendered measurement article, never an already-composed one.
 */

const repoRoot = (): string => resolve(process.cwd(), "../..");

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const generatedAtFromStamp = (stamp: string): string => {
  const match = /^(.+T\d{2})-(\d{2})-(\d{2})-(\d+)Z$/.exec(stamp);
  if (match === null) return stamp;
  const [, dateAndHour, minute, second, milliseconds] = match;
  return `${dateAndHour}:${minute}:${second}.${milliseconds}Z`;
};

/** Dated frames under docs/research-reports/history/, optionally one topic. */
export const readHistoryFrames = async (
  topicId?: string,
): Promise<ReadonlyArray<ResearchHistoryFrame>> => {
  const root = repoRoot();
  const topics =
    topicId === undefined
      ? publishedResearchTopics
      : publishedResearchTopics.filter((topic) => topic.id === topicId);
  const frames: ResearchHistoryFrame[] = [];

  for (const topic of topics) {
    const topicDir = resolve(root, "docs/research-reports/history", topic.id);
    let entries: Dirent[];
    try {
      entries = await readdir(topicDir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const directory = `docs/research-reports/history/${topic.id}/${entry.name}`;
      const sourcePath = `${directory}/${topic.artifactBase}.md`;
      const japanesePath = `${directory}/${topic.artifactBase}.ja.md`;
      const dataPath = `${directory}/${topic.artifactBase}.data.json`;
      const frame: {
        topicId: string;
        generatedAt: string;
        sourcePath?: string;
        japanesePath?: string;
        dataPath?: string;
      } = {
        topicId: topic.id,
        generatedAt: generatedAtFromStamp(entry.name),
      };
      if (await exists(resolve(root, sourcePath)))
        frame.sourcePath = sourcePath;
      if (await exists(resolve(root, japanesePath)))
        frame.japanesePath = japanesePath;
      if (await exists(resolve(root, dataPath))) frame.dataPath = dataPath;

      if (
        frame.sourcePath !== undefined ||
        frame.japanesePath !== undefined ||
        frame.dataPath !== undefined
      ) {
        frames.push(frame);
      }
    }
  }

  return frames;
};

const trendPointsFor = async (
  topic: ResearchSiteTopic,
  frames: ReadonlyArray<ResearchHistoryFrame>,
): Promise<ReadonlyArray<SnapshotPoint>> => {
  const root = repoRoot();
  const artifacts: { artifact: unknown; version: number }[] = [];
  const currentDataPath =
    topic.dataPath === undefined ? undefined : resolve(root, topic.dataPath);
  if (currentDataPath !== undefined && (await exists(currentDataPath))) {
    const artifact: unknown = JSON.parse(
      await readFile(currentDataPath, "utf8"),
    );
    artifacts.push({ artifact, version: instrumentVersionOf(artifact) });
  }
  for (const frame of frames) {
    if (frame.dataPath === undefined) continue;
    const artifact: unknown = JSON.parse(
      await readFile(resolve(root, frame.dataPath), "utf8"),
    );
    artifacts.push({ artifact, version: instrumentVersionOf(artifact) });
  }
  // Only same-instrument-version runs connect into one trend series.
  const latestVersion = artifacts[0]?.version;
  const points: SnapshotPoint[] = [];
  for (const entry of artifacts) {
    if (entry.version !== latestVersion) continue;
    points.push(...snapshotPointsFor(topic.id, entry.artifact));
  }
  return points;
};

/** Compose one topic's freshly-rendered current page in place. Returns true if
 * a page was written, false if there was no current page to compose. */
export const composeTopicCurrentArticle = async (
  topicId: string,
): Promise<boolean> => {
  const topic = findPublishedResearchTopic(topicId);
  if (topic === undefined) return false;
  const root = repoRoot();
  const currentPath = resolve(root, topic.source.docsPath);
  if (!(await exists(currentPath))) return false;
  const frames = framesInTendencyWindow(await readHistoryFrames(topicId));
  const points = await trendPointsFor(topic, frames);
  const { trendBlock, relatedBlock } = currentArticleBlocks(
    topic,
    frames,
    points,
  );
  const article = await readFile(currentPath, "utf8");
  const composed = composeCurrentArticle(article, trendBlock, relatedBlock);
  await mkdir(dirname(currentPath), { recursive: true });
  await writeFile(currentPath, composed, "utf8");
  return true;
};

/** Compose every published topic's current page (the site-wide command). */
export const composeAllCurrentArticles = async (): Promise<number> => {
  let written = 0;
  for (const topic of publishedResearchTopics) {
    if (await composeTopicCurrentArticle(topic.id)) written += 1;
  }
  return written;
};
