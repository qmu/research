import { constants, type Dirent } from "node:fs";
import {
  access,
  mkdir,
  readdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  findPublishedResearchTopic,
  publishedResearchTopics,
  type ResearchHistoryFrame,
  type ResearchSiteTopic,
} from "./domain/site";
import {
  appendRelatedBlock,
  buildRelatedBlock,
  buildTrendBlock,
  composeCurrentArticle,
  latestCompleteFrame,
  type ArticleLanguage,
} from "./domain/current-article";
import {
  framesInTendencyWindow,
  instrumentVersionOf,
  snapshotPointsFor,
  type SnapshotPoint,
} from "./domain/snapshot";
import { findTopic } from "./domain/topic";

/**
 * The effectful driver for the dated survey-article composition (pure blocks in
 * `domain/current-article.ts`), in two steps around translation:
 *   1. `composeTopicCurrentArticle` injects the 推移 (trend) block into the
 *      English current page BEFORE translation, so its caption translates.
 *   2. `appendRelatedToTopicPages` appends the 過去の調査 (past surveys) links
 *      AFTER translation, once per language, so the English and Japanese pages
 *      each link their own-language frames (translation would keep English
 *      URLs). The `research -- <topic> --real` pipeline runs both around the
 *      translation step, and the `compose-current-articles` /
 *      `append-past-surveys` CLI commands run them for the whole site.
 *
 * Neither step is idempotent (both add blocks), so a caller must run them on a
 * FRESHLY-rendered / freshly-translated article, never on an already-composed one.
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

/**
 * The newest complete dated frame (English article + data artifact) whose
 * artifact yields at least one MEASURED snapshot point — i.e. the frame of a
 * real, owner-approved trial. Fixture/curated frames yield zero points (the
 * extractors chart `provenance: "measured"` rows only) and never qualify, so a
 * topic that has only harness-proof frames keeps its keyless fixture rendering.
 */
export const latestMeasuredFrame = async (
  topicId: string,
): Promise<ResearchHistoryFrame | undefined> => {
  const topic = findPublishedResearchTopic(topicId);
  if (topic === undefined) return undefined;
  if (findTopic(topicId)?.kind === "article") return undefined;
  const frame = latestCompleteFrame(await readHistoryFrames(topicId));
  if (frame?.dataPath === undefined) return undefined;
  const artifact: unknown = JSON.parse(
    await readFile(resolve(repoRoot(), frame.dataPath), "utf8"),
  );
  return snapshotPointsFor(topicId, artifact).length > 0 ? frame : undefined;
};

/** Trend points from the dated frames only (no current artifact): under the
 * measured-frame composition the current data artifact IS a copy of the latest
 * frame, so including it would double the newest survey's points. Anchored on
 * the newest frame's instrument version, like `trendPointsFor`. */
const trendPointsFromFrames = async (
  topic: ResearchSiteTopic,
  frames: ReadonlyArray<ResearchHistoryFrame>,
): Promise<ReadonlyArray<SnapshotPoint>> => {
  const root = repoRoot();
  const artifacts: { artifact: unknown; version: number }[] = [];
  for (const frame of frames) {
    if (frame.dataPath === undefined) continue;
    const artifact: unknown = JSON.parse(
      await readFile(resolve(root, frame.dataPath), "utf8"),
    );
    artifacts.push({ artifact, version: instrumentVersionOf(artifact) });
  }
  const latestVersion = artifacts[0]?.version;
  const points: SnapshotPoint[] = [];
  for (const entry of artifacts) {
    if (entry.version !== latestVersion) continue;
    points.push(...snapshotPointsFor(topic.id, entry.artifact));
  }
  return points;
};

export type ComposeFromFrameOptions = Readonly<{
  /**
   * Preserve the keyless fixture render that the benchmark stage just wrote
   * over the current pages by moving it to the gitignored
   * `<artifactBase>.fixture.md` / `<artifactBase>.fixture.data.json` side
   * files (the llm-model-comparison convention) before the restore. The
   * fixture pipeline stays fully exercised and inspectable without ever being
   * presented as the current survey.
   */
  fixtureRenderAside?: boolean;
}>;

/**
 * Render one topic's CURRENT pages from its latest MEASURED dated frame — the
 * committed real-data source of truth — instead of the keyless fixture render:
 *
 *   - English current page  ← frame's survey article + 推移 block + 過去の調査
 *   - current data artifact ← frame's data artifact (verbatim copy)
 *   - Japanese current page ← frame's Japanese survey article (when the frame
 *     has one) + the same blocks; left untouched otherwise, matching the
 *     keyless path's hands-off treatment of the translated page.
 *
 * Everything read here is committed, so the composition is keyless and
 * deterministic — `make drift` regenerates it byte-stably. Returns false (and
 * writes nothing) when the topic has no measured frame; the caller then falls
 * back to the fixture composition.
 */
