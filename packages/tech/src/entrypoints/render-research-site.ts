import { constants, type Dirent } from "node:fs";
import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  framePublishPlan,
  publishPlan,
  publishSlugs,
  renderJapaneseHistoryIndex,
  renderJapaneseIndex,
  renderQmuTicketPayload,
  renderSourceHistoryIndex,
  renderSourceIndex,
  publishedResearchTopics,
  type ResearchHistoryFrame,
} from "../research/domain/site";
import { composeAllCurrentArticles } from "../research/current-article-runner";
import { isDirectRun } from "./direct-run";

const repoRoot = (): string => resolve(process.cwd(), "../..");

const usage = (): string =>
  [
    "Usage: research-site <command>",
    "",
    "Commands:",
    "  slugs         Print qmu publish slugs in sidebar order",
    "  copy-plan     Print source and destination slugs for qmu copy",
    "  qmu-ticket    Print the qmu-co-jp handoff ticket body",
    "  write-indexes Regenerate docs/research-reports and docs/llm-foundation indexes",
    "  compose-current-articles  Inject the trend + past-survey links into each topic's current page",
    "",
  ].join("\n");

const writeText = async (path: string, text: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text, "utf8");
};

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

const readHistoryFrames = async (): Promise<
  ReadonlyArray<ResearchHistoryFrame>
> => {
  const root = repoRoot();
  const frames: ResearchHistoryFrame[] = [];

  for (const topic of publishedResearchTopics) {
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

export const main = async (): Promise<void> => {
  const [command] = process.argv.slice(2);
  if (command === "slugs") {
    process.stdout.write(`${publishSlugs().join(" ")}\n`);
    return;
  }
  if (command === "copy-plan") {
    // D1: the plan is the per-topic latest pages plus every dated survey's
    // Japanese article (mirrored under history/), so qmu-co-jp holds the past
    // surveys the current articles link to.
    const frames = await readHistoryFrames();
    const entries = [...publishPlan(), ...framePublishPlan(frames)];
    process.stdout.write(
      `${entries
        .map((entry) => `${entry.sourceSlug}\t${entry.destinationSlug}`)
        .join("\n")}\n`,
    );
    return;
  }
  if (command === "qmu-ticket") {
    const frames = await readHistoryFrames();
    process.stdout.write(`${renderQmuTicketPayload(frames)}\n`);
    return;
  }
  // Compose each topic's CURRENT English page into the dated survey-article
  // series view: inject the 推移 (trend) block into §4 and the 過去の調査
  // (past surveys) links into §7, over the freshly-rendered measurement
  // article. The composition itself lives in `current-article-runner` so the
  // real-run pipeline composes through the same code. `write-snapshots` is a
  // deprecated alias.
  if (command === "compose-current-articles" || command === "write-snapshots") {
    const written = await composeAllCurrentArticles();
    process.stdout.write(`composed ${written} current article(s)\n`);
    return;
  }
  if (command === "write-indexes") {
    const historyFrames = await readHistoryFrames();
    await writeText(
      resolve(repoRoot(), "docs/research-reports/index.md"),
      renderSourceIndex(),
    );
    await writeText(
      resolve(repoRoot(), "docs/research-reports/history.md"),
      renderSourceHistoryIndex(historyFrames),
    );
    await writeText(
      resolve(repoRoot(), "docs/llm-foundation/index.md"),
      renderJapaneseIndex(),
    );
    await writeText(
      resolve(repoRoot(), "docs/llm-foundation/history.md"),
      renderJapaneseHistoryIndex(historyFrames),
    );
    process.stdout.write(
      `wrote research site indexes (${historyFrames.length} history frames)\n`,
    );
    return;
  }

  process.stderr.write(usage());
  process.exitCode = 1;
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`research-site failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
}