export const composeCurrentPagesFromLatestMeasuredFrame = async (
  topicId: string,
  options: ComposeFromFrameOptions = {},
): Promise<boolean> => {
  const topic = findPublishedResearchTopic(topicId);
  if (topic === undefined) return false;
  const frame = await latestMeasuredFrame(topicId);
  if (frame?.sourcePath === undefined || frame.dataPath === undefined) {
    return false;
  }
  const root = repoRoot();
  const currentPath = resolve(root, topic.source.docsPath);
  const currentDataPath =
    topic.dataPath === undefined ? undefined : resolve(root, topic.dataPath);

  if (options.fixtureRenderAside === true) {
    const asideOf = (path: string): string =>
      path
        .replace(/\.data\.json$/, ".fixture.data.json")
        .replace(/\.md$/, ".fixture.md");
    for (const path of [currentPath, currentDataPath]) {
      if (path !== undefined && (await exists(path))) {
        await rename(path, asideOf(path));
      }
    }
  }

  const frames = framesInTendencyWindow(await readHistoryFrames(topicId));
  const trendBlock = buildTrendBlock(
    topic,
    await trendPointsFromFrames(topic, frames),
  );

  const frameArticle = await readFile(resolve(root, frame.sourcePath), "utf8");
  await mkdir(dirname(currentPath), { recursive: true });
  await writeFile(
    currentPath,
    appendRelatedBlock(
      composeCurrentArticle(frameArticle, trendBlock),
      buildRelatedBlock(frames, "en"),
    ),
    "utf8",
  );
  if (currentDataPath !== undefined) {
    await writeFile(
      currentDataPath,
      await readFile(resolve(root, frame.dataPath), "utf8"),
      "utf8",
    );
  }
  if (frame.japanesePath !== undefined) {
    const japanesePath = resolve(root, topic.japanese.docsPath);
    const frameJapanese = await readFile(
      resolve(root, frame.japanesePath),
      "utf8",
    );
    await mkdir(dirname(japanesePath), { recursive: true });
    await writeFile(
      japanesePath,
      appendRelatedBlock(
        composeCurrentArticle(frameJapanese, trendBlock),
        buildRelatedBlock(frames, "ja"),
      ),
      "utf8",
    );
  }
  return true;
};

/**
 * Compose the 推移 (trend) block into one topic's freshly-rendered English
 * current page, BEFORE translation (so the Japanese page gets the translated
 * trend). The 過去の調査 links are added later, per language, by
 * `appendRelatedToTopicPages`. Returns true if a page was written.
 */
export const composeTopicCurrentArticle = async (
  topicId: string,
): Promise<boolean> => {
  const topic = findPublishedResearchTopic(topicId);
  if (topic === undefined) return false;
  // Hand-authored reference articles (kind "article", e.g. agent-sdk) are not
  // survey-series pages: they carry no measured series, and their pages are
  // maintained by hand. The site-wide compose/append commands must never
  // inject survey blocks into them.
  if (findTopic(topicId)?.kind === "article") return false;
  const root = repoRoot();
  const currentPath = resolve(root, topic.source.docsPath);
  if (!(await exists(currentPath))) return false;
  const frames = framesInTendencyWindow(await readHistoryFrames(topicId));
  const points = await trendPointsFor(topic, frames);
  const article = await readFile(currentPath, "utf8");
  const composed = composeCurrentArticle(
    article,
    buildTrendBlock(topic, points),
  );
  await mkdir(dirname(currentPath), { recursive: true });
  await writeFile(currentPath, composed, "utf8");
  return true;
};

/**
 * Append the 過去の調査 (past surveys) block to a topic's English and Japanese
 * current pages, AFTER translation — each page links its own-language frames,
 * so the links resolve in both qmu-co-jp language sections. Returns the number
 * of pages written. `languages` narrows the write to the pages that were
 * freshly (re-)rendered: the keyless fixture path rewrites only the English
 * page, so it passes `["en"]` to leave the committed Japanese page untouched
 * (the block is append-only, never idempotent).
 */
export const appendRelatedToTopicPages = async (
  topicId: string,
  languages: ReadonlyArray<ArticleLanguage> = ["en", "ja"],
): Promise<number> => {
  const topic = findPublishedResearchTopic(topicId);
  if (topic === undefined) return 0;
  // Same guard as composeTopicCurrentArticle: hand-authored article-kind
  // pages never receive survey-series blocks.
  if (findTopic(topicId)?.kind === "article") return 0;
  const root = repoRoot();
  const frames = framesInTendencyWindow(await readHistoryFrames(topicId));
  let written = 0;
  const allPages: ReadonlyArray<{ path: string; language: ArticleLanguage }> = [
    { path: topic.source.docsPath, language: "en" },
    { path: topic.japanese.docsPath, language: "ja" },
  ];
  const pages = allPages.filter((page) => languages.includes(page.language));
  for (const page of pages) {
    const absolute = resolve(root, page.path);
    if (!(await exists(absolute))) continue;
    const block = buildRelatedBlock(frames, page.language);
    if (block === "") continue;
    const article = await readFile(absolute, "utf8");
    await writeFile(absolute, appendRelatedBlock(article, block), "utf8");
    written += 1;
  }
  return written;
};

/** Compose the trend into every published topic's current page (site-wide
 * command; run BEFORE translation). */
export const composeAllCurrentArticles = async (): Promise<number> => {
  let written = 0;
  for (const topic of publishedResearchTopics) {
    if (await composeTopicCurrentArticle(topic.id)) written += 1;
  }
  return written;
};

/** Append past-survey links to every published topic's EN and JP current pages
 * (site-wide command; run AFTER translation). */
export const appendAllRelated = async (): Promise<number> => {
  let written = 0;
  for (const topic of publishedResearchTopics) {
    written += await appendRelatedToTopicPages(topic.id);
  }
  return written;
};
